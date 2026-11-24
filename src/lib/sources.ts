/** Herkunft aller Inhalte – wird auf der Seite „Quellen & Lizenzen“ angezeigt (siehe auch QUELLEN.md). */
type L = { de: string; tr: string };
export type SourceInfo = { name: string; url: string; usedFor: L; license: L; version: string };

export const SOURCES: SourceInfo[] = [
  {
    name: 'Tanzil Project – Quran Text (Uthmani)',
    url: 'https://tanzil.net',
    usedFor: {
      de: 'Arabischer Korantext (Medina-Mushaf, Rezitation Hafs ʿan ʿAsim), Metadaten der Suren, Text ohne Diakritika für die Suche',
      tr: "Arapça Kur'an metni (Medine Mushafı, Hafs an Âsım kıraati), sure bilgileri, arama için harekesiz metin",
    },
    license: {
      de: 'Creative Commons BY 3.0 – Weitergabe nur unverändert, mit Quellenangabe und Link zu tanzil.net',
      tr: "Creative Commons BY 3.0 – yalnızca değiştirilmeden, kaynak belirtilerek ve tanzil.net'e bağlantı verilerek",
    },
    version: 'Uthmani 1.1',
  },
  {
    name: 'QuranEnc.com – Bubenheim & Elyas (Deutsch)',
    url: 'https://quranenc.com/de/browse/german_bubenheim',
    usedFor: {
      de: 'Deutsche Bedeutungsübersetzung von ʿAbdullah as-Samit (Frank Bubenheim) und Dr. Nadeem Elyas',
      tr: 'Almanca meal: Abdullah es-Sâmit (Frank Bubenheim) ve Dr. Nadeem Elyas',
    },
    license: {
      de: 'Weitergabe erlaubt ohne Änderungen, mit Angabe von Quelle und Versionsnummer',
      tr: 'Değiştirmeden, kaynak ve sürüm numarası belirtilerek paylaşılabilir',
    },
    version: 'v1.1.5',
  },
  {
    name: 'Tanzil Project – Diyanet İşleri (Türkçe)',
    url: 'https://tanzil.net/trans/',
    usedFor: {
      de: 'Türkische Übersetzung des Präsidiums für Religionsangelegenheiten (Diyanet)',
      tr: 'Diyanet İşleri Başkanlığı Türkçe meali',
    },
    license: {
      de: 'Nur für nicht-kommerzielle Zwecke',
      tr: 'Yalnızca ticari olmayan kullanım için',
    },
    version: '27.12.2011',
  },
  {
    name: 'QuranEnc.com – Diyanet Vakfı / Ali Özek u. a. (Türkçe)',
    url: 'https://quranenc.com/tr/browse/turkish_shahin',
    usedFor: {
      de: 'Türkische Übersetzung von Ali Özek, Hayrettin Karaman u. a. (Türkiye Diyanet Vakfı)',
      tr: 'Ali Özek, Hayrettin Karaman ve diğerleri (Türkiye Diyanet Vakfı) meali',
    },
    license: {
      de: 'Weitergabe erlaubt ohne Änderungen, mit Angabe von Quelle und Versionsnummer',
      tr: 'Değiştirmeden, kaynak ve sürüm numarası belirtilerek paylaşılabilir',
    },
    version: 'v1.0.0',
  },
  {
    name: 'EveryAyah.com',
    url: 'https://everyayah.com',
    usedFor: {
      de: 'Rezitationen Vers für Vers (Alafasy, Husary, Minshawi, Abdul Basit u. a.) – werden beim Abspielen geladen',
      tr: 'Ayet ayet tilavetler (Alafasy, Husary, Minşâvî, Abdulbâsıt vb.) – dinlerken yüklenir',
    },
    license: { de: 'Frei abrufbar für Koran-Apps', tr: "Kur'an uygulamaları için serbestçe erişilebilir" },
    version: '—',
  },
  {
    name: 'HadeethEnc.com',
    url: 'https://hadeethenc.com',
    usedFor: {
      de: 'Hadithe mit arabischem Originaltext, Übersetzung, Einstufung, Quelle und Erläuterung',
      tr: 'Arapça asıllarıyla hadisler, tercüme, derece, kaynak ve açıklama',
    },
    license: {
      de: 'Inhalte der Enzyklopädie, unverändert übernommen mit Quellenangabe',
      tr: 'Ansiklopedi içerikleri, kaynak belirtilerek değiştirilmeden alınmıştır',
    },
    version: '11/2026',
  },
  {
    name: 'Tanzil Project – Umschrift',
    url: 'https://tanzil.net/trans/',
    usedFor: {
      de: 'Lateinische Umschrift der Verse (Tanzil „Transliteration“) und türkische Umschrift (Çeviriyazı, Muhammet Abay); dazu der einfache Text mit Vokalzeichen für „Rezitation prüfen“',
      tr: 'Ayetlerin Latin harfli okunuşu (Tanzil "Transliteration") ve Türkçe okunuşu (Çeviriyazı, Muhammet Abay); ayrıca kıraat kontrolü için harekeli basit metin',
    },
    license: { de: 'Nur für nicht-kommerzielle Zwecke bzw. CC BY 3.0 (Korantext)', tr: 'Yalnızca ticari olmayan kullanım / CC BY 3.0 (Kur’an metni)' },
    version: '2010 / Simple 1.1',
  },
  {
    name: 'Tarteel AI – whisper-tiny-ar-quran',
    url: 'https://huggingface.co/tarteel-ai/whisper-tiny-ar-quran',
    usedFor: {
      de: 'Spracherkennung für „Rezitation prüfen“ – ein auf Koran-Rezitationen trainiertes Whisper-Modell. Läuft auf dem Gerät; die Stimme verlässt das Handy nicht.',
      tr: 'Kıraat kontrolü için ses tanıma – Kur’an tilavetleriyle eğitilmiş bir Whisper modeli. Cihazda çalışır; ses telefondan çıkmaz.',
    },
    license: { de: 'Apache-2.0 (umgewandelt mit whisper.cpp, MIT; Einbindung über whisper.rn, MIT)', tr: 'Apache-2.0 (whisper.cpp ile dönüştürüldü, MIT; whisper.rn ile, MIT)' },
    version: 'modell-quran-v1',
  },
  {
    name: 'adhan-js (Batoul Apps)',
    url: 'https://github.com/batoulapps/adhan-js',
    usedFor: {
      de: 'Astronomische Berechnung der Gebetszeiten und der Qibla-Richtung auf dem Gerät',
      tr: 'Namaz vakitlerinin ve kıble yönünün cihazda astronomik hesaplanması',
    },
    license: { de: 'MIT-Lizenz', tr: 'MIT lisansı' },
    version: '4.4.6',
  },
  {
    name: '@umalqura/core',
    url: 'https://github.com/umalqura/umalqura',
    usedFor: { de: 'Hijri-Kalender (Umm al-Qura)', tr: 'Hicrî takvim (Ümmü’l-Kurâ)' },
    license: { de: 'MIT-Lizenz', tr: 'MIT lisansı' },
    version: '0.0.7',
  },
  {
    name: 'Wikimedia Commons – Azan-Aufnahmen',
    url: 'https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg',
    usedFor: {
      de: 'Azan 1 + kurz: „Beautiful adhan.ogg“ (Adam-synagda, CC0). Azan 2: „Azan.ogg“ (Andrewler, CC BY-SA 4.0)',
      tr: 'Ezan 1 + kısa: "Beautiful adhan.ogg" (Adam-synagda, CC0). Ezan 2: "Azan.ogg" (Andrewler, CC BY-SA 4.0)',
    },
    license: { de: 'CC0 bzw. CC BY-SA 4.0', tr: 'CC0 ve CC BY-SA 4.0' },
    version: '—',
  },
  {
    name: 'Amiri / Amiri Quran (Khaled Hosny)',
    url: 'https://github.com/aliftype/amiri',
    usedFor: { de: 'Arabische Schrift für Korantext und Duas', tr: "Kur'an metni ve dualar için Arapça yazı tipi" },
    license: { de: 'SIL Open Font License 1.1', tr: 'SIL Open Font License 1.1' },
    version: '—',
  },
];
