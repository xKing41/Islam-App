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
import { buildTracks, getReciter, groupReciters, RECITERS, reciterSampleUrls } from '../src/lib/quran/audio';
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
      for (const key of ['ar', 'arClean', 'arSimple', 'de_bubenheim', 'tr_diyanet', 'tr_vakfi', 'translit_tr', 'translit_en']) {
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

  it('Rezitatoren: eindeutige Ordner, Gruppen, Suche, Hörprobe', () => {
    const ids = RECITERS.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length, 'doppelter EveryAyah-Ordner');
    // Bisherige Auswahl bleibt gültig
    for (const old of ['Alafasy_128kbps', 'Husary_128kbps', 'Husary_Muallim_128kbps', 'Minshawy_Murattal_128kbps', 'Abdul_Basit_Murattal_192kbps',
      'Abdurrahmaan_As-Sudais_192kbps', 'MaherAlMuaiqly128kbps', 'Saood_ash-Shuraym_128kbps']) {
      assert.equal(getReciter(old).id, old);
    }
    assert.equal(getReciter('gibt-es-nicht').id, 'Alafasy_128kbps');
    const all = groupReciters('');
    assert.deepEqual(all.map((g) => g.style), ['murattal', 'mujawwad', 'teacher']);
    assert.equal(all.reduce((n, g) => n + g.items.length, 0), RECITERS.length);
    // Suche ohne Groß-/Kleinschreibung und Bindestriche
    const husary = groupReciters('al husary');
    assert.equal(husary.reduce((n, g) => n + g.items.length, 0), 3);
    assert.deepEqual(groupReciters('xyz'), []);
    assert.deepEqual(reciterSampleUrls('Alafasy_128kbps'), [1, 2, 3, 4].map((a) => `https://everyayah.com/data/Alafasy_128kbps/11200${a}.mp3`));
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

    it(`${lang}: Einstufung und Sammlungen passen zur arabischen Quellenangabe`, () => {
      const dir = join(root, 'src/data/hadith', lang);
      const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));
      const chunks = new Map<number, Record<string, { gradeAr: string; attribution: string }>>();
      const raw = new Map<number, { attribution_ar: string; grade_ar: string }>(
        readFileSync(join(root, `data/sources/hadeethenc/hadeeths_${lang}.jsonl`), 'utf8')
          .split('\n')
          .filter(Boolean)
          .map((l) => JSON.parse(l))
          .map((h) => [Number(h.id), h]),
      );
      for (const item of index.items) {
        if (!chunks.has(item.c)) chunks.set(item.c, JSON.parse(readFileSync(join(dir, `c${String(item.c).padStart(2, '0')}.json`), 'utf8')));
        const src = raw.get(item.id)!;
        // Einstufung: nur aus dem arabischen Urteil
        if (/صحيح/.test(src.grade_ar)) assert.equal(item.g, 's', `${item.id}: ${src.grade_ar}`);
        else if (/حسن/.test(src.grade_ar)) assert.equal(item.g, 'h', `${item.id}: ${src.grade_ar}`);
        // Muttafaqun ʿalayh = Buchari und Muslim
        if (/متفق علي/.test(src.attribution_ar)) {
          assert.equal(item.mt, 1);
          assert.ok(item.s.includes('bu') && item.s.includes('mu'), `${item.id}`);
        }
        if (/^رواه مسلم$/.test(src.attribution_ar.trim())) assert.deepEqual(item.s, ['mu']);
        if (/^رواه البخاري$/.test(src.attribution_ar.trim())) assert.deepEqual(item.s, ['bu']);
        assert.ok(item.s.length > 0, `${item.id} ohne Sammlung`);
      }
    });

    it(`${lang}: Themen-Namen ohne Tippfehler und englische Reste`, () => {
      const index = JSON.parse(readFileSync(join(root, 'src/data/hadith', lang, 'index.json'), 'utf8'));
      for (const c of index.categories) {
        if (!c.count) continue;
        assert.ok(!/\b(the|and|of|Rulings|Stance|Virtue|Merits?)\b/.test(c.title), `${c.id}: ${c.title}`);
        assert.ok(!/[A-ZÄÖÜ]{2}[a-zäöü]/.test(c.title), `${c.id}: ${c.title}`);
      }
    });
  }
});

describe('Koran-Wortschatz (Rezitation prüfen)', () => {
  it('enthält jede Wortform des Korantextes', () => {
    const vocab = new Set(JSON.parse(readFileSync(join(root, 'src/data/quran/vocab.json'), 'utf8')));
    for (let s = 1; s <= 114; s++) {
      const data = JSON.parse(readFileSync(join(root, `src/data/quran/suras/${String(s).padStart(3, '0')}.json`), 'utf8'));
      for (const aya of data.arClean as string[])
        for (const w of aya.split(' ')) {
          const n = normalizeArabic(w).replace(/[^\u0621-\u064A]/g, '');
          if (n) assert.ok(vocab.has(n), `${s}: ${w}`);
        }
    }
  });
});

