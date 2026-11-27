"""
Sucht und prüft frei lizenzierte Azan-Aufnahmen für die Gebetserinnerung (läuft in GitHub Actions).

  python scripts/azan/check.py collect > list.json        # Kandidaten: Wikimedia Commons + Freesound
  python scripts/azan/check.py analyze '<json>' out/      # herunterladen, messen, mit Whisper mitschreiben
  python scripts/azan/check.py report out/ > report.md    # Bericht

Gemessen wird, was für einen Erinnerungston zählt:
- Lizenz und Urheber (nur CC0, CC BY, CC BY-SA, gemeinfrei mit belastbarer Begründung),
- Inhalt: Whisper (large-v3) schreibt mit, damit nur vollständige sunnitische Gebetsrufe übrig bleiben
  (ohne Zusätze wie „ḥayya ʿalā khayr al-ʿamal“) und der Fadschr-Ruf („aṣ-ṣalātu khayrun min an-nawm“)
  erkannt wird,
- Klang: Lautheit, Dynamik (Abstand zwischen Stimme und Grundrauschen), Spektrogramm.
"""
import html
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request

UA = 'IslamAppBot/1.0 (open-source prayer app)'

COMMONS = [
    # Referenz: bereits in der App
    'File:Beautiful adhan.ogg',
    'File:Azan.ogg',
    # Kandidaten
    'File:33937 ejaz215 call-to-prayer-from-the-prophet-s-mo.ogg',
    'File:Adhan, Great Mosque of Mecca - Jan 21, 2013.webm',
    'File:Maghrib Adhan at the Masjid al Haram, Mecca - 25 Feb, 2012.webm',
    'File:Time of Adhan, Great Mosque of Mecca - Jan 6, 2018 .webm',
    'File:Eid al-Fitr Fajr azan at Malmö Mosque - 19 August 2012.webm',
    'File:Adhan in Shalqar mosque.webm',
    'File:Adhan in Istanbul.webm',
    'File:The Adhan - Muslim Call to Prayer - Aaqib Azeez.mp3',
    'File:Call to prayer.ogg',
    'File:Islamic call to worship.oga',
    'File:Llamada a oración Mezquita Hassan II.wav',
    'File:ASC Leiden - van de Bruinhorst Collection - Somaliland 2019 - 4412 - Oriental Hotel. Adhan (call to prayer) from the Ali Matan Mosque, Hargeisa.webm',
    'File:Hminsec150 Konya.webm',
]

FREESOUND_QUERIES = ['ezan', 'adhan', 'azan', 'call to prayer', 'muezzin', 'adzan', 'athan']
ADHAN_WORDS = re.compile(r'adhan|azan|ezan|adzan|athan|azaan|call[ -]to[ -]prayer|muezzin|müezzin|أذان|اذان', re.I)


def get(url, binary=False, tries=6):
    wait = 10
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=300) as r:
                data = r.read()
            return data if binary else data.decode('utf-8', 'replace')
        except Exception as e:  # 429 / Netzfehler: warten und erneut versuchen
            print(f'  Fehler {e} bei {url[:120]} – Versuch {attempt + 1}', file=sys.stderr)
            if attempt == tries - 1:
                raise
            time.sleep(wait)
            wait *= 2


def strip_tags(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s or ''))).strip()


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:60]


# ---------------------------------------------------------------- Kandidaten sammeln

def collect_commons():
    out = []
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({
        'action': 'query', 'titles': '|'.join(COMMONS), 'prop': 'imageinfo',
        'iiprop': 'url|size|mime|extmetadata', 'format': 'json'})
    d = json.loads(get(url))
    for p in d['query']['pages'].values():
        if 'imageinfo' not in p:
            print(f'Commons: nicht gefunden: {p["title"]}', file=sys.stderr)
            continue
        ii = p['imageinfo'][0]
        m = ii.get('extmetadata', {})
        out.append({
            'id': 'c-' + slug(p['title'][5:]),
            'source': 'commons',
            'title': p['title'][5:],
            'page': ii['descriptionurl'],
            'url': ii['url'],
            'license': m.get('LicenseShortName', {}).get('value', '?'),
            'author': strip_tags(m.get('Artist', {}).get('value', '?')),
            'description': strip_tags(m.get('ImageDescription', {}).get('value', ''))[:400],
        })
    return out


