import {
  type AudioStreamBuffer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioStream,
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useLocalSearchParams } from 'expo-router';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NumberBadge } from '@/components/ayah-badge';
import { AppText, Button, Card, Icon, Screen, Segmented, Stepper } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { ayahAudioUrl } from '@/lib/quran/audio';
import { getSura } from '@/lib/quran/data';
import { getSuraMeta, SURAS, suraTitle } from '@/lib/quran/meta';
import { normalizeArabic, normalizeLatin } from '@/lib/quran/text';
import { alignWords, type Extra, summarize, type Token, tokenize, type WordStatus } from '@/lib/recite/align';
import { type Decoder, getWhisper, releaseWhisper, selfTest, transcribePcm } from '@/lib/recite/engine';
import { downloadModel, isModelReady, MODEL } from '@/lib/recite/model';
import { concat, resampleTo16k, Segmenter } from '@/lib/recite/segmenter';
import { evaluateSession, finishAlignment, pcmToWav, segmentsForRange, segmentsWithFlags } from '@/lib/recite/session';
import { useQuranStore } from '@/store/quran';
import { useSettings } from '@/store/settings';

type Phase = 'idle' | 'loading' | 'listening' | 'finishing' | 'done';
type Seg = { pcm: Int16Array; tokens: Token[]; alt?: Token[] };

/**
 * Hauptdurchgang und Gegenprobe der Erkennung. Markiert der Hauptdurchgang ein Wort, wird der Abschnitt
 * ein zweites Mal mit dem anderen Suchverfahren erkannt; hört die Gegenprobe das richtige Wort, gilt es
 * als „unsicher“ statt als Fehler. Gemessen in scripts/recite-eval (Release „rezitation-auswertung“).
 */
const PRIMARY: Decoder = 'greedy';
const SECOND_OPINION: Decoder | null = 'beam';

/**
 * Beispiel-Auswertung (Al-Fatiha) für „Beispiel ansehen“: zeigt, wie Fehler dargestellt werden –
 * eine Selbstkorrektur, ein falscher Buchstabe, ein unsicheres Wort und ein ausgelassenes Wort.
 */
const DEMO_SEGMENTS: Seg[] = [
  'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ',
  'الْحَمْدُ لِلَّهِ رَبِّ الْكَافِرِينَ رَبِّ الْعَالَمِينَ الرَّحْمَنِ الرَّحِيمِ',
  'مَلِكِ يَوْمِ الدِّينِ',
  'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمِ',
  'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ الضَّالِّينَ',
].map((text, i) => ({
  pcm: new Int16Array(0),
  tokens: tokenize(i === 3 ? text.replace('نَسْتَعِينُ', 'نَسْتَعِيذُ') : text),
  ...(i === 3 ? { alt: tokenize(text) } : {}),
}));

const MAX_AYAT = 20;
const MAX_WORDS = 320;

/** Erwartete Wörter ab einem Vers: vereinheitlicht für den Abgleich, mit Vokalzeichen für die Anzeige. */
function buildExpected(sura: number, startAya: number) {
  const data = getSura(sura);
  const words: string[] = [];
  const display: string[] = [];
  const ayat: { aya: number; from: number; to: number }[] = [];
  for (let a = startAya; a <= data.arClean.length && ayat.length < MAX_AYAT && words.length < MAX_WORDS; a++) {
    let clean = data.arClean[a - 1].split(' ');
    let simple = data.arSimple[a - 1].split(' ');
    if (a === 1 && sura !== 1 && sura !== 9) {
      clean = clean.slice(4); // Basmala ist kein Teil des Verses
      simple = simple.slice(4);
    }
    const from = words.length;
    clean.forEach((w, i) => {
      words.push(normalizeArabic(w));
      display.push(simple[i] ?? w);
    });
    ayat.push({ aya: a, from, to: words.length });
  }
  const lastAya = ayat.length ? ayat[ayat.length - 1].aya : startAya;
  return {
    words,
    display,
    ayat,
    formula: { expectedStartsWithBasmala: sura === 1 && startAya === 1, endsWithFatiha: sura === 1 && lastAya === 7 },
  };
}

