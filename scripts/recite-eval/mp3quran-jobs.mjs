#!/usr/bin/env node
/**
 * Erzeugt Aufträge für transcribe.ts mit ganzen Suren von Rezitatoren, die NICHT auf EveryAyah sind
 * (also nicht in den Trainingsdaten des Erkennungsmodells) – Quelle: mp3quran.net, Rewaya Hafs ʿan ʿAsim,
 * Murattal. Bevorzugt bekannte Rezitatoren (WANTED), füllt sonst mit weiteren auf.
 *
 *   node scripts/recite-eval/mp3quran-jobs.mjs > jobs.json
 */
const WANTED = ['idrees abkr', 'bandar balila', 'islam sobhi', 'hazza', 'raad al kurdi', 'thubaity', 'salimi', 'abdullah al mousa'];
// Nachnamen der EveryAyah-Rezitatoren (Trainingsdaten) – diese werden ausgeschlossen
const EVERYAYAH = [
  'afasy', 'husary', 'hussary', 'husari', 'minshawi', 'menshawi', 'minshawy', 'basit', 'sudais', 'shuraim', 'shuraym', 'ghamdi', 'ghamadi',
  'muaiqly', 'muaiqli', 'hudhaify', 'huthaifi', 'hudaifi', 'ajamy', 'ajmi', 'shatri', 'shaatree', 'shatree', 'dussary', 'dosari', 'dossari',
  'qatami', 'jibreel', 'jibril', 'ayyoub', 'ayoub', 'tablawi', 'tablaway', 'banna', 'matroud', 'basfar', 'juhany', 'juhaynee', 'juhani', 'rifai',
  'alaqimi', 'alaqimy', 'suesy', 'abbad', 'akhdar', 'akdar', 'qahtani', 'qahtaanee', 'mansoori', 'salamah', 'bukhatir', 'budair', 'neana',
  'abdulsamad', 'abdussamad', 'sowaid', 'jaber', 'parhizgar', 'yassin', 'abdulkareem', 'qasim', 'ismail', 'alili', 'tunaiji',
];
const SURAHS = [1, 67, 78, 87, 93, 94, 97, 103, 112, 113, 114];
const MAX = 8;

const res = await fetch('https://mp3quran.net/api/v3/reciters?language=eng', { headers: { 'User-Agent': 'IslamApp-Eval/1.0' } });
const body = await res.json();
if (!Array.isArray(body.reciters)) {
  console.error('Unerwartetes Format:', Object.keys(body));
  process.exit(1);
}
const norm = (s) => String(s).toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
const isEveryAyah = (name) => EVERYAYAH.some((x) => norm(name).replace(/ /g, '').includes(x));

/** Hafs-Murattal-Fassung mit allen Test-Suren */
function hafsMoshaf(r) {
  for (const m of r.moshaf ?? []) {
    const name = norm(m.name);
    if (!/hafs/.test(name) || /mujawwad|mojawwad|mujawad|teacher|mualim|muallim/.test(name)) continue;
    const have = new Set(String(m.surah_list ?? '').split(',').map(Number));
    if (SURAHS.every((s) => have.has(s)) && m.server) return m;
  }
  return null;
}

const candidates = body.reciters.filter((r) => !isEveryAyah(r.name) && hafsMoshaf(r));
const picked = [];
for (const w of WANTED) {
  const r = candidates.find((x) => norm(x.name).includes(w) && !picked.includes(x));
  if (r) picked.push(r);
}
for (const r of [...candidates].sort((a, b) => Number(a.id) - Number(b.id))) {
  if (picked.length >= MAX) break;
  if (!picked.includes(r)) picked.push(r);
}

const jobs = [];
for (const r of picked.slice(0, MAX)) {
  const m = hafsMoshaf(r);
  const server = m.server.endsWith('/') ? m.server : `${m.server}/`;
  const label = String(r.name).replace(/[^A-Za-z]+/g, '_').replace(/^_|_$/g, '');
  console.error(`- ${r.name} (${m.name}) ${server}`);
  for (const s of SURAHS) jobs.push({ key: `${label}/sura${String(s).padStart(3, '0')}`, url: `${server}${String(s).padStart(3, '0')}.mp3` });
}
if (!jobs.length) {
  console.error('Keine passenden Rezitatoren gefunden');
  process.exit(1);
}
console.log(JSON.stringify(jobs));
