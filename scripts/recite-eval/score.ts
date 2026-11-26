/**
 * Bewertet den Wortabgleich an echten Rezitationen (Ergebnis von transcribe.ts):
 *
 *  1. Falschalarme: korrekt rezitierte Verse – jedes markierte Wort ist ein Fehlalarm.
 *  2. Erkennungsrate: Mutashabihat – Aufnahme von Vers A, geprüft gegen den Text des ähnlichen Verses B.
 *     Die 1–2 abweichenden Wörter entsprechen einer typischen Verwechslung und müssen gefunden werden.
 *
 *   npx tsx scripts/recite-eval/score.ts <transcripts.json> [--examples 30] [--out bericht.md]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { alignRecitation, applyVocabulary, combineOpinions, summarize, tokenize, type Alignment } from '../../src/lib/recite/align';
import { evaluateSession } from '../../src/lib/recite/session';
import { alignWords as legacyAlign, stripFormulas as legacyStrip, toWords as legacyWords } from './legacy-align';

type Transcripts = Record<string, { segments: { ms: number; text: Record<string, string> }[] }>;

const ROOT = resolve(__dirname, '../..');
const file = process.argv[2];
const opt: Record<string, string> = {};
for (let i = 3; i < process.argv.length; i += 2) opt[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const EXAMPLES = Number(opt.examples ?? 25);
const data: Transcripts = JSON.parse(readFileSync(file, 'utf8'));

const suraCache = new Map<number, { arClean: string[]; arSimple: string[] }>();
function sura(n: number) {
  if (!suraCache.has(n)) suraCache.set(n, JSON.parse(readFileSync(join(ROOT, `src/data/quran/suras/${String(n).padStart(3, '0')}.json`), 'utf8')));
  return suraCache.get(n)!;
}
/** Erwartete Wörter eines Verses wie in der App (Basmala gehört nicht zu Vers 1, außer bei Al-Fatiha). */
function verseWords(s: number, a: number) {
  let clean = sura(s).arClean[a - 1].split(' ');
  let simple = sura(s).arSimple[a - 1].split(' ');
  if (a === 1 && s !== 1 && s !== 9) {
    clean = clean.slice(4);
    simple = simple.slice(4);
  }
  return { norm: clean.flatMap((w) => tokenize(w).map((t) => t.norm)), display: simple };
}

/** Wort-Editierskript: gehört (a) → erwartet (b). */
function editOps(a: string[], b: string[]) {
  const n = a.length;
  const m = b.length;
  const d = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  const ops: { op: 'sub' | 'omit' | 'insert'; k: number }[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      if (a[i - 1] !== b[j - 1]) ops.push({ op: 'sub', k: j - 1 });
      i--;
      j--;
    } else if (j > 0 && d[i][j] === d[i][j - 1] + 1) {
      ops.push({ op: 'omit', k: j - 1 });
      j--;
    } else {
      ops.push({ op: 'insert', k: j });
      i--;
    }
  }
  return ops.reverse();
}

function lev(a: string, b: string) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = t;
    }
  }
  return prev[b.length];
}

type FO = { expectedStartsWithBasmala: boolean; endsWithFatiha: boolean };
type Matcher = { name: string; run: (expected: string[], heardText: string[], s: number, a: number, fo?: FO, key?: string) => Alignment };

const formulaOpts = (s: number, a: number) => ({ expectedStartsWithBasmala: s === 1 && a === 1, endsWithFatiha: s === 1 && a === 7 });

const vocab = new Set<string>(JSON.parse(readFileSync(join(ROOT, 'src/data/quran/vocab.json'), 'utf8')));

function strict(variant: string, second?: string, withVocab = false): Matcher {
  return {
    name: `streng, ${variant}${second ? ` + Gegenprobe ${second}` : ''}${withVocab ? ' + Wortschatz' : ''}`,
    run: (expected, texts, s, a, fo) => {
      const opts = fo ?? formulaOpts(s, a);
      let al = alignRecitation(expected, tokenize(texts[0]), opts).alignment;
      if (second) al = combineOpinions(al, alignRecitation(expected, tokenize(texts[1]), opts).alignment);
      return withVocab ? applyVocabulary(al, (w) => vocab.has(w)) : al;
    },
  };
}
function legacy(variant: string): Matcher {
  return {
    name: `alt (75 %), ${variant}`,
    run: (expected, texts, s) => {
      const heard = legacyStrip(legacyWords(texts[0]), s === 1);
      const r = legacyAlign(expected, heard);
      return { ...r, heardAt: [], repeats: 0, extras: r.extras.map((e) => ({ ...e, kind: 'extra' as const, heardIndex: -1 })) };
    },
  };
}

