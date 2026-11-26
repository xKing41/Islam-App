/** Anzeigenamen für Hauptthemen und Sammlungen (Deutsch/Türkisch). */
import type { IconName } from '@/components/ui';

import type { CollectionFilter } from './data';
import type { HadithGrade } from './types';

type L = { de: string; tr: string };

/** Kurze Namen und Beschreibung der 7 Hauptthemen von HadeethEnc. */
export const ROOT_TOPICS: Record<number, { name: L; sub: L; icon: IconName }> = {
  1: {
    name: { de: 'Koran', tr: "Kur'an-ı Kerim" },
    sub: { de: 'Offenbarung, Auslegung, Vorzüge der Suren', tr: 'İnişi, tefsiri, surelerin faziletleri' },
    icon: 'book-open-page-variant',
  },
  2: {
    name: { de: 'Sunna', tr: 'Sünnet' },
    sub: { de: 'Bedeutung und Niederschrift der Sunna', tr: 'Sünnetin önemi ve yazıya geçirilmesi' },
    icon: 'script-text-outline',
  },
  3: {
    name: { de: 'Glaube (Aqida)', tr: 'İman (Akide)' },
    sub: { de: 'Allah, Engel, Propheten, Jenseits, Vorherbestimmung', tr: 'Allah, melekler, peygamberler, ahiret, kader' },
    icon: 'star-crescent',
  },
  4: {
    name: { de: 'Gottesdienst & Recht (Fiqh)', tr: 'İbadet ve Hukuk (Fıkıh)' },
    sub: { de: 'Reinheit, Gebet, Fasten, Zakah, Hadsch, Familie', tr: 'Taharet, namaz, oruç, zekât, hac, aile' },
    icon: 'mosque',
  },
  5: {
    name: { de: 'Charakter & Benehmen', tr: 'Ahlak ve Adap' },
    sub: { de: 'Gute Eigenschaften, Zikr, Bittgebete, das Herz', tr: 'Güzel ahlak, zikir, dualar, kalp' },
    icon: 'heart-outline',
  },
  6: {
    name: { de: 'Daʿwa & Gesellschaft', tr: 'Davet ve Toplum' },
    sub: { de: 'Ruf zum Islam, das Gute gebieten, Herrschaft', tr: "İslam'a davet, iyiliği emretmek, yönetim" },
    icon: 'account-group-outline',
  },
  7: {
    name: { de: 'Sira & Geschichte', tr: 'Siyer ve Tarih' },
    sub: { de: 'Leben und Eigenschaften des Propheten ﷺ', tr: "Peygamber'in ﷺ hayatı ve şemaili" },
    icon: 'history',
  },
};