describe('Vers des Tages', () => {
  it('verweist nur auf existierende Verse und wechselt täglich', async () => {
    const { DAILY_VERSES, verseOfTheDay } = await import('../src/lib/daily');
    for (const v of DAILY_VERSES) {
      const meta = getSuraMeta(v.sura);
      assert.ok(v.from >= 1 && v.to >= v.from && v.to <= meta.ayas, `${v.sura}:${v.from}-${v.to}`);
    }
    const a = verseOfTheDay(new Date(2026, 0, 1));
    const b = verseOfTheDay(new Date(2026, 0, 2));
    assert.notDeepEqual(a, b);
    assert.deepEqual(verseOfTheDay(new Date(2026, 0, 1, 23, 59)), a);
  });
});

describe('Azan-Stimmen', () => {
  it('jede Tondatei liegt in assets/sounds und ist in app.json eingebunden', async () => {
    const { AZAN_FILES } = await import('../src/lib/azan');
    const app = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8'));
    const plugin = app.expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-notifications');
    const listed = new Set((plugin[1].sounds as string[]).map((f) => f.replace('./assets/sounds/', '').replace('.ogg', '')));
    const files = new Set(readdirSync(join(root, 'assets/sounds')).map((f) => f.replace('.ogg', '')));
    for (const f of AZAN_FILES) {
      assert.ok(files.has(f), `Datei fehlt: assets/sounds/${f}.ogg`);
      assert.ok(listed.has(f), `nicht in app.json: ${f}`);
      // Android-Ressourcennamen: nur Kleinbuchstaben, Ziffern, Unterstrich
      assert.match(f, /^[a-z][a-z0-9_]*$/);
    }
    assert.equal(listed.size, AZAN_FILES.length, 'app.json enthält Töne, die die App nicht kennt');
  });

  it('Texte für jede Stimme (Deutsch und Türkisch)', async () => {
    const { AZAN_VOICES } = await import('../src/lib/azan');
    const { de } = await import('../src/i18n/de');
    const { tr } = await import('../src/i18n/tr');
    for (const v of AZAN_VOICES) {
      assert.ok(de.azan.voices[v.id].name && tr.azan.voices[v.id].name, v.id);
    }
  });

  it('Länge, Abwechseln und Fadschr-Ruf', async () => {
    const { AZAN_VOICES, FAJR_AZAN, azanSound, parseAzanSound, soundForPrayer } = await import('../src/lib/azan');
    // bisherige Werte bleiben gültig
    assert.deepEqual(parseAzanSound('azan_short'), { voice: AZAN_VOICES[0], length: 'short' });
    assert.equal(parseAzanSound('azan_a')?.length, 'full');
    assert.equal(parseAzanSound('default'), null);
    const day = new Date(2026, 10, 27, 13, 0);
    const off = { rotate: false, fajrAzan: false };
    assert.equal(soundForPrayer('azan_b', off, 1, false, day), 'azan_b');
    assert.equal(soundForPrayer('default', { rotate: true, fajrAzan: true }, 0, true, day), 'default');
    // Abwechseln: fünf Gebete eines Tages nacheinander verschiedene Stimmen, gleiche Länge, gleichbleibend je Datum
    const rot = { rotate: true, fajrAzan: false };
    const sounds = [0, 1, 2, 3, 4].map((i) => soundForPrayer('azan_short', rot, i, i === 0, day));
    for (const sound of sounds) assert.equal(parseAzanSound(sound)?.length, 'short');
    for (let i = 1; i < sounds.length; i++) assert.notEqual(sounds[i], sounds[i - 1]);
    assert.deepEqual([0, 1, 2, 3, 4].map((i) => soundForPrayer('azan_short', rot, i, i === 0, new Date(2026, 10, 27, 5, 0))), sounds);
    assert.equal(new Set(Array.from({ length: 10 }, (_, i) => soundForPrayer('azan_a', rot, i % 5, false, new Date(2026, 0, 1 + Math.floor(i / 5))))).size,
      Math.min(10, AZAN_VOICES.length));
    // Fadschr-Ruf nur bei voller Länge und nur zum Fadschr
    if (FAJR_AZAN) {
      const fajr = { rotate: false, fajrAzan: true };
      assert.equal(soundForPrayer('azan_a', fajr, 0, true, day), FAJR_AZAN.file);
      assert.equal(soundForPrayer('azan_a', fajr, 1, false, day), 'azan_a');
      assert.equal(soundForPrayer('azan_short', fajr, 0, true, day), 'azan_short');
    }
    assert.equal(azanSound(AZAN_VOICES[0], 'short'), 'azan_short');
  });
});
