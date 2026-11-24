import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';

import { Compass } from '@/components/compass';
import { LocationPrompt } from '@/components/location-prompt';
import { AppText, Card, Icon, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { angleDiff, distanceToKaaba, qiblaBearing, smoothAngle } from '@/lib/qibla';
import { useSettings } from '@/store/settings';

const ALIGN_TOLERANCE = 4;

export default function QiblaScreen() {
  const t = useT();
  const theme = useTheme();
  const location = useSettings((s) => s.location);
  const lang = useSettings((s) => s.language);
  const { width } = useWindowDimensions();
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number>(3);
  const [noCompass, setNoCompass] = useState(Platform.OS === 'web');
  const smoothed = useRef<number | null>(null);
  const wasAligned = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    Location.watchHeadingAsync(
      (h) => {
        const raw = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
        smoothed.current = smoothed.current === null ? raw : smoothAngle(smoothed.current, raw, 0.25);
        setHeading(smoothed.current);
        setAccuracy(h.accuracy);
      },
      () => setNoCompass(true)
    )
      .then((s) => {
        if (cancelled) s.remove();
        else sub = s;
      })
      .catch(() => setNoCompass(true));
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  if (!location) {
    return (
      <Screen topInset>
        <AppText variant="title">{t.qibla.title}</AppText>
        <AppText color="textSecondary">{t.qibla.needLocation}</AppText>
        <LocationPrompt />
      </Screen>
    );
  }

  const qibla = qiblaBearing(location.latitude, location.longitude);
  const km = Math.round(distanceToKaaba(location.latitude, location.longitude));
  const h = heading ?? 0;
  const diff = angleDiff(h, qibla);
  const aligned = heading !== null && Math.abs(diff) <= ALIGN_TOLERANCE;

  if (aligned && !wasAligned.current) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
  wasAligned.current = aligned;

  const size = Math.min(width - Spacing.lg * 2, 340);
  const labels: [string, string, string, string] = lang === 'tr' ? ['K', 'D', 'G', 'B'] : ['N', 'O', 'S', 'W'];
  const kmText = km.toLocaleString(lang === 'tr' ? 'tr-TR' : 'de-DE');

  return (
    <Screen topInset>
      <AppText variant="title">{t.qibla.title}</AppText>
      <AppText color="textSecondary">
        {location.name} · {t.qibla.distance(kmText)}
      </AppText>

      <View style={{ alignItems: 'center', paddingVertical: Spacing.md }}>
        <Compass size={size} heading={noCompass ? 0 : h} qibla={qibla} aligned={aligned} labels={labels} />
      </View>

      <Card tone={aligned ? 'primary' : 'card'} style={{ alignItems: 'center', gap: 4 }}>
        {noCompass ? (
          <AppText style={{ textAlign: 'center' }}>{t.qibla.noCompass}</AppText>
        ) : heading === null ? (
          <AppText color="textSecondary">{t.common.loading}</AppText>
        ) : aligned ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Icon name="check-circle" color={theme.onPrimary} />
            <AppText variant="heading" style={{ color: theme.onPrimary }}>
              {t.qibla.aligned}
            </AppText>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Icon name={diff < 0 ? 'rotate-left' : 'rotate-right'} color={theme.primary} />
            <AppText variant="heading">
              {diff < 0 ? t.qibla.turnLeft : t.qibla.turnRight} ({Math.abs(Math.round(diff))}°)
            </AppText>
          </View>
        )}
        <AppText variant="caption" color={aligned ? 'onPrimary' : 'textSecondary'}>
          {t.qibla.direction(qibla.toFixed(1))}
        </AppText>
      </Card>

      {!noCompass && accuracy < 2 ? (
        <AppText color="danger" style={{ textAlign: 'center' }}>
          {t.qibla.lowAccuracy}
        </AppText>
      ) : null}
      <AppText variant="caption" color="textSecondary">
        {t.qibla.calibrate}
      </AppText>
    </Screen>
  );
}
