import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText, Button, ListGroup, ListRow, Screen, SectionTitle, Segmented, SwitchRow } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { DHIKR, getDhikr } from '@/lib/dhikr';
import { useSettings } from '@/store/settings';
import { useTasbih } from '@/store/tasbih';

export default function TasbihScreen() {
  const t = useT();
  const theme = useTheme();
  const lang = useSettings((s) => s.language);
  const { width } = useWindowDimensions();
  const s = useTasbih();
  const dhikr = getDhikr(s.dhikrId);

  const size = Math.min(width - Spacing.lg * 2, 300);
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = s.target > 0 ? s.count / s.target : 0;

  function tap() {
    const { reachedTarget } = s.increment();
    if (s.vibration) {
      if (reachedTarget) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <AppText style={{ fontFamily: Fonts.arabic, fontSize: 34, lineHeight: 60 }} color="primary">
          {dhikr.arabic}
        </AppText>
        <AppText variant="heading">{dhikr.translit[lang]}</AppText>
        <AppText color="textSecondary" style={{ textAlign: 'center' }}>
          {t.tasbih.dhikr[dhikr.id]}
        </AppText>
      </View>

      <Pressable
        onPress={tap}
        accessibilityRole="button"
        accessibilityLabel={`${t.tasbih.tap}: ${s.count}`}
        style={({ pressed }) => [{ alignSelf: 'center', transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.primarySoft} strokeWidth={stroke} fill={theme.card} />
            {s.target > 0 ? (
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={theme.primary}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={circumference * (1 - progress)}
                rotation={-90}
                origin={`${size / 2}, ${size / 2}`}
              />
            ) : null}
          </Svg>
          <AppText style={{ fontSize: 72, lineHeight: 80, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{s.count}</AppText>
          <AppText color="textSecondary">
            {s.target > 0 ? `/ ${s.target}` : t.tasbih.free} · {t.tasbih.round(s.rounds + 1)}
          </AppText>
          <AppText variant="caption" color="textMuted" style={{ marginTop: 6 }}>
            {t.tasbih.tap}
          </AppText>
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="caption" color="textSecondary">
          {t.tasbih.total(s.total)}
        </AppText>
        <Button title={t.common.reset} icon="restart" variant="ghost" onPress={s.reset} />
      </View>

      <ListGroup>
        <SwitchRow title={t.tasbih.afterPrayer} value={s.afterPrayerMode} onValueChange={s.setAfterPrayerMode} icon="mosque" />
        <SwitchRow title={t.tasbih.vibration} value={s.vibration} onValueChange={s.setVibration} icon="vibrate" last />
      </ListGroup>

      {!s.afterPrayerMode ? (
        <>
          <SectionTitle>{t.tasbih.target}</SectionTitle>
          <Segmented
            options={[33, 99, 100, 0].map((v) => ({ value: v, label: v === 0 ? t.tasbih.free : String(v) }))}
            value={s.target}
            onChange={s.setTarget}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
            {DHIKR.map((d) => {
              const active = d.id === s.dhikrId;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => s.select(d.id)}
                  style={[
                    styles.chip,
                    { backgroundColor: active ? theme.primary : theme.card, borderColor: active ? theme.primary : theme.border },
                  ]}>
                  <AppText style={{ fontFamily: Fonts.arabic, fontSize: 18, lineHeight: 30, color: active ? theme.onPrimary : theme.text }}>
                    {d.arabic}
                  </AppText>
                  <AppText variant="caption" style={{ color: active ? theme.onPrimary : theme.textSecondary }}>
                    {d.translit[lang]}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : (
        <ListGroup>
          {[0, 1, 2].map((i) => {
            const id = (['subhanallah', 'alhamdulillah', 'allahuakbar'] as const)[i];
            const d = getDhikr(id);
            return (
              <ListRow
                key={id}
                title={`${d.translit[lang]} × ${i === 2 ? 34 : 33}`}
                subtitle={t.tasbih.dhikr[id]}
                last={i === 2}
                right={s.afterPrayerStep === i ? <AppText color="primary" variant="label">●</AppText> : undefined}
              />
            );
          })}
        </ListGroup>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minWidth: 120,
  },
});
