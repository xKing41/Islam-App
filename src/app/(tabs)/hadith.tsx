import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HadithListRow } from '@/components/hadith-list-row';
import { AppText, Icon, Segmented } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { getHadithIndex, rootCategories, searchHadiths } from '@/lib/hadith/data';
import type { HadithCategory, HadithListItem } from '@/lib/hadith/types';
import { useHadithStore } from '@/store/hadith';
import { useSettings } from '@/store/settings';

type Mode = 'topics' | 'favorites';

export default function HadithScreen() {
  const t = useT();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const lang = useSettings((s) => s.language);
  const favorites = useHadithStore((s) => s.favorites);
  const [mode, setMode] = useState<Mode>('topics');
  const [query, setQuery] = useState('');

  const roots = useMemo(() => rootCategories(lang), [lang]);
  const total = useMemo(() => getHadithIndex(lang).items.length, [lang]);
  const results = useMemo(() => searchHadiths(lang, query), [lang, query]);
  const favItems = useMemo(() => {
    const items = getHadithIndex(lang).items;
    return favorites.map((id) => items.find((h) => h.id === id)).filter(Boolean) as HadithListItem[];
  }, [favorites, lang]);

  const searching = query.trim().length >= 2;

  const header = (
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
        />
      </View>
      {!searching ? (
        <Segmented<Mode>
          options={[
            { value: 'topics', label: t.hadith.categories },
            { value: 'favorites', label: t.hadith.favorites },
          ]}
          value={mode}
          onChange={setMode}
        />
      ) : null}
    </View>
  );

  const container = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
    width: '100%' as const,
    maxWidth: MaxContentWidth,
    alignSelf: 'center' as const,
  };

  if (searching || mode === 'favorites') {
    const data = searching ? results : favItems;
    return (
      <FlatList
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={container}
        data={data}
        keyExtractor={(h) => String(h.id)}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <AppText color="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.xl }}>
            {searching ? t.hadith.noResults : t.hadith.noFavorites}
          </AppText>
        }
        renderItem={({ item }) => <HadithListRow item={item} favorite={favorites.includes(item.id)} />}
      />
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={container}
      data={roots}
      keyExtractor={(c) => String(c.id)}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      renderItem={({ item }) => <CategoryCard c={item} />}
      ListFooterComponent={
        <AppText variant="caption" color="textMuted" style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
          {t.hadith.sourceNote}
        </AppText>
      }
    />
  );
}

const ICONS = ['book-open-page-variant', 'script-text-outline', 'star-crescent', 'scale-balance', 'heart-outline', 'bullhorn-outline', 'history'] as const;

function CategoryCard({ c }: { c: HadithCategory }) {
  const theme = useTheme();
  const t = useT();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/hadith/category/[id]', params: { id: c.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 }]}>
      <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
        <Icon name={ICONS[(c.id - 1) % ICONS.length]} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="label" numberOfLines={2}>
          {c.title}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {t.hadith.count(c.count)}
        </AppText>
      </View>
      <Icon name="chevron-right" color={theme.textMuted} />
    </Pressable>
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
});