def freesound_licenses(page):
    """Alle Creative-Commons-Verweise der Seite, z. B. ['CC0'] oder ['CC BY 4.0']."""
    out = []
    for lic in re.findall(r'creativecommons\.org/(publicdomain/zero/1\.0|licenses/[a-z+-]+/[\d.]+)', page):
        if lic.startswith('publicdomain/zero'):
            name = 'CC0'
        else:
            kind, ver = lic.split('/')[1:3]
            name = f'CC {kind.upper()} {ver}'
        if name not in out:
            out.append(name)
    return out


def collect_freesound():
    found = {}
    for q in FREESOUND_QUERIES:
        for page in (1, 2):
            url = f'https://freesound.org/search/?q={urllib.parse.quote(q)}&page={page}'
            try:
                h = get(url, tries=3)
            except Exception as e:
                print(f'Freesound-Suche fehlgeschlagen: {url}: {e}', file=sys.stderr)
                continue
            hits = re.findall(r'/people/([^/"\s]+)/sounds/(\d+)/', h)
            print(f'Freesound {q!r} Seite {page}: {len(set(hits))} Treffer', file=sys.stderr)
            for user, sid in hits:
                found.setdefault(sid, user)
            time.sleep(2)
    out = []
    for sid, user in list(found.items())[:120]:
        url = f'https://freesound.org/people/{user}/sounds/{sid}/'
        try:
            h = get(url, tries=3)
        except Exception:
            continue
        title = strip_tags((re.search(r'<title>(.*?)</title>', h, re.S) or [None, ''])[1])
        desc = strip_tags((re.search(r'<meta name="description" content="([^"]*)"', h) or [None, ''])[1])
        tags = sorted(set(re.findall(r'/browse/tags/([^/"?]+)/', h)))
        lics = freesound_licenses(h)
        previews = re.findall(r'https://cdn\.freesound\.org/previews/\d+/\d+_\d+-hq\.(?:ogg|mp3)', h)
        text = ' '.join([title, desc, ' '.join(tags)])
        # Nur eindeutige, freie Lizenz (kein „NC“, kein „Sampling+“)
        lic = lics[0] if len(lics) == 1 else None
        ok_lic = lic and ('NC' not in lic) and ('SAMPLING' not in lic)
        print(f'  {sid} {user}: {title[:60]!r} {lics} adhan={bool(ADHAN_WORDS.search(text))} previews={len(previews)}', file=sys.stderr)
        if not (ok_lic and previews and ADHAN_WORDS.search(text)):
            continue
        prev = sorted(set(previews), key=lambda u: 0 if u.endswith('.ogg') else 1)[0]
        out.append({
            'id': f'f-{sid}',
            'source': 'freesound',
            'title': title,
            'page': url,
            'url': prev,
            'license': lic,
            'author': user,
            'description': (desc + ' | Tags: ' + ', '.join(tags))[:400],
        })
        time.sleep(1)
    return out


def collect():
    items = collect_commons()
    try:
        items += collect_freesound()
    except Exception as e:
        print(f'Freesound übersprungen: {e}', file=sys.stderr)
    print(json.dumps(items, ensure_ascii=False))


# ---------------------------------------------------------------- Analyse eines Kandidaten

def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def loudness(path):
    r = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-vn', '-af', 'loudnorm=print_format=json', '-f', 'null', '-'])
    m = re.search(r'\{[^{}]*"input_i"[^{}]*\}', r.stderr)
    j = json.loads(m.group(0))
    return {k: float(j[k]) for k in ('input_i', 'input_tp', 'input_lra', 'input_thresh')}


