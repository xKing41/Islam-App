import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LocationPrompt } from '@/components/location-prompt';
import { AppText, Card, Screen, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { usePrayerConfig } from '@/hooks/use-prayer-config';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { fromHijri, toHijri } from '@/lib/hijri';
import { getDayTimes } from '@/lib/prayer-times';
import { addDays, daysBetween, formatDate, formatTime, startOfDay } from '@/lib/time';
import { useSettings } from '@/store/settings';

export default function RamadanScreen() {
  const t = useT();
  const theme = useTheme();
  const now = useNow(60000);
  const cfg = usePrayerConfig();
  const offset = useSettings((s) => s.hijriOffset);

  const { start, length, year } = useMemo(() => {
    const h = toHijri(now, offset);
    // Laufender oder nächster Ramadan
    const y = h.month <= 9 ? h.year : h.year + 1;
    const s = fromHijri({ year: y, month: 9, day: 1 }, offset);
    const e = fromHijri({ year: y, month: 10, day: 1 }, offset);
    return { start: s, length: daysBetween(s, e), year: y };
  }, [now, offset]);

  const rows = useMemo(() => {
    if (!cfg) return [];
    return Array.from({ length }, (_, i) => {
      const date = addDays(start, i);
      const times = getDayTimes(date, cfg);
      return { day: i + 1, date, imsak: times.fajr, iftar: times.maghrib };
    });
  }, [cfg, start, length]);

  const daysUntil = daysBetween(now, start);
  const todayTs = startOfDay(now).getTime();

  return (
    <Screen>
      <Card tone="accent" style={{ gap: 4 }}>
        <AppText variant="heading">
          {t.ramadan.title} {year}
        </AppText>
        <AppText color="textSecondary">
          {formatDate(start, t, { weekday: true })} – {formatDate(addDays(start, length - 1), t)}
        </AppText>
        {daysUntil > 0 ? <AppText>{t.ramadan.startsIn(daysUntil)}</AppText> : null}
      </Card>

      {!cfg ? (
        <>
          <AppText color="textSecondary">{t.ramadan.needLocation}</AppText>
          <LocationPrompt />
        </>
      ) : (
        <>
          <SectionTitle>{t.ramadan.table}</SectionTitle>
          <Card style={{ paddingHorizontal: 0, paddingVertical: Spacing.xs }}>
            <View style={[styles.row, { borderBottomColor: theme.border }]}>
              <AppText variant="small" color="textSecondary" style={styles.colDay}>
                #
              </AppText>
              <View style={styles.colDate} />
              <AppText variant="small" color="textSecondary" style={styles.colTime}>
                {t.ramadan.imsak}
              </AppText>
              <AppText variant="small" color="textSecondary" style={styles.colTime}>
                {t.ramadan.iftar}
              </AppText>
            </View>
            {rows.map((r) => {
              const isToday = startOfDay(r.date).getTime() === todayTs;
              return (
                <View
                  key={r.day}
                  style={[styles.row, { borderBottomColor: theme.border }, isToday && { backgroundColor: theme.primarySoft }]}>
                  <AppText variant="label" style={styles.colDay} color={isToday ? 'primary' : 'text'}>
                    {r.day}
                  </AppText>
                  <AppText variant="caption" color="textSecondary" style={styles.colDate}>
                    {t.weekdaysShort[r.date.getDay()]}, {formatDate(r.date, t, { year: false })}
                  </AppText>
                  <AppText variant="label" style={[styles.colTime, { fontVariant: ['tabular-nums'] }]}>
                    {formatTime(r.imsak)}
                  </AppText>
                  <AppText variant="label" style={[styles.colTime, { fontVariant: ['tabular-nums'] }]}>
                    {formatTime(r.iftar)}
                  </AppText>
                </View>
              );
            })}
          </Card>
          <AppText variant="caption" color="textSecondary">
            {t.calendar.note}
          </AppText>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colDay: { width: 32 },
  colDate: { flex: 1 },
  colTime: { width: 70, textAlign: 'right' },
});
