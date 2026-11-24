#!/usr/bin/env python3
"""
Misst die Erkennungsgenauigkeit von ggml-Whisper-Modellen an echten Rezitationen (EveryAyah)
gegen den Tanzil-Korantext der App (Wortfehlerrate, WER).

    python scripts/model/eval_model.py <whisper-cli> <modell1.bin> [<modell2.bin> ...]

Schreibt einen Bericht nach eval-report.md.
"""
import json
import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CLI = sys.argv[1]
MODELS = sys.argv[2:]
# (Sure, von Vers, bis Vers) – kurze und lange Verse, verschiedene Stile
TESTS = [(1, 1, 7), (112, 1, 4), (113, 1, 5), (114, 1, 6), (2, 255, 255), (36, 1, 12), (67, 1, 5), (55, 1, 13)]
RECITERS = ["Alafasy_128kbps", "Husary_128kbps", "Minshawy_Murattal_128kbps"]
WORK = Path("eval-audio")
WORK.mkdir(exist_ok=True)


def normalize(s: str) -> str:
    """Gleiche Vereinheitlichung wie in der App (src/lib/quran/text.ts)."""
    s = re.sub("[ً-ٰٟۖ-ۭـ]", "", s)
    s = re.sub("[آأإٱ]", "ا", s)
    s = s.replace("ى", "ي").replace("ة", "ه").replace("ؤ", "و").replace("ئ", "ي")
    s = re.sub("[^ء-ي ]", " ", s)
    return " ".join(s.split())


def expected_text(sura: int, aya: int) -> str:
    data = json.loads((ROOT / f"src/data/quran/suras/{sura:03d}.json").read_text(encoding="utf-8"))
    words = data["arClean"][aya - 1].split(" ")
    if aya == 1 and sura not in (1, 9):
        words = words[4:]  # Basmala gehört bei EveryAyah nicht zur Datei von Vers 1
    return " ".join(words)


def edit_distance(ref: list, hyp: list) -> int:
    prev = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        cur = [i] + [0] * len(hyp)
        for j, h in enumerate(hyp, 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (r != h))
        prev = cur
    return prev[-1]


def audio(reciter: str, sura: int, aya: int) -> Path:
    wav = WORK / f"{reciter}-{sura:03d}{aya:03d}.wav"
    if not wav.exists():
        mp3 = wav.with_suffix(".mp3")
        url = f"https://everyayah.com/data/{reciter}/{sura:03d}{aya:03d}.mp3"
        req = urllib.request.Request(url, headers={"User-Agent": "IslamApp-CI/0.1"})
        mp3.write_bytes(urllib.request.urlopen(req, timeout=60).read())
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(mp3), "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", str(wav)], check=True)
    return wav


def duration(wav: Path) -> float:
    return (wav.stat().st_size - 44) / (16000 * 2)


items = [(r, s, a) for r in RECITERS for (s, a1, a2) in TESTS for a in range(a1, a2 + 1)]
for r, s, a in items:
    audio(r, s, a)

report = ["# Auswertung Erkennungsmodelle", "", f"{len(items)} Verse, Rezitatoren: {', '.join(RECITERS)}", ""]
report.append("| Modell | Größe | Wortfehlerrate (WER) | Rechenzeit pro Audiosekunde |")
report.append("|---|---|---|---|")
examples = {}
for model in MODELS:
    errors = words = 0
    t_audio = t_cpu = 0.0
    for r, s, a in items:
        wav = audio(r, s, a)
        t0 = time.time()
        out = subprocess.run([CLI, "-m", model, "-l", "ar", "-nt", "-np", "-t", "4", "-f", str(wav)], capture_output=True, text=True).stdout
        t_cpu += time.time() - t0
        t_audio += duration(wav)
        ref = normalize(expected_text(s, a)).split()
        hyp = normalize(out).split()
        e = edit_distance(ref, hyp)
        errors += e
        words += len(ref)
        if r == RECITERS[0] and e > 0 and len(examples.setdefault(model, [])) < 25:
            examples[model].append(f"- {s}:{a} erwartet: `{' '.join(ref)}` – erkannt: `{' '.join(hyp)}`")
    size = Path(model).stat().st_size / 1e6
    report.append(f"| {Path(model).name} | {size:.0f} MB | {100 * errors / words:.2f} % | {t_cpu / t_audio:.2f} s |")
    print(report[-1], flush=True)

for model in MODELS:
    report += ["", f"## Abweichungen {Path(model).name} ({RECITERS[0]})", ""] + (examples.get(model) or ["- keine"])
Path("eval-report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
print("\n".join(report))
