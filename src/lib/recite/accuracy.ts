/**
 * Gemessene Genauigkeit von „Rezitation prüfen“ (scripts/recite-eval, Workflows „Auswertung Rezitation
 * prüfen“; Rohdaten und Berichte am Release „rezitation-auswertung“). Wird in der App angezeigt.
 */
export const ACCURACY = {
  /** Mutashabihat-Test: Aufnahme eines Verses gegen den Text eines sehr ähnlichen Verses */
  confusionTests: 3936,
  confusionsFound: 99.92,
  /** Ein-Buchstaben-Verwechslungen (z. B. نرزقهم/نرزقكم) */
  letterFound: 99.59,
  /** Korrekt rezitierte Einzelverse (EveryAyah, 3 Rezitatoren) */
  verses: 1365,
  versesWithoutRed: 99.71,
  redPerWordKnown: 0.05,
  /** Ganze Suren am Stück von 8 Rezitatoren, die das Modell nicht kennt (mp3quran.net) */
  surahs: 88,
  surahsWithoutRed: 63,
  redPerWordUnknown: 1.29,
  yellowPerWordUnknown: 3.62,
};
