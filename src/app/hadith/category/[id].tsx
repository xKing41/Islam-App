import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useMemo } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { HadithListRow } from '@/components/hadith-list-row';
import { AppText } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { childCategories, getCategory, hadithsInCategory } from '@/lib/hadith/data';
import { useHadithStore } from '@/store/hadith';
import { useSettings } from '@/store/settings';

export default function HadithCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catId = Number(id);
  const t = useT();
  const theme = useTheme();
  const lang = useSettings((s) => s.language);
  const favorites = useHadithStore((s) => s.favorites);
  const category = getCategory(lang, catId);
  const children = useMemo(() => childCategories(lang, catId), [lang, catId]);
  const items = useMemo(() => hadithsInCategory(lang, catId), [lang, catId]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: category?.title ?? t.hadith.title }} />
      <FlatList
        data={items}
        keyExtractor={(h) => String(h.id)}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl * 2, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' }}
        ListHeaderComponent={
          <View style={{ gap: Spacing.md, paddingBottom: Spacing.sm }}>
            <AppText variant="heading">{category?.title}</AppText>
            <AppText variant="caption" color="textSecondary">
              {t.hadith.count(items.length)}
            </AppText>
            {children.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
                {children.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => router.push({ pathname: '/hadith/category/[id]', params: { id: c.id } })}
                    style={[styles.chip, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <AppText variant="caption" style={{ fontWeight: '600' }} numberOfLines={1}>
                      {c.title} ({c.count})
                    </AppText>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>
        }
        renderItem={({ item }) => <HadithListRow item={item} favorite={favorites.includes(item.id)} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1, maxWidth: 260 },
});
