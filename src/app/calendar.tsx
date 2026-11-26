import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, Icon, ListGroup, ListRow, Screen, SectionTitle } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatHijri, toHijri, upcomingIslamicDays } from '@/lib/hijri';
import { addDays, daysBetween, formatDate, startOfDay } from '@/lib/time';
import { useSettings } from '@/store/settings';

export default function CalendarScreen() {
  const t = useT();
  const theme = useTheme();
  const now = useNow(60000);
  const offset = useSettings((s) => s.hijriOffset);
  const [monthShift, setMonthShift] = useState(0);

  // angezeigter Monat als einfache Zahlen (Monate seit Jahr 0)
  const monthIndex = now.getFullYear() * 12 + now.getMonth() + monthShift;
  const viewYear = Math.floor(monthIndex / 12);
  const viewMonth = monthIndex - viewYear * 12;
  const days = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startPad = (first.getDay() + 6) % 7; // Woche beginnt am Montag
    const count = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from({ length: startPad }, () => null);
    for (let d = 1; d <= count; d++) cells.push(new Date(viewYear, viewMonth, d));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const upcoming = useMemo(() => upcomingIslamicDays(now, offset, 11), [now, offset]);
  const special = useMemo(
    () => new Set(upcomingIslamicDays(addDays(new Date(viewYear, viewMonth, 1), -1), offset, 30).map((d) => startOfDay(d.date).getTime())),
    [viewYear, viewMonth, offset],
  );

  const firstH = toHijri(days.find(Boolean) as Date, offset);
  const lastH = toHijri([...days].reverse().find(Boolean) as Date, offset);
  const hijriRange =
    firstH.month === lastH.month
      ? `${t.hijriMonths[firstH.month - 1]} ${firstH.year}`
      : `${t.hijriMonths[firstH.month - 1]} – ${t.hijriMonths[lastH.month - 1]} ${lastH.year}`;
  const weekdays = [1, 2, 3, 4, 5, 6, 0].map((d) => t.weekdaysShort[d]);
  const today = startOfDay(now).getTime();

  return (
    <Screen>
      <Card style={{ gap: Spacing.md }}>
        <View style={styles.monthHeader}>
          <Pressable onPress={() => setMonthShift((m) => m - 1)} hitSlop={10} accessibilityLabel="previous month">
            <Icon name="chevron-left" size={28} color={theme.primary} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <AppText variant="heading">
              {t.months[viewMonth]} {viewYear}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {hijriRange}
            </AppText>
          </View>
          <Pressable onPress={() => setMonthShift((m) => m + 1)} hitSlop={10} accessibilityLabel="next month">
            <Icon name="chevron-right" size={28} color={theme.primary} />
          </Pressable>
        </View>
        <View style={styles.grid}>
          {weekdays.map((w) => (
            <View key={w} style={styles.cell}>
              <AppText variant="caption" color="textMuted" style={{ fontWeight: '600' }}>
                {w}
              </AppText>
            </View>
          ))}
          {days.map((d, i) => {
            if (!d) return <View key={`e${i}`} style={styles.cell} />;
            const h = toHijri(d, offset);
            const isToday = d.getTime() === today;
            const isSpecial = special.has(d.getTime());
            return (
              <View key={d.getTime()} style={styles.cell}>
                <View
                  style={[
                    styles.dayBox,
                    isToday && { backgroundColor: theme.primary },
                    !isToday && isSpecial && { backgroundColor: theme.accentSoft },
                  ]}>
                  <AppText variant="label" style={{ color: isToday ? theme.onPrimary : theme.text }}>
                    {d.getDate()}
                  </AppText>
                  <AppText style={{ fontSize: 10, lineHeight: 12, color: isToday ? theme.onPrimary : h.day === 1 ? theme.accent : theme.textMuted }}>
                    {h.day}
                  </AppText>
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      <SectionTitle>{t.calendar.importantDays}</SectionTitle>
      <ListGroup>
        {upcoming.map((d, i) => {
          const eventStart = d.night ? addDays(d.date, -1) : d.date;
          const n = daysBetween(now, eventStart);
          return (
            <ListRow
              key={`${d.key}-${d.date.getTime()}`}
              icon={d.night ? 'weather-night' : 'star-crescent'}
              iconColor={theme.accent}
              title={t.calendar.days[d.key]}
              subtitle={`${formatDate(eventStart, t, { weekday: true })}${d.night ? ` (${t.calendar.nightBefore})` : ''} · ${formatHijri(toHijri(d.date, offset), t.hijriMonths)}`}
              right={
                <AppText variant="caption" color={n <= 7 ? 'primary' : 'textSecondary'} style={{ fontWeight: '600' }}>
                  {t.calendar.daysLeft(n)}
                </AppText>
              }
              last={i === upcoming.length - 1}
            />
          );
        })}
      </ListGroup>
      <AppText variant="caption" color="textSecondary">
        {t.calendar.note}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  dayBox: { width: 42, height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
});
