import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DailyHadithCard, DailyVerseCard } from '@/components/daily-cards';
import { LocationPrompt } from '@/components/location-prompt';
import { AppText, Card, Icon, type IconName, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { usePrayerConfig } from '@/hooks/use-prayer-config';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatHijri, ramadanDay, toHijri } from '@/lib/hijri';
import { getCurrentAndNext, PRAYER_KEYS } from '@/lib/prayer-times';
import { formatCountdown, formatDate, formatTime } from '@/lib/time';
import { useQuranStore } from '@/store/quran';
import { useSettings } from '@/store/settings';

export default function PrayerScreen() {
  const t = useT();
  const theme = useTheme();
  const now = useNow(1000);
  const cfg = usePrayerConfig();
  const location = useSettings((s) => s.location);
  const method = useSettings((s) => s.method);
  const notify = useSettings((s) => s.notify);
  const setNotify = useSettings((s) => s.setNotify);
  const hijriOffset = useSettings((s) => s.hijriOffset);
  const lastRead = useQuranStore((s) => s.lastRead);

  // Nur einmal pro Minute neu berechnen – der Countdown nutzt `now` direkt.
  const minuteKey = Math.floor(now.getTime() / 60000);
  const info = useMemo(() => (cfg ? getCurrentAndNext(new Date(minuteKey * 60000), cfg) : null), [cfg, minuteKey]);
  const hijri = toHijri(now, hijriOffset);
  const ramadan = ramadanDay(now, hijriOffset);

  const quick: { icon: IconName; label: string; onPress: () => void }[] = [
    { icon: 'compass-outline', label: t.home.quick.qibla, onPress: () => router.push('/qibla') },
    { icon: 'counter', label: t.home.quick.tasbih, onPress: () => router.push('/tasbih') },
    { icon: 'calendar-month', label: t.home.quick.calendar, onPress: () => router.push('/calendar') },
    {
      icon: 'book-open-page-variant',
      label: t.home.quick.continueReading,
      onPress: () =>
        router.push(lastRead ? { pathname: '/sura/[id]', params: { id: lastRead.sura, aya: lastRead.aya } } : '/quran'),
    },
    { icon: 'microphone-outline', label: t.home.quick.recite, onPress: () => router.push('/recite') },
    { icon: 'weather-night', label: t.home.quick.ramadan, onPress: () => router.push('/ramadan') },
  ];

  return (
    <Screen topInset>
      <View style={styles.header}>
        <Pressable onPress={() => router.push('/location')} style={styles.locationRow} accessibilityRole="button">
          <Icon name="map-marker" size={18} color={theme.primary} />
          <AppText variant="label" color="primary" numberOfLines={1}>
            {location?.name ?? t.home.noLocationTitle}
          </AppText>
        </Pressable>
        <AppText variant="title">{formatDate(now, t, { weekday: true, year: false })}</AppText>
        <AppText color="textSecondary">{formatHijri(hijri, t.hijriMonths)}</AppText>
      </View>

      {!cfg || !info ? (
        <LocationPrompt />
      ) : (
        <>
          <Card tone="primary" style={{ gap: Spacing.xs }}>
            <AppText variant="small" style={{ color: theme.onPrimary, opacity: 0.8 }}>
              {t.home.nextPrayer}
            </AppText>
            <View style={styles.nextRow}>
              <AppText variant="title" style={{ color: theme.onPrimary }}>
                {t.prayers[info.next.key]}
              </AppText>
              <AppText variant="title" style={{ color: theme.onPrimary }}>
                {formatTime(info.next.time)}
              </AppText>
            </View>
            <AppText variant="display" style={{ color: theme.onPrimary, fontVariant: ['tabular-nums'] }}>
              {formatCountdown(info.next.time.getTime() - now.getTime())}
            </AppText>
          </Card>

          {ramadan ? (
            <Card tone="accent" style={{ gap: Spacing.sm }}>
              <AppText variant="heading">
                {t.home.ramadanTitle} · {t.ramadan.dayN(ramadan)}
              </AppText>
              <View style={styles.nextRow}>
                <AppText>{t.home.imsak}</AppText>
                <AppText variant="label">{formatTime(info.today.fajr)}</AppText>
              </View>
              <View style={styles.nextRow}>
                <AppText>{t.home.iftar}</AppText>
                <AppText variant="label">{formatTime(info.today.maghrib)}</AppText>
              </View>
            </Card>
          ) : null}

          <Card style={{ paddingVertical: Spacing.xs, paddingHorizontal: 0 }}>
            {PRAYER_KEYS.map((key, i) => {
              const active = info.current === key;
              const on = notify[key]?.enabled;
              return (
                <View
                  key={key}
                  style={[
                    styles.timeRow,
                    i < PRAYER_KEYS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                    active && { backgroundColor: theme.primarySoft },
                  ]}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="label" color={active ? 'primary' : 'text'} style={active ? { fontWeight: '700' } : undefined}>
                      {t.prayers[key]}
                    </AppText>
                    <AppText variant="caption" color="textSecondary">
                      {t.prayerHints[key]}
                    </AppText>
                  </View>
                  <AppText
                    variant="heading"
                    color={active ? 'primary' : 'text'}
                    style={{ fontVariant: ['tabular-nums'], marginRight: Spacing.md }}>
                    {formatTime(info.today[key])}
                  </AppText>
                  <Pressable
                    onPress={() => setNotify(key, { enabled: !on })}
                    hitSlop={10}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: !!on }}
                    accessibilityLabel={on ? t.home.notifyOnFor(t.prayers[key]) : t.home.notifyOffFor(t.prayers[key])}>
                    <Icon name={on ? 'bell-ring' : 'bell-off-outline'} size={22} color={on ? theme.accent : theme.textMuted} />
                  </Pressable>
                </View>
              );
            })}
          </Card>

          <Pressable onPress={() => router.push('/prayer-settings')} accessibilityRole="button">
            <AppText variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
              {t.home.methodNote(t.methods[method])} · {location?.name}
            </AppText>
          </Pressable>
        </>
      )}

      <View style={styles.quickGrid}>
        {quick.map((q) => (
          <Pressable
            key={q.label}
            onPress={q.onPress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.quickItem, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.8 : 1 }]}>
            <View style={[styles.quickIcon, { backgroundColor: theme.primarySoft }]}>
              <Icon name={q.icon} size={22} color={theme.primary} />
            </View>
            <AppText variant="caption" style={{ fontWeight: '600', textAlign: 'center' }} numberOfLines={1}>
              {q.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <DailyVerseCard date={now} />
      <DailyHadithCard date={now} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4, alignSelf: 'flex-start' },
  nextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  timeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quickItem: {
    flexGrow: 1,
    flexBasis: '30%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
