import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, type ListViewToken, Pressable, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NumberBadge } from '@/components/ayah-badge';
import { AppText, Button, Icon } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { getReciter } from '@/lib/quran/audio';
import { getSura, TRANSLATIONS } from '@/lib/quran/data';
import { getSuraMeta, isSajda, suraTitle } from '@/lib/quran/meta';
import { splitBasmala, toArabicDigits } from '@/lib/quran/text';
import { useQuranPlayer } from '@/lib/quran/use-quran-player';
import { useQuranStore } from '@/store/quran';
import { useSettings } from '@/store/settings';

type AyahRow = { aya: number; arabic: string; translation: string };

export default function SuraReader() {
  const params = useLocalSearchParams<{ id: string; aya?: string }>();
  const sura = Math.min(114, Math.max(1, Number(params.id) || 1));
  const startAya = Number(params.aya) || 1;
  const t = useT();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const lang = useSettings((s) => s.language);
  const translationKey = useSettings((s) => (s.language === 'tr' ? s.translationTr : s.translationDe));
  const showTranslation = useSettings((s) => s.showTranslation);
  const arabicSize = useSettings((s) => s.arabicFontSize);
  const translationSize = useSettings((s) => s.translationFontSize);
  const reciterId = useSettings((s) => s.reciter);
  const keepAwake = useSettings((s) => s.keepAwake);
  const bookmarks = useQuranStore((s) => s.bookmarks);
  const toggleBookmark = useQuranStore((s) => s.toggleBookmark);
  const setLastRead = useQuranStore((s) => s.setLastRead);

  const meta = getSuraMeta(sura);
  const title = suraTitle(meta, lang);
  const data = useMemo(() => getSura(sura), [sura]);
  const [selected, setSelected] = useState<number | null>(null);
  const listRef = useRef<FlatList<AyahRow>>(null);

  const rows: AyahRow[] = useMemo(
    () =>
      data.ar.map((ar, i) => ({
        aya: i + 1,
        arabic: splitBasmala(sura, i + 1, ar).rest,
        translation: data[translationKey][i],
      })),
    [data, sura, translationKey]
  );
  const basmala = splitBasmala(sura, 1, data.ar[0]).basmala;

  const player = useQuranPlayer(sura, meta.ayas, reciterId, (aya) => `${title.name} · ${t.reader.verse(aya)}`);

  // Bildschirm beim Lesen anlassen
  useEffect(() => {
    if (!keepAwake) return;
    activateKeepAwakeAsync('reader').catch(() => {});
    return () => {
      deactivateKeepAwake('reader').catch(() => {});
    };
  }, [keepAwake]);

  // Zum gewünschten Vers springen
  useEffect(() => {
    if (startAya <= 1) return;
    const id = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: Math.min(startAya, meta.ayas) - 1, animated: false, viewPosition: 0 });
    }, 250);
    return () => clearTimeout(id);
  }, [startAya, meta.ayas, sura]);

  // Beim Abspielen mitscrollen
  useEffect(() => {
    if (player.state.currentAya) {
      listRef.current?.scrollToIndex({ index: player.state.currentAya - 1, animated: true, viewPosition: 0.3 });
    }
  }, [player.state.currentAya]);

  // Zuletzt gelesenen Vers merken
  const onViewable = useRef(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const first = viewableItems.find((v) => v.isViewable && v.item);
    const row = first?.item as AyahRow | undefined;
    if (row) setLastReadRef.current(sura, row.aya);
  });
  const setLastReadRef = useRef(setLastRead);
  setLastReadRef.current = setLastRead;

  const bookmarked = useMemo(() => new Set(bookmarks.filter((b) => b.sura === sura).map((b) => b.aya)), [bookmarks, sura]);

  const share = useCallback(
    (row: AyahRow) => {
      Share.share({
        message: `${data.ar[row.aya - 1]}\n\n${row.translation}\n\n— ${title.name} ${sura}:${row.aya} (${TRANSLATIONS[translationKey].name})`,
      }).catch(() => {});
    },
    [data.ar, sura, title.name, translationKey]
  );

  const renderItem = useCallback(
    ({ item }: { item: AyahRow }) => (
      <AyahItem
        row={item}
        sura={sura}
        arabicSize={arabicSize}
        translationSize={translationSize}
        showTranslation={showTranslation}
        playing={player.state.currentAya === item.aya}
        bookmarked={bookmarked.has(item.aya)}
        selected={selected === item.aya}
        onPress={() => setSelected((s) => (s === item.aya ? null : item.aya))}
        onBookmark={() => toggleBookmark(sura, item.aya)}
        onPlay={() => {
          setSelected(null);
          player.playFrom(item.aya);
        }}
        onShare={() => share(item)}
      />
    ),
    [sura, arabicSize, translationSize, showTranslation, player, bookmarked, selected, toggleBookmark, share]
  );

  const header = (
    <View style={[styles.banner, { backgroundColor: theme.primary }]}>
      <AppText style={{ fontFamily: Fonts.arabicBold, fontSize: 34, lineHeight: 56, color: theme.onPrimary }}>
        {meta.name}
      </AppText>
      <AppText variant="heading" style={{ color: theme.onPrimary }}>
        {title.name}
      </AppText>
      <AppText variant="caption" style={{ color: theme.onPrimary, opacity: 0.85 }}>
        {title.meaning} · {t.quran.ayahCount(meta.ayas)} · {meta.type === 'Meccan' ? t.quran.meccan : t.quran.medinan}
      </AppText>
      {basmala ? (
        <AppText style={{ fontFamily: Fonts.quran, fontSize: 26, lineHeight: 52, color: theme.onPrimary, marginTop: Spacing.sm }}>
          {basmala}
        </AppText>
      ) : null}
    </View>
  );

  const footer = (
    <View style={{ gap: Spacing.md, paddingVertical: Spacing.xl }}>
      {showTranslation ? (
        <AppText variant="caption" color="textMuted" style={{ textAlign: 'center' }}>
          {t.reader.translationBy(`${TRANSLATIONS[translationKey].name} (${TRANSLATIONS[translationKey].source})`)}
        </AppText>
      ) : null}
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        {sura > 1 ? (
          <Button
            title={t.reader.prevSura}
            icon="chevron-left"
            variant="ghost"
            style={{ flex: 1 }}
            onPress={() => router.replace({ pathname: '/sura/[id]', params: { id: sura - 1 } })}
          />
        ) : null}
        {sura < 114 ? (
          <Button
            title={t.reader.nextSura}
            icon="chevron-right"
            variant="ghost"
            style={{ flex: 1 }}
            onPress={() => router.replace({ pathname: '/sura/[id]', params: { id: sura + 1 } })}
          />
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: `${sura}. ${title.name}` }} />
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(r) => String(r.aya)}
        renderItem={renderItem}
        extraData={[selected, player.state.currentAya, bookmarked]}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: 120 + insets.bottom,
          width: '100%',
          maxWidth: MaxContentWidth,
          alignSelf: 'center',
        }}
        initialNumToRender={Math.min(meta.ayas, Math.max(10, startAya + 3))}
        windowSize={11}
        onViewableItemsChanged={onViewable.current}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
          setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: false }), 300);
        }}
      />
      <AudioBar
        player={player}
        reciterName={getReciter(reciterId).name}
        bottomInset={insets.bottom}
        onStart={() => player.playFrom(1)}
      />
    </View>
  );
}