const variantsAvailable = new Set<string>();
for (const v of Object.values(data)) for (const s of v.segments) if (s) for (const k of Object.keys(s.text)) variantsAvailable.add(k);
const V = [...variantsAvailable];
const configs: { m: Matcher; variants: string[] }[] = [];
for (const v of V) configs.push({ m: legacy(v), variants: [v] });
for (const v of V) configs.push({ m: strict(v), variants: [v] });
for (const v of V) configs.push({ m: strict(v, undefined, true), variants: [v] });
if (V.includes('greedy') && V.includes('beam5')) {
  // so arbeitet die App: schnell erkennen, markierte Stellen gründlich gegenprüfen, Wortschatz-Regel
  configs.push({ m: strict('greedy', 'beam5', true), variants: ['greedy', 'beam5'] });
}
if (V.includes('greedy') && V.includes('beam5') && V.includes('greedy-split') && V.includes('greedy-merge')) {
  // … und Zusammenhören zweier Abschnitte bei Markierungen an der Schnittstelle (so arbeitet die App)
  configs.push({
    m: {
      name: 'streng, greedy + Gegenprobe beam5 + Nachhören + Zusammenhören + Wortschatz',
      run: (expected, _texts, s, a, fo, key) => {
        const segs = (data[key!]?.segments ?? []).map((x) => {
          const m = x?.text['greedy-merge'];
          return {
            tokens: tokenize(x?.text.greedy ?? ''),
            alt: tokenize(x?.text.beam5 ?? ''),
            split: tokenize(x?.text['greedy-split'] ?? ''),
            ...(m ? { withNext: tokenize(m) } : {}),
          };
        });
        return evaluateSession(expected, segs, fo ?? formulaOpts(s, a), (w) => vocab.has(w)).alignment;
      },
    },
    variants: ['greedy', 'beam5', 'greedy-split', 'greedy-merge'],
  });
}
if (V.includes('greedy') && V.includes('beam5') && V.includes('greedy-split')) {
  // … und zusätzlich Nachhören in zwei Hälften (wie die App bei scheinbar ausgelassenen Wörtern)
  configs.push({
    m: {
      name: 'streng, greedy + Gegenprobe beam5 + Nachhören + Wortschatz',
      run: (expected, _texts, s, a, fo, key) => {
        const segs = (data[key!]?.segments ?? []).map((x) => ({
          tokens: tokenize(x?.text.greedy ?? ''),
          alt: tokenize(x?.text.beam5 ?? ''),
          split: tokenize(x?.text['greedy-split'] ?? ''),
        }));
        return evaluateSession(expected, segs, fo ?? formulaOpts(s, a), (w) => vocab.has(w)).alignment;
      },
    },
    variants: ['greedy', 'beam5', 'greedy-split'],
  });
}

const keyOf = (rec: string, s: number, a: number) => `${rec}/${String(s).padStart(3, '0')}${String(a).padStart(3, '0')}`;
const reciters = [...new Set(Object.keys(data).map((k) => k.split('/')[0]))];
const textOf = (key: string, variant: string) => data[key]?.segments.map((x) => x?.text[variant] ?? '').join(' ');
/** Nur Aufnahmen auswerten, deren Abschnitte alle in allen nötigen Varianten erkannt sind. */
const complete = (key: string, variants: string[]) =>
  !!data[key] && data[key].segments.length > 0 && data[key].segments.every((x) => x && variants.every((v) => x.text[v] !== undefined));

// Paare mit der Basmala (1:1) sind kein sinnvoller Test: Eine Basmala am Anfang wird absichtlich übergangen.
const pairs: { a: [number, number]; b: [number, number] }[] = JSON.parse(
  readFileSync(join(ROOT, 'scripts/recite-eval/pairs.json'), 'utf8'),
).filter((p: { a: number[]; b: number[] }) => !(p.a[0] === 1 && p.a[1] === 1) && !(p.b[0] === 1 && p.b[1] === 1));

