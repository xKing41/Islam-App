#!/usr/bin/env node
/**
 * Wortschatz des Korans (alle vorkommenden Wortformen, vereinheitlicht wie in der App) für
 * „Rezitation prüfen“: Ein erkanntes Wort, das so nirgends im Koran vorkommt, ist eher ein Hörfehler der
 * Erkennung als ein Gedächtnisfehler – es wird dann als „unsicher“ statt als „falsch“ markiert.
 *
 *   node scripts/build-quran-vocab.mjs   ->  src/data/quran/vocab.json
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src/data/quran/suras');

/** Wie normalizeArabic + Buchstabenfilter in src/lib/quran/text.ts bzw. src/lib/recite/align.ts */
function norm(w) {
  return w
    .replace(/[ً-ٰٟۖ-ۭـ]/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^ء-ي]/g, '');
}

const words = new Set();
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  const data = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  for (const aya of data.arClean) for (const w of aya.split(' ')) if (norm(w)) words.add(norm(w));
}
// Isti‘adha und „Sadaqa llahu l-‘azim“ sind keine Koranwörter, werden aber oft rezitiert
for (const w of ['اعوذ', 'بالله', 'الشيطان', 'الرجيم', 'صدق', 'العظيم', 'امين']) words.add(w);
const list = [...words].sort();
writeFileSync(join(root, 'src/data/quran/vocab.json'), JSON.stringify(list));
console.log(`${list.length} Wortformen`);
