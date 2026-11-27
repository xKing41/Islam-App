"""
Prüft den Wortlaut einer Azan-Aufnahme Satz für Satz: an den Atempausen schneiden und jeden Ruf einzeln
mit Whisper large-v3 erkennen. Bei langen, verzierten Rufen (türkischer Stil, Mekka) erfindet Whisper
in 30-Sekunden-Fenstern sonst Text („اشتركوا في القناة“); einzelne Rufe erkennt es zuverlässig.

  python scripts/azan/phrases.py <datei.flac> [<datei.flac> …]  > phrases.md
"""
import os
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from check import CHECKS, norm_ar  # noqa: E402
from make_sound import pauses  # noqa: E402
import re  # noqa: E402
import subprocess  # noqa: E402
import tempfile  # noqa: E402


def load16k(path):
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, 'x.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-ac', '1', '-ar', '16000', wav], check=True)
        w = wave.open(wav)
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        ps = pauses(wav)
    return x, ps


def segments(x, ps, sr=16000):
    """Rufe zwischen den Pausen (sehr kurze Stücke unter 1,5 s werden angehängt)."""
    cuts = [0.0] + [(a + b) / 2 for a, b in ps] + [len(x) / sr]
    segs = []
    for a, b in zip(cuts, cuts[1:]):
        if segs and b - a < 1.5:
            segs[-1] = (segs[-1][0], b)
        elif b - a >= 1.0:
            segs.append((a, b))
    return segs


# Nur ein Hinweis auf die Art der Aufnahme („Dies ist ein Gebetsruf.“) – kein Wortlaut, damit die Prüfung
# nichts vorgibt, was nicht gesungen wird. Abschalten mit PROMPT=''.
PROMPT = os.environ.get('PROMPT', 'هذا أذان للصلاة.')


def main():
    from faster_whisper import WhisperModel
    model = WhisperModel('large-v3', device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 4)
    for path in sys.argv[1:]:
        x, ps = load16k(path)
        print(f'## {os.path.basename(path)} (Hinweis: {PROMPT or "keiner"})\n')
        all_text = []
        for a, b in segments(x, ps):
            clip = x[int(a * 16000): int(b * 16000)]
            out, _ = model.transcribe(clip, language='ar', beam_size=5, vad_filter=False,
                                      condition_on_previous_text=False, temperature=[0.0, 0.2, 0.4],
                                      initial_prompt=PROMPT or None)
            text = ' '.join(s.text.strip() for s in out)
            all_text.append(text)
            print(f'- {a:6.1f}–{b:6.1f} s: {text}')
        joined = norm_ar(' '.join(all_text))
        hits = {k: len(re.findall(v, joined)) for k, v in CHECKS.items()}
        print(f'\nTreffer: {hits}\n', flush=True)


if __name__ == '__main__':
    main()
