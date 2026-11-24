import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NumberBadge } from '@/components/ayah-badge';
import { AppText, Card, Icon, Segmented } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { getSura } from '@/lib/quran/data';
import { getSuraMeta, JUZ, SURAS, suraTitle } from '@/lib/quran/meta';
import { normalizeLatin } from '@/lib/quran/text';
import type { SuraMeta } from '@/lib/quran/types';
import { useQuranStore } from '@/store/quran';
import { useSettings } from '@/store/settings';

type Mode = 'suras' | 'juz' | 'bookmarks';

export default function QuranScreen() {
  const t = useT();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const lang = useSettings((s) => s.language);
  const translationKey = useSettings((s) => (s.language === 'tr' ? s.translationTr : s.translationDe));
  const bookmarks = useQuranStore((s) => s.bookmarks);
  const lastRead = useQuranStore((s) => s.lastRead);
  const [mode, setMode] = useState<Mode>('suras');
  const [query, setQuery] = useState('');

  const suras = useMemo(() => {
    const q = normalizeLatin(query.trim());
    if (!q) return SURAS;
    return SURAS.filter(
      (s) =>
        String(s.index) === q ||
        normalizeLatin(s.nameDe).includes(q) ||
        normalizeLatin(s.nameTr).includes(q) ||
        normalizeLatin(s.meaningDe).includes(q) ||
        normalizeLatin(s.meaningTr).includes(q) ||
        s.name.includes(query.trim())
    );
  }, [query]);

  const open = (sura: number, aya?: number) =>
    router.push({ pathname: '/sura/[id]', params: aya ? { id: sura, aya } : { id: sura } });

  const header = (
    <View style={{ gap: Spacing.lg, paddingBottom: Spacing.md }}>
      <AppText variant="title">{t.quran.title}</AppText>
      {lastRead ? (
        <Pressable onPress={() => open(lastRead.sura, lastRead.aya)} accessibilityRole="button">
          <Card tone="primary" style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <Icon name="book-open-page-variant" color={theme.onPrimary} size={28} />
            <View style={{ flex: 1 }}>
              <AppText variant="small" style={{ color: theme.onPrimary, opacity: 0.85 }}>
                {t.quran.continueReading}
              </AppText>
              <AppText variant="heading" style={{ color: theme.onPrimary }}>
                {t.quran.lastRead(suraTitle(getSuraMeta(lastRead.sura), lang).name, lastRead.aya)}
              </AppText>
            </View>
            <Icon name="chevron-right" color={theme.onPrimary} />
          </Card>
        </Pressable>
      ) : null}
      <Segmented<Mode>
        options={[
          { value: 'suras', label: t.quran.surahs },
          { value: 'juz', label: t.quran.juz },
          { value: 'bookmarks', label: t.quran.bookmarks },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'suras' ? (
        <View style={[styles.search, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Icon name="magnify" color={theme.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.quran.searchPlaceholder}
            placeholderTextColor={theme.textMuted}
            style={{ flex: 1, paddingVertical: 11, color: theme.text, fontSize: 16 }}
            autoCorrect={false}
          />
        </View>
      ) : null}
    </View>
  );

  const container = { paddingHorizontal: Spacing.lg, paddingTop: insets.top + Spacing.lg, paddingBottom: Spacing.xxl * 2 };
  const wrap = { width: '100%' as const, maxWidth: MaxContentWidth, alignSelf: 'center' as const };

  if (mode === 'juz') {
    return (
      <FlatList
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[container, wrap]}
        data={JUZ}
        keyExtractor={(j) => String(j.index)}
        ListHeaderComponent={header}
        renderItem={({ item }) => {
          const s = getSuraMeta(item.sura);
          return (
            <Row onPress={() => open(item.sura, item.aya)}>
              <NumberBadge n={item.index} />
              <View style={{ flex: 1 }}>
                <AppText variant="label">{t.quran.juzN(item.index)}</AppText>
                <AppText variant="caption" color="textSecondary">
                  {suraTitle(s, lang).name} {item.sura}:{item.aya}
                </AppText>
              </View>
              <Icon name="chevron-right" color={theme.textMuted} />
            </Row>
          );
        }}
      />
    );
  }

  if (mode === 'bookmarks') {
    return (
      <FlatList
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[container, wrap]}
        data={bookmarks}
        keyExtractor={(b) => `${b.sura}:${b.aya}`}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <AppText color="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.xl }}>
            {t.quran.noBookmarks}
          </AppText>
        }
        renderItem={({ item }) => {
          const s = getSuraMeta(item.sura);
          const text = getSura(item.sura)[translationKey][item.aya - 1];
          return (
            <Row onPress={() => open(item.sura, item.aya)}>
              <Icon name="bookmark" color={theme.accent} />
              <View style={{ flex: 1 }}>
                <AppText variant="label">
                  {suraTitle(s, lang).name} · {t.reader.verse(item.aya)}
                </AppText>
                <AppText variant="caption" color="textSecondary" numberOfLines={2}>
                  {text}
                </AppText>
              </View>
            </Row>
          );
        }}
      />
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[container, wrap]}
      data={suras}
      keyExtractor={(s) => String(s.index)}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={20}
      renderItem={({ item }) => <SuraRow s={item} lang={lang} onPress={() => open(item.index)} />}
    />
  );
}

function Row({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border, backgroundColor: pressed ? theme.cardAlt : 'transparent' },
      ]}>
      {children}
    </Pressable>
  );
}

function SuraRow({ s, lang, onPress }: { s: SuraMeta; lang: 'de' | 'tr'; onPress: () => void }) {
  const t = useT();
  const title = suraTitle(s, lang);
  return (
    <Row onPress={onPress}>
      <NumberBadge n={s.index} />
      <View style={{ flex: 1, gap: 1 }}>
        <AppText variant="label">{title.name}</AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {title.meaning} · {t.quran.ayahCount(s.ayas)} · {s.type === 'Meccan' ? t.quran.meccan : t.quran.medinan}
        </AppText>
      </View>
      <AppText style={{ fontFamily: Fonts.arabic, fontSize: 22, lineHeight: 34 }} color="primary">
        {s.name}
      </AppText>
    </Row>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
  },
});
