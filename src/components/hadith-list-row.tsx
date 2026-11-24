import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { HadithListItem } from '@/lib/hadith/types';

export function HadithListRow({ item, favorite }: { item: HadithListItem; favorite?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/hadith/[id]', params: { id: item.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, backgroundColor: pressed ? theme.cardAlt : 'transparent' }]}>
      <View style={[styles.dot, { backgroundColor: theme.accentSoft }]}>
        <Icon name={favorite ? 'star' : 'format-quote-open'} size={18} color={theme.accent} />
      </View>
      <AppText style={{ flex: 1 }} numberOfLines={3}>
        {item.title}
      </AppText>
      <Icon name="chevron-right" color={theme.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
