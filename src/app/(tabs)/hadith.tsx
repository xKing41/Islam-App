import { router } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradePill, HadithListRow } from '@/components/hadith-list-row';
import { AppText, Icon, ListGroup, ListRow, SectionTitle } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { collectionCounts, getHadithIndex, hadithOfTheDay, rootCategories, searchHadiths, type SearchHit } from '@/lib/hadith/data';
import { COLLECTIONS, ROOT_TOPICS, sourceLine } from '@/lib/hadith/meta';
import { useHadithStore } from '@/store/hadith';
import { useSettings } from '@/store/settings';

export default function HadithScreen() {
  const t = useT();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const lang = useSettings((s) => s.language);
  const favorites = useHadithStore((s) => s.favorites);
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);

  const total = useMemo(() => getHadithIndex(lang).items.length, [lang]);
  const searching = query.trim().length >= 2;
  const hits = useMemo<SearchHit[]>(() => (deferred.trim().length >= 2 ? searchHadiths(lang, deferred) : []), [lang, deferred]);

  // Eine einzige Liste für Start und Suche – so bleibt das Suchfeld beim Tippen fokussiert.
  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{
        paddingHorizontal: Spacing.lg,
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: Spacing.xxl * 2,
        width: '100%',
        maxWidth: MaxContentWidth,
        alignSelf: 'center',
      }}
      data={searching ? hits : []}
      keyExtractor={(h) => String(h.item.id)}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ListHeaderComponent={
        <View style={{ gap: Spacing.lg, paddingBottom: Spacing.md }}>
          <View>
            <AppText variant="title">{t.hadith.title}</AppText>
            <AppText variant="caption" color="textSecondary">
              {t.hadith.count(total)} · HadeethEnc.com
            </AppText>
          </View>
          <View style={[styles.search, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Icon name="magnify" color={theme.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t.hadith.search}
              placeholderTextColor={theme.textMuted}
              style={{ flex: 1, paddingVertical: 11, color: theme.text, fontSize: 16 }}
              autoCorrect={false}
              returnKeyType="search"
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel={t.common.close}>
                <Icon name="close-circle" size={20} color={theme.textMuted} />
              </Pressable>
            ) : null}
          </View>
          {searching ? (
            <AppText variant="caption" color="textSecondary">
              {query === deferred ? t.hadith.results(hits.length) : '…'} · {t.hadith.searchHint}
            </AppText>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        searching && query === deferred ? (
          <AppText color="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.xl }}>
            {t.hadith.noResults}
          </AppText>
        ) : undefined
      }
      renderItem={({ item }) => <HadithListRow item={item.item} snippet={item.snippet} favorite={favorites.includes(item.item.id)} />}
      ListFooterComponent={searching ? undefined : <HadithHome favoritesCount={favorites.length} />}
    />
  );
}

function HadithHome({ favoritesCount }: { favoritesCount: number }) {
  const t = useT();
  const theme = useTheme();
  const lang = useSettings((s) => s.language);
  const daily = useMemo(() => hadithOfTheDay(lang), [lang]);
  const roots = useMemo(() => rootCategories(lang), [lang]);
  const counts = useMemo(() => collectionCounts(lang), [lang]);

  return (
    <View style={{ gap: Spacing.lg }}>
      {/* Hadith des Tages */}
      <Pressable
        onPress={() => router.push({ pathname: '/hadith/[id]', params: { id: daily.id } })}
        accessibilityRole="button"
        style={({ pressed }) => [styles.daily, { backgroundColor: theme.accentSoft, opacity: pressed ? 0.9 : 1 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Icon name="calendar-star" size={18} color={theme.accent} />
          <AppText variant="small" color="accent">
            {t.hadith.ofTheDay}
          </AppText>
        </View>
        <AppText style={{ fontSize: 17, lineHeight: 25 }} numberOfLines={5}>
          {daily.title}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <GradePill g={daily.g} />
          <AppText variant="caption" color="textSecondary" style={{ flex: 1 }} numberOfLines={1}>
            {sourceLine(daily, lang)}
          </AppText>
          <Icon name="chevron-right" color={theme.textMuted} />
        </View>
      </Pressable>

      {/* Themen */}
      <SectionTitle>{t.hadith.topics}</SectionTitle>
      <View style={{ gap: Spacing.sm }}>
        {roots.map((c) => {
          const meta = ROOT_TOPICS[c.id];
          return (
            <Pressable
              key={c.id}
              onPress={() => router.push({ pathname: '/hadith/category/[id]', params: { id: c.id } })}
              accessibilityRole="button"
              style={({ pressed }) => [styles.card, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 }]}>
              <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
                <Icon name={meta?.icon ?? 'format-quote-open'} color={theme.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="label" numberOfLines={1}>
                  {meta ? meta.name[lang] : c.title}
                </AppText>
                <AppText variant="caption" color="textSecondary" numberOfLines={2}>
                  {meta ? meta.sub[lang] : ''}
                </AppText>
              </View>
              <AppText variant="caption" color="textMuted">
                {c.count}
              </AppText>
              <Icon name="chevron-right" color={theme.textMuted} />
            </Pressable>
          );
        })}
      </View>

      {/* Sammlungen */}
      <SectionTitle>{t.hadith.collections}</SectionTitle>
      <View style={styles.grid}>
        {COLLECTIONS.filter((c) => counts[c.key] > 0).map((c) => (
          <Pressable
            key={c.key}
            onPress={() => router.push({ pathname: '/hadith/collection/[key]', params: { key: c.key } })}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.tile,
              {
                backgroundColor: c.key === 'mt' ? theme.primarySoft : theme.card,
                borderColor: theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <AppText variant="label" numberOfLines={2} color={c.key === 'mt' ? 'primary' : 'text'}>
              {c.name[lang]}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {t.hadith.count(counts[c.key])}
            </AppText>
          </Pressable>
        ))}
      </View>

      <ListGroup>
        <ListRow
          icon="star-outline"
          iconColor={theme.accent}
          title={t.hadith.favorites}
          subtitle={t.hadith.count(favoritesCount)}
          chevron
          last
          onPress={() => router.push('/hadith/favorites')}
        />
      </ListGroup>

      <AppText variant="caption" color="textMuted" style={{ textAlign: 'center' }}>
        {t.hadith.sourceNote}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
  },
  daily: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 42, height: 42, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: 4,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 72,
    justifyContent: 'space-between',
  },
});
