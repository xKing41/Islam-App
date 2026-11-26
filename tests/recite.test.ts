/** Tests für „Rezitation prüfen“: Wortabgleich und Pausen-Erkennung. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { alignWords, applyVocabulary, combineOpinions, stripFormulas, summarize, tokenize, toWords, vowelHints, vowelPattern } from '../src/lib/recite/align';
import { resampleTo16k, Segmenter } from '../src/lib/recite/segmenter';
import { evaluateSession, finishAlignment, pcmToWav, segmentsForRange, segmentsWithFlags } from '../src/lib/recite/session';

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

  it('wertet schon einen falschen Buchstaben als Fehler', () => {
    // typische Verwechslungen ähnlicher Verse bzw. Endungen – früher (75-%-Ähnlichkeit) als richtig durchgegangen
    const pairs = [
      ['نرزقكم', 'نرزقهم'],
      ['يعلمون', 'تعلمون'],
      ['فقال', 'قال'],
      ['عليكم', 'عليهم'],
      ['بحسبان', 'بحصبان'],
      ['الحمد', 'والحمد'],
    ];
    for (const [exp, heard] of pairs) {
      const a = alignWords(['ان', 'الله', exp, 'علي', 'كل'], ['ان', 'الله', heard, 'علي', 'كل']);
      assert.equal(a.status[2], 'wrong', `${exp} / ${heard}`);
      assert.equal(a.heardFor[2], heard);
    }
  });

  it('toleriert nur Schreibvarianten ohne Einfluss auf die Aussprache', () => {
    // Vokalzeichen, Hamza-Träger, Alif-Formen, Ta marbuta, Alif maqsura
    const exp = toWords('وَبِالْآخِرَةِ هُمْ يُوقِنُونَ عَلَى هُدًى');
    const heard = tokenize('وبالاخره هم يوقنون علي هدي');
    assert.equal(summarize(alignWords(exp, heard)).correct, exp.length);
  });

  it('erkennt Zusammen- und Getrenntschreibung', () => {
    const a = alignWords(['يا', 'ايها', 'الناس'], ['ياايها', 'الناس']);
    assert.deepEqual(a.status, ['correct', 'correct', 'correct']);
    const b = alignWords(['ياايها', 'الناس'], ['يا', 'ايها', 'الناس']);
    assert.deepEqual(b.status, ['correct', 'correct']);
  });

  it('wertet Wiederholungen nicht als Fehler', () => {
    const heard = [...fatiha.slice(0, 7), ...fatiha.slice(5, 7), ...fatiha.slice(7, 12)];
    const a = alignWords(fatiha, heard);
    const s = summarize(a);
    assert.equal(s.correct, 12);
    assert.equal(s.extra, 0);
    assert.equal(s.repeats, 1); // einmal neu angesetzt
  });

  it('wertet ein eingefügtes Wort als Fehler, auch wenn es weiter vorne schon vorkam', () => {
    // „الحمد لله رب العالمين الرحمن الرحيم [لله] مالك“ – kein Neuansatz, sondern ein eingeschobenes Wort
    const heard = [...fatiha.slice(0, 10), 'لله', ...fatiha.slice(10, 13)];
    const s = summarize(alignWords(fatiha, heard));
    assert.equal(s.extra, 1);
    assert.equal(s.repeats, 0);
  });

  it('erkennt einen Neuansatz über mehrere Wörter als Wiederholung', () => {
    // „… مالك يوم الدين | يوم الدين اياك …“
    const heard = [...fatiha.slice(0, 13), ...fatiha.slice(11, 13), ...fatiha.slice(13, 16)];
    const s = summarize(alignWords(fatiha, heard));
    assert.equal(s.repeats, 1);
    assert.equal(s.extra + s.wrong + s.missing, 0);
  });

  it('verkraftet mehrfach wiederholte Phrasen (auch mit Hörfehler in der Wiederholung)', () => {
    // 67:8 wie bei manchen Rezitatoren: „كلما القي فيها فوج سالهم خزنتها“ zweimal, einmal davon verhört
    const exp = toWords('تكاد تميز من الغيظ كلما القي فيها فوج سالهم خزنتها الم ياتكم نذير');
    const heard = toWords('تكاد تميز من الغيظ كلما القي فيها فوج سالهم فزنتها كلما القي فيها فوج سالهم خزنتها الم ياتكم نذير');
    const s = summarize(alignWords(exp, heard));
    assert.equal(s.correct, exp.length);
    assert.equal(s.extra + s.wrong + s.missing, 0);
    assert.equal(s.repeats, 1);
    assert.equal(s.corrected, 1); // „فزنتها“ – im zweiten Durchgang richtig
  });

  it('erkennt eine sofortige Selbstkorrektur', () => {
    // „… رب الكافرين رب العالمين“ – falsches Wort, dann neu angesetzt
    const heard = [...fatiha.slice(0, 7), 'الكافرين', ...fatiha.slice(6, 8)];
    const a = alignWords(fatiha, heard);
    const s = summarize(a);
    assert.equal(s.wrong + s.missing + s.extra, 0);
    assert.equal(s.corrected, 1);
  });

  it('markiert ein zusätzliches Wort an der richtigen Stelle', () => {
    // 2:58 „وكلوا منها حيث شئتم رغدا“ – bei 7:161 gehört „رغدا“ nicht dazu
    const exp = toWords('وكلوا منها حيث شئتم وقولوا حطة');
    const a = alignWords(exp, toWords('وكلوا منها حيث شئتم رغدا وقولوا حطة'));
    assert.deepEqual(a.extras.map((e) => [e.before, e.word, e.kind]), [[4, 'رغدا', 'extra']]);
    assert.equal(summarize(a).correct, exp.length);
  });

  it('macht aus einem Fehler „unsicher“, wenn die Gegenprobe das Wort richtig hört', () => {
    const exp = toWords('قل هو الله احد');
    const primary = alignWords(exp, toWords('قل هو الله اخذ'));
    const second = alignWords(exp, toWords('قل هو الله احد'));
    assert.equal(primary.status[3], 'wrong');
    assert.equal(combineOpinions(primary, second).status[3], 'uncertain');
    // bestätigt die Gegenprobe den Fehler, bleibt er ein Fehler
    assert.equal(combineOpinions(primary, primary).status[3], 'wrong');
  });

  it('markiert Nicht-Wörter (Hörfehler) als unsicher, echte Verwechslungen als Fehler', () => {
    const vocab = new Set<string>(JSON.parse(readFileSync(join(root, 'src/data/quran/vocab.json'), 'utf8')));
    const known = (w: string) => vocab.has(w);
    const exp = toWords('فسحقا لاصحاب السعير ان الذين يخشون ربهم بالغيب');
    // „الساعير“ kommt im Koran nicht vor → unsicher; „يعلمون“ statt „يخشون“ ist ein echtes Wort → Fehler
    const a = applyVocabulary(alignWords(exp, toWords('فسحقا لاصحاب الساعير ان الذين يعلمون ربهم بالغيب')), known);
    assert.equal(a.status[2], 'uncertain');
    assert.equal(a.status[5], 'wrong');
  });

  it('vergleicht Vokalzeichen (nur als Hinweis), Idgham-Schadda und Versende-Endung ausgenommen', () => {
    // gleiche Vokale trotz Schreibunterschied: Angleichungs-Schadda am Wortanfang
    assert.equal(vowelPattern('لِّلشَّيَاطِينِ'), vowelPattern('لِلشَّيَاطِينِ'));
    // 94:4 „وَرَفَعْنَا لَكَ ذِكْرَكَ“ – mit „ذِكْرُكَ“ (falsche Endung) mitten im Text
    const display = ['وَرَفَعْنَا', 'لَكَ', 'ذِكْرَكَ', 'فَإِنَّ'];
    const heard = tokenize('وَرَفَعْنَا لَكَ ذِكْرُكَ فَإِنَّ');
    const a = alignWords(display.map((w) => tokenize(w)[0].norm), heard);
    assert.deepEqual(vowelHints(a, heard, display, new Set([3])), [null, null, 'ذِكْرُكَ', null]);
    // auch in Pausalform bleibt der Vokal vor dem Pronomen hörbar – der Hinweis bleibt
    assert.deepEqual(vowelHints(a, heard, display, new Set([2])), [null, null, 'ذِكْرُكَ', null]);
    // am Versende zählt die Endung des letzten Buchstabens nicht: „أَحَدٌ“ wird als „أَحَدْ“ gesprochen
    const d2 = ['قُلْ', 'هُوَ', 'اللَّهُ', 'أَحَدٌ'];
    const h2 = tokenize('قُلْ هُوَ اللَّهُ أَحَدُ');
    const a2 = alignWords(d2.map((w) => tokenize(w)[0].norm), h2);
    assert.deepEqual(vowelHints(a2, h2, d2, new Set([3])), [null, null, null, null]);
    assert.deepEqual(vowelHints(a2, h2, d2, new Set([])), [null, null, null, 'أَحَدُ']);
  });

  it('übergeht „Amin“ nach Al-Fatiha', () => {
    const heard = stripFormulas(toWords('غير المغضوب عليهم ولا الضالين آمين'), { expectedStartsWithBasmala: false, endsWithFatiha: true });
    assert.deepEqual(heard, toWords('غير المغضوب عليهم ولا الضالين'));
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

  it('teilt sehr lange Abschnitte an der leisesten Stelle statt mitten im Wort', () => {
    const seg = new Segmenter({ sampleRate: rate });
    // 26 s ohne echte Pause, nur bei 15 s ein kurzes Leiserwerden (Atemzug, 0,25 s)
    const quiet = new Int16Array(Math.round(rate * 0.25));
    for (let i = 0; i < quiet.length; i++) quiet[i] = Math.round(300 * Math.sin((2 * Math.PI * 220 * i) / rate));
    const parts = [silence(0.5), tone(15), quiet, tone(10.75), silence(1.5)];
    const found: Int16Array[] = [];
    for (const p of parts) for (let i = 0; i < p.length; i += 1600) found.push(...seg.push(p.slice(i, i + 1600)));
    assert.equal(found.length, 2);
    const first = found[0].length / rate;
    assert.ok(first > 15 && first < 16, `Schnitt bei ${first} s`);
  });

  it('teilt auch bei Hall nur an einer Atempause, nicht an kurzen leisen Lauten', () => {
    const seg = new Segmenter({ sampleRate: rate });
    const level = (s: number, amp: number) => {
      const out = new Int16Array(Math.round(rate * s));
      for (let i = 0; i < out.length; i++) out[i] = Math.round(amp * Math.sin((2 * Math.PI * 220 * i) / rate));
      return out;
    };
    // 0,06 s leiser Laut bei 14 s (z. B. ein „ff“) – zu kurz; echte, aber verhallte Pause (0,25 s) bei 17 s
    const parts = [silence(0.5), tone(14), level(0.06, 1500), tone(2.94), level(0.25, 1500), tone(8), silence(1.5)];
    const found: Int16Array[] = [];
    for (const p of parts) for (let i = 0; i < p.length; i += 1600) found.push(...seg.push(p.slice(i, i + 1600)));
    assert.ok(found.length >= 2);
    const first = found[0].length / rate;
    assert.ok(first > 17 && first < 18, `Schnitt bei ${first} s`);
  });

  it('rechnet 48 kHz auf 16 kHz um', () => {
    assert.equal(resampleTo16k(new Int16Array(48000), 48000).length, 16000);
  });
});

describe('Sitzung (mehrere Abschnitte)', () => {
  const segs = [
    { tokens: tokenize('أعوذ بالله من الشيطان الرجيم الحمد لله رب العالمين') },
    { tokens: tokenize('الرحمن الرحيم') },
    { tokens: tokenize('مالك يوم الدين اياك نعبد') },
  ];
  const opts = { expectedStartsWithBasmala: false };
  const exp = fatiha.slice(4);

  it('ordnet Wörter ihren Abschnitten zu', () => {
    const res = evaluateSession(exp, segs, opts);
    assert.equal(summarize(res.alignment).correct, 11);
    // Vers 2 (الحمد … العالمين) liegt im ersten, Vers 3 im zweiten Abschnitt
    assert.deepEqual(segmentsForRange(res, 0, 4), [0]);
    assert.deepEqual(segmentsForRange(res, 4, 6), [1]);
    assert.deepEqual(segmentsForRange(res, 6, 9), [2]);
  });

  it('findet die Abschnitte mit Fehlern und nutzt die Gegenprobe', () => {
    const bad = [segs[0], { tokens: tokenize('الرحمن الرحين') }, segs[2]];
    const res = evaluateSession(exp, bad, opts);
    assert.equal(res.alignment.status[5], 'wrong');
    assert.deepEqual(segmentsWithFlags(res), [1]);
    const checked = evaluateSession(exp, [bad[0], { ...bad[1], alt: tokenize('الرحمن الرحيم') }, bad[2]], opts);
    assert.equal(checked.alignment.status[5], 'uncertain');
  });

  it('meldet einen angefangenen, aber nicht beendeten Vers als unvollständig', () => {
    const res = evaluateSession(exp, [segs[0], { tokens: tokenize('الرحمن') }], opts);
    const ayat = [
      { from: 0, to: 4 },
      { from: 4, to: 6 },
      { from: 6, to: 9 },
    ];
    const done = finishAlignment(res.alignment, ayat);
    assert.equal(done.status[5], 'missing');
    assert.equal(done.status[6], 'pending');
  });

  it('verpackt die eigene Aufnahme als WAV', () => {
    const wav = pcmToWav(new Int16Array([0, 1000, -1000]));
    assert.equal(wav.length, 44 + 6);
    assert.equal(String.fromCharCode(...wav.slice(0, 4)), 'RIFF');
    assert.equal(new DataView(wav.buffer).getInt16(46, true), 1000);
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
