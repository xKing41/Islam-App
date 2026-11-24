import { suraLoaders } from '@/data/quran';

import type { SuraData, TranslationKey } from './types';

const cache = new Map<number, SuraData>();

/** Lädt die Texte einer Sure (synchron, aus dem App-Paket – funktioniert offline). */
export function getSura(index: number): SuraData {
  let data = cache.get(index);
  if (!data) {
    data = suraLoaders[index]();
    cache.set(index, data);
  }
  return data;
}

export const TRANSLATIONS: Record<
  TranslationKey,
  { lang: 'de' | 'tr'; name: string; source: 'QuranEnc' | 'Tanzil'; version: string }
> = {
  de_bubenheim: { lang: 'de', name: 'Bubenheim & Elyas', source: 'QuranEnc', version: 'v1.1.5' },
  tr_diyanet: { lang: 'tr', name: 'Diyanet İşleri', source: 'Tanzil', version: '2011-12-27' },
  tr_vakfi: { lang: 'tr', name: 'Diyanet Vakfı (Ali Özek u. a.)', source: 'QuranEnc', version: 'v1.0.0' },
};
