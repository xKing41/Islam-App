/**
 * Wie zuverlässig sind die Vokalzeichen (Harakat) der Erkennung? Vergleicht bei korrekt rezitierten
 * Versen die Vokalzeichen der richtig erkannten Wörter mit dem Tanzil-Text („simple“ mit Vokalzeichen).
 * Nur wenn sie fast immer übereinstimmen, wäre eine Prüfung der Vokale sinnvoll.
 *
 *   npx tsx scripts/recite-eval/vowels.ts <transcripts.json> [variante]
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { alignWords, tokenize } from '../../src/lib/recite/align';

const ROOT = resolve(__dirname, '../..');
const data: Record<string, { segments: { text: Record<string, string> }[] }> = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const variant = process.argv[3] ?? 'greedy';

/** Vokalzeichen je Buchstabe: z. B. „الْحَمْدُ“ → ["ا:", "ل:ْ", "ح:َ", "م:ْ", "د:ُ"] (ohne Sukun-Unterschiede). */
function marks(word: string, dropFinal: boolean): string[] {
  const out: string[] = [];
  const w = word
    .replace(/ـ/g, '')
    .replace(/ٱ/g, 'ا')
    .replace(/[ۖ-ۭ]/g, '')
    .replace(/ٰ/g, '');
  for (const ch of w) {
    if (/[ء-ي]/.test(ch)) out.push(ch.replace(/[آأإ]/, 'ا') + ':');
    else if (/[ً-ْ]/.test(ch) && out.length) {
      if (ch === 'ْ') continue; // Sukun wird uneinheitlich geschrieben
      const cur = out[out.length - 1];
      const [l, m] = cur.split(':');
      out[out.length - 1] = `${l}:${[...m, ch].sort().join('')}`;
    }
  }
  if (dropFinal && out.length) out[out.length - 1] = out[out.length - 1].split(':')[0] + ':';
  // Schadda auf dem ersten Buchstaben zeigt nur die Angleichung an das Wort davor (Idgham) – Schreibweise
  if (out.length) out[0] = out[0].replace('ّ', '');
  return out;
}

const suraCache = new Map<number, { arClean: string[]; arSimple: string[] }>();
const sura = (n: number) => {
  if (!suraCache.has(n)) suraCache.set(n, JSON.parse(readFileSync(join(ROOT, `src/data/quran/suras/${String(n).padStart(3, '0')}.json`), 'utf8')));
  return suraCache.get(n)!;
};

let words = 0;
let same = 0;
let sameIgnoringEnd = 0;
const examples: string[] = [];
const meta = JSON.parse(readFileSync(join(ROOT, 'src/data/quran/meta.json'), 'utf8'));
for (const [key, v] of Object.entries(data)) {
  const m = key.match(/\/(\d{3})(\d{3})$/);
  const ms = key.match(/\/sura(\d{3})$/);
  if (!m && !ms) continue;
  let simple: string[] = [];
  if (m) {
    const s = Number(m[1]);
    const a = Number(m[2]);
    simple = sura(s).arSimple[a - 1].split(' ');
    if (a === 1 && s !== 1 && s !== 9) simple = simple.slice(4);
  } else {
    const s = Number(ms![1]);
    for (let a = 1; a <= meta.suras[s - 1].ayas; a++) {
      let w = sura(s).arSimple[a - 1].split(' ');
      if (a === 1 && s !== 1 && s !== 9) w = w.slice(4);
      simple.push(...w);
    }
  }
  const expNorm = simple.map((w) => tokenize(w)[0]?.norm ?? '');
  const heard = tokenize(v.segments.map((x) => x?.text[variant] ?? '').join(' '));
  const al = alignWords(expNorm, heard);
  al.status.forEach((st, i) => {
    if (st !== 'correct' || al.heardAt[i] < 0) return;
    const h = heard[al.heardAt[i]];
    if (!/[ً-ْ]/.test(h.raw)) return; // ohne Vokalzeichen erkannt
    words++;
    const e1 = marks(simple[i], false).join(' ');
    const h1 = marks(h.raw, false).join(' ');
    if (e1 === h1) same++;
    if (marks(simple[i], true).join(' ') === marks(h.raw, true).join(' ')) sameIgnoringEnd++;
    else if (examples.length < 30) examples.push(`${key}: erwartet ${simple[i]} – erkannt ${h.raw}`);
  });
}
console.log(`Variante ${variant}: ${words} richtig erkannte Wörter mit Vokalzeichen`);
console.log(`Vokale identisch: ${((100 * same) / words).toFixed(2)} %`);
console.log(`Vokale identisch ohne Endung (Pausalform am Versende): ${((100 * sameIgnoringEnd) / words).toFixed(2)} %`);
console.log('Beispiele für Abweichungen (ohne Endung):');
console.log(examples.join('\n'));
