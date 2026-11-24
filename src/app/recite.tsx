import {
  type AudioStreamBuffer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioStream,
} from 'expo-audio';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { alignWords, stripFormulas, summarize, toWords, type WordStatus } from '@/lib/recite/align';
import { getWhisper, releaseWhisper, selfTest, transcribePcm } from '@/lib/recite/engine';
import { downloadModel, isModelReady, MODEL } from '@/lib/recite/model';
import { resampleTo16k, Segmenter } from '@/lib/recite/segmenter';
import { useQuranStore } from '@/store/quran';
import { useSettings } from '@/store/settings';

type Phase = 'idle' | 'loading' | 'listening' | 'finishing' | 'done';

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
  return {
    words,
    display,
    ayat,
    startsWithBasmala: sura === 1 && startAya === 1,
  };
}

export default function ReciteScreen() {
  const t = useT();
  const theme = useTheme();
  const params = useLocalSearchParams<{ sura?: string; aya?: string }>();
  const lastRead = useQuranStore((s) => s.lastRead);
  const lang = useSettings((s) => s.language);
  const reciter = useSettings((s) => s.reciter);

  const [sura, setSura] = useState(() => Number(params.sura) || lastRead?.sura || 1);
  const [startAya, setStartAya] = useState(() => (params.sura ? Number(params.aya) || 1 : lastRead?.aya || 1));
  const [hidden, setHidden] = useState(false);
  const [modelReady, setModelReady] = useState(() => isModelReady());
  const [progress, setProgress] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [heard, setHeard] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const segmenter = useRef<Segmenter | null>(null);
  const queue = useRef<Int16Array[]>([]);
  const processing = useRef(false);
  const stopped = useRef(true);
  const heardRef = useRef<string[]>([]);
  const lastLevel = useRef(0);

  const meta = getSuraMeta(sura);
  const expected = useMemo(() => buildExpected(sura, startAya), [sura, startAya]);
  const alignment = useMemo(
    () => alignWords(expected.words, stripFormulas(heard, expected.startsWithBasmala)),
    [expected, heard],
  );
  const summary = summarize(alignment);
  const player = useAudioPlayer();

  const reset = useCallback(() => {
    heardRef.current = [];
    setHeard([]);
    setError(null);
    setPhase('idle');
  }, []);

  useEffect(() => {
    reset();
  }, [sura, startAya, reset]);

  const processQueue = useCallback(async () => {
    if (processing.current) return;
    processing.current = true;
    setBusy(true);
    try {
      while (queue.current.length) {
        const seg = queue.current.shift()!;
        const text = await transcribePcm(seg);
        console.log('[Rezitation] erkannt:', text);
        heardRef.current = [...heardRef.current, ...toWords(text)];
        setHeard(heardRef.current);
      }
    } catch (e) {
      setError(`${t.recite.error} ${String(e)}`);
    } finally {
      processing.current = false;
      setBusy(false);
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
    heardRef.current = [];
    setHeard([]);
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
    },
    [stream],
  );

  async function loadModel() {
    setError(null);
    setProgress(0);
    try {
      await downloadModel((f) => setProgress(f));
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
      console.log('[Selbsttest] erkannt:', r.text, `${r.ms} ms`);
      setTestResult(t.recite.selfTestResult(r.text.trim(), (r.ms / 1000).toFixed(1)));
    } catch (e) {
      console.log('[Selbsttest] Fehler', String(e));
      setTestResult(`${t.recite.error} ${String(e)}`);
    }
  }

  function play(aya: number) {
    player.replace({ uri: ayahAudioUrl(reciter, sura, aya) });
    player.play();
  }

  const listening = phase === 'listening';
  const title = suraTitle(meta, lang);
  const mistakes = expected.ayat
    .map((a) => ({
      aya: a.aya,
      items: alignment.status
        .slice(a.from, a.to)
        .map((s, k) => ({ s, i: a.from + k }))
        .filter((x) => x.s === 'wrong' || x.s === 'missing'),
    }))
    .filter((a) => a.items.length);

  const wordStyle = (s: WordStatus, i: number) => {
    if (s === 'correct') return { color: theme.success };
    if (s === 'wrong') return { color: theme.danger, textDecorationLine: 'underline' as const };
    if (s === 'missing')
      return {
        color: theme.accent,
        textDecorationLine: 'line-through' as const,
      };
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
            <Stepper signed={false} value={startAya} min={1} max={meta.ayas} onChange={(v) => !listening && setStartAya(v)} />
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
            gap: Spacing.lg,
            justifyContent: 'center',
          }}>
          <Legend color={theme.success} label={t.recite.legendCorrect} />
          <Legend color={theme.danger} label={t.recite.legendWrong} />
          <Legend color={theme.accent} label={t.recite.legendMissing} />
        </View>

        {/* Verse */}
        {expected.ayat.map((a) => (
          <View key={a.aya} style={[styles.verse, { borderBottomColor: theme.border }]}>
            <View style={{ alignItems: 'flex-start' }}>
              <NumberBadge n={a.aya} size={32} />
            </View>
            <Text style={styles.arabic}>
              {expected.display.slice(a.from, a.to).map((w, k) => {
                const i = a.from + k;
                return (
                  <Text key={i} style={wordStyle(alignment.status[i], i)}>
                    {w}
                    {k < a.to - a.from - 1 ? ' ' : ''}
                  </Text>
                );
              })}
            </Text>
          </View>
        ))}

        {/* Ergebnis */}
        {phase === 'done' && heard.length > 0 ? (
          <Card style={{ gap: Spacing.md }}>
            <AppText variant="heading">{t.recite.resultTitle}</AppText>
            <AppText variant="title" color={summary.wrong + summary.missing === 0 ? 'success' : 'text'}>
              {summary.correct + summary.wrong + summary.missing > 0
                ? `${Math.round((100 * summary.correct) / (summary.correct + summary.wrong + summary.missing))} %`
                : '–'}
            </AppText>
            <AppText color="textSecondary">
              {t.recite.resultLine(summary.correct, summary.correct + summary.wrong + summary.missing)}
              {summary.extra ? ` · ${t.recite.extraWords(summary.extra)}` : ''}
            </AppText>
            {mistakes.length === 0 ? (
              <AppText color="success">{t.recite.noMistakes}</AppText>
            ) : (
              mistakes.map((m) => (
                <View key={m.aya} style={{ gap: 4 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                    <AppText variant="label">{t.recite.verse(m.aya)}</AppText>
                    <Pressable onPress={() => play(m.aya)} style={styles.listen} accessibilityRole="button">
                      <Icon name="play-circle-outline" size={18} color={theme.primary} />
                      <AppText variant="caption" color="primary" style={{ fontWeight: '600' }}>
                        {t.recite.listen}
                      </AppText>
                    </Pressable>
                  </View>
                  {m.items.map((x) => (
                    <AppText key={x.i} variant="caption" color={x.s === 'wrong' ? 'danger' : 'accent'} style={{ fontSize: 15 }}>
                      {x.s === 'wrong'
                        ? t.recite.wrongWord(expected.display[x.i], alignment.heardFor[x.i] ?? '')
                        : t.recite.missingWord(expected.display[x.i])}
                    </AppText>
                  ))}
                </View>
              ))
            )}
            <Button title={t.recite.again} icon="restart" variant="secondary" onPress={reset} />
          </Card>
        ) : null}

        <AppText variant="caption" color="textMuted">
          {t.recite.limits}
        </AppText>

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
        level={level}
        disabled={!modelReady || progress !== null}
        summary={`${summary.correct} ✓ · ${summary.wrong} ✗ · ${summary.missing} –`}
        onStart={start}
        onStop={stop}
      />

      <SuraPicker
        visible={pickerOpen}
        lang={lang}
        onClose={() => setPickerOpen(false)}
        onPick={(s) => {
          setSura(s);
          setStartAya(1);
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
  level,
  disabled,
  summary,
  onStart,
  onStop,
}: {
  phase: Phase;
  busy: boolean;
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
