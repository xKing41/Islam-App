import { hadithLoaders } from '@/data/hadith';
import { normalizeArabic, normalizeLatin } from '@/lib/quran/text';

import type { CollectionKey, HadithBody, HadithCategory, HadithIndex, HadithListItem } from './types';

type Lang = 'de' | 'tr';
const indexCache = new Map<Lang, HadithIndex>();
const chunkCache = new Map<string, Record<string, HadithBody>>();
const byIdCache = new Map<Lang, Map<number, HadithListItem>>();
const catByIdCache = new Map<Lang, Map<number, HadithCategory>>();

export function getHadithIndex(lang: Lang): HadithIndex {
  let idx = indexCache.get(lang);
  if (!idx) {
    idx = hadithLoaders[lang].index();
    indexCache.set(lang, idx);
  }
  return idx;
}

function itemsById(lang: Lang): Map<number, HadithListItem> {
  let m = byIdCache.get(lang);
  if (!m) {
    m = new Map(getHadithIndex(lang).items.map((h) => [h.id, h]));
    byIdCache.set(lang, m);
  }
  return m;
}

export function getItem(lang: Lang, id: number): HadithListItem | undefined {
  return itemsById(lang).get(id);
}

function loadChunk(lang: Lang, c: number): Record<string, HadithBody> {
  const key = `${lang}:${c}`;
  let chunk = chunkCache.get(key);
  if (!chunk) {
    chunk = hadithLoaders[lang].chunks[c]();
    chunkCache.set(key, chunk);
  }
  return chunk;
}

export function getHadith(lang: Lang, id: number): { item: HadithListItem; body: HadithBody } | null {
  const item = getItem(lang, id);
  if (!item) return null;
  const body = loadChunk(lang, item.c)[String(id)];
  return body ? { item, body } : null;
}

// ---------- Themen ----------

function catsById(lang: Lang): Map<number, HadithCategory> {
  let m = catByIdCache.get(lang);
  if (!m) {
    m = new Map(getHadithIndex(lang).categories.map((c) => [c.id, c]));
    catByIdCache.set(lang, m);
  }
  return m;
}

export function getCategory(lang: Lang, id: number): HadithCategory | undefined {
  return catsById(lang).get(id);
}

export function rootCategories(lang: Lang): HadithCategory[] {
  return getHadithIndex(lang).categories.filter((c) => c.parent === null && c.count > 0);
}

/** Unterthemen (nur solche mit Hadithen). */
export function childCategories(lang: Lang, parent: number): HadithCategory[] {
  return getHadithIndex(lang).categories.filter((c) => c.parent === parent && c.count > 0);
}

/** Pfad von der obersten Ebene bis zu diesem Thema (für die „Brotkrumen“-Navigation). */
export function categoryPath(lang: Lang, id: number): HadithCategory[] {
  const path: HadithCategory[] = [];
  let c = getCategory(lang, id);
  while (c && path.length < 10) {
    path.unshift(c);
    c = c.parent !== null ? getCategory(lang, c.parent) : undefined;
  }
  return path;
}

/** Alle Kategorie-IDs unterhalb (inkl.) einer Kategorie. */
function descendants(lang: Lang, id: number): Set<number> {
  const cats = getHadithIndex(lang).categories;
  const result = new Set([id]);
  let added = true;
  while (added) {
    added = false;
    for (const c of cats) {
      if (c.parent !== null && result.has(c.parent) && !result.has(c.id)) {
        result.add(c.id);
        added = true;
      }
    }
  }
  return result;
}

export function hadithsInCategory(lang: Lang, id: number): HadithListItem[] {
  const ids = descendants(lang, id);
  return getHadithIndex(lang).items.filter((h) => h.cats.some((c) => ids.has(c)));
}

/** Hat ein Thema Unter-Unterthemen? Dann zeigt die Seite zuerst die Unterthemen, sonst gleich die Hadithe. */
export function hasGrandchildren(lang: Lang, id: number): boolean {
  return childCategories(lang, id).some((c) => childCategories(lang, c.id).length > 0);
}

