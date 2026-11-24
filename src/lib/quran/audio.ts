/**
 * Vers-für-Vers-Rezitationen von EveryAyah.com (frei abrufbar, von vielen Koran-Apps genutzt).
 * URL-Schema: https://everyayah.com/data/<Ordner>/<SSS><AAA>.mp3
 */
export type Reciter = { id: string; name: string; style: string };

export const RECITERS: Reciter[] = [
  { id: 'Alafasy_128kbps', name: 'Mishary Rashid Alafasy', style: 'Murattal' },
  { id: 'Husary_128kbps', name: 'Mahmoud Khalil Al-Husary', style: 'Murattal' },
  { id: 'Husary_Muallim_128kbps', name: 'Mahmoud Khalil Al-Husary', style: 'Muallim (Lernmodus)' },
  { id: 'Minshawy_Murattal_128kbps', name: 'Mohamed Siddiq Al-Minshawi', style: 'Murattal' },
  { id: 'Abdul_Basit_Murattal_192kbps', name: 'Abdul Basit Abdus-Samad', style: 'Murattal' },
  { id: 'Abdurrahmaan_As-Sudais_192kbps', name: 'Abdurrahman As-Sudais', style: 'Murattal' },
  { id: 'MaherAlMuaiqly128kbps', name: 'Maher Al-Muaiqly', style: 'Murattal' },
  { id: 'Saood_ash-Shuraym_128kbps', name: 'Saud Ash-Shuraim', style: 'Murattal' },
];

export function getReciter(id: string): Reciter {
  return RECITERS.find((r) => r.id === id) ?? RECITERS[0];
}

const pad3 = (n: number) => String(n).padStart(3, '0');

export function ayahAudioUrl(reciterId: string, sura: number, aya: number): string {
  return `https://everyayah.com/data/${reciterId}/${pad3(sura)}${pad3(aya)}.mp3`;
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