/** Sammlungen in der üblichen Rangfolge; „mt“ = bei Buchari und Muslim (Muttafaqun ʿalayh). */
export const COLLECTIONS: { key: CollectionFilter; name: L; short: L; author: L }[] = [
  {
    key: 'mt',
    name: { de: 'Buchari & Muslim', tr: 'Buhârî ve Müslim' },
    short: { de: 'Muttafaqun ʿalayh', tr: 'Müttefekun aleyh' },
    author: { de: 'Von beiden überliefert – die höchste Stufe der Echtheit', tr: 'İkisinin de rivayet ettiği – en yüksek sıhhat derecesi' },
  },
  {
    key: 'bu',
    name: { de: 'Sahih al-Buchari', tr: 'Sahîh-i Buhârî' },
    short: { de: 'Buchari', tr: 'Buhârî' },
    author: { de: 'Imam al-Buchari (gest. 256 n. H.)', tr: 'İmam Buhârî (v. 256/870)' },
  },
  {
    key: 'mu',
    name: { de: 'Sahih Muslim', tr: 'Sahîh-i Müslim' },
    short: { de: 'Muslim', tr: 'Müslim' },
    author: { de: 'Imam Muslim (gest. 261 n. H.)', tr: 'İmam Müslim (v. 261/875)' },
  },
  {
    key: 'ad',
    name: { de: 'Sunan Abi Dawud', tr: 'Sünen-i Ebû Dâvûd' },
    short: { de: 'Abu Dawud', tr: 'Ebû Dâvûd' },
    author: { de: 'Abu Dawud as-Sidschistani (gest. 275 n. H.)', tr: 'Ebû Dâvûd es-Sicistânî (v. 275/889)' },
  },
  {
    key: 'ti',
    name: { de: 'Dschamiʿ at-Tirmidhi', tr: "Câmiu't-Tirmizî" },
    short: { de: 'Tirmidhi', tr: 'Tirmizî' },
    author: { de: 'Imam at-Tirmidhi (gest. 279 n. H.)', tr: 'İmam Tirmizî (v. 279/892)' },
  },
  {
    key: 'na',
    name: { de: 'Sunan an-Nasaʾi', tr: 'Sünen-i Nesâî' },
    short: { de: 'Nasaʾi', tr: 'Nesâî' },
    author: { de: 'Imam an-Nasaʾi (gest. 303 n. H.)', tr: 'İmam Nesâî (v. 303/915)' },
  },
  {
    key: 'im',
    name: { de: 'Sunan Ibn Madscha', tr: 'Sünen-i İbn Mâce' },
    short: { de: 'Ibn Madscha', tr: 'İbn Mâce' },
    author: { de: 'Ibn Madscha al-Qazwini (gest. 273 n. H.)', tr: 'İbn Mâce el-Kazvînî (v. 273/887)' },
  },
  {
    key: 'ah',
    name: { de: 'Musnad Ahmad', tr: 'Müsned-i Ahmed' },
    short: { de: 'Ahmad', tr: 'Ahmed' },
    author: { de: 'Imam Ahmad ibn Hanbal (gest. 241 n. H.)', tr: 'Ahmed b. Hanbel (v. 241/855)' },
  },
  {
    key: 'ma',
    name: { de: 'Muwattaʾ Malik', tr: 'Muvatta' },
    short: { de: 'Malik', tr: 'Mâlik' },
    author: { de: 'Imam Malik ibn Anas (gest. 179 n. H.)', tr: 'İmam Mâlik b. Enes (v. 179/795)' },
  },
  {
    key: 'da',
    name: { de: 'Sunan ad-Darimi', tr: 'Sünen-i Dârimî' },
    short: { de: 'Darimi', tr: 'Dârimî' },
    author: { de: 'Imam ad-Darimi (gest. 255 n. H.)', tr: 'İmam Dârimî (v. 255/869)' },
  },
  {
    key: 'ot',
    name: { de: 'Weitere Sammlungen', tr: 'Diğer kaynaklar' },
    short: { de: 'weitere', tr: 'diğer' },
    author: { de: 'Ibn Hibban, Ibn Khuzaima, al-Hakim, al-Bayhaqi, ad-Daraqutni u. a.', tr: 'İbn Hibbân, İbn Huzeyme, Hâkim, Beyhakî, Dârekutnî vb.' },
  },
];

export function collectionMeta(key: CollectionFilter) {
  return COLLECTIONS.find((c) => c.key === key) ?? COLLECTIONS[COLLECTIONS.length - 1];
}

/** Kurze Quellenangabe für Listen, z. B. „Buchari · Muslim“. */
export function sourceLine(item: { s: string[]; mt?: 1 }, lang: 'de' | 'tr'): string {
  if (item.mt) return collectionMeta('mt').short[lang];
  return item.s
    .slice(0, 3)
    .map((k) => collectionMeta(k as CollectionFilter).short[lang])
    .join(' · ');
}

export function gradeLabel(g: HadithGrade, lang: 'de' | 'tr'): string | null {
  if (g === 's') return lang === 'de' ? 'Sahih' : 'Sahih';
  if (g === 'h') return lang === 'de' ? 'Hasan' : 'Hasen';
  return null;
}