const report: string[] = ['# Auswertung „Rezitation prüfen“', ''];
const hasVerses = Object.keys(data).some((k) => /\/\d{6}$/.test(k));
report.push(`Aufnahmen: ${Object.keys(data).length} (EveryAyah: ${reciters.join(', ')}), Mutashabihat-Paare: ${pairs.length}`, '');
report.push('| Verfahren | Falschalarme je Wort | Verse ganz ohne Fehlalarm | unsicher je Wort | Erkannte Verwechslungen | davon nur „unsicher“ | Buchstabe | Wort | ausgelassen | eingefügt |');
report.push('|---|---|---|---|---|---|---|---|---|---|');

const examples: Record<string, string[]> = {};
for (const { m, variants } of hasVerses ? configs : []) {
  // 1) Falschalarme auf korrekten Rezitationen
  let words = 0;
  let flagged = 0;
  let uncertain = 0;
  let verses = 0;
  let clean = 0;
  const fa: string[] = (examples[`Fehlalarme – ${m.name}`] = []);
  for (const key of Object.keys(data)) {
    const m2 = key.match(/\/(\d{3})(\d{3})$/);
    if (!m2) continue;
    if (!complete(key, variants)) continue;
    const s = Number(m2[1]);
    const a = Number(m2[2]);
    const exp = verseWords(s, a);
    const texts = variants.map((v) => textOf(key, v));
    const al = m.run(exp.norm, texts, s, a, undefined, key);
    const sum = summarize(al);
    const unreached = sum.total - sum.reached;
    const bad = sum.wrong + sum.missing + sum.extra + unreached;
    words += sum.total;
    flagged += bad;
    uncertain += sum.uncertain;
    verses++;
    if (bad === 0) clean++;
    if (bad > 0 && fa.length < EXAMPLES) fa.push(`- ${key}: erwartet „${exp.norm.join(' ')}“ – erkannt „${texts[0]}“`);
  }

  // 2) Erkennungsrate auf Mutashabihat-Paaren
  const det = { total: 0, found: 0, onlyUncertain: 0 } as Record<string, number>;
  const byKind: Record<string, [number, number]> = { letter: [0, 0], word: [0, 0], omit: [0, 0], insert: [0, 0] };
  const miss: string[] = (examples[`Nicht erkannte Verwechslungen – ${m.name}`] = []);
  for (const p of pairs) {
    for (const [A, B] of [
      [p.a, p.b],
      [p.b, p.a],
    ] as [number, number][][]) {
      const wa = verseWords(A[0], A[1]).norm;
      const wb = verseWords(B[0], B[1]).norm;
      const ops = editOps(wa, wb);
      for (const rec of reciters) {
        const key = keyOf(rec, A[0], A[1]);
        if (!complete(key, variants)) continue;
        const texts = variants.map((v) => textOf(key, v));
        const al = m.run(wb, texts, B[0], B[1], undefined, key);
        // Ein Vers je Test: nicht erreichte Wörter am Ende zählen wie ausgelassen (die App meldet „Vers unvollständig“)
        const isFlag = (k: number) => k >= 0 && k < al.status.length && ['wrong', 'missing', 'uncertain', 'pending'].includes(al.status[k]);
        const isHard = (k: number) => k >= 0 && k < al.status.length && ['wrong', 'missing', 'pending'].includes(al.status[k]);
        const extraAt = (k: number, hard: boolean) =>
          al.extras.some((e) => (e.kind === 'extra' || (!hard && e.kind === 'corrected')) && (!hard || !e.uncertain) && Math.abs(e.before - k) <= 1);
        for (const o of ops) {
          let kind: string = o.op;
          if (o.op === 'sub') {
            const x = wa[editOpsIndexA(wa, wb, o.k)] ?? '';
            kind = lev(x, wb[o.k]) <= 2 ? 'letter' : 'word';
          }
          const span = o.op === 'insert' ? [o.k - 1, o.k] : [o.k];
          const found = span.some(isFlag) || extraAt(o.k, false) || (o.op !== 'insert' && extraAt(o.k + 1, false));
          const hard = span.some(isHard) || extraAt(o.k, true) || (o.op !== 'insert' && extraAt(o.k + 1, true));
          det.total++;
          byKind[kind][1]++;
          if (found) {
            det.found++;
            byKind[kind][0]++;
            if (!hard) det.onlyUncertain++;
          } else if (miss.length < EXAMPLES) {
            miss.push(`- ${key} gegen ${B[0]}:${B[1]} (${kind}, Wort ${o.k + 1}): erwartet „${wb.join(' ')}“ – erkannt „${texts[0]}“`);
          }
        }
      }
    }
  }
  const pct = (x: number, y: number) => (y ? `${((100 * x) / y).toFixed(2)} %` : '–');
  const k = (n: string) => pct(byKind[n][0], byKind[n][1]);
  report.push(
    `| ${m.name} | ${pct(flagged, words)} (${flagged}/${words}) | ${pct(clean, verses)} | ${pct(uncertain, words)} | ${pct(det.found, det.total)} (${det.found}/${det.total}) | ${det.onlyUncertain} | ${k('letter')} | ${k('word')} | ${k('omit')} | ${k('insert')} |`,
  );
  console.log(report[report.length - 1]);
}

