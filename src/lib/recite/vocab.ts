/**
 * Wortschatz des Korans (alle Wortformen, vereinheitlicht) – erzeugt von scripts/build-quran-vocab.mjs.
 * Wird erst geladen, wenn „Rezitation prüfen“ ein Ergebnis auswertet.
 */
let vocab: Set<string> | null = null;

export function isQuranWord(norm: string): boolean {
  if (!vocab) vocab = new Set(require('@/data/quran/vocab.json') as string[]);
  return vocab.has(norm);
}
