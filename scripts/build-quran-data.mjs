#!/usr/bin/env node
/**
 * Erzeugt die Koran-Daten der App aus den Originaldateien in data/sources/.
 *
 *   node scripts/build-quran-data.mjs
 *
 * Eingaben (unverändert von den Originalquellen heruntergeladen, siehe QUELLEN.md):
 *   data/sources/tanzil/quran-uthmani.txt        Tanzil, Uthmani-Text (Medina-Mushaf, Hafs)
 *   data/sources/tanzil/quran-simple-clean.txt   Tanzil, Text ohne Diakritika (für Suche/Prüfmodus)
 *   data/sources/tanzil/quran-simple.txt         Tanzil, einfacher Text mit Diakritika, ohne Pausenzeichen
 *                                                (gleiche Wörter wie simple-clean – für die Anzeige im Prüfmodus)
 *   data/sources/tanzil/quran-data.xml           Tanzil, Metadaten (Suren, Dschuz, Sadschda ...)
 *   data/sources/tanzil/tr.diyanet.txt           Tanzil, Diyanet İşleri (Türkisch)
 *   data/sources/tanzil/tr.transliteration.txt   Tanzil, Çeviriyazı (Muhammet Abay) – türkische Umschrift
 *   data/sources/tanzil/en.transliteration.txt   Tanzil, Transliteration – lateinische Umschrift (mit <u>/<b>-Markierungen)
 *   data/sources/quranenc/german_bubenheim.sqlite  QuranEnc, Bubenheim & Elyas (Deutsch)
 *   data/sources/quranenc/turkish_shahin.sqlite    QuranEnc, Ali Özek u. a. / Diyanet Vakfı (Türkisch)
 *
 * Ausgaben:
 *   src/data/quran/suras/NNN.json   je Sure: { ar, arClean, de_bubenheim, tr_diyanet, tr_vakfi, translit_tr, translit_en }
 *   src/data/quran/index.ts         Lazy-Loader für die 114 Dateien
 *   src/data/quran/meta.json        Metadaten (Suren, Dschuz, Sadschda-Stellen)
 *
 * Der Text wird dabei NICHT verändert – nur in ein anderes Dateiformat gebracht.
 * Am Ende prüft das Skript die Vollständigkeit (6236 Verse je Ausgabe).
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (...p) => join(root, 'data', 'sources', ...p);
const outDir = join(root, 'src', 'data', 'quran');
const TOTAL_AYAT = 6236;

/** Liest eine Tanzil-Datei im Format "sura|aya|text" (Kommentarzeilen beginnen mit #). */
function readTanzil(file) {
  const map = new Map();
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [s, a, ...rest] = line.split('|');
    map.set(`${Number(s)}:${Number(a)}`, rest.join('|').trim());
  }
  return map;
}

/** Liest eine QuranEnc-SQLite-Datei (Tabelle translations: sura, aya, translation, footnotes). */
function readQuranEnc(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  const map = new Map();
  for (const row of db.prepare('SELECT sura, aya, translation, footnotes FROM translations').all()) {
    map.set(`${row.sura}:${row.aya}`, { text: String(row.translation).trim(), footnotes: row.footnotes ? String(row.footnotes).trim() : '' });
  }
  db.close();
  return map;
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : undefined;
}

// ---------- Metadaten ----------
const xml = readFileSync(src('tanzil', 'quran-data.xml'), 'utf8');
const suras = [...xml.matchAll(/<sura [^>]*\/>/g)].map(([tag]) => ({
  index: Number(attr(tag, 'index')),
  ayas: Number(attr(tag, 'ayas')),
  start: Number(attr(tag, 'start')),
  name: attr(tag, 'name'),
  tname: attr(tag, 'tname'),
  type: attr(tag, 'type'),
  order: Number(attr(tag, 'order')),
}));
const juz = [...xml.matchAll(/<juz [^>]*\/>/g)].map(([tag]) => ({
  index: Number(attr(tag, 'index')),
  sura: Number(attr(tag, 'sura')),
  aya: Number(attr(tag, 'aya')),
}));
const sajdas = [...xml.matchAll(/<sajda [^>]*\/>/g)].map(([tag]) => ({
  sura: Number(attr(tag, 'sura')),
  aya: Number(attr(tag, 'aya')),
  type: attr(tag, 'type'),
}));
const pages = [...xml.matchAll(/<page [^>]*\/>/g)].map(([tag]) => [Number(attr(tag, 'sura')), Number(attr(tag, 'aya'))]);

