/**
 * Suren-Metadaten. Arabische Namen, Versanzahl, Offenbarungsort, Dschuz und Sadschda-Stellen
 * stammen aus den Tanzil-Metadaten (data/sources/tanzil/quran-data.xml).
 * Die deutschen/türkischen Umschriften und Bedeutungen sind gängige Bezeichnungen
 * (deutsch angelehnt an die Surentitel bei Bubenheim/Elyas, türkisch wie bei Diyanet üblich).
 */
import meta from '../../data/quran/meta.json';
import type { SuraMeta } from './types';

const NAMES_DE = [
  'Al-Fatiha', 'Al-Baqara', 'Al Imran', 'An-Nisa', 'Al-Maida', 'Al-Anam', 'Al-Araf', 'Al-Anfal',
  'At-Tauba', 'Yunus', 'Hud', 'Yusuf', 'Ar-Rad', 'Ibrahim', 'Al-Hidschr', 'An-Nahl', 'Al-Isra',
  'Al-Kahf', 'Maryam', 'Ta-Ha', 'Al-Anbiya', 'Al-Haddsch', 'Al-Muminun', 'An-Nur', 'Al-Furqan',
  'Asch-Schuara', 'An-Naml', 'Al-Qasas', 'Al-Ankabut', 'Ar-Rum', 'Luqman', 'As-Sadschda',
  'Al-Ahzab', 'Saba', 'Fatir', 'Ya-Sin', 'As-Saffat', 'Sad', 'Az-Zumar', 'Ghafir', 'Fussilat',
  'Asch-Schura', 'Az-Zuchruf', 'Ad-Duchan', 'Al-Dschathiya', 'Al-Ahqaf', 'Muhammad', 'Al-Fath',
  'Al-Hudschurat', 'Qaf', 'Adh-Dhariyat', 'At-Tur', 'An-Nadschm', 'Al-Qamar', 'Ar-Rahman',
  'Al-Waqia', 'Al-Hadid', 'Al-Mudschadala', 'Al-Haschr', 'Al-Mumtahana', 'As-Saff',
  'Al-Dschumua', 'Al-Munafiqun', 'At-Taghabun', 'At-Talaq', 'At-Tahrim', 'Al-Mulk', 'Al-Qalam',
  'Al-Haqqa', 'Al-Maaridsch', 'Nuh', 'Al-Dschinn', 'Al-Muzzammil', 'Al-Muddaththir',
  'Al-Qiyama', 'Al-Insan', 'Al-Mursalat', 'An-Naba', 'An-Naziat', 'Abasa', 'At-Takwir',
  'Al-Infitar', 'Al-Mutaffifin', 'Al-Inschiqaq', 'Al-Burudsch', 'At-Tariq', 'Al-Ala',
  'Al-Ghaschiya', 'Al-Fadschr', 'Al-Balad', 'Asch-Schams', 'Al-Lail', 'Ad-Duha', 'Asch-Scharh',
  'At-Tin', 'Al-Alaq', 'Al-Qadr', 'Al-Bayyina', 'Az-Zalzala', 'Al-Adiyat', 'Al-Qaria',
  'At-Takathur', 'Al-Asr', 'Al-Humaza', 'Al-Fil', 'Quraisch', 'Al-Maun', 'Al-Kauthar',
  'Al-Kafirun', 'An-Nasr', 'Al-Masad', 'Al-Ichlas', 'Al-Falaq', 'An-Nas',
];