const AyahItem = memo(function AyahItem({
  row,
  sura,
  arabicSize,
  translationSize,
  showTranslation,
  playing,
  bookmarked,
  selected,
  onPress,
  onBookmark,
  onPlay,
  onShare,
}: {
  row: AyahRow;
  sura: number;
  arabicSize: number;
  translationSize: number;
  showTranslation: boolean;
  playing: boolean;
  bookmarked: boolean;
  selected: boolean;
  onPress: () => void;
  onBookmark: () => void;
  onPlay: () => void;
  onShare: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const sajda = isSajda(sura, row.aya);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.ayah,
        { borderBottomColor: theme.border },
        (playing || selected) && { backgroundColor: playing ? theme.highlight : theme.cardAlt },
      ]}>
      <View style={styles.ayahTop}>
        <NumberBadge n={row.aya} size={34} active={playing} />
        <View style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }}>
          {sajda ? (
            <AppText variant="caption" color="accent">
              ۩ {t.quran.sajda}
            </AppText>
          ) : null}
          {bookmarked ? <Icon name="bookmark" size={20} color={theme.accent} /> : null}
        </View>
      </View>
      <AppText
        style={{
          fontFamily: Fonts.quran,
          fontSize: arabicSize,
          lineHeight: Math.round(arabicSize * 2),
          textAlign: 'right',
          writingDirection: 'rtl',
        }}>
        {row.arabic} {'۝' + toArabicDigits(row.aya)}
      </AppText>
      {showTranslation ? (
        <AppText color="textSecondary" style={{ fontSize: translationSize, lineHeight: Math.round(translationSize * 1.5) }}>
          {row.translation}
        </AppText>
      ) : null}
      {selected ? (
        <View style={styles.actions}>
          <ActionButton icon={bookmarked ? 'bookmark-remove' : 'bookmark-plus-outline'} label={bookmarked ? t.reader.removeBookmark : t.reader.bookmark} onPress={onBookmark} />
          <ActionButton icon="play-circle-outline" label={t.reader.playFromHere} onPress={onPlay} />
          <ActionButton icon="share-variant-outline" label={t.reader.share} onPress={onShare} />
        </View>
      ) : null}
    </Pressable>
  );
});

