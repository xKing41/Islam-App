/**
 * Gebetszeiten-Berechnung mit der Bibliothek "adhan" (Batoul Apps, MIT-Lizenz).
 * Bewusst ohne React-Native-Abhängigkeiten, damit sie mit Unit-Tests geprüft werden kann.
 */
import {
  CalculationMethod,
  type CalculationParameters,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PrayerTimes,
} from 'adhan';

import type { CalcMethod, HighLatRule, PrayerKey } from '../store/settings';

export const PRAYER_KEYS: PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

export type PrayerConfig = {
  latitude: number;
  longitude: number;
  method: CalcMethod;
  madhab: 'shafi' | 'hanafi';
  highLatRule: HighLatRule;
  adjustments: Record<PrayerKey, number>;
};

export type DayTimes = Record<PrayerKey, Date>;

function buildParams(cfg: PrayerConfig): CalculationParameters {
  const params = CalculationMethod[cfg.method]();
  params.madhab = cfg.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  const coords = new Coordinates(cfg.latitude, cfg.longitude);
  params.highLatitudeRule =
    cfg.highLatRule === 'auto' ? HighLatitudeRule.recommended(coords) : cfg.highLatRule;
  params.adjustments = { ...cfg.adjustments };
  return params;
}

/** Gebetszeiten für den Kalendertag von `date` (lokale Zeitzone des Geräts). */
export function getDayTimes(date: Date, cfg: PrayerConfig): DayTimes {
  const coords = new Coordinates(cfg.latitude, cfg.longitude);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const pt = new PrayerTimes(coords, day, buildParams(cfg));
  return {
    fajr: pt.fajr,
    sunrise: pt.sunrise,
    dhuhr: pt.dhuhr,
    asr: pt.asr,
    maghrib: pt.maghrib,
    isha: pt.isha,
  };
}

/** Aktuelles Gebet (oder null vor Fajr) und nächstes Gebet inkl. Zeitpunkt. */
export function getCurrentAndNext(now: Date, cfg: PrayerConfig) {
  const today = getDayTimes(now, cfg);
  let current: PrayerKey | null = null;
  for (const key of PRAYER_KEYS) {
    if (today[key].getTime() <= now.getTime()) current = key;
  }
  const nextKey = PRAYER_KEYS.find((k) => today[k].getTime() > now.getTime());
  if (nextKey) {
    return { current, next: { key: nextKey, time: today[nextKey] }, today };
  }
  // Nach Isha: nächstes Gebet ist Fajr am folgenden Tag
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const t = getDayTimes(tomorrow, cfg);
  return { current: current ?? ('isha' as PrayerKey), next: { key: 'fajr' as PrayerKey, time: t.fajr }, today };
}

/** Prüft, ob alle Zeiten gültig und in der richtigen Reihenfolge sind. */
export function isValidDay(times: DayTimes): boolean {
  let prev = -Infinity;
  for (const key of PRAYER_KEYS) {
    const v = times[key]?.getTime();
    if (!Number.isFinite(v) || v <= prev) return false;
    prev = v;
  }
  return true;
}
