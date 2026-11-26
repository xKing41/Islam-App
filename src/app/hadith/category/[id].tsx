import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useMemo } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';

import { HadithListRow } from '@/components/hadith-list-row';
import { AppText, Icon, ListGroup, ListRow, SectionTitle } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { categoryPath, childCategories, getCategory, hasGrandchildren, topicSections } from '@/lib/hadith/data';
import { ROOT_TOPICS } from '@/lib/hadith/meta';
import type { HadithCategory } from '@/lib/hadith/types';
import { useHadithStore } from '@/store/hadith';
import { useSettings } from '@/store/settings';

/**
 * Thema: oben der Pfad (Brotkrumen). Hat das Thema mehrere Ebenen darunter, erscheinen zuerst die
 * Unterthemen; sonst gleich alle Hadithe, gegliedert nach Unterthemen.
 */
export default function HadithCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catId = Number(id);
  const t = useT();
  const theme = useTheme();
  const lang = useSettings((s) => s.language);
  const favorites = useHadithStore((s) => s.favorites);
  const category = getCategory(lang, catId);
  const path = useMemo(() => categoryPath(lang, catId), [lang, catId]);
  // Große Themen mit mehreren Ebenen: zuerst Unterthemen wählen. Kleinere Themen: alles auf einer Seite.
  const navigate = useMemo(() => hasGrandchildren(lang, catId) && (getCategory(lang, catId)?.count ?? 0) > 40, [lang, catId]);
  const children = useMemo(() => childCategories(lang, catId), [lang, catId]);
  const sections = useMemo(() => topicSections(lang, catId), [lang, catId]);

  const title = (c: HadithCategory | undefined) => (c && c.parent === null && ROOT_TOPICS[c.id] ? ROOT_TOPICS[c.id].name[lang] : (c?.title ?? ''));
  const from = `cat:${catId}`;

  const header = (
    <View style={{ gap: Spacing.md, paddingBottom: Spacing.sm }}>
      {path.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', gap: 4 }}>
          {path.slice(0, -1).map((c) => (
            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Pressable onPress={() => router.push({ pathname: '/hadith/category/[id]', params: { id: c.id } })} hitSlop={6}>
                <AppText variant="caption" color="primary" style={{ fontWeight: '600' }} numberOfLines={1}>
                  {title(c)}
                </AppText>
              </Pressable>
              <Icon name="chevron-right" size={14} color={theme.textMuted} />
            </View>
          ))}
        </ScrollView>
      ) : null}
      <AppText variant="title" style={{ fontSize: 24, lineHeight: 30 }}>
        {title(category)}
      </AppText>
      <AppText variant="caption" color="textSecondary">
        {t.hadith.count(category?.count ?? 0)}
      </AppText>
    </View>
  );

  if (navigate) {
    // Viele Ebenen: Unterthemen als Liste, darunter ggf. direkt zugeordnete Hadithe
    const direct = sections.find((s) => s.category === null);
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={[styles.container, { gap: Spacing.lg }]}>
        <Stack.Screen options={{ title: title(category) }} />
        {header}
        <SectionTitle>{t.hadith.subtopics}</SectionTitle>
        <ListGroup>
          {children.map((c, i) => {
            const grand = childCategories(lang, c.id);
            return (
              <ListRow
                key={c.id}
                title={c.title}
                subtitle={
                  grand.length
                    ? grand
                        .slice(0, 4)
                        .map((g) => g.title)
                        .join(' · ') + (grand.length > 4 ? ' …' : '')
                    : undefined
                }
                right={
                  <AppText variant="caption" color="textMuted">
                    {c.count}
                  </AppText>
                }
                chevron
                last={i === children.length - 1}
                onPress={() => router.push({ pathname: '/hadith/category/[id]', params: { id: c.id } })}
              />
            );
          })}
        </ListGroup>
        {direct ? (
          <View style={{ gap: Spacing.lg }}>
            <SectionTitle>{t.hadith.general}</SectionTitle>
            <View>
              {direct.items.map((h) => (
                <HadithListRow key={h.id} item={h} favorite={favorites.includes(h.id)} from={from} />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: title(category) }} />
      <SectionList
        sections={sections.map((s) => ({ key: String(s.category?.id ?? 'direct'), title: s.category?.title ?? null, count: s.items.length, data: s.items }))}
        keyExtractor={(h, i) => `${h.id}-${i}`}
        contentContainerStyle={styles.container}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) =>
          sections.length > 1 || section.title ? (
            <View style={[styles.sectionHeader, { backgroundColor: theme.primarySoft }]}>
              <AppText variant="label" color="primary" style={{ flex: 1 }}>
                {section.title ?? t.hadith.general}
              </AppText>
              <AppText variant="caption" color="primary">
                {section.count}
              </AppText>
            </View>
          ) : null
        }
        renderItem={({ item }) => <HadithListRow item={item} favorite={favorites.includes(item.id)} from={from} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
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