function ActionButton({ icon, label, onPress }: { icon: Parameters<typeof Icon>[0]['name']; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.action, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}>
      <Icon name={icon} size={20} color={theme.primary} />
      <AppText variant="caption" color="primary" numberOfLines={1} style={{ fontWeight: '600' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

function AudioBar({
  player,
  reciterName,
  bottomInset,
  onStart,
}: {
  player: ReturnType<typeof useQuranPlayer>;
  reciterName: string;
  bottomInset: number;
  onStart: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { state } = player;
  return (
    <View
      style={[
        styles.audioBar,
        { backgroundColor: theme.card, borderColor: theme.border, bottom: Math.max(bottomInset, Spacing.md) },
      ]}>
      {!state.active ? (
        <Pressable onPress={onStart} style={styles.audioStart} accessibilityRole="button" accessibilityLabel={t.audio.play}>
          <View style={[styles.playBtn, { backgroundColor: theme.primary }]}>
            <Icon name="play" color={theme.onPrimary} size={26} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="label">{t.audio.play}</AppText>
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {reciterName}
            </AppText>
          </View>
        </Pressable>
      ) : (
        <View style={styles.audioStart}>
          <View style={{ flex: 1 }}>
            <AppText variant="label">{state.currentAya ? t.reader.verse(state.currentAya) : 'Basmala'}</AppText>
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {state.buffering ? t.audio.loading : reciterName}
            </AppText>
          </View>
          <Pressable onPress={() => player.setRepeat(!state.repeat)} hitSlop={8} accessibilityLabel={t.audio.repeatAyah}>
            <Icon name={state.repeat ? 'repeat-once' : 'repeat-off'} color={state.repeat ? theme.accent : theme.textMuted} />
          </Pressable>
          <Pressable onPress={player.previous} hitSlop={8} accessibilityLabel="previous">
            <Icon name="skip-previous" size={28} color={theme.text} />
          </Pressable>
          <Pressable onPress={player.toggle} accessibilityLabel={state.playing ? t.audio.pause : t.audio.play}>
            <View style={[styles.playBtn, { backgroundColor: theme.primary }]}>
              {state.buffering && !state.playing ? (
                <ActivityIndicator color={theme.onPrimary} />
              ) : (
                <Icon name={state.playing ? 'pause' : 'play'} color={theme.onPrimary} size={26} />
              )}
            </View>
          </Pressable>
          <Pressable onPress={player.next} hitSlop={8} accessibilityLabel="next">
            <Icon name="skip-next" size={28} color={theme.text} />
          </Pressable>
          <Pressable onPress={player.stop} hitSlop={8} accessibilityLabel={t.audio.stop}>
            <Icon name="stop" size={24} color={theme.textMuted} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: Radius.lg,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: 2,
  },
  ayah: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
  },
  ayahTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  audioBar: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.sm,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  audioStart: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingRight: Spacing.sm },
  playBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
