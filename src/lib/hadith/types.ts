export type HadithCategory = { id: number; title: string; parent: number | null; count: number };

/** s = sahih (authentisch), h = hasan (gut) – abgeleitet aus dem arabischen Urteil von HadeethEnc. */
export type HadithGrade = 's' | 'h' | '';

/** Sammlungen: Buchari, Muslim, Abu Dawud, Tirmidhi, Nasaʾi, Ibn Madscha, Ahmad, Malik, Darimi, weitere. */
export type CollectionKey = 'bu' | 'mu' | 'ad' | 'ti' | 'na' | 'im' | 'ah' | 'ma' | 'da' | 'ot';

export type HadithListItem = {
  id: number;
  title: string;
  cats: number[];
  /** Nummer des Datenpakets mit dem Text */
  c: number;
  g: HadithGrade;
  s: CollectionKey[];
  /** Muttafaqun ʿalayh (bei Buchari und Muslim) */
  mt?: 1;
  /** Länge des Hadith-Textes (Zeichen) */
  n: number;
};
export type HadithIndex = { categories: HadithCategory[]; items: HadithListItem[] };
export type HadithBody = {
  text: string;
  ar: string;
  attribution: string;
  grade: string;
  gradeAr: string;
  explanation: string;
  hints: string[];
};
export type HadithChunk = Record<string, HadithBody>;
