"""
Erzeugt einen Erinnerungston aus einer geprüften Azan-Aufnahme (siehe check.py):
Ausschnitt wählen, Lautheit angleichen (wie die vorhandenen Töne: ca. −10 LUFS, Spitzen ≤ −2 dBTP),
sanft ein- und ausblenden und als OGG Vorbis (Mono) speichern. Optional eine Kurzfassung, die an der
ersten Atempause nach einer Mindestlänge endet (meist nach dem vierfachen „Allāhu akbar“).

  python3 scripts/azan/make_sound.py <quelle> <ziel.ogg> --start 0.0 --end 150.0 \
      [--highpass 80] [--denoise] [--short <ziel_kurz.ogg> --short-min 20 --short-max 40]

Gibt Dauer, Lautheit und SHA-256 der erzeugten Dateien aus (für QUELLEN.md).
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import wave

import numpy as np

TARGET_I = -10.0
TARGET_TP = -2.0


def ff(*args):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-y', *args], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(r.stderr[-2000:])
    return r.stderr


def measure(path, filters=''):
    chain = (filters + ',' if filters else '') + f'loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA=11:print_format=json'
    err = ff('-i', path, '-af', chain, '-f', 'null', '-')
    return json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', err).group(0))


def pauses(wav_path, min_len=0.35):
    """Atempausen: mindestens min_len Sekunden mehr als 28 dB unter den lauten Stellen (Stimme)."""
    w = wave.open(wav_path)
    sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    hop = int(sr * 0.02)
    frames = x[: len(x) // hop * hop].reshape(-1, hop)
    db = 20 * np.log10(np.sqrt((frames ** 2).mean(axis=1)) + 1e-9)
    loud = np.percentile(db, 95)
    quiet = db < loud - 28
    out, start = [], None
    for i, q in enumerate(quiet):
        if q and start is None:
            start = i
        elif not q and start is not None:
            if (i - start) * 0.02 >= min_len:
                out.append((start * 0.02, i * 0.02))
            start = None
    return out


def render(src, dst, start, end, pre_filters, fade_out, headroom=0.5):
    """Ausschnitt [start, end] → Lautheit angleichen → Ein-/Ausblenden → OGG Vorbis Mono."""
    length = end - start
    with tempfile.TemporaryDirectory() as tmp:
        cut = os.path.join(tmp, 'cut.wav')
        ff('-ss', f'{start:.3f}', '-t', f'{length:.3f}', '-i', src, '-ac', '1', '-ar', '44100', *(['-af', pre_filters] if pre_filters else []), cut)
        m = measure(cut)
        # Sanft verdichten (nur Stellen deutlich über der mittleren Lautheit), dann verstärken bis zur
        # Ziel-Lautheit; verbleibende Spitzen fängt ein Begrenzer ab (0,5 dB Reserve für das Kodieren).
        thr = 10 ** ((float(m['input_i']) + 6) / 20)
        limit = 10 ** ((TARGET_TP - headroom) / 20)
        gain = TARGET_I - float(m['input_i'])

        def dyn(g):
            return (f'acompressor=threshold={thr:.5f}:ratio=2.5:attack=15:release=250:knee=4,'
                    f'volume={g:.2f}dB,alimiter=limit={limit:.4f}:attack=3:release=80:level=false')

        for _ in range(4):  # Begrenzer/Verdichter senken die Lautheit etwas – nachregeln
            got = float(measure(cut, dyn(gain))['input_i'])
            if abs(got - TARGET_I) < 0.25:
                break
            gain += TARGET_I - got
        chain = f'{dyn(gain)},afade=t=in:d=0.05,afade=t=out:st={max(0, length - fade_out):.3f}:d={fade_out}'
        ff('-i', cut, '-af', chain, '-ar', '44100', '-ac', '1', '-c:a', 'libvorbis', '-q:a', '3', dst)
    after = measure(dst)
    over = float(after['input_tp']) - TARGET_TP
    if over > 0.5 and headroom < 4:
        # Das Kodieren hat Spitzen erzeugt – mit mehr Reserve wiederholen
        return render(src, dst, start, end, pre_filters, fade_out, headroom + over)
    data = open(dst, 'rb').read()
    info = {
        'file': dst,
        'seconds': round(length, 1),
        'bytes': len(data),
        'lufs': float(after['input_i']),
        'true_peak': float(after['input_tp']),
        'sha256': hashlib.sha256(data).hexdigest(),
    }
    print(json.dumps(info, ensure_ascii=False))
    return info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('dst')
    ap.add_argument('--start', type=float, default=0.0)
    ap.add_argument('--end', type=float, required=True)
    ap.add_argument('--highpass', type=int, default=0)
    ap.add_argument('--denoise', action='store_true')
    ap.add_argument('--short')
    ap.add_argument('--short-min', type=float, default=20)
    ap.add_argument('--short-max', type=float, default=40)
    a = ap.parse_args()

    filters = []
    if a.highpass:
        filters.append(f'highpass=f={a.highpass}')
    if a.denoise:
        filters.append('afftdn=nf=-30')
    pre = ','.join(filters)
    render(a.src, a.dst, a.start, a.end, pre, fade_out=1.5)

    if a.short:
        with tempfile.TemporaryDirectory() as tmp:
            cut = os.path.join(tmp, 'cut.wav')
            ff('-ss', f'{a.start:.3f}', '-t', f'{a.end - a.start:.3f}', '-i', a.src, '-ac', '1', '-ar', '16000', cut)
            ps = pauses(cut)
        cand = [(s + e) / 2 for s, e in ps if a.short_min <= (s + e) / 2 <= a.short_max]
        if not cand:
            sys.exit(f'Keine Atempause zwischen {a.short_min} und {a.short_max} s gefunden. Pausen: {ps}')
        cut_at = cand[0]
        print(f'Kurzfassung endet bei {cut_at:.1f} s (Pause)', file=sys.stderr)
        render(a.src, a.short, a.start, a.start + cut_at, pre, fade_out=0.6)


if __name__ == '__main__':
    main()