// 3) Ganze Suren am Stück (fremde Rezitatoren, nicht in den Trainingsdaten): nur Falschalarme
const suraKeys = Object.keys(data).filter((k) => /\/sura\d{3}$/.test(k));
if (suraKeys.length) {
  const recs = [...new Set(suraKeys.map((k) => k.split('/')[0]))];
  report.push('', '## Ganze Suren am Stück – Rezitatoren, die das Modell nicht kennt', '');
  report.push(`${suraKeys.length} Aufnahmen (${recs.join(', ')}), Quelle mp3quran.net`, '');
  report.push('| Verfahren | Falschalarme je Wort | unsicher je Wort | Suren ohne Fehlalarm |');
  report.push('|---|---|---|---|');
  for (const { m, variants } of configs) {
    if (m.name.startsWith('alt')) continue;
    let words = 0;
    let flagged = 0;
    let uncertain = 0;
    let clean = 0;
    let n = 0;
    const fa: string[] = (examples[`Fehlalarme ganze Suren – ${m.name}`] = []);
    for (const key of suraKeys) {
      if (!complete(key, variants)) continue;
      const sNum = Number(key.slice(-3));
      const meta = JSON.parse(readFileSync(join(ROOT, 'src/data/quran/meta.json'), 'utf8')).suras[sNum - 1];
      const exp: string[] = [];
      for (let a = 1; a <= meta.ayas; a++) exp.push(...verseWords(sNum, a).norm);
      const texts = variants.map((v) => textOf(key, v));
      const al = m.run(exp, texts, sNum, 1, { expectedStartsWithBasmala: sNum === 1, endsWithFatiha: sNum === 1 }, key);
      const sum = summarize(al);
      const bad = sum.wrong + sum.missing + sum.extra + (sum.total - sum.reached);
      words += sum.total;
      flagged += bad;
      uncertain += sum.uncertain;
      n++;
      if (bad === 0) clean++;
      al.status.forEach((st, i) => {
        if ((st === 'wrong' || st === 'missing') && fa.length < EXAMPLES) fa.push(`- ${key} Wort ${i + 1}: ${st} „${exp[i]}“${al.heardFor[i] ? ` – erkannt „${al.heardFor[i]}“` : ''}`);
      });
    }
    const pct = (x: number, y: number) => (y ? `${((100 * x) / y).toFixed(2)} %` : '–');
    report.push(`| ${m.name} | ${pct(flagged, words)} (${flagged}/${words}) | ${pct(uncertain, words)} | ${clean}/${n} |`);
    console.log(report[report.length - 1]);
  }
}

/** Für eine Ersetzung an Index k in b: zugehöriger Index in a (über das gleiche Editierskript). */
function editOpsIndexA(a: string[], b: string[], kb: number): number {
  // einfache Näherung: gleiche Position relativ zum Ende, wenn die Längen abweichen
  return a.length === b.length ? kb : Math.min(a.length - 1, Math.max(0, kb - (b.length - a.length)));
}

for (const [title, list] of Object.entries(examples)) {
  if (!list.length) continue;
  report.push('', `## ${title}`, '', ...list);
}
const out = opt.out ?? 'eval-report.md';
writeFileSync(out, report.join('\n') + '\n');
console.log(`Bericht: ${out}`);
