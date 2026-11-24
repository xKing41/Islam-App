import { hadithLoaders } from '@/data/hadith';
import { normalizeLatin } from '@/lib/quran/text';

import type { HadithBody, HadithCategory, HadithIndex, HadithListItem } from './types';

type Lang = 'de' | 'tr';
const indexCache = new Map<Lang, HadithIndex>();
const chunkCache = new Map<string, Record<string, HadithBody>>();

export function getHadithIndex(lang: Lang): HadithIndex {
  let idx = indexCache.get(lang);
  if (!idx) {
    idx = hadithLoaders[lang].index();
    indexCache.set(lang, idx);
  }
  return idx;
}

export function getHadith(lang: Lang, id: number): { item: HadithListItem; body: HadithBody } | null {
  const item = getHadithIndex(lang).items.find((h) => h.id === id);
  if (!item) return null;
  const key = `${lang}:${item.c}`;
  let chunk = chunkCache.get(key);
  if (!chunk) {
    chunk = hadithLoaders[lang].chunks[item.c]();
    chunkCache.set(key, chunk);
  }
  const body = chunk[String(id)];
  return body ? { item, body } : null;
}

export function rootCategories(lang: Lang): HadithCategory[] {
  return getHadithIndex(lang).categories.filter((c) => c.parent === null);
}

export function childCategories(lang: Lang, parent: number): HadithCategory[] {
  return getHadithIndex(lang).categories.filter((c) => c.parent === parent);
}

export function getCategory(lang: Lang, id: number): HadithCategory | undefined {
  return getHadithIndex(lang).categories.find((c) => c.id === id);
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

export function searchHadiths(lang: Lang, query: string): HadithListItem[] {
  const q = normalizeLatin(query.trim());
  if (q.length < 2) return [];
  return getHadithIndex(lang).items.filter((h) => normalizeLatin(h.title).includes(q)).slice(0, 100);
}