const MEANINGS_DE = [
  'Die Eröffnende', 'Die Kuh', 'Die Sippe Imrans', 'Die Frauen', 'Der Tisch', 'Das Vieh',
  'Die Höhen', 'Die Beute', 'Die Reue', 'Jonas', 'Hud', 'Josef', 'Der Donner', 'Abraham',
  'Die Felsengegend', 'Die Bienen', 'Die Nachtreise', 'Die Höhle', 'Maria', 'Ta-Ha',
  'Die Propheten', 'Die Pilgerfahrt', 'Die Gläubigen', 'Das Licht', 'Die Unterscheidung',
  'Die Dichter', 'Die Ameisen', 'Die Geschichten', 'Die Spinne', 'Die Römer', 'Luqman',
  'Die Niederwerfung', 'Die Gruppierungen', 'Saba', 'Der Erschaffer', 'Ya-Sin',
  'Die sich Reihenden', 'Sad', 'Die Scharen', 'Der Vergebende', 'Ausführlich dargelegt',
  'Die Beratung', 'Der Prunk', 'Der Rauch', 'Die Kniende', 'Die Sanddünen', 'Muhammad',
  'Der Sieg', 'Die Gemächer', 'Qaf', 'Die Aufwirbelnden', 'Der Berg', 'Der Stern', 'Der Mond',
  'Der Allerbarmer', 'Das eintreffende Ereignis', 'Das Eisen', 'Der Disput', 'Die Versammlung',
  'Die Geprüfte', 'Die Reihe', 'Der Freitag', 'Die Heuchler', 'Die Übervorteilung',
  'Die Scheidung', 'Das Verbot', 'Die Herrschaft', 'Das Schreibrohr', 'Die fällig Werdende',
  'Die Aufstiegswege', 'Noah', 'Die Dschinn', 'Der Eingehüllte', 'Der Zugedeckte',
  'Die Auferstehung', 'Der Mensch', 'Die Gesandten', 'Die Kunde', 'Die Entreißenden',
  'Er runzelte die Stirn', 'Das Umschlingen', 'Das Zerbrechen', 'Die das Maß Verkürzenden',
  'Das Zerreißen', 'Die Türme', 'Der Pochende', 'Der Höchste', 'Die Überdeckende',
  'Die Morgendämmerung', 'Die Ortschaft', 'Die Sonne', 'Die Nacht', 'Die Morgenhelle',
  'Das Auftun', 'Die Feige', 'Das Anhängsel', 'Die Bestimmung', 'Der klare Beweis', 'Das Beben',
  'Die Rennenden', 'Das Verhängnis', 'Die Vermehrung', 'Das Zeitalter', 'Der Stichler',
  'Der Elefant', 'Quraisch', 'Die Hilfeleistung', 'Die Fülle', 'Die Ungläubigen', 'Die Hilfe',
  'Die Palmfasern', 'Die Aufrichtigkeit', 'Das Frühlicht', 'Die Menschen',
];

const NAMES_TR = [
  'Fâtiha', 'Bakara', 'Âl-i İmrân', 'Nisâ', 'Mâide', "En'âm", "A'râf", 'Enfâl', 'Tevbe', 'Yûnus',
  'Hûd', 'Yûsuf', "Ra'd", 'İbrâhîm', 'Hicr', 'Nahl', 'İsrâ', 'Kehf', 'Meryem', 'Tâhâ', 'Enbiyâ',
  'Hac', "Mü'minûn", 'Nûr', 'Furkân', 'Şuarâ', 'Neml', 'Kasas', 'Ankebût', 'Rûm', 'Lokmân',
  'Secde', 'Ahzâb', "Sebe'", 'Fâtır', 'Yâsîn', 'Sâffât', 'Sâd', 'Zümer', "Mü'min", 'Fussilet',
  'Şûrâ', 'Zuhruf', 'Duhân', 'Câsiye', 'Ahkâf', 'Muhammed', 'Fetih', 'Hucurât', 'Kâf',
  'Zâriyât', 'Tûr', 'Necm', 'Kamer', 'Rahmân', 'Vâkıa', 'Hadîd', 'Mücâdele', 'Haşr',
  'Mümtehine', 'Saf', 'Cuma', 'Münâfikûn', 'Teğâbün', 'Talâk', 'Tahrîm', 'Mülk', 'Kalem',
  'Hâkka', 'Meâric', 'Nûh', 'Cin', 'Müzzemmil', 'Müddessir', 'Kıyâme', 'İnsân', 'Mürselât',
  "Nebe'", 'Nâziât', 'Abese', 'Tekvîr', 'İnfitâr', 'Mutaffifîn', 'İnşikâk', 'Bürûc', 'Târık',
  "A'lâ", 'Gâşiye', 'Fecr', 'Beled', 'Şems', 'Leyl', 'Duhâ', 'İnşirâh', 'Tîn', 'Alak', 'Kadir',
  'Beyyine', 'Zilzâl', 'Âdiyât', 'Kâria', 'Tekâsür', 'Asr', 'Hümeze', 'Fîl', 'Kureyş', 'Mâûn',
  'Kevser', 'Kâfirûn', 'Nasr', 'Tebbet', 'İhlâs', 'Felak', 'Nâs',
];

