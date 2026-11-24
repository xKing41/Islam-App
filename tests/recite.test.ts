/** Tests für „Rezitation prüfen“: Wortabgleich und Pausen-Erkennung. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { alignWords, similarity, stripFormulas, summarize, toWords } from '../src/lib/recite/align';
import { resampleTo16k, Segmenter } from '../src/lib/recite/segmenter';

const root = join(__dirname, '..');
const sura = (n: number) => JSON.parse(readFileSync(join(root, `src/data/quran/suras/${String(n).padStart(3, '0')}.json`), 'utf8'));
const fatiha = sura(1).arClean.flatMap((a: string) => toWords(a));

describe('Wortabgleich', () => {
  it('erkennt eine fehlerfreie Rezitation', () => {
    const a = alignWords(fatiha, fatiha);
    const s = summarize(a);
    assert.equal(s.correct, fatiha.length);
    assert.equal(s.wrong + s.missing + s.extra, 0);
    assert.equal(a.reached, fatiha.length);
  });

  it('lässt noch nicht rezitierte Wörter offen', () => {
    const a = alignWords(fatiha, fatiha.slice(0, 6));
    assert.equal(a.reached, 6);
    assert.deepEqual(a.status.slice(0, 6), Array(6).fill('correct'));
    assert.ok(a.status.slice(6).every((x) => x === 'pending'));
  });

  it('findet ein ausgelassenes Wort', () => {
    const heard = [...fatiha.slice(0, 5), ...fatiha.slice(6, 12)];
    const a = alignWords(fatiha, heard);
    assert.equal(a.status[5], 'missing');
    assert.equal(summarize(a).missing, 1);
  });

  it('findet ein falsches Wort und merkt sich, was gehört wurde', () => {
    const heard = [...fatiha.slice(0, 10)];
    heard[7] = 'الكافرين';
    const a = alignWords(fatiha, heard);
    assert.equal(a.status[7], 'wrong');
    assert.equal(a.heardFor[7], 'الكافرين');
  });

  it('findet ein zusätzliches Wort', () => {
    const heard = [...fatiha.slice(0, 4), 'سبحان', ...fatiha.slice(4, 8)];
    const a = alignWords(fatiha, heard);
    assert.equal(a.extras.length, 1);
    assert.equal(a.extras[0].word, 'سبحان');
  });

  it('toleriert kleine Schreibunterschiede der Erkennung', () => {
    assert.ok(similarity('الرحمن', 'الرحمان') >= 0.75);
    const heard = fatiha.map((w: string) => (w === 'الرحمن' ? 'الرحمان' : w));
    assert.equal(summarize(alignWords(fatiha, heard)).correct, fatiha.length);
  });

  it('entfernt Isti‘adha und Basmala vor einer Sure', () => {
    const ikhlas = sura(112).arClean.flatMap((a: string, i: number) => toWords(i === 0 ? a.split(' ').slice(4).join(' ') : a));
    const heard = stripFormulas([...toWords('أعوذ بالله من الشيطان الرجيم بسم الله الرحمن الرحيم'), ...ikhlas, ...toWords('صدق الله العظيم')], false);
    assert.deepEqual(heard, ikhlas);
    // Bei Al-Fatiha gehört die Basmala zum ersten Vers und bleibt erhalten
    assert.equal(stripFormulas(toWords('بسم الله الرحمن الرحيم الحمد'), true).length, 5);
  });

  it('vereinheitlicht arabische Schreibweisen', () => {
    assert.deepEqual(toWords('ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ'), ['الحمد', 'لله', 'رب', 'العلمين']);
  });
});

describe('Pausen-Erkennung', () => {
  const rate = 16000;
  const silence = (s: number) => new Int16Array(Math.round(rate * s));
  const tone = (s: number) => {
    const out = new Int16Array(Math.round(rate * s));
    for (let i = 0; i < out.length; i++) out[i] = Math.round(8000 * Math.sin((2 * Math.PI * 220 * i) / rate));
    return out;
  };

  it('trennt zwei Sprechabschnitte an der Pause', () => {
    const seg = new Segmenter({ sampleRate: rate });
    const parts = [silence(1), tone(2), silence(1), tone(1.5), silence(1)];
    const found: Int16Array[] = [];
    // in kleinen Stücken einspeisen, wie vom Mikrofon
    for (const p of parts) for (let i = 0; i < p.length; i += 1000) found.push(...seg.push(p.slice(i, i + 1000)));
    assert.equal(found.length, 2);
    assert.ok(found[0].length / rate > 2 && found[0].length / rate < 3.5, `Länge 1: ${found[0].length / rate}`);
    assert.ok(found[1].length / rate > 1.5 && found[1].length / rate < 3, `Länge 2: ${found[1].length / rate}`);
  });

  it('liefert beim Stoppen den angefangenen Abschnitt', () => {
    const seg = new Segmenter({ sampleRate: rate });
    seg.push(silence(0.5));
    seg.push(tone(1));
    const rest = seg.flush();
    assert.ok(rest && rest.length / rate >= 1);
  });

  it('ignoriert kurze Geräusche', () => {
    const seg = new Segmenter({ sampleRate: rate });
    const out = [...seg.push(silence(0.5)), ...seg.push(tone(0.1)), ...seg.push(silence(1.5))];
    assert.equal(out.length, 0);
  });

  it('rechnet 48 kHz auf 16 kHz um', () => {
    assert.equal(resampleTo16k(new Int16Array(48000), 48000).length, 16000);
  });
});

describe('Dua-Auswahl', () => {
  it('verweist nur auf existierende Verse', async () => {
    const { QURAN_DUA_GROUPS } = await import('../src/lib/duas');
    const meta = JSON.parse(readFileSync(join(root, 'src/data/quran/meta.json'), 'utf8'));
    for (const g of QURAN_DUA_GROUPS) {
      for (const d of g.items) {
        const ayas = meta.suras[d.sura - 1].ayas;
        assert.ok(d.from >= 1 && d.to >= d.from && d.to <= ayas, `${d.sura}:${d.from}-${d.to}`);
      }
    }
  });

  it('die bekannten Dua-Verse enthalten die erwarteten Worte', () => {
    const has = (s: number, a: number, word: string) => assert.ok(sura(s).arClean[a - 1].includes(word), `${s}:${a} ${word}`);
    has(2, 201, 'ربنا آتنا في الدنيا حسنة');
    has(7, 23, 'ربنا ظلمنا أنفسنا');
    has(21, 87, 'سبحانك إني كنت من الظالمين');
    has(17, 24, 'رب ارحمهما');
    has(20, 114, 'رب زدني علما');
    has(25, 74, 'قرة أعين');
    has(3, 8, 'ربنا لا تزغ قلوبنا');
    has(14, 41, 'ربنا اغفر لي ولوالدي');
    has(2, 255, 'الحي القيوم');
  });
});
