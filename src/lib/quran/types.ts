export type TranslationKey = 'de_bubenheim' | 'tr_diyanet' | 'tr_vakfi';

/** Inhalt einer Datei src/data/quran/suras/NNN.json (Index 0 = Vers 1). */
export type SuraData = {
  /** Uthmani-Text (Tanzil) – unverändert, inkl. Basmala-Präfix in Vers 1. */
  ar: string[];
  /** Arabischer Text ohne Diakritika (Tanzil "simple-clean") – für Suche und Prüfmodus. */
  arClean: string[];
  /** Einfacher Text mit Diakritika (Tanzil "simple", ohne Pausenzeichen) – gleiche Wörter wie arClean. */
  arSimple: string[];
  de_bubenheim: string[];
  tr_diyanet: string[];
  tr_vakfi: string[];
  /** Türkische Umschrift (Tanzil „Çeviriyazı“, Muhammet Abay). */
  translit_tr: string[];
  /** Lateinische Umschrift (Tanzil „Transliteration“) mit <u>…</u> (lang/emphatisch) und <b>…</b> (stumm). */
  translit_en: string[];
  footnotes: Partial<Record<TranslationKey, Record<string, string>>>;
};

export type SuraMeta = {
  index: number;
  ayas: number;
  /** Arabischer Name (Tanzil-Metadaten). */
  name: string;
  type: 'Meccan' | 'Medinan';
  nameDe: string;
  meaningDe: string;
  nameTr: string;
  meaningTr: string;
};
