#!/usr/bin/env node
/**
 * Erzeugt die Hadith-Daten der App aus dem HadeethEnc-Download (data/sources/hadeethenc/).
 *
 *   node scripts/build-hadith-data.mjs
 *
 * Ausgabe je Sprache (de, tr):
 *   src/data/hadith/<lang>/index.json   Kategorien + Liste (id, Titel, Kategorien, Chunk-Nr., Einstufung,
 *                                       Sammlungen, Textlänge)
 *   src/data/hadith/<lang>/cNN.json     Hadith-Texte in Paketen zu je 100 (werden bei Bedarf geladen)
 *   src/data/hadith/index.ts            Lazy-Loader
 * Die Texte werden unverändert übernommen. Zusätzlich abgeleitet (für Sortierung und Filter):
 *   - Einstufung aus dem arabischen Urteil (صحيح → s, حسن → h)
 *   - Sammlungen aus der arabischen Quellenangabe (متفق عليه → Bukhari + Muslim, رواه أبو داود … )
 * Themen-Namen mit Tippfehlern oder englischen Resten werden über scripts/hadith-titles.mjs korrigiert.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TITLE_FIXES } from './hadith-titles.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'data', 'sources', 'hadeethenc');
const outDir = join(root, 'src', 'data', 'hadith');
const CHUNK = 100;
const clean = (s) => (typeof s === 'string' ? s.replace(/\r/g, '').trim() : '');

/** Einstufung aus dem arabischen Urteil: s = sahih (authentisch), h = hasan (gut), '' = sonstiges. */
function gradeOf(gradeAr) {
  const g = clean(gradeAr);
  if (/صحيح/.test(g)) return 's';
  if (/حسن/.test(g)) return 'h';
  return '';
}

/** Sammlungen aus der arabischen Quellenangabe (Reihenfolge = Rang der Sammlung). */
const COLLECTIONS = [
  ['bu', /البخاري/],
  ['mu', /مسلم/],
  ['ad', /أبو داود|أبي داود/],
  ['ti', /الترمذي/],
  ['na', /النسائي/],
  ['im', /ابن ماجه/],
  ['ah', /أحمد/],
  ['ma', /مالك|الموطأ/],
  ['da', /الدارمي/],
];
function collectionsOf(attrAr) {
  const a = clean(attrAr);
  const muttafaq = /متفق علي/.test(a);
  const found = COLLECTIONS.filter(([key, re]) => re.test(a) || (muttafaq && (key === 'bu' || key === 'mu'))).map(([key]) => key);
  // weitere Sammlungen (Ibn Hibban, Ibn Khuzaima, al-Hakim, al-Bayhaqi, ad-Daraqutni …)
  const rest = a
    .replace(/متفق علي(ه|ها)|البخاري|مسلم|أبو داود|أبي داود|الترمذي|النسائي|ابن ماجه|أحمد|مالك|الموطأ|الدارمي/g, '')
    .match(/ابن حبان|ابن خزيمة|الحاكم|البيهقي|الدارقطني|البزار|الطبراني|ابن أبي حاتم|عبد الرزاق|ابن أبي شيبة|أبو يعلى|رويناه|الطيالسي|الحميدي|سعيد بن منصور|ابن السني/);
  if (rest || !found.length) found.push('ot');
  return { s: found, mt: muttafaq ? 1 : undefined };
}

rmSync(outDir, { recursive: true, force: true });
const loaderLines = [];

for (const lang of ['de', 'tr']) {
  const cats = JSON.parse(readFileSync(join(srcDir, `categories_${lang}.json`), 'utf8'));
  const rows = readFileSync(join(srcDir, `hadeeths_${lang}.jsonl`), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .sort((a, b) => Number(a.id) - Number(b.id));

  // Doppelte entfernen (falls der Download fortgesetzt wurde)
  const seen = new Set();
  const hadiths = rows.filter((h) => (seen.has(h.id) ? false : (seen.add(h.id), true)));

  mkdirSync(join(outDir, lang), { recursive: true });
  const items = [];
  const chunks = [];
  hadiths.forEach((h, i) => {
    const c = Math.floor(i / CHUNK);
    const { s: src, mt } = collectionsOf(h.attribution_ar);
    items.push({
      id: Number(h.id),
      title: clean(h.title),
      cats: (h.categories ?? []).map(Number),
      c,
      g: gradeOf(h.grade_ar),
      s: src,
      ...(mt ? { mt } : {}),
      n: clean(h.hadeeth).length,
    });
    (chunks[c] ??= {})[h.id] = {
      text: clean(h.hadeeth),
      ar: clean(h.hadeeth_ar),
      attribution: clean(h.attribution),
      grade: clean(h.grade),
      gradeAr: clean(h.grade_ar),
      explanation: clean(h.explanation),
      hints: (h.hints ?? []).map(clean).filter(Boolean),
    };
  });

  const fixes = TITLE_FIXES[lang] ?? {};
  const categories = cats.map((c) => ({
    id: Number(c.id),
    title: fixes[Number(c.id)] ?? clean(c.title),
    parent: c.parent_id ? Number(c.parent_id) : null,
    count: Number(c.hadeeths_count) || 0,
  }));

  writeFileSync(join(outDir, lang, 'index.json'), JSON.stringify({ categories, items }));
  chunks.forEach((chunk, i) => writeFileSync(join(outDir, lang, `c${String(i).padStart(2, '0')}.json`), JSON.stringify(chunk)));

  loaderLines.push(
    `  ${lang}: {\n    index: () => require('./${lang}/index.json'),\n    chunks: [\n${chunks
      .map((_, i) => `      () => require('./${lang}/c${String(i).padStart(2, '0')}.json'),`)
      .join('\n')}\n    ],\n  },`
  );
  console.log(`${lang}: ${hadiths.length} Hadithe, ${categories.length} Kategorien, ${chunks.length} Pakete`);
}

writeFileSync(
  join(outDir, 'index.ts'),
  `// AUTOMATISCH ERZEUGT von scripts/build-hadith-data.mjs – nicht von Hand bearbeiten.
import type { HadithChunk, HadithIndex } from '@/lib/hadith/types';

export const hadithLoaders: Record<'de' | 'tr', { index: () => HadithIndex; chunks: (() => HadithChunk)[] }> = {
${loaderLines.join('\n')}
};
`
);