def dynamics(wav16):
    """Abstand zwischen lauten Stellen (Stimme) und leisen Stellen (Grundrauschen) in dB, 50-ms-Fenster."""
    import numpy as np
    import wave
    w = wave.open(wav16)
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    n = 800
    frames = x[: len(x) // n * n].reshape(-1, n)
    rms = np.sqrt((frames ** 2).mean(axis=1)) + 1e-9
    db = 20 * np.log10(rms)
    p10, p50, p95 = (float(np.percentile(db, q)) for q in (10, 50, 95))
    quiet = float((db < p95 - 30).mean())  # Anteil wirklich leiser Stellen (Pausen zwischen den Rufen)
    return {'p10_db': round(p10, 1), 'p50_db': round(p50, 1), 'p95_db': round(p95, 1),
            'range_db': round(p95 - p10, 1), 'quiet_share': round(quiet, 3)}


def transcribe(wav16):
    import numpy as np
    import wave
    from faster_whisper import WhisperModel
    # Tonspur selbst einlesen (16 kHz Mono) – umgeht das Dekodieren über PyAV
    w = wave.open(wav16)
    audio = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    model = WhisperModel('large-v3', device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 4)
    segs, info = model.transcribe(audio, language='ar', beam_size=5, vad_filter=False,
                                  condition_on_previous_text=False, temperature=0.0)
    return [{'start': round(s.start, 1), 'end': round(s.end, 1), 'text': s.text.strip()} for s in segs]


def analyze(item_json, outdir):
    item = json.loads(item_json)
    os.makedirs(outdir, exist_ok=True)
    base = os.path.join(outdir, item['id'])
    ext = os.path.splitext(urllib.parse.urlparse(item['url']).path)[1] or '.bin'
    src = base + '-original' + ext
    with open(src, 'wb') as f:
        f.write(get(item['url'], binary=True))
    probe = json.loads(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,sample_rate,channels',
                            '-of', 'json', src]).stdout)
    audio = [s for s in probe.get('streams', []) if s.get('codec_type') == 'audio']
    item['duration'] = round(float(probe['format']['duration']), 1)
    item['audio'] = audio[0] if audio else None
    # Für die spätere Bearbeitung: verlustfrei, Mono, 44,1 kHz
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-vn', '-ac', '1', '-ar', '44100', base + '.flac'])
    wav16 = base + '-16k.wav'
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav16])
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', base + '.flac', '-lavfi',
         'showspectrumpic=s=1400x300:mode=combined:color=intensity:scale=log:legend=1', base + '.png'])
    for key, fn, arg in (('loudness', loudness, base + '.flac'), ('dynamics', dynamics, wav16)):
        try:
            item[key] = fn(arg)
        except Exception as e:
            print(f'{key} fehlgeschlagen: {e}', file=sys.stderr)
            item[key] = {}
    t0 = time.time()
    item['transcript'] = transcribe(wav16)
    item['transcribe_s'] = round(time.time() - t0)
    os.remove(src)
    os.remove(wav16)
    with open(base + '.json', 'w') as f:
        json.dump(item, f, ensure_ascii=False, indent=1)
    print(json.dumps(item, ensure_ascii=False, indent=1))


# ---------------------------------------------------------------- Bericht

AR_DIAC = re.compile(r'[ً-ٰٟۖ-ۭ]')
CHECKS = {
    'allahu_akbar': r'الله ?اكبر',
    'shahada': r'اشهد ان ?لا ?اله ?الا ?الله',
    'rasul': r'محمدا? ?رسول ?الله',
    'salah': r'حي علي الصلا',
    'falah': r'حي علي الفلا',
    'fajr': r'الصلاة? خير من النوم',
    'shia_khayr_amal': r'خير العمل',
    'shia_ali': r'علي[اً]? ?ولي',
}


def norm_ar(s):
    s = AR_DIAC.sub('', s)
    s = re.sub('[إأآٱ]', 'ا', s)
    s = s.replace('ى', 'ي').replace('ـ', '')
    return re.sub(r'\s+', ' ', s)


def report(outdir):
    items = []
    for name in sorted(os.listdir(outdir)):
        if name.endswith('.json'):
            with open(os.path.join(outdir, name)) as f:
                items.append(json.load(f))
    print('# Azan-Kandidaten\n')
    print('| ID | Quelle | Lizenz | Urheber | Dauer | Lautheit | Dynamik | Pausen | Inhalt |')
    print('|---|---|---|---|---|---|---|---|---|')
    for it in items:
        text = norm_ar(' '.join(s['text'] for s in it.get('transcript', [])))
        hits = {k: len(re.findall(v, text)) for k, v in CHECKS.items()}
        flags = ' '.join(f'{k}={v}' for k, v in hits.items() if v)
        l, d = it.get('loudness', {}), it.get('dynamics', {})
        print(f"| {it['id']} | {it['source']} | {it['license']} | {it['author'][:30]} | {it.get('duration', '?')} s | "
              f"{l.get('input_i', '?')} LUFS | {d.get('range_db', '?')} dB | {d.get('quiet_share', '?')} | {flags} |")
    print()
    for it in items:
        print(f"## {it['id']}\n\n{it['title']}  \n{it['page']}  \nLizenz: {it['license']} · Urheber: {it['author']}  \n"
              f"Beschreibung: {it['description']}\n")
        for s in it.get('transcript', []):
            print(f"- {s['start']:7.1f}–{s['end']:7.1f}: {s['text']}")
        print()


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'collect':
        collect()
    elif cmd == 'analyze':
        analyze(sys.argv[2], sys.argv[3])
    elif cmd == 'report':
        report(sys.argv[2])
