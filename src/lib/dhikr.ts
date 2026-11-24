/** Dhikr-Formeln für den Tesbih-Zähler (arabisch, Umschrift; Bedeutung kommt aus i18n). */
export type Dhikr = {
  id: 'subhanallah' | 'alhamdulillah' | 'allahuakbar' | 'tahlil' | 'istighfar' | 'salawat' | 'subhanallahiwabihamdihi';
  arabic: string;
  translit: { de: string; tr: string };
  defaultTarget: number;
};

export const DHIKR: Dhikr[] = [
  { id: 'subhanallah', arabic: 'سُبْحَانَ ٱللَّٰهِ', translit: { de: 'Subhanallah', tr: 'Sübhânallah' }, defaultTarget: 33 },
  { id: 'alhamdulillah', arabic: 'ٱلْحَمْدُ لِلَّٰهِ', translit: { de: 'Alhamdulillah', tr: 'Elhamdülillah' }, defaultTarget: 33 },
  { id: 'allahuakbar', arabic: 'ٱللَّٰهُ أَكْبَرُ', translit: { de: 'Allahu akbar', tr: 'Allâhu ekber' }, defaultTarget: 34 },
  { id: 'tahlil', arabic: 'لَا إِلَٰهَ إِلَّا ٱللَّٰهُ', translit: { de: 'La ilaha illallah', tr: 'Lâ ilâhe illallah' }, defaultTarget: 100 },
  { id: 'istighfar', arabic: 'أَسْتَغْفِرُ ٱللَّٰهَ', translit: { de: 'Astaghfirullah', tr: 'Estağfirullah' }, defaultTarget: 100 },
  { id: 'salawat', arabic: 'ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ', translit: { de: 'Allahumma salli ala Muhammad', tr: 'Allâhümme salli alâ Muhammed' }, defaultTarget: 100 },
  { id: 'subhanallahiwabihamdihi', arabic: 'سُبْحَانَ ٱللَّٰهِ وَبِحَمْدِهِ', translit: { de: 'Subhanallahi wa bihamdihi', tr: 'Sübhânallâhi ve bihamdihî' }, defaultTarget: 100 },
];

export function getDhikr(id: string): Dhikr {
  return DHIKR.find((d) => d.id === id) ?? DHIKR[0];
}
