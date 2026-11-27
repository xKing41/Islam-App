/**
 * Vers-für-Vers-Rezitationen von EveryAyah.com (frei abrufbar, von vielen Koran-Apps genutzt).
 * URL-Schema: https://everyayah.com/data/<Ordner>/<SSS><AAA>.mp3
 *
 * Aufgenommen sind nur Ordner, in denen alle 6236 Verse vorhanden sind (Dateiliste des Servers
 * geprüft, keine leeren oder abgeschnittenen Dateien) – siehe QUELLEN.md, Abschnitt 4.
 */
export type ReciterStyle = 'murattal' | 'mujawwad' | 'teacher';

/** Besonderheit der Lern-Aufnahmen: Pause zum Nachsprechen oder Kinder, die nachsprechen. */
export type ReciterNote = 'pause' | 'children';

export type Reciter = {
  /** Ordnername bei EveryAyah */
  id: string;
  name: string;
  style: ReciterStyle;
  /** Bitrate der MP3-Dateien */
  kbps: number;
  note?: ReciterNote;
};

export const RECITER_STYLES: ReciterStyle[] = ['murattal', 'mujawwad', 'teacher'];

export const RECITERS: Reciter[] = [
  // Murattal: gleichmäßiges Tempo (alphabetisch)
  { id: 'Abdul_Basit_Murattal_192kbps', name: 'Abdul Basit Abdus-Samad', style: 'murattal', kbps: 192 },
  { id: 'Abdullaah_3awwaad_Al-Juhaynee_128kbps', name: 'Abdullah Awad Al-Juhany', style: 'murattal', kbps: 128 },
  { id: 'Abdullah_Basfar_192kbps', name: 'Abdullah Basfar', style: 'murattal', kbps: 192 },
  { id: 'Abdullah_Matroud_128kbps', name: 'Abdullah Al-Matrood', style: 'murattal', kbps: 128 },
  { id: 'Abdurrahmaan_As-Sudais_192kbps', name: 'Abdurrahman As-Sudais', style: 'murattal', kbps: 192 },
  { id: 'Abu_Bakr_Ash-Shaatree_128kbps', name: 'Abu Bakr Ash-Shatri', style: 'murattal', kbps: 128 },
  { id: 'Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net', name: 'Ahmed ibn Ali Al-Ajamy', style: 'murattal', kbps: 128 },
  { id: 'Ahmed_Neana_128kbps', name: 'Ahmed Neana', style: 'murattal', kbps: 128 },
  { id: 'Akram_AlAlaqimy_128kbps', name: 'Akram Al-Alaqimi', style: 'murattal', kbps: 128 },
  { id: 'Hudhaify_128kbps', name: 'Ali Al-Hudhaify', style: 'murattal', kbps: 128 },
  { id: 'Ali_Hajjaj_AlSuesy_128kbps', name: 'Ali Hajjaj As-Suwaisi', style: 'murattal', kbps: 128 },
  { id: 'Ali_Jaber_64kbps', name: 'Ali Jaber', style: 'murattal', kbps: 64 },
  { id: 'Ayman_Sowaid_64kbps', name: 'Ayman Suwaid', style: 'murattal', kbps: 64 },
  { id: 'aziz_alili_128kbps', name: 'Aziz Alili', style: 'murattal', kbps: 128 },
  { id: 'Fares_Abbad_64kbps', name: 'Fares Abbad', style: 'murattal', kbps: 64 },
  { id: 'Hani_Rifai_192kbps', name: 'Hani Ar-Rifai', style: 'murattal', kbps: 192 },
  { id: 'Khaalid_Abdullaah_al-Qahtaanee_192kbps', name: 'Khalid Al-Qahtani', style: 'murattal', kbps: 192 },
  { id: 'khalefa_al_tunaiji_64kbps', name: 'Khalifa Al-Tunaiji', style: 'murattal', kbps: 64 },
  { id: 'MaherAlMuaiqly128kbps', name: 'Maher Al-Muaiqly', style: 'murattal', kbps: 128 },
  { id: 'Husary_128kbps', name: 'Mahmoud Khalil Al-Husary', style: 'murattal', kbps: 128 },
  { id: 'Alafasy_128kbps', name: 'Mishary Rashid Alafasy', style: 'murattal', kbps: 128 },
  { id: 'Mohammad_al_Tablaway_128kbps', name: 'Mohammad Al-Tablawi', style: 'murattal', kbps: 128 },
  { id: 'Minshawy_Murattal_128kbps', name: 'Mohamed Siddiq Al-Minshawi', style: 'murattal', kbps: 128 },
  { id: 'Muhammad_AbdulKareem_128kbps', name: 'Muhammad Abdul-Kareem', style: 'murattal', kbps: 128 },
  { id: 'Muhammad_Ayyoub_128kbps', name: 'Muhammad Ayyub', style: 'murattal', kbps: 128 },
  { id: 'Muhammad_Jibreel_128kbps', name: 'Muhammad Jibreel', style: 'murattal', kbps: 128 },
  { id: 'Muhsin_Al_Qasim_192kbps', name: 'Muhsin Al-Qasim', style: 'murattal', kbps: 192 },
  { id: 'Nasser_Alqatami_128kbps', name: 'Nasser Al-Qatami', style: 'murattal', kbps: 128 },
  { id: 'Ghamadi_40kbps', name: 'Saad Al-Ghamdi', style: 'murattal', kbps: 40 },
  { id: 'Sahl_Yassin_128kbps', name: 'Sahl Yassin', style: 'murattal', kbps: 128 },
  { id: 'Salah_Al_Budair_128kbps', name: 'Salah Al-Budair', style: 'murattal', kbps: 128 },
  { id: 'Salaah_AbdulRahman_Bukhatir_128kbps', name: 'Salah Bukhatir', style: 'murattal', kbps: 128 },
  { id: 'Saood_ash-Shuraym_128kbps', name: 'Saud Ash-Shuraim', style: 'murattal', kbps: 128 },
  { id: 'Yaser_Salamah_128kbps', name: 'Yaser Salamah', style: 'murattal', kbps: 128 },
  { id: 'Yasser_Ad-Dussary_128kbps', name: 'Yasser Ad-Dossari', style: 'murattal', kbps: 128 },
  // Mujawwad: langsam und melodisch
  { id: 'Abdul_Basit_Mujawwad_128kbps', name: 'Abdul Basit Abdus-Samad', style: 'mujawwad', kbps: 128 },
  { id: 'Husary_128kbps_Mujawwad', name: 'Mahmoud Khalil Al-Husary', style: 'mujawwad', kbps: 128 },
  { id: 'Minshawy_Mujawwad_192kbps', name: 'Mohamed Siddiq Al-Minshawi', style: 'mujawwad', kbps: 192 },
  // Lernmodus: zum Nachsprechen
  { id: 'Husary_Muallim_128kbps', name: 'Mahmoud Khalil Al-Husary', style: 'teacher', kbps: 128, note: 'pause' },
  { id: 'Minshawy_Teacher_128kbps', name: 'Mohamed Siddiq Al-Minshawi', style: 'teacher', kbps: 128, note: 'children' },
];

