/**
 * Hijri-Datum nach dem Umm-al-Qura-Kalender (Bibliothek @umalqura/core, MIT).
 * `offset` verschiebt um ganze Tage (Mondsichtung / Diyanet-Kalender können abweichen).
 */
import umalquraModule from '@umalqura/core';

import { addDays, startOfDay } from './time';

// Das Paket exportiert die Funktion als "default" (CommonJS-Interop absichern).
const umalqura: typeof umalquraModule =
  (umalquraModule as unknown as { default?: typeof umalquraModule }).default ?? umalquraModule;

export type HijriDate = { year: number; month: number; day: number };

export function toHijri(date: Date, offset = 0): HijriDate {
  const d = umalqura(addDays(startOfDay(date), offset));
  return { year: d.hy, month: d.hm, day: d.hd };
}

/** Gregorianisches Datum (lokal, 00:00) zu einem Hijri-Datum. */
export function fromHijri(h: HijriDate, offset = 0): Date {
  const d = umalqura(h.year, h.month, h.day);
  return addDays(startOfDay(d.date), -offset);
}

export function formatHijri(h: HijriDate, monthNames: string[]): string {
  return `${h.day}. ${monthNames[h.month - 1]} ${h.year}`;
}

export type IslamicDayKey =
  | 'newYear'
  | 'ashura'
  | 'mawlid'
  | 'regaib'
  | 'miraj'
  | 'barat'
  | 'ramadan'
  | 'qadr'
  | 'eidFitr'
  | 'arafah'
  | 'eidAdha';

export type IslamicDay = {
  key: IslamicDayKey;
  /** Gregorianisches Datum des Tages. */
  date: Date;
  /** true = wird in der Nacht davor begangen (Kandil-Nächte). */
  night: boolean;
};

/** Erster Freitag im Radschab – die Regaib-Nacht ist die Nacht davor (Donnerstagabend). */
function firstFridayOfRajab(hYear: number, offset: number): Date {
  const first = fromHijri({ year: hYear, month: 7, day: 1 }, offset);
  const delta = (5 - first.getDay() + 7) % 7;
  return addDays(first, delta);
}

function daysOfHijriYear(hYear: number, offset: number): IslamicDay[] {
  const at = (month: number, day: number) => fromHijri({ year: hYear, month, day }, offset);
  return [
    { key: 'newYear', date: at(1, 1), night: false },
    { key: 'ashura', date: at(1, 10), night: false },
    { key: 'mawlid', date: at(3, 12), night: true },
    { key: 'regaib', date: firstFridayOfRajab(hYear, offset), night: true },
    { key: 'miraj', date: at(7, 27), night: true },
    { key: 'barat', date: at(8, 15), night: true },
    { key: 'ramadan', date: at(9, 1), night: false },
    { key: 'qadr', date: at(9, 27), night: true },
    { key: 'eidFitr', date: at(10, 1), night: false },
    { key: 'arafah', date: at(12, 9), night: false },
    { key: 'eidAdha', date: at(12, 10), night: false },
  ];
}

/** Die nächsten wichtigen Tage ab `from` (inklusive heute). */
export function upcomingIslamicDays(from: Date, offset = 0, count = 12): IslamicDay[] {
  const today = startOfDay(from);
  const hy = toHijri(today, offset).year;
  const all = [...daysOfHijriYear(hy, offset), ...daysOfHijriYear(hy + 1, offset)];
  return all
    .filter((d) => {
      // Nacht-Ereignisse beginnen am Vorabend
      const start = d.night ? addDays(d.date, -1) : d.date;
      return start.getTime() >= today.getTime();
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, count);
}

/** Ist heute Ramadan? Liefert dann den Fastentag (1–30). */
export function ramadanDay(date: Date, offset = 0): number | null {
  const h = toHijri(date, offset);
  return h.month === 9 ? h.day : null;
}