if (suras.length !== 114) throw new Error(`Erwartet 114 Suren, gefunden ${suras.length}`);
if (suras.reduce((n, s) => n + s.ayas, 0) !== TOTAL_AYAT) throw new Error('Versanzahl in Metadaten stimmt nicht');

// ---------- Texte ----------
const editions = {
  ar: readTanzil(src('tanzil', 'quran-uthmani.txt')),
  arClean: readTanzil(src('tanzil', 'quran-simple-clean.txt')),
  arSimple: readTanzil(src('tanzil', 'quran-simple.txt')),
  tr_diyanet: readTanzil(src('tanzil', 'tr.diyanet.txt')),
  translit_tr: readTanzil(src('tanzil', 'tr.transliteration.txt')),
  translit_en: readTanzil(src('tanzil', 'en.transliteration.txt')),
};
const quranEnc = {
  de_bubenheim: readQuranEnc(src('quranenc', 'german_bubenheim.sqlite')),
  tr_vakfi: readQuranEnc(src('quranenc', 'turkish_shahin.sqlite')),
};
for (const [key, map] of [...Object.entries(editions), ...Object.entries(quranEnc)]) {
  if (map.size !== TOTAL_AYAT) throw new Error(`${key}: ${map.size} statt ${TOTAL_AYAT} Verse`);
}

rmSync(join(outDir, 'suras'), { recursive: true, force: true });
mkdirSync(join(outDir, 'suras'), { recursive: true });

const pad = (n) => String(n).padStart(3, '0');
let written = 0;
for (const s of suras) {
  const data = { ar: [], arClean: [], arSimple: [], de_bubenheim: [], tr_diyanet: [], tr_vakfi: [], translit_tr: [], translit_en: [], footnotes: {} };
  for (let a = 1; a <= s.ayas; a++) {
    const k = `${s.index}:${a}`;
    for (const key of ['ar', 'arClean', 'arSimple', 'tr_diyanet', 'translit_tr', 'translit_en']) {
      const v = editions[key].get(k);
      if (!v) throw new Error(`${key} fehlt ${k}`);
      data[key].push(v);
    }
    if (data.arSimple[a - 1].split(' ').length !== data.arClean[a - 1].split(' ').length) {
      throw new Error(`Wortanzahl simple/clean unterschiedlich in ${k}`);
    }
    for (const key of ['de_bubenheim', 'tr_vakfi']) {
      const v = quranEnc[key].get(k);
      if (!v) throw new Error(`${key} fehlt ${k}`);
      data[key].push(v.text);
      if (v.footnotes) (data.footnotes[key] ??= {})[a] = v.footnotes;
    }
    written++;
  }
  writeFileSync(join(outDir, 'suras', `${pad(s.index)}.json`), JSON.stringify(data));
}
if (written !== TOTAL_AYAT) throw new Error(`Nur ${written} Verse geschrieben`);

writeFileSync(
  join(outDir, 'meta.json'),
  JSON.stringify({ suras, juz, sajdas, pages }, null, 0)
);

const loaders = suras
  .map((s) => `  ${s.index}: () => require('./suras/${pad(s.index)}.json'),`)
  .join('\n');
writeFileSync(
  join(outDir, 'index.ts'),
  `// AUTOMATISCH ERZEUGT von scripts/build-quran-data.mjs – nicht von Hand bearbeiten.
import type { SuraData } from '@/lib/quran/types';

/** Lädt die Daten einer Sure erst bei Bedarf (Metro wertet require() erst beim Aufruf aus). */
export const suraLoaders: Record<number, () => SuraData> = {
${loaders}
};
`
);

// Prüfsummen der Quelldateien ausgeben (für QUELLEN.md)
const sources = [
  'tanzil/quran-uthmani.txt',
  'tanzil/quran-simple-clean.txt',
  'tanzil/quran-simple.txt',
  'tanzil/quran-data.xml',
  'tanzil/tr.diyanet.txt',
  'tanzil/tr.transliteration.txt',
  'tanzil/en.transliteration.txt',
  'quranenc/german_bubenheim.sqlite',
  'quranenc/turkish_shahin.sqlite',
];
console.log(`OK: 114 Suren, ${written} Verse je Ausgabe.`);
for (const f of sources) {
  const hash = createHash('sha256').update(readFileSync(src(...f.split('/')))).digest('hex');
  console.log(`  sha256 ${hash}  data/sources/${f}`);
}
