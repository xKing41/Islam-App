/**
 * „Vers des Tages“: jeden Tag ein anderer, in sich verständlicher Vers (oder kurzer Abschnitt).
 * Die Auswahl ist fest (für alle gleich) und wird in tests/core.test.ts gegen den Korantext geprüft.
 */
export type DailyVerse = { sura: number; from: number; to: number };

/** Bekannte, für sich verständliche Verse: Trost, Vertrauen, Gedenken, Charakter, Bittgebete. */
export const DAILY_VERSES: DailyVerse[] = [
  { sura: 2, from: 152, to: 152 },
  { sura: 2, from: 153, to: 153 },
  { sura: 2, from: 186, to: 186 },
  { sura: 2, from: 201, to: 201 },
  { sura: 2, from: 45, to: 45 },
  { sura: 2, from: 255, to: 255 },
  { sura: 2, from: 286, to: 286 },
  { sura: 3, from: 8, to: 8 },
  { sura: 3, from: 31, to: 31 },
  { sura: 3, from: 139, to: 139 },
  { sura: 3, from: 173, to: 173 },
  { sura: 3, from: 190, to: 191 },
  { sura: 3, from: 200, to: 200 },
  { sura: 6, from: 162, to: 163 },
  { sura: 9, from: 51, to: 51 },
  { sura: 11, from: 6, to: 6 },
  { sura: 13, from: 28, to: 28 },
  { sura: 14, from: 7, to: 7 },
  { sura: 15, from: 9, to: 9 },
  { sura: 16, from: 97, to: 97 },
  { sura: 16, from: 128, to: 128 },
  { sura: 17, from: 23, to: 24 },
  { sura: 18, from: 46, to: 46 },
  { sura: 20, from: 25, to: 28 },
  { sura: 20, from: 114, to: 114 },
  { sura: 21, from: 87, to: 87 },
  { sura: 23, from: 1, to: 2 },
  { sura: 25, from: 63, to: 63 },
  { sura: 29, from: 45, to: 45 },
  { sura: 29, from: 69, to: 69 },
  { sura: 33, from: 41, to: 42 },
  { sura: 33, from: 56, to: 56 },
  { sura: 39, from: 10, to: 10 },
  { sura: 39, from: 53, to: 53 },
  { sura: 40, from: 60, to: 60 },
  { sura: 41, from: 34, to: 34 },
  { sura: 49, from: 10, to: 10 },
  { sura: 49, from: 13, to: 13 },
  { sura: 50, from: 16, to: 16 },
  { sura: 59, from: 22, to: 24 },
  { sura: 64, from: 11, to: 11 },
  { sura: 67, from: 1, to: 2 },
  { sura: 93, from: 3, to: 5 },
  { sura: 94, from: 5, to: 6 },
  { sura: 103, from: 1, to: 3 },
  { sura: 112, from: 1, to: 4 },
];

function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

export function verseOfTheDay(date = new Date()): DailyVerse {
  const list = DAILY_VERSES;
  // feste Durchmischung: aufeinanderfolgende Tage zeigen Verse aus verschiedenen Suren
  return list[(dayNumber(date) * 17) % list.length];
}
