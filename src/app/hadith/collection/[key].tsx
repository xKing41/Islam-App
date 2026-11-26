import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useMemo } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

import { HadithListRow } from '@/components/hadith-list-row';
import { AppText } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { groupByRoot, hadithsInCollection, type CollectionFilter } from '@/lib/hadith/data';
import { collectionMeta, ROOT_TOPICS } from '@/lib/hadith/meta';
import { useHadithStore } from '@/store/hadith';
import { useSettings } from '@/store/settings';

/** Alle Hadithe einer Sammlung (z. B. Sahih Muslim), gegliedert nach Hauptthemen. */
export default function HadithCollectionScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const t = useT();
  const theme = useTheme();
  const lang = useSettings((s) => s.language);
  const favorites = useHadithStore((s) => s.favorites);
  const meta = collectionMeta(key as CollectionFilter);
  const items = useMemo(() => hadithsInCollection(lang, key as CollectionFilter), [lang, key]);
  const sections = useMemo(() => groupByRoot(lang, items), [lang, items]);
  const from = `col:${key}`;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: meta.name[lang] }} />
      <SectionList
        sections={sections.map((s) => ({
          key: String(s.category?.id ?? 'rest'),
          title: s.category ? (ROOT_TOPICS[s.category.id]?.name[lang] ?? s.category.title) : t.hadith.general,
          count: s.items.length,
          data: s.items,
        }))}
        keyExtractor={(h) => String(h.id)}
        contentContainerStyle={styles.container}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={{ gap: Spacing.sm, paddingBottom: Spacing.sm }}>
            <AppText variant="title" style={{ fontSize: 24, lineHeight: 30 }}>
              {meta.name[lang]}
            </AppText>
            <AppText color="textSecondary">{meta.author[lang]}</AppText>
            <AppText variant="caption" color="textMuted">
              {t.hadith.inCollection(items.length)} · {t.hadith.collectionNote}
            </AppText>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: theme.primarySoft }]}>
            <AppText variant="label" color="primary" style={{ flex: 1 }}>
              {section.title}
            </AppText>
            <AppText variant="caption" color="primary">
              {section.count}
            </AppText>
          </View>
        )}
        renderItem={({ item }) => <HadithListRow item={item} favorite={favorites.includes(item.id)} from={from} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.lg,
  },
});
