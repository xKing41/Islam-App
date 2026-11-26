import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { gradeLabel, sourceLine } from '@/lib/hadith/meta';
import type { HadithGrade, HadithListItem } from '@/lib/hadith/types';
import { useSettings } from '@/store/settings';

/** Eine Zeile in Hadith-Listen: Titel, Einstufung, Sammlungen (und bei der Suche ein Textausschnitt). */
export function HadithListRow({
  item,
  favorite,
  snippet,
  from,
}: {
  item: HadithListItem;
  favorite?: boolean;
  snippet?: string | null;
  /** Herkunftsliste für „vorheriger/nächster“ in der Detailansicht, z. B. „cat:59“ */
  from?: string;
}) {
  const theme = useTheme();
  const lang = useSettings((s) => s.language);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/hadith/[id]', params: from ? { id: item.id, from } : { id: item.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, backgroundColor: pressed ? theme.cardAlt : 'transparent' }]}>
      <View style={{ flex: 1, gap: 6 }}>
        <AppText numberOfLines={3}>{item.title}</AppText>
        {snippet ? (
          <AppText variant="caption" color="textSecondary" numberOfLines={3}>
            {snippet}
          </AppText>
        ) : null}
        <View style={styles.meta}>
          <GradePill g={item.g} />
          <AppText variant="caption" color="textSecondary" numberOfLines={1} style={{ flexShrink: 1 }}>
            {sourceLine(item, lang)}
          </AppText>
          {favorite ? <Icon name="star" size={15} color={theme.accent} /> : null}
        </View>
      </View>
      <Icon name="chevron-right" color={theme.textMuted} />
    </Pressable>
  );
}

/** Kleines Etikett für die Einstufung (Sahih grün, Hasan blau). */
export function GradePill({ g, large }: { g: HadithGrade; large?: boolean }) {
  const theme = useTheme();
  const lang = useSettings((s) => s.language);
  const label = gradeLabel(g, lang);
  if (!label) return null;
  const fg = g === 's' ? theme.success : theme.info;
  const bg = g === 's' ? theme.successSoft : theme.infoSoft;
  return (
    <View style={[styles.pill, { backgroundColor: bg }, large && styles.pillLarge]}>
      <Icon name="check-decagram" size={large ? 16 : 12} color={fg} />
      <AppText variant="caption" style={{ color: fg, fontWeight: '700', fontSize: large ? 13 : 11, lineHeight: large ? 18 : 14 }}>
        {label}
      </AppText>
    </View>
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
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.pill },
  pillLarge: { paddingHorizontal: 10, paddingVertical: 5, gap: 5 },
});
