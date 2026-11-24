/** Kleine Helfer zum Formatieren von Uhrzeiten und Daten (unabhängig von Intl). */

const pad2 = (n: number) => String(n).padStart(2, '0');

/** "06:05" in der lokalen Zeitzone des Geräts. */
export function formatTime(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** "1:05:09" bzw. "05:09" für einen Countdown. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Ganze Kalendertage zwischen zwei Daten (lokal). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);
}

export function formatDate(
  date: Date,
  dict: { weekdays: string[]; months: string[] },
  opts: { weekday?: boolean; year?: boolean } = {}
): string {
  const base = `${date.getDate()}. ${dict.months[date.getMonth()]}${opts.year === false ? '' : ` ${date.getFullYear()}`}`;
  return opts.weekday ? `${dict.weekdays[date.getDay()]}, ${base}` : base;
}
