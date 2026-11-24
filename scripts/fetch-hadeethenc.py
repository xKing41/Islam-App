#!/usr/bin/env python3
"""
Lädt alle Hadithe von HadeethEnc.com (Deutsch und Türkisch, jeweils inkl. arabischem Originaltext)
über die offizielle API herunter. Höflich: kurze Pause zwischen den Anfragen, setzt bei Abbruch fort.

    python3 scripts/fetch-hadeethenc.py data/sources/hadeethenc

Danach: node scripts/build-hadith-data.mjs
"""
import json, os, sys, time, urllib.parse, urllib.request

OUT = sys.argv[1] if len(sys.argv) > 1 else "data/sources/hadeethenc"
BASE = "https://hadeethenc.com/api/v1"
UA = {"User-Agent": "IslamApp/0.1 (non-commercial personal app)"}
os.makedirs(OUT, exist_ok=True)


def get(path, **params):
    url = f"{BASE}/{path}/?" + urllib.parse.urlencode(params)
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            print("retry", attempt, url, e, flush=True)
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(url)


for lang in ["de", "tr"]:
    cats = get("categories/list", language=lang)
    json.dump(cats, open(f"{OUT}/categories_{lang}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    ids = {}
    for c in cats:
        d = get("hadeeths/list", language=lang, category_id=c["id"], page=1, per_page=5000)
        for h in d["data"]:
            ids.setdefault(h["id"], set()).add(c["id"])
        time.sleep(0.2)
    print(lang, "unique hadiths:", len(ids), flush=True)
    path = f"{OUT}/hadeeths_{lang}.jsonl"
    done = set()
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            done.add(json.loads(line)["id"])
    with open(path, "a", encoding="utf-8") as f:
        for i, hid in enumerate(sorted(ids, key=int)):
            if hid in done:
                continue
            f.write(json.dumps(get("hadeeths/one", language=lang, id=hid), ensure_ascii=False) + "\n")
            f.flush()
            if i % 100 == 0:
                print(lang, i, "/", len(ids), flush=True)
            time.sleep(0.35)
print("DONE", flush=True)