export function getReciter(id: string): Reciter {
  return RECITERS.find((r) => r.id === id) ?? RECITERS.find((r) => r.id === 'Alafasy_128kbps')!;
}

/** Rezitatoren gefiltert nach Suchtext (Name, ohne Groß-/Kleinschreibung und Bindestriche) und gruppiert nach Stil. */
export function groupReciters(query = ''): { style: ReciterStyle; items: Reciter[] }[] {
  const simple = (s: string) => s.toLowerCase().replace(/[-'\s]+/g, '');
  const q = simple(query.trim());
  return RECITER_STYLES.map((style) => ({
    style,
    items: RECITERS.filter((r) => r.style === style && (!q || simple(r.name).includes(q))),
  })).filter((g) => g.items.length > 0);
}

const pad3 = (n: number) => String(n).padStart(3, '0');

export function ayahAudioUrl(reciterId: string, sura: number, aya: number): string {
  return `https://everyayah.com/data/${reciterId}/${pad3(sura)}${pad3(aya)}.mp3`;
}

/** Hörprobe: Sure 112 (al-Ichlas), alle vier Verse. */
export function reciterSampleUrls(reciterId: string): string[] {
  return [1, 2, 3, 4].map((a) => ayahAudioUrl(reciterId, 112, a));
}

export type Track = { sura: number; aya: number; url: string; isBasmala: boolean };

/**
 * Wiedergabeliste ab einem Vers. Vor Vers 1 (außer Sure 1 und 9) wird die Basmala (1:1) gespielt,
 * so wie es in Koran-Apps üblich ist.
 */
export function buildTracks(reciterId: string, sura: number, fromAya: number, ayas: number): Track[] {
  const tracks: Track[] = [];
  if (fromAya === 1 && sura !== 1 && sura !== 9) {
    tracks.push({ sura, aya: 1, url: ayahAudioUrl(reciterId, 1, 1), isBasmala: true });
  }
  for (let a = fromAya; a <= ayas; a++) {
    tracks.push({ sura, aya: a, url: ayahAudioUrl(reciterId, sura, a), isBasmala: false });
  }
  return tracks;
}