export type HadithSection = { category: HadithCategory | null; items: HadithListItem[] };

/** Hadithe eines Themas, gegliedert nach Unterthemen (zuerst die direkt zugeordneten). */
export function topicSections(lang: Lang, id: number): HadithSection[] {
  const children = childCategories(lang, id);
  const sections: HadithSection[] = [];
  const direct = getHadithIndex(lang).items.filter((h) => h.cats.includes(id));
  if (direct.length) sections.push({ category: null, items: direct });
  for (const c of children) {
    const items = hadithsInCategory(lang, c.id);
    if (items.length) sections.push({ category: c, items });
  }
  return sections;
}

/** Das genaueste Thema eines Hadiths (tiefste Ebene). */
export function primaryCategory(lang: Lang, item: HadithListItem): HadithCategory | undefined {
  let best: HadithCategory | undefined;
  let bestDepth = -1;
  for (const id of item.cats) {
    const depth = categoryPath(lang, id).length;
    if (depth > bestDepth) {
      best = getCategory(lang, id);
      bestDepth = depth;
    }
  }
  return best;
}

// ---------- Sammlungen ----------

export type CollectionFilter = CollectionKey | 'mt';

export function hadithsInCollection(lang: Lang, key: CollectionFilter): HadithListItem[] {
  const items = getHadithIndex(lang).items;
  return key === 'mt' ? items.filter((h) => h.mt) : items.filter((h) => h.s.includes(key));
}

export function collectionCounts(lang: Lang): Record<CollectionFilter, number> {
  const counts = { mt: 0, bu: 0, mu: 0, ad: 0, ti: 0, na: 0, im: 0, ah: 0, ma: 0, da: 0, ot: 0 } as Record<CollectionFilter, number>;
  for (const h of getHadithIndex(lang).items) {
    if (h.mt) counts.mt++;
    for (const s of h.s) counts[s]++;
  }
  return counts;
}

/** Gliedert eine Liste nach den Hauptthemen. */
export function groupByRoot(lang: Lang, items: HadithListItem[]): HadithSection[] {
  const roots = rootCategories(lang);
  const rootOf = new Map<number, number>();
  const sections = new Map<number, HadithListItem[]>();
  for (const h of items) {
    let root = -1;
    for (const c of h.cats) {
      let r = rootOf.get(c);
      if (r === undefined) {
        r = categoryPath(lang, c)[0]?.id ?? -1;
        rootOf.set(c, r);
      }
      root = r;
      if (root !== -1) break;
    }
    if (!sections.has(root)) sections.set(root, []);
    sections.get(root)!.push(h);
  }
  const out: HadithSection[] = [];
  for (const r of roots) {
    const list = sections.get(r.id);
    if (list?.length) out.push({ category: r, items: list });
  }
  const rest = sections.get(-1);
  if (rest?.length) out.push({ category: null, items: rest });
  return out;
}

// ---------- Hadith des Tages ----------

/** Themen für den „Hadith des Tages“: Koran (1) sowie Charakter, Gedenken und Herz (5) – für sich verständlich. */
const DAILY_ROOTS = new Set([1, 5]);
const dailyPoolCache = new Map<Lang, HadithListItem[]>();

/**
 * Jeden Tag ein anderer Hadith (für alle gleich): authentisch, eher kurz, aus allgemein verständlichen
 * Themen, in fester, gemischter Reihenfolge.
 */
