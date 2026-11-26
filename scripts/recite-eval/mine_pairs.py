#!/usr/bin/env python3
"""
Sucht „Mutashabihat“: Verspaare, die sich nur in 1–2 Wörtern unterscheiden (z. B. 6:151 / 17:31).
Mit der Aufnahme des einen Verses und dem Text des anderen lässt sich messen, ob die
Rezitationsprüfung genau diese typischen Verwechslungen findet.

    python scripts/recite-eval/mine_pairs.py  ->  scripts/recite-eval/pairs.json (Verse mit höchstens 30 Wörtern)
"""
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def normalize(s: str) -> str:
    """Wie normalizeArabic + toWords in der App."""
    s = re.sub("[ً-ٰٟۖ-ۭـ]", "", s)
    s = re.sub("[آأإٱ]", "ا", s)
    s = s.replace("ى", "ي").replace("ة", "ه").replace("ؤ", "و").replace("ئ", "ي")
    s = re.sub("[^ء-ي ]", " ", s)
    return " ".join(s.split())


def lev(a, b):
    prev = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        cur = [i] + [0] * len(b)
        for j in range(1, len(b) + 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] != b[j - 1]))
        prev = cur
    return prev[-1]


def edit_ops(a, b):
    """Wort-Editierskript von a (gehört) nach b (erwartet): Liste von (op, i_b, wort_a, wort_b)."""
    n, m = len(a), len(b)
    d = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        d[i][0] = i
    for j in range(m + 1):
        d[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] != b[j - 1]))
    ops = []
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and d[i][j] == d[i - 1][j - 1] + (a[i - 1] != b[j - 1]):
            if a[i - 1] != b[j - 1]:
                ops.append(("sub", j - 1, a[i - 1], b[j - 1]))
            i, j = i - 1, j - 1
        elif j > 0 and d[i][j] == d[i][j - 1] + 1:
            ops.append(("omit", j - 1, None, b[j - 1]))  # erwartetes Wort fehlt in der Aufnahme
            j -= 1
        else:
            ops.append(("insert", j, a[i - 1], None))  # zusätzliches Wort vor erwartetem Index j
            i -= 1
    return d[n][m], list(reversed(ops))


verses = []
for f in sorted((ROOT / "src/data/quran/suras").glob("*.json")):
    sura = int(f.stem)
    data = json.loads(f.read_text(encoding="utf-8"))
    for k, text in enumerate(data["arClean"]):
        aya = k + 1
        words = text.split(" ")
        if aya == 1 and sura not in (1, 9):
            words = words[4:]
        w = normalize(" ".join(words)).split()
        if w:
            verses.append((sura, aya, w))

index = defaultdict(set)
for vid, (_, _, w) in enumerate(verses):
    for k in range(len(w) - 1):
        index[(w[k], w[k + 1])].add(vid)

pairs = []
seen = set()
for vid, (s, a, w) in enumerate(verses):
    if len(w) < 4 or len(w) > 45:
        continue
    cnt = Counter()
    for k in range(len(w) - 1):
        for other in index[(w[k], w[k + 1])]:
            if other != vid:
                cnt[other] += 1
    for other, shared in cnt.items():
        s2, a2, w2 = verses[other]
        if len(w2) < 4 or len(w2) > 45 or abs(len(w2) - len(w)) > 2:
            continue
        if shared < min(len(w), len(w2)) - 4:
            continue
        key = tuple(sorted([vid, other]))
        if key in seen:
            continue
        seen.add(key)
        if w == w2:
            continue
        dist, ops = edit_ops(w, w2)
        if 1 <= dist <= 2:
            kinds = []
            for op, _, wa, wb in ops:
                if op == "sub":
                    kinds.append("letter" if lev(wa, wb) <= 2 else "word")
                else:
                    kinds.append(op)
            pairs.append({"a": [s, a], "b": [s2, a2], "dist": dist, "kinds": kinds, "lenA": len(w), "lenB": len(w2)})

pairs.sort(key=lambda p: (p["a"], p["b"]))
c = Counter(k for p in pairs for k in p["kinds"])
print(len(pairs), "Paare;", dict(c))
(ROOT / "scripts/recite-eval/pairs.json").write_text(json.dumps(pairs, ensure_ascii=False), encoding="utf-8")
