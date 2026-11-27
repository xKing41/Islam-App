/**
 * Azan-Stimmen der Gebetserinnerung.
 *
 * Jede Stimme gibt es vollständig und als Kurzfassung (endet an der ersten Atempause nach etwa
 * 20–40 Sekunden). Die Dateien liegen in assets/sounds und werden über das expo-notifications-Plugin
 * (app.json) als Android-Ressource „res/raw/<datei>“ eingebunden. Android legt den Ton pro
 * Benachrichtigungskanal fest und erlaubt keine nachträgliche Änderung – deshalb ein Kanal je Datei.
 *
 * Herkunft, Lizenz und Prüfung jeder Aufnahme: QUELLEN.md, Abschnitt 7.
 */

type VoiceDef = { id: string; full: string; short: string; seconds: number; shortSeconds: number };

export const AZAN_VOICES = [
  { id: 'a', full: 'azan_a', short: 'azan_short', seconds: 154, shortSeconds: 28 },
  { id: 'b', full: 'azan_b', short: 'azan_b_short', seconds: 183, shortSeconds: 30 },
  { id: 'medina', full: 'azan_medina', short: 'azan_medina_short', seconds: 186, shortSeconds: 36 },
] as const satisfies readonly VoiceDef[];

/**
 * Fadschr-Ruf (mit „aṣ-ṣalātu khayrun mina n-naum“) – nur für das Morgengebet und nur in voller Länge
 * (eine Kurzfassung endet vor diesem Satz), nicht zum Abwechseln.
 */
export const FAJR_AZAN = null as { file: string; seconds: number } | null;

export type AzanVoice = (typeof AZAN_VOICES)[number];
export type AzanVoiceId = AzanVoice['id'];
export type AzanSound = AzanVoice['full' | 'short'];
export type AzanLength = 'full' | 'short';

/** Alle Tondateien (ohne Endung) – auch die des Fadschr-Rufs. */
export const AZAN_FILES: string[] = [...AZAN_VOICES.flatMap((v) => [v.full, v.short]), ...(FAJR_AZAN ? [FAJR_AZAN.file] : [])];

export function isAzanSound(sound: string): boolean {
  return AZAN_FILES.includes(sound);
}

/** Stimme und Länge eines Tons, z. B. „azan_short“ → Stimme „a“, kurz. */
export function parseAzanSound(sound: string): { voice: VoiceDef; length: AzanLength } | null {
  for (const v of AZAN_VOICES) {
    if (v.full === sound) return { voice: v, length: 'full' };
    if (v.short === sound) return { voice: v, length: 'short' };
  }
  return null;
}

export function azanSound(voice: VoiceDef, length: AzanLength): AzanSound {
  return (length === 'short' ? voice.short : voice.full) as AzanSound;
}

/** Tag seit 1970 (Ortszeit) – für den gleichbleibenden Wechsel der Stimmen. */
export function dayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

/**
 * Welche Datei zu einem Gebet gespielt wird.
 * - „Stimmen abwechseln“: jedes Gebet eine andere Stimme; für ein Datum immer dieselbe Zuordnung,
 *   Neuplanen ändert also nichts.
 * - „Fadschr-Ruf am Morgen“: beim Fadschr die Fadschr-Aufnahme (nur vollständige Länge – die
 *   Kurzfassung endet vor dem Satz, der den Fadschr-Ruf ausmacht).
 */
export function soundForPrayer(
  sound: string,
  opts: { rotate: boolean; fajrAzan: boolean },
  prayerIndex: number,
  isFajr: boolean,
  date: Date,
): string {
  const parsed = parseAzanSound(sound);
  if (!parsed) return sound;
  if (isFajr && opts.fajrAzan && FAJR_AZAN && parsed.length === 'full') return FAJR_AZAN.file;
  if (!opts.rotate) return sound;
  const n = AZAN_VOICES.length;
  const voice = AZAN_VOICES[(((dayNumber(date) * 5 + prayerIndex) % n) + n) % n];
  return azanSound(voice, parsed.length);
}