export function hadithOfTheDay(lang: Lang, date = new Date()): HadithListItem {
  let list = dailyPoolCache.get(lang);
  if (!list) {
    const items = getHadithIndex(lang).items;
    const pool = items.filter(
      (h) => h.g === 's' && h.n > 60 && h.n <= 420 && h.cats.some((c) => DAILY_ROOTS.has(categoryPath(lang, c)[0]?.id ?? -1)),
    );
    list = pool.length ? pool : items;
    dailyPoolCache.set(lang, list);
  }
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  // feste Durchmischung (multiplikativ, teilerfremd zur Länge), damit aufeinanderfolgende Tage verschiedene Themen zeigen
  let step = 7919;
  while (gcd(step, list.length) !== 1) step++;
  return list[(day * step) % list.length];
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// ---------- Suche ----------

type SearchEntry = { id: number; title: string; text: string; ar: string };
const searchCache = new Map<Lang, SearchEntry[]>();

/** Baut beim ersten Suchen einen Suchindex über Titel, Text und arabischen Text auf. */
function searchIndex(lang: Lang): SearchEntry[] {
  let idx = searchCache.get(lang);
  if (!idx) {
    idx = getHadithIndex(lang).items.map((item) => {
      const body = loadChunk(lang, item.c)[String(item.id)];
      return {
        id: item.id,
        title: normalizeLatin(item.title),
        text: normalizeLatin(body?.text ?? ''),
        ar: normalizeArabic(body?.ar ?? ''),
      };
    });
    searchCache.set(lang, idx);
  }
  return idx;
}

export type SearchHit = { item: HadithListItem; snippet: string | null };

/** Volltextsuche: alle Suchwörter müssen vorkommen. Treffer im Titel zuerst. */
export function searchHadiths(lang: Lang, query: string, limit = 150): SearchHit[] {
  const raw = query.trim();
  if (raw.length < 2) return [];
  const isArabic = /[ء-ي]/.test(raw);
  const terms = (isArabic ? normalizeArabic(raw) : normalizeLatin(raw)).split(/\s+/).filter((w) => w.length >= 2 || isArabic);
  if (!terms.length) return [];
  const titleHits: SearchHit[] = [];
  const textHits: SearchHit[] = [];
  for (const e of searchIndex(lang)) {
    const item = getItem(lang, e.id);
    if (!item) continue;
    if (isArabic) {
      if (terms.every((t) => e.ar.includes(t))) textHits.push({ item, snippet: null });
      continue;
    }
    if (terms.every((t) => e.title.includes(t))) titleHits.push({ item, snippet: null });
    else if (terms.every((t) => e.title.includes(t) || e.text.includes(t))) {
      textHits.push({ item, snippet: makeSnippet(lang, item, terms[0]) });
    }
  }
  return [...titleHits, ...textHits].slice(0, limit);
}

/** Kurzer Textausschnitt rund um den ersten Treffer (aus dem Originaltext). */
function makeSnippet(lang: Lang, item: HadithListItem, term: string): string | null {
  const text = loadChunk(lang, item.c)[String(item.id)]?.text ?? '';
  const norm = normalizeLatin(text);
  const at = norm.indexOf(term);
  if (at < 0) return null;
  // normalizeLatin entfernt nur Akzente/Apostrophe – die Position passt daher fast immer; zur Sicherheit großzügig ausschneiden
  const from = Math.max(0, at - 60);
  const to = Math.min(text.length, at + term.length + 90);
  return `${from > 0 ? '…' : ''}${text.slice(from, to).trim()}${to < text.length ? '…' : ''}`;
}

// ---------- Verwandte Hadithe ----------

export function relatedHadiths(lang: Lang, item: HadithListItem, limit = 5): HadithListItem[] {
  const cat = primaryCategory(lang, item);
  if (!cat) return [];
  return hadithsInCategory(lang, cat.id)
    .filter((h) => h.id !== item.id)
    .slice(0, limit);
}

/** Liste, aus der ein Hadith geöffnet wurde (für „vorheriger/nächster“). */
export function contextList(lang: Lang, from: string | undefined, item: HadithListItem, favorites: number[]): HadithListItem[] {
  if (from?.startsWith('cat:')) return hadithsInCategory(lang, Number(from.slice(4)));
  if (from?.startsWith('col:')) return hadithsInCollection(lang, from.slice(4) as CollectionFilter);
  if (from === 'fav') return favorites.map((id) => getItem(lang, id)).filter((h): h is HadithListItem => !!h);
  const cat = primaryCategory(lang, item);
  return cat ? hadithsInCategory(lang, cat.id) : [];
}
