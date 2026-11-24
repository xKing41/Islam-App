/**
 * Dua & Zikr.
 *
 * 1) Bittgebete aus dem Koran: Auswahl bekannter Verse (vor allem „Rabbanā“-Gebete). Text und
 *    Übersetzung kommen unverändert aus den Koran-Quellen der App (Tanzil, QuranEnc) – hier steht
 *    nur, WELCHE Verse gemeint sind. Jede Angabe ist im Koran-Leser nachprüfbar.
 * 2) Bittgebete und Gedenken aus der Sunnah: Themen der HadeethEnc-Enzyklopädie
 *    (arabischer Originaltext, Übersetzung, Quelle und Einstufung).
 */

type L = { de: string; tr: string };

export type QuranDua = { sura: number; from: number; to: number; note?: L };
export type DuaGroup = { id: string; title: L; items: QuranDua[] };

const who = (de: string, tr: string): L => ({ de, tr });

export const QURAN_DUA_GROUPS: DuaGroup[] = [
  {
    id: 'forgiveness',
    title: { de: 'Vergebung & Barmherzigkeit', tr: 'Bağışlanma ve Rahmet' },
    items: [
      { sura: 7, from: 23, to: 23, note: who('Gebet von Adam und Hawwa', 'Hz. Âdem ve Havva’nın duası') },
      { sura: 3, from: 16, to: 16 },
      { sura: 3, from: 147, to: 147 },
      { sura: 3, from: 193, to: 194 },
      { sura: 21, from: 87, to: 87, note: who('Gebet des Propheten Yunus', 'Hz. Yûnus’un duası') },
      { sura: 28, from: 16, to: 16, note: who('Gebet des Propheten Musa', 'Hz. Mûsâ’nın duası') },
      { sura: 23, from: 109, to: 109 },
      { sura: 23, from: 118, to: 118 },
      { sura: 59, from: 10, to: 10 },
      { sura: 66, from: 8, to: 8 },
      { sura: 71, from: 28, to: 28, note: who('Gebet des Propheten Nuh', 'Hz. Nûh’un duası') },
    ],
  },
  {
    id: 'guidance',
    title: { de: 'Rechtleitung & Standhaftigkeit', tr: 'Hidayet ve Sebat' },
    items: [
      { sura: 1, from: 6, to: 7 },
      { sura: 3, from: 8, to: 8 },
      { sura: 2, from: 250, to: 250 },
      { sura: 7, from: 126, to: 126 },
      { sura: 18, from: 10, to: 10, note: who('Gebet der Gefährten der Höhle', 'Ashâb-ı Kehf’in duası') },
      { sura: 20, from: 25, to: 28, note: who('Gebet des Propheten Musa', 'Hz. Mûsâ’nın duası') },
      { sura: 20, from: 114, to: 114 },
      { sura: 17, from: 80, to: 80 },
    ],
  },
  {
    id: 'worlds',
    title: { de: 'Diesseits & Jenseits', tr: 'Dünya ve Ahiret' },
    items: [
      { sura: 2, from: 201, to: 201 },
      { sura: 3, from: 191, to: 192 },
      { sura: 3, from: 9, to: 9 },
      { sura: 3, from: 53, to: 53 },
      { sura: 25, from: 65, to: 66 },
      { sura: 7, from: 47, to: 47 },
    ],
  },
  {
    id: 'family',
    title: { de: 'Familie & Eltern', tr: 'Aile ve Anne-Baba' },
    items: [
      { sura: 14, from: 40, to: 41, note: who('Gebet des Propheten Ibrahim', 'Hz. İbrâhîm’in duası') },
      { sura: 17, from: 24, to: 24 },
      { sura: 25, from: 74, to: 74 },
      { sura: 3, from: 38, to: 38, note: who('Gebet des Propheten Zakariyya', 'Hz. Zekeriyyâ’nın duası') },
      { sura: 21, from: 89, to: 89, note: who('Gebet des Propheten Zakariyya', 'Hz. Zekeriyyâ’nın duası') },
      { sura: 46, from: 15, to: 15 },
      { sura: 27, from: 19, to: 19, note: who('Gebet des Propheten Sulaiman', 'Hz. Süleymân’ın duası') },
    ],
  },
  {
    id: 'trust',
    title: { de: 'Annahme, Schutz & Vertrauen', tr: 'Kabul, Korunma ve Tevekkül' },
    items: [
      { sura: 2, from: 127, to: 128, note: who('Gebet von Ibrahim und Isma‘il', 'Hz. İbrâhîm ve İsmâil’in duası') },
      { sura: 10, from: 85, to: 86 },
      { sura: 23, from: 97, to: 98 },
      { sura: 60, from: 4, to: 5 },
      { sura: 26, from: 83, to: 85, note: who('Gebet des Propheten Ibrahim', 'Hz. İbrâhîm’in duası') },
      { sura: 28, from: 24, to: 24, note: who('Gebet des Propheten Musa', 'Hz. Mûsâ’nın duası') },
      { sura: 21, from: 83, to: 83, note: who('Gebet des Propheten Ayyub', 'Hz. Eyyûb’un duası') },
      { sura: 40, from: 7, to: 9, note: who('Bittgebet der Engel für die Gläubigen', 'Meleklerin mü’minler için duası') },
    ],
  },
  {
    id: 'protection',
    title: { de: 'Schutzverse (morgens, abends, vor dem Schlafen)', tr: 'Koruyucu Ayetler (sabah, akşam, yatarken)' },
    items: [
      { sura: 2, from: 255, to: 255, note: who('Ayat al-Kursi', 'Âyetü’l-Kürsî') },
      { sura: 2, from: 285, to: 286, note: who('Die letzten zwei Verse von Al-Baqara', 'Bakara’nın son iki ayeti') },
      { sura: 112, from: 1, to: 4 },
      { sura: 113, from: 1, to: 5 },
      { sura: 114, from: 1, to: 6 },
    ],
  },
];

/**
 * Themen der HadeethEnc-Enzyklopädie zu Dua und Zikr (die IDs sind in allen Sprachen gleich).
 * Angezeigt werden nur Themen, die in der eingestellten Sprache Hadithe enthalten.
 */
export const SUNNAH_DUA_CATEGORY_IDS = [
  268, // Dua und Zikr (Oberthema)
  301, // Morgen- und Abendgedenken
  302, // Allgemeine Gedenken
  465, // Gedenken beim Gebet
  313, // Überlieferte Bittgebete aus der Sunnah
  307, // In schwierigen Zeiten
  308, // Bei Unglück und Schicksalsschlägen
  303, // Beim Betreten und Verlassen des Hauses
  306, // Beim Betreten und Verlassen der Moschee
  305, // Beim Betreten und Verlassen der Toilette
  278, // Vorzüge des Gedenkens
  279, // Vorzüge des Bittgebets
  311, // Benehmen beim Bittgebet
  312, // Gründe für die Annahme der Bittgebete
];
