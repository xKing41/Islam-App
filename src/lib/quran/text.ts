/** Textwerkzeuge für den arabischen Korantext (rein lesend – der Text selbst bleibt unverändert). */

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicDigits(n: number): string {
  return String(n)
    .split('')
    .map((d) => ARABIC_DIGITS[Number(d)] ?? d)
    .join('');
}

/**
 * In der Tanzil-Datei beginnt Vers 1 jeder Sure (außer 1 und 9) mit der Basmala.
 * Für die Anzeige wird sie als Überschrift gezeigt – dazu trennen wir die ersten vier Wörter ab.
 */
export function splitBasmala(sura: number, aya: number, text: string): { basmala: string | null; rest: string } {
  if (aya !== 1 || sura === 1 || sura === 9) return { basmala: null, rest: text };
  const words = text.split(' ');
  if (words.length <= 4) return { basmala: null, rest: text };
  return { basmala: words.slice(0, 4).join(' '), rest: words.slice(4).join(' ') };
}

/** Vereinheitlicht arabische Schreibvarianten für Suche und Vergleich. */
export function normalizeArabic(s: string): string {
  return s
    .replace(/[ً-ٰٟۖ-ۭـ]/g, '') // Tashkil, Koranzeichen, Tatweel
    .replace(/[آأإٱ]/g, 'ا') // Alif-Varianten → ا
    .replace(/ى/g, 'ي') // Alif maqsura → ي
    .replace(/ة/g, 'ه') // Ta marbuta → ه
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Für die Suche in Übersetzungen: Kleinbuchstaben, ohne Akzente (z. B. â → a, İ → i). */
export function normalizeLatin(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[’'`]/g, '');
}