const MEANINGS_TR = [
  'Açılış', 'Sığır', 'İmrân Ailesi', 'Kadınlar', 'Sofra', 'Hayvanlar', 'Yüksek Yerler',
  'Ganimetler', 'Tövbe', 'Yûnus', 'Hûd', 'Yûsuf', 'Gök Gürültüsü', 'İbrâhîm', 'Hicr Bölgesi',
  'Bal Arısı', 'Gece Yürüyüşü', 'Mağara', 'Meryem', 'Tâhâ', 'Peygamberler', 'Hac',
  "Mü'minler", 'Nur', 'Doğruyu Yanlıştan Ayıran', 'Şairler', 'Karınca', 'Kıssalar', 'Örümcek',
  'Rumlar', 'Lokmân', 'Secde', 'Topluluklar', "Sebe'", 'Yaratan', 'Yâsîn', 'Saf Tutanlar',
  'Sâd', 'Zümreler', "Mü'min", 'Açıklanmış', 'Danışma', 'Altın Süs', 'Duman', 'Diz Çöken',
  'Kum Tepeleri', 'Muhammed', 'Fetih', 'Odalar', 'Kâf', 'Savuranlar', 'Tûr Dağı', 'Yıldız',
  'Ay', 'Rahmân', 'Kaçınılmaz Olay', 'Demir', 'Tartışma', 'Sürgün', 'İmtihan Edilen Kadın',
  'Saf', 'Cuma', 'Münafıklar', 'Aldanış', 'Boşanma', 'Yasaklama', 'Hükümranlık', 'Kalem',
  'Gerçekleşen', 'Yükseliş Yolları', 'Nûh', 'Cinler', 'Örtünen', 'Bürünen', 'Kıyamet', 'İnsan',
  'Gönderilenler', 'Haber', 'Söküp Çıkaranlar', 'Yüzünü Ekşitti', 'Dürülme', 'Yarılma',
  'Ölçüde Hile Yapanlar', 'Yarılma', 'Burçlar', 'Gece Gelen', 'En Yüce', 'Kuşatan', 'Tan Vakti',
  'Şehir', 'Güneş', 'Gece', 'Kuşluk Vakti', 'Göğsü Açma', 'İncir', 'Asılıp Tutunan', 'Kadir',
  'Apaçık Delil', 'Deprem', 'Koşan Atlar', 'Kapıyı Çalan', 'Çoğalma Yarışı', 'Zaman',
  'Arkadan Çekiştiren', 'Fil', 'Kureyş', 'Yardım', 'Bolluk', 'Kâfirler', 'Yardım', 'Kurusun',
  'İhlas', 'Şafak', 'İnsanlar',
];

type RawSura = { index: number; ayas: number; name: string; type: string };

export const SURAS: SuraMeta[] = (meta.suras as RawSura[]).map((s, i) => ({
  index: s.index,
  ayas: s.ayas,
  name: s.name,
  type: s.type === 'Medinan' ? 'Medinan' : 'Meccan',
  nameDe: NAMES_DE[i],
  meaningDe: MEANINGS_DE[i],
  nameTr: NAMES_TR[i],
  meaningTr: MEANINGS_TR[i],
}));

export const JUZ: { index: number; sura: number; aya: number }[] = meta.juz;
export const SAJDAS: { sura: number; aya: number; type?: string }[] = meta.sajdas;

export const NAME_LISTS = { NAMES_DE, MEANINGS_DE, NAMES_TR, MEANINGS_TR };

export function getSuraMeta(index: number): SuraMeta {
  return SURAS[index - 1];
}

export function suraTitle(s: SuraMeta, lang: 'de' | 'tr'): { name: string; meaning: string } {
  return lang === 'tr' ? { name: s.nameTr, meaning: s.meaningTr } : { name: s.nameDe, meaning: s.meaningDe };
}

export function isSajda(sura: number, aya: number): boolean {
  return SAJDAS.some((s) => s.sura === sura && s.aya === aya);
}

/** In welchem Dschuz liegt ein Vers? */
export function juzOf(sura: number, aya: number): number {
  let result = 1;
  for (const j of JUZ) {
    if (j.sura < sura || (j.sura === sura && j.aya <= aya)) result = j.index;
  }
  return result;
}
