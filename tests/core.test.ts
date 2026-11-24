/**
 * Automatische Prüfungen der Kernlogik und der Daten.
 *   npm test
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { formatHijri, fromHijri, toHijri, upcomingIslamicDays } from '../src/lib/hijri';
import { getCurrentAndNext, getDayTimes, isValidDay, type PrayerConfig } from '../src/lib/prayer-times';
import { angleDiff, distanceToKaaba, qiblaBearing } from '../src/lib/qibla';
import { buildTracks } from '../src/lib/quran/audio';
import { getSuraMeta, juzOf, NAME_LISTS, SURAS } from '../src/lib/quran/meta';
import { normalizeArabic, splitBasmala, toArabicDigits } from '../src/lib/quran/text';

const root = join(__dirname, '..');
const zero = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
const cfg = (lat: number, lon: number, extra: Partial<PrayerConfig> = {}): PrayerConfig => ({
  latitude: lat,
  longitude: lon,
  method: 'Turkey',
  madhab: 'shafi',
  highLatRule: 'auto',
  adjustments: zero,
  ...extra,
});

describe('Gebetszeiten', () => {
  it('liefert für jeden Tag des Jahres gültige, geordnete Zeiten (Köln, Hamburg, Kiel, Istanbul)', () => {
    for (const [lat, lon] of [
      [50.9375, 6.9603],
      [53.5511, 9.9937],
      [54.3233, 10.1228],
      [41.0082, 28.9784],
    ]) {
      for (let d = 0; d < 366; d++) {
        const date = new Date(2027, 0, 1 + d);
        const times = getDayTimes(date, cfg(lat, lon));
        assert.ok(isValidDay(times), `ungültig: ${lat},${lon} am ${date.toDateString()}`);
      }
    }
  });

  it('berechnet plausible Zeiten für Köln im Winter', () => {
    const t = getDayTimes(new Date(2026, 10, 24), cfg(50.9375, 6.9603));
    const hm = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes();
    // Erwartung in UTC (Köln = UTC+1 im November): Dhuhr ~11:24 UTC, Maghrib ~15:42 UTC
    assert.ok(Math.abs(hm(t.dhuhr) - (11 * 60 + 24)) <= 3, `Dhuhr ${t.dhuhr.toISOString()}`);
    assert.ok(Math.abs(hm(t.maghrib) - (15 * 60 + 42)) <= 3, `Maghrib ${t.maghrib.toISOString()}`);
  });

  it('wendet die Feinjustierung an', () => {
    const base = getDayTimes(new Date(2026, 10, 24), cfg(50.9375, 6.9603));
    const adj = getDayTimes(new Date(2026, 10, 24), cfg(50.9375, 6.9603, { adjustments: { ...zero, isha: 5 } }));
    assert.equal(adj.isha.getTime() - base.isha.getTime(), 5 * 60000);
  });

  it('Hanafi-Asr liegt später als Standard-Asr', () => {
    const std = getDayTimes(new Date(2026, 5, 1), cfg(50.9375, 6.9603));
    const han = getDayTimes(new Date(2026, 5, 1), cfg(50.9375, 6.9603, { madhab: 'hanafi' }));
    assert.ok(han.asr.getTime() > std.asr.getTime());
  });

  it('findet nach Isha das Fajr des nächsten Tages', () => {
    const c = cfg(50.9375, 6.9603);
    const t = getDayTimes(new Date(2026, 10, 24), c);
    const late = new Date(t.isha.getTime() + 60000);
    const info = getCurrentAndNext(late, c);
    assert.equal(info.next.key, 'fajr');
    assert.ok(info.next.time.getTime() > late.getTime());
  });
});

describe('Hijri-Kalender (Umm al-Qura)', () => {
  it('kennt bekannte Daten', () => {
    assert.deepEqual(toHijri(new Date(2024, 2, 11)), { year: 1445, month: 9, day: 1 }); // 1. Ramadan 1445
    assert.deepEqual(toHijri(new Date(2024, 6, 7)), { year: 1446, month: 1, day: 1 }); // 1. Muharram 1446
    assert.deepEqual(toHijri(new Date(2024, 5, 16)), { year: 1445, month: 12, day: 10 }); // Opferfest 1445
  });

  it('rechnet hin und zurück', () => {
    const d = fromHijri({ year: 1448, month: 9, day: 1 });
    assert.deepEqual(toHijri(d), { year: 1448, month: 9, day: 1 });
  });

  it('berücksichtigt die Tageskorrektur', () => {
    const d = new Date(2024, 2, 11);
    // Schaʿban 1445 hatte nach Umm al-Qura 29 Tage
    assert.deepEqual(toHijri(d, -1), { year: 1445, month: 8, day: 29 });
  });

  it('listet wichtige Tage chronologisch', () => {
    const list = upcomingIslamicDays(new Date(2026, 10, 24));
    assert.ok(list.length > 5);
    for (let i = 1; i < list.length; i++) assert.ok(list[i].date >= list[i - 1].date);
    assert.equal(formatHijri({ year: 1448, month: 9, day: 1 }, ['', '', '', '', '', '', '', '', 'Ramadan', '', '', '']), '1. Ramadan 1448');
  });
});

describe('Qibla', () => {
  it('stimmt für bekannte Städte (±1°)', () => {
    assert.ok(Math.abs(qiblaBearing(50.9375, 6.9603) - 126.7) < 1); // Köln
    assert.ok(Math.abs(qiblaBearing(52.52, 13.405) - 136.6) < 1); // Berlin
    assert.ok(Math.abs(qiblaBearing(41.0082, 28.9784) - 151.6) < 1); // Istanbul
  });
  it('Entfernung Köln–Mekka ca. 4.400 km', () => {
    const km = distanceToKaaba(50.9375, 6.9603);
    assert.ok(km > 4300 && km < 4500, String(km));
  });
  it('Winkeldifferenz über 0° hinweg', () => {
    assert.equal(angleDiff(350, 10), 20);
    assert.equal(angleDiff(10, 350), -20);
  });
});

describe('Koran-Daten', () => {
  it('114 Suren mit zusammen 6236 Versen in allen Ausgaben', () => {
    const dir = join(root, 'src/data/quran/suras');
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    assert.equal(files.length, 114);
    let total = 0;
    for (const s of SURAS) {
      const data = JSON.parse(readFileSync(join(dir, `${String(s.index).padStart(3, '0')}.json`), 'utf8'));
      for (const key of ['ar', 'arClean', 'de_bubenheim', 'tr_diyanet', 'tr_vakfi']) {
        assert.equal(data[key].length, s.ayas, `Sure ${s.index} ${key}`);
        for (const v of data[key]) assert.ok(typeof v === 'string' && v.length > 0, `leerer Vers in ${s.index} ${key}`);
      }
      total += s.ayas;
    }
    assert.equal(total, 6236);
  });

  it('Text ist identisch mit der Tanzil-Originaldatei', () => {
    const lines = readFileSync(join(root, 'data/sources/tanzil/quran-uthmani.txt'), 'utf8')
      .split('\n')
      .filter((l) => /^\d/.test(l));
    assert.equal(lines.length, 6236);
    const byKey = new Map(lines.map((l) => {
      const [s, a, ...rest] = l.split('|');
      return [`${s}:${a}`, rest.join('|').trim()];
    }));
    for (const s of SURAS) {
      const data = JSON.parse(readFileSync(join(root, `src/data/quran/suras/${String(s.index).padStart(3, '0')}.json`), 'utf8'));
      data.ar.forEach((v: string, i: number) => assert.equal(v, byKey.get(`${s.index}:${i + 1}`)));
    }
  });

  it('Namenslisten haben je 114 Einträge', () => {
    for (const list of Object.values(NAME_LISTS)) assert.equal(list.length, 114);
    assert.equal(getSuraMeta(1).name, 'الفاتحة');
    assert.equal(getSuraMeta(114).nameTr, 'Nâs');
    assert.equal(getSuraMeta(36).nameDe, 'Ya-Sin');
  });

  it('trennt die Basmala korrekt ab', () => {
    const s1 = JSON.parse(readFileSync(join(root, 'src/data/quran/suras/001.json'), 'utf8'));
    const s2 = JSON.parse(readFileSync(join(root, 'src/data/quran/suras/002.json'), 'utf8'));
    const { basmala, rest } = splitBasmala(2, 1, s2.ar[0]);
    assert.equal(basmala, s1.ar[0]); // identisch mit Al-Fatiha 1:1
    assert.equal(rest, 'الٓمٓ');
    assert.equal(splitBasmala(1, 1, 'x y z w v').basmala, null);
    assert.equal(splitBasmala(9, 1, 'x y z w v').basmala, null);
  });

  it('Dschuz-Zuordnung', () => {
    assert.equal(juzOf(1, 1), 1);
    assert.equal(juzOf(2, 142), 2);
    assert.equal(juzOf(114, 6), 30);
  });

  it('Hilfsfunktionen', () => {
    assert.equal(toArabicDigits(286), '٢٨٦');
    assert.equal(normalizeArabic('ٱلْحَمْدُ لِلَّهِ'), 'الحمد لله');
  });

  it('Wiedergabeliste mit Basmala vor Vers 1', () => {
    const tr = buildTracks('Alafasy_128kbps', 2, 1, 286);
    assert.equal(tr.length, 287);
    assert.equal(tr[0].url, 'https://everyayah.com/data/Alafasy_128kbps/001001.mp3');
    assert.equal(tr[1].url, 'https://everyayah.com/data/Alafasy_128kbps/002001.mp3');
    assert.equal(buildTracks('Alafasy_128kbps', 9, 1, 129).length, 129);
    assert.equal(buildTracks('Alafasy_128kbps', 2, 255, 286)[0].aya, 255);
  });
});

describe('Hadith-Daten', () => {
  for (const lang of ['de', 'tr']) {
    it(`${lang}: Index und Texte sind vollständig`, () => {
      const dir = join(root, 'src/data/hadith', lang);
      const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));
      assert.ok(index.items.length > 100);
      const chunks = new Map<number, Record<string, unknown>>();
      for (const item of index.items) {
        if (!chunks.has(item.c)) chunks.set(item.c, JSON.parse(readFileSync(join(dir, `c${String(item.c).padStart(2, '0')}.json`), 'utf8')));
        const body = chunks.get(item.c)![String(item.id)] as { text: string; ar: string };
        assert.ok(body && body.text.length > 0, `Hadith ${item.id} fehlt`);
        assert.ok(item.title.length > 0);
      }
    });
  }
});
