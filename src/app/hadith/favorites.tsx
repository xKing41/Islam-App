import { Stack } from 'expo-router/stack';
import { useMemo } from 'react';
import { FlatList, View } from 'react-native';

import { HadithListRow } from '@/components/hadith-list-row';
import { AppText } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { getItem } from '@/lib/hadith/data';
import type { HadithListItem } from '@/lib/hadith/types';
import { useHadithStore } from '@/store/hadith';
import { useSettings } from '@/store/settings';

export default function HadithFavoritesScreen() {
  const t = useT();
  const theme = useTheme();
  const lang = useSettings((s) => s.language);
  const favorites = useHadithStore((s) => s.favorites);
  const items = useMemo(() => favorites.map((id) => getItem(lang, id)).filter((h): h is HadithListItem => !!h), [favorites, lang]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: t.hadith.favorites }} />
      <FlatList
        data={items}
        keyExtractor={(h) => String(h.id)}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl * 2, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' }}
        ListEmptyComponent={
          <AppText color="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.xl }}>
            {t.hadith.noFavorites}
          </AppText>
        }
        renderItem={({ item }) => <HadithListRow item={item} favorite from="fav" />}
      />
    </View>
  );
}