export default function ReciteScreen() {
  const t = useT();
  const theme = useTheme();
  const params = useLocalSearchParams<{ sura?: string; aya?: string; demo?: string }>();
  const lastRead = useQuranStore((s) => s.lastRead);
  const lang = useSettings((s) => s.language);
  const reciter = useSettings((s) => s.reciter);

  const [sura, setSura] = useState(() => (params.demo === '1' ? 1 : Number(params.sura) || lastRead?.sura || 1));
  const [startAya, setStartAya] = useState(() =>
    params.demo === '1' ? 1 : params.sura ? Number(params.aya) || 1 : lastRead?.aya || 1,
  );
  const [hidden, setHidden] = useState(false);
  const [modelReady, setModelReady] = useState(() => isModelReady());
  const [progress, setProgress] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>(() => (params.demo === '1' ? 'done' : 'idle'));
  const [segs, setSegs] = useState<Seg[]>(() => (params.demo === '1' ? DEMO_SEGMENTS : []));
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [demo, setDemo] = useState(params.demo === '1');

  const segmenter = useRef<Segmenter | null>(null);
  const queue = useRef<Int16Array[]>([]);
  const processing = useRef(false);
  const stopped = useRef(true);
  const segsRef = useRef<Seg[]>(params.demo === '1' ? DEMO_SEGMENTS : []);
  const altTried = useRef<Set<number>>(new Set());
  const lastLevel = useRef(0);
  const recFile = useRef<File | null>(null);

  const meta = getSuraMeta(sura);
  const expected = useMemo(() => buildExpected(sura, startAya), [sura, startAya]);
  const expectedRef = useRef(expected);
  useEffect(() => {
    expectedRef.current = expected;
  }, [expected]);
  const result = useMemo(() => evaluateSession(expected.words, segs, expected.formula), [expected, segs]);
  // Nach dem Stoppen: angefangener, nicht beendeter Vers → fehlende Wörter
  const alignment = phase === 'done' ? finishAlignment(result.alignment, expected.ayat) : result.alignment;
  const summary = summarize(alignment);
  const player = useAudioPlayer();

  const reset = useCallback(() => {
    segsRef.current = [];
    altTried.current = new Set();
    setSegs([]);
    setError(null);
    setDemo(false);
    setPhase('idle');
  }, []);

  /** Neue Auswahl (Sure/Startvers): bisheriges Ergebnis verwerfen. */
  function select(s: number, a: number) {
    if (s === sura && a === startAya) return;
    reset();
    setSura(s);
    setStartAya(a);
  }

  function showDemo() {
    reset();
    setSura(1);
    setStartAya(1);
    segsRef.current = DEMO_SEGMENTS;
    setSegs(DEMO_SEGMENTS);
    setDemo(true);
    setPhase('done');
  }

  const processQueue = useCallback(async () => {
    if (processing.current) return;
    processing.current = true;
    setBusy(true);
    try {
      for (;;) {
        // 1) neue Abschnitte erkennen
        const pcm = queue.current.shift();
        if (pcm) {
          const text = await transcribePcm(pcm, PRIMARY);
          console.log('[Rezitation] erkannt:', text);
          segsRef.current = [...segsRef.current, { pcm, tokens: tokenize(text) }];
          setSegs(segsRef.current);
          continue;
        }
        // 2) Gegenprobe für Abschnitte mit markierten Wörtern
        if (!SECOND_OPINION) break;
        const res = evaluateSession(expectedRef.current.words, segsRef.current, expectedRef.current.formula);
        const k = segmentsWithFlags(res).find((x) => !altTried.current.has(x));
        if (k === undefined) break;
        altTried.current.add(k);
        setChecking(true);
        const text = await transcribePcm(segsRef.current[k].pcm, SECOND_OPINION);
        console.log('[Rezitation] Gegenprobe:', text);
        segsRef.current = segsRef.current.map((x, i) => (i === k ? { ...x, alt: tokenize(text) } : x));
        setSegs(segsRef.current);
      }
    } catch (e) {
      setError(`${t.recite.error} ${String(e)}`);
    } finally {
      processing.current = false;
      setBusy(false);
      setChecking(false);
      if (stopped.current && queue.current.length === 0) setPhase((p) => (p === 'finishing' ? 'done' : p));
    }
  }, [t.recite.error]);

  const onBuffer = useCallback(
    (buf: AudioStreamBuffer) => {
      if (stopped.current || !segmenter.current) return;
      let samples: Int16Array = new Int16Array(buf.data);
      if (buf.sampleRate && buf.sampleRate !== 16000) samples = resampleTo16k(samples, buf.sampleRate);
      const segs = segmenter.current.push(samples);
      const now = Date.now();
      if (now - lastLevel.current > 120) {
        lastLevel.current = now;
        setLevel(segmenter.current.level);
      }
      if (segs.length) {
        queue.current.push(...segs);
        processQueue();
      }
    },
    [processQueue],
  );

  const { stream } = useAudioStream({
    sampleRate: 16000,
    channels: 1,
    encoding: 'int16',
    onBuffer,
  });

  const stop = useCallback(() => {
    if (stopped.current) return;
    stopped.current = true;
    try {
      stream.stop();
    } catch {}
    const rest = segmenter.current?.flush();
    if (rest) queue.current.push(rest);
    setLevel(0);
    setPhase('finishing');
    setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    if (!processing.current) {
      if (queue.current.length) processQueue();
      else setPhase('done');
    }
  }, [stream, processQueue]);

  const start = useCallback(async () => {
    setError(null);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError(t.recite.micDenied);
      return;
    }
    setPhase('loading');
    try {
      await getWhisper();
    } catch (e) {
      setError(`${t.recite.error} ${String(e)}`);
      setPhase('idle');
      return;
    }
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    }).catch(() => {});
    segsRef.current = [];
    altTried.current = new Set();
    setSegs([]);
    queue.current = [];
    segmenter.current = new Segmenter({ sampleRate: 16000 });
    stopped.current = false;
    try {
      await stream.start();
      setPhase('listening');
    } catch (e) {
      stopped.current = true;
      setError(`${t.recite.error} ${String(e)}`);
      setPhase('idle');
    }
  }, [stream, t.recite.error, t.recite.micDenied]);

  // Automatisch beenden, wenn alles rezitiert wurde
  useEffect(() => {
    if (phase === 'listening' && expected.words.length > 0 && alignment.reached >= expected.words.length) stop();
  }, [phase, alignment.reached, expected.words.length, stop]);

  // Aufräumen beim Verlassen
  useEffect(
    () => () => {
      stopped.current = true;
      try {
        stream.stop();
      } catch {}
      releaseWhisper();
      try {
        recFile.current?.delete();
      } catch {}
    },
    [stream],
  );

  async function loadModel() {
    setError(null);
    setProgress(0);
    try {
      await downloadModel((f) => setProgress(f));
      console.log('[Rezitation] Modell bereit:', MODEL.id);
      setModelReady(true);
    } catch (e) {
      console.log('[Rezitation] Download-Fehler', String(e));
      setError(t.recite.downloadError);
    } finally {
      setProgress(null);
    }
  }

  async function runSelfTest() {
    setTestResult(t.recite.loadingModel);
    try {
      const r = await selfTest();
      const exp = tokenize(getSura(1).arClean[1]).map((x) => x.norm);
      const score = (text: string) => summarize(alignWords(exp, tokenize(text))).correct;
      console.log('[Selbsttest] erkannt:', r.greedy, `${r.msGreedy} ms`, '| Strahlsuche:', r.beam, `${r.msBeam} ms`, `| ${r.segments} Abschnitt(e)`);
      setTestResult(
        t.recite.selfTestResult2(
          r.greedy.trim(),
          (r.msGreedy / 1000).toFixed(1),
          (r.msBeam / 1000).toFixed(1),
          Math.min(score(r.greedy), score(r.beam)),
          exp.length,
        ),
      );
    } catch (e) {
      console.log('[Selbsttest] Fehler', String(e));
      setTestResult(`${t.recite.error} ${String(e)}`);
    }
  }

  function play(aya: number) {
    player.replace({ uri: ayahAudioUrl(reciter, sura, aya) });
    player.play();
  }

  /** Spielt die eigene Aufnahme der Abschnitte ab, die zu diesem Vers gehören. */
  async function playMine(from: number, to: number) {
    const ks = segmentsForRange(result, from, to);
    if (!ks.length) return;
    try {
      const pcm = concat(ks.map((k) => segsRef.current[k].pcm));
      try {
        recFile.current?.delete();
      } catch {}
      const f = new File(Paths.cache, `meine-rezitation-${Date.now()}.wav`);
      if (!f.exists) f.create();
      await f.write(pcmToWav(pcm));
      recFile.current = f;
      player.replace({ uri: f.uri });
      player.play();
    } catch (e) {
      setError(`${t.recite.error} ${String(e)}`);
    }
  }

  const listening = phase === 'listening';
  const title = suraTitle(meta, lang);
  type Note = { key: string; text: string; tone: 'danger' | 'warning' | 'textSecondary' };
  // Arabische Wörter in deutschen/türkischen Sätzen als eigene Richtungsinsel einfügen (sonst ordnet
  // Android die Satzteile von rechts nach links um); \u200E erzwingt eine Zeile von links nach rechts.
  const ar = (w: string) => `\u2068${w}\u2069`;
  const note = (key: string, text: string, tone: Note['tone']): Note => ({ key, text: `\u200E${text}`, tone });
  const extraOwner = (e: Extra) => (e.before > 0 ? e.before - 1 : 0);
  const mistakes = expected.ayat
    .map((a) => {
      const notes: Note[] = [];
      for (let i = a.from; i < a.to; i++) {
        const st = alignment.status[i];
        const word = expected.display[i];
        if (st === 'wrong') notes.push(note(`w${i}`, t.recite.wrongWord(ar(word), ar(alignment.heardFor[i] ?? '')), 'danger'));
        else if (st === 'missing')
          notes.push(note(`m${i}`, i >= result.alignment.reached ? t.recite.unfinished(ar(word)) : t.recite.missingWord(ar(word)), 'danger'));
        else if (st === 'uncertain')
          notes.push(
            note(
              `u${i}`,
              alignment.heardFor[i] ? t.recite.uncertainWord(ar(word), ar(alignment.heardFor[i] ?? '')) : t.recite.uncertainMissing(ar(word)),
              'warning',
            ),
          );
      }
      for (const e of alignment.extras) {
        if (extraOwner(e) < a.from || extraOwner(e) >= a.to || e.kind === 'repeat') continue;
        if (e.kind === 'corrected') notes.push(note(`c${e.heardIndex}`, t.recite.correctedWord(ar(e.word)), 'textSecondary'));
        else
          notes.push(
            note(
              `x${e.heardIndex}`,
              e.uncertain ? t.recite.uncertainExtra(ar(e.word)) : t.recite.extraWord(ar(e.word)),
              e.uncertain ? 'warning' : 'danger',
            ),
          );
      }
      return { aya: a.aya, from: a.from, to: a.to, notes };
    })
    .filter((a) => a.notes.length);

  const wordStyle = (s: WordStatus, i: number) => {
    if (s === 'correct') return { color: theme.success };
    if (s === 'wrong') return { color: theme.danger, textDecorationLine: 'underline' as const };
    if (s === 'missing') return { color: theme.danger, textDecorationLine: 'line-through' as const, opacity: 0.8 };
    if (s === 'uncertain')
      return { color: theme.warning, textDecorationLine: 'underline' as const, textDecorationStyle: 'dotted' as const };
    const isNext = listening && i === alignment.reached;
    if (hidden)
      return {
        color: 'transparent',
        backgroundColor: isNext ? theme.highlight : theme.cardAlt,
      };
    return {
      color: theme.text,
      backgroundColor: isNext ? theme.highlight : undefined,
    };
  };

  /** Zusätzlich gesagte Wörter erscheinen klein an der Stelle, an der sie gesagt wurden. */
  const extrasAfter = (i: number) =>
    alignment.extras
      .filter((e) => e.before === i + 1 && e.kind !== 'repeat')
      .map((e) => (
        <Text
          key={`e${e.heardIndex}`}
          style={{
            fontSize: 18,
            color: e.kind === 'corrected' ? theme.textMuted : e.uncertain ? theme.warning : theme.danger,
            textDecorationLine: e.kind === 'corrected' ? 'line-through' : 'none',
          }}>
          {` +${e.word} `}
        </Text>
      ));

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Screen contentStyle={{ paddingBottom: 140 }}>
        <AppText color="textSecondary">{t.recite.intro}</AppText>

        {/* Auswahl */}
        <Card style={{ gap: Spacing.md }}>
          <Pressable onPress={() => !listening && setPickerOpen(true)} accessibilityRole="button" style={styles.pickerRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="small" color="textSecondary">
                {t.recite.sura}
              </AppText>
              <AppText variant="heading">
                {sura}. {title.name}
              </AppText>
            </View>
            <AppText style={{ fontFamily: Fonts.arabic, fontSize: 24, lineHeight: 40 }} color="primary">
              {meta.name}
            </AppText>
            <Icon name="chevron-down" color={theme.textMuted} />
          </Pressable>
          <View style={styles.pickerRow}>
            <AppText style={{ flex: 1 }}>{t.recite.startVerse}</AppText>
            <Stepper signed={false} value={startAya} min={1} max={meta.ayas} onChange={(v) => !listening && select(sura, v)} />
          </View>
          <Segmented
            options={[
              { value: 'show', label: t.recite.showText },
              { value: 'hide', label: t.recite.hideText },
            ]}
            value={hidden ? 'hide' : 'show'}
            onChange={(v) => setHidden(v === 'hide')}
          />
        </Card>

        {/* Modell */}
        {!modelReady ? (
          <Card tone="accent" style={{ gap: Spacing.md }}>
            <AppText variant="heading">{t.recite.modelTitle}</AppText>
            <AppText>{t.recite.modelText(MODEL.sizeMB)}</AppText>
            {progress !== null ? (
              <View style={{ gap: 6 }}>
                <View style={[styles.bar, { backgroundColor: theme.card }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.round(progress * 100)}%`,
                        backgroundColor: theme.primary,
                      },
                    ]}
                  />
                </View>
                <AppText variant="caption" color="textSecondary">
                  {t.recite.downloading(Math.round(progress * 100))}
                </AppText>
              </View>
            ) : (
              <Button title={t.recite.download} icon="download" onPress={loadModel} />
            )}
          </Card>
        ) : null}

        {error ? (
          <Card tone="accent">
            <AppText color="danger">{error}</AppText>
          </Card>
        ) : null}

        {/* Legende */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: Spacing.md,
            justifyContent: 'center',
          }}>
          <Legend color={theme.success} label={t.recite.legendCorrect} />
          <Legend color={theme.danger} label={`${t.recite.legendWrong} / ${t.recite.legendMissing} / ${t.recite.legendExtra}`} />
          <Legend color={theme.warning} label={t.recite.legendUncertain} />
        </View>

        {/* Verse */}
        {expected.ayat.map((a) => (
          <View key={a.aya} style={[styles.verse, { borderBottomColor: theme.border }]}>
            <View style={{ alignItems: 'flex-start' }}>
              <NumberBadge n={a.aya} size={32} />
            </View>
            <Text style={styles.arabic}>
              {a.from === 0 ? extrasAfter(-1) : null}
              {expected.display.slice(a.from, a.to).map((w, k) => {
                const i = a.from + k;
                return (
                  <Fragment key={i}>
                    <Text style={wordStyle(alignment.status[i], i)}>{w}</Text>
                    {k < a.to - a.from - 1 ? ' ' : ''}
                    {extrasAfter(i)}
                  </Fragment>
                );
              })}
            </Text>
          </View>
        ))}

        {/* Ergebnis */}
        {phase === 'done' && segs.length > 0 ? (
          <Card style={{ gap: Spacing.md }}>
            <AppText variant="heading">{demo ? t.recite.demoTitle : t.recite.resultTitle}</AppText>
            {demo ? (
              <AppText variant="caption" color="textSecondary">
                {t.recite.demoNote}
              </AppText>
            ) : null}
            <AppText
              variant="title"
              color={summary.wrong + summary.missing + summary.extra === 0 ? (summary.uncertain ? 'warning' : 'success') : 'text'}>
              {summary.correct + summary.wrong + summary.missing + summary.uncertain > 0
                ? `${Math.round((100 * summary.correct) / (summary.correct + summary.wrong + summary.missing + summary.uncertain))} %`
                : '–'}
            </AppText>
            <AppText color="textSecondary">
              {t.recite.resultLine(summary.correct, summary.correct + summary.wrong + summary.missing + summary.uncertain)}
              {summary.uncertain ? ` · ${t.recite.uncertainCount(summary.uncertain)}` : ''}
              {summary.extra ? ` · ${t.recite.extraWords(summary.extra)}` : ''}
            </AppText>
            {summary.repeats ? (
              <AppText variant="caption" color="textMuted">
                {t.recite.repeats(summary.repeats)}
              </AppText>
            ) : null}
            {mistakes.length === 0 ? (
              <AppText color="success">{t.recite.noMistakes}</AppText>
            ) : (
              <>
                <AppText variant="small" color="textSecondary">
                  {t.recite.mistakesTitle}
                </AppText>
                {mistakes.map((m) => (
                  <View key={m.aya} style={[styles.mistake, { borderColor: theme.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                      <AppText variant="label" style={{ flex: 1 }}>
                        {t.recite.verse(m.aya)}
                      </AppText>
                      <Pressable onPress={() => play(m.aya)} style={styles.listen} accessibilityRole="button" hitSlop={6}>
                        <Icon name="play-circle-outline" size={18} color={theme.primary} />
                        <AppText variant="caption" color="primary" style={{ fontWeight: '600' }}>
                          {t.recite.reference}
                        </AppText>
                      </Pressable>
                      {!demo && segmentsForRange(result, m.from, m.to).length ? (
                        <Pressable onPress={() => playMine(m.from, m.to)} style={styles.listen} accessibilityRole="button" hitSlop={6}>
                          <Icon name="account-voice" size={18} color={theme.primary} />
                          <AppText variant="caption" color="primary" style={{ fontWeight: '600' }}>
                            {t.recite.mine}
                          </AppText>
                        </Pressable>
                      ) : null}
                    </View>
                    {!demo ? (
                      <Pressable onPress={() => select(sura, m.aya)} style={styles.listen} accessibilityRole="button" hitSlop={6}>
                        <Icon name="restart" size={16} color={theme.primary} />
                        <AppText variant="caption" color="primary" style={{ fontWeight: '600' }}>
                          {t.recite.retryFrom}
                        </AppText>
                      </Pressable>
                    ) : null}
                    {m.notes.map((n) => (
                      <AppText
                        key={n.key}
                        variant="caption"
                        color={n.tone}
                        style={{ fontSize: 15, lineHeight: 24, textAlign: 'left', writingDirection: 'ltr' }}>
                        {n.text}
                      </AppText>
                    ))}
                  </View>
                ))}
              </>
            )}
            <Button title={t.recite.again} icon="restart" variant="secondary" onPress={reset} />
          </Card>
        ) : null}

        <AppText variant="caption" color="textMuted">
          {t.recite.limits}
        </AppText>
        {phase === 'idle' ? <Button title={t.recite.demo} icon="eye-outline" variant="ghost" onPress={showDemo} /> : null}

        {modelReady ? (
          <View style={{ gap: Spacing.sm }}>
            <Button title={t.recite.selfTest} icon="check-decagram-outline" variant="ghost" onPress={runSelfTest} />
            {testResult ? (
              <AppText variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
                {testResult}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </Screen>
      <MicBar
        phase={phase}
        busy={busy}
        checking={checking}
        level={level}
        disabled={!modelReady || progress !== null}
        summary={`${summary.correct} ✓ · ${summary.wrong + summary.missing + summary.extra} ✗${summary.uncertain ? ` · ${summary.uncertain} ?` : ''}`}
        onStart={start}
        onStop={stop}
      />

      <SuraPicker
        visible={pickerOpen}
        lang={lang}
        onClose={() => setPickerOpen(false)}
        onPick={(s) => {
          select(s, 1);
          setPickerOpen(false);
        }}
      />
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
        }}
      />
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
    </View>
  );
}

function MicBar({
  phase,
  busy,
  checking,
  level,
  disabled,
  summary,
  onStart,
  onStop,
}: {
  phase: Phase;
  busy: boolean;
  checking: boolean;
  level: number;
  disabled: boolean;
  summary: string;
  onStart: () => void;
  onStop: () => void;
}) {
  const t = useT();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const listening = phase === 'listening';
  const status =
    phase === 'loading'
      ? t.recite.loadingModel
      : checking
        ? t.recite.checking
        : listening
          ? busy
            ? t.recite.processing
            : t.recite.listening
          : phase === 'finishing'
            ? t.recite.processing
            : t.recite.start;
  return (
    <View
      style={[
        styles.micBar,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          bottom: Math.max(insets.bottom, Spacing.md),
        },
      ]}>
      <Pressable
        onPress={listening ? onStop : onStart}
        disabled={disabled || phase === 'loading' || phase === 'finishing'}
        accessibilityRole="button"
        accessibilityLabel={listening ? t.recite.stop : t.recite.start}
        style={({ pressed }) => [
          styles.mic,
          {
            backgroundColor: listening ? theme.danger : theme.primary,
            opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
            transform: [{ scale: listening ? 1 + level * 0.25 : 1 }],
          },
        ]}>
        {phase === 'loading' || phase === 'finishing' ? (
          <ActivityIndicator color={theme.onPrimary} />
        ) : (
          <Icon name={listening ? 'stop' : 'microphone'} size={30} color={theme.onPrimary} />
        )}
      </Pressable>
      <View style={{ flex: 1 }}>
        <AppText variant="label">{listening ? t.recite.stop : status}</AppText>
        <AppText variant="caption" color="textSecondary">
          {listening || phase === 'finishing' ? status : summary}
        </AppText>
      </View>
    </View>
  );
}

function SuraPicker({
  visible,
  lang,
  onClose,
  onPick,
}: {
  visible: boolean;
  lang: 'de' | 'tr';
  onClose: () => void;
  onPick: (s: number) => void;
}) {
  const t = useT();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const n = normalizeLatin(q.trim());
    return n ? SURAS.filter((s) => String(s.index) === n || normalizeLatin(suraTitle(s, lang).name).includes(n)) : SURAS;
  }, [q, lang]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          paddingTop: insets.top + Spacing.md,
        }}>
        <View style={[styles.pickerRow, { paddingHorizontal: Spacing.lg }]}>
          <AppText variant="heading" style={{ flex: 1 }}>
            {t.recite.chooseSura}
          </AppText>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={t.common.close}>
            <Icon name="close" />
          </Pressable>
        </View>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t.quran.searchPlaceholder}
          placeholderTextColor={theme.textMuted}
          style={[
            styles.search,
            {
              color: theme.text,
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        />
        <FlatList
          data={list}
          keyExtractor={(s) => String(s.index)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPick(item.index)}
              style={({ pressed }) => [
                styles.pickItem,
                {
                  borderBottomColor: theme.border,
                  backgroundColor: pressed ? theme.cardAlt : undefined,
                },
              ]}>
              <NumberBadge n={item.index} size={32} />
              <AppText style={{ flex: 1 }}>{suraTitle(item, lang).name}</AppText>
              <AppText
                style={{
                  fontFamily: Fonts.arabic,
                  fontSize: 20,
                  lineHeight: 34,
                }}
                color="primary">
                {item.name}
              </AppText>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  verse: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  arabic: {
    fontFamily: Fonts.arabic,
    fontSize: 26,
    lineHeight: 52,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  listen: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mistake: { gap: 4, paddingTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  micBar: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  mic: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    margin: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 16,
  },
  pickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
