/** Karten „Vers des Tages“ und „Hadith des Tages“ für die Startseite. */
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GradePill } from '@/components/hadith-list-row';
import { AppText, Icon } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { verseOfTheDay } from '@/lib/daily';
import { hadithOfTheDay } from '@/lib/hadith/data';
import { sourceLine } from '@/lib/hadith/meta';
import { getSura } from '@/lib/quran/data';
import { getSuraMeta, suraTitle } from '@/lib/quran/meta';
import { splitBasmala } from '@/lib/quran/text';
import { useSettings } from '@/store/settings';

export function DailyVerseCard({ date }: { date: Date }) {
  const t = useT();
  const theme = useTheme();
  const lang = useSettings((s) => s.language);
  const translationKey = useSettings((s) => (s.language === 'tr' ? s.translationTr : s.translationDe));
  const dayKey = date.toDateString();
  const v = useMemo(() => verseOfTheDay(new Date(dayKey)), [dayKey]);
  const data = getSura(v.sura);
  const ayat: number[] = [];
  for (let a = v.from; a <= v.to; a++) ayat.push(a);
  const ref = `${suraTitle(getSuraMeta(v.sura), lang).name} ${v.sura}:${v.from}${v.to > v.from ? `–${v.to}` : ''}`;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/sura/[id]', params: { id: v.sura, aya: v.from } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.9 : 1 }]}>
      <View style={styles.head}>
        <Icon name="book-open-page-variant" size={18} color={theme.primary} />
        <AppText variant="small" color="primary" style={{ flex: 1 }}>
          {t.home.verseOfDay}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {ref}
        </AppText>
      </View>
      <AppText style={{ fontFamily: Fonts.quran, fontSize: 24, lineHeight: 48, textAlign: 'right', writingDirection: 'rtl' }}>
        {ayat.map((a) => splitBasmala(v.sura, a, data.ar[a - 1]).rest).join(' ۝ ')}
      </AppText>
      <AppText color="textSecondary" style={{ lineHeight: 23 }}>
        {ayat.map((a) => data[translationKey][a - 1]).join(' ')}
      </AppText>
    </Pressable>
  );
}

export function DailyHadithCard({ date }: { date: Date }) {
  const t = useT();
  const theme = useTheme();
  const lang = useSettings((s) => s.language);
  const dayKey = date.toDateString();
  const h = useMemo(() => hadithOfTheDay(lang, new Date(dayKey)), [lang, dayKey]);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/hadith/[id]', params: { id: h.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, { backgroundColor: theme.accentSoft, borderColor: theme.accentSoft, opacity: pressed ? 0.9 : 1 }]}>
      <View style={styles.head}>
        <Icon name="format-quote-open" size={18} color={theme.accent} />
        <AppText variant="small" color="accent" style={{ flex: 1 }}>
          {t.hadith.ofTheDay}
        </AppText>
      </View>
      <AppText style={{ fontSize: 17, lineHeight: 25 }} numberOfLines={6}>
        {h.title}
      </AppText>
      <View style={[styles.head, { gap: Spacing.sm }]}>
        <GradePill g={h.g} />
        <AppText variant="caption" color="textSecondary" style={{ flex: 1 }} numberOfLines={1}>
          {sourceLine(h, lang)}
        </AppText>
        <Icon name="chevron-right" color={theme.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
