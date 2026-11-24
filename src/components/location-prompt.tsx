import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppText, Button, Card, Icon } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { locateWithGps } from '@/lib/location';
import { requestNotificationPermission } from '@/lib/notifications';
import { useSettings } from '@/store/settings';

/** Karte, die zum Festlegen des Standorts auffordert (GPS oder Stadtliste). */
export function LocationPrompt() {
  const t = useT();
  const theme = useTheme();
  const set = useSettings((s) => s.set);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function useGps() {
    setBusy(true);
    setError(null);
    const res = await locateWithGps();
    setBusy(false);
    if (res.ok) {
      set({ location: res.location });
      requestNotificationPermission().catch(() => {});
    } else {
      setError(res.reason === 'denied' ? t.location.permissionDenied : t.location.gpsError);
    }
  }

  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <Icon name="map-marker-radius" color={theme.primary} size={26} />
        <AppText variant="heading">{t.home.noLocationTitle}</AppText>
      </View>
      <AppText color="textSecondary">{t.home.noLocationText}</AppText>
      {error ? <AppText color="danger">{error}</AppText> : null}
      {busy ? (
        <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
          <ActivityIndicator color={theme.primary} />
          <AppText color="textSecondary">{t.location.gpsWorking}</AppText>
        </View>
      ) : (
        <View style={{ gap: Spacing.sm }}>
          <Button title={t.home.useGps} icon="crosshairs-gps" onPress={useGps} />
          <Button title={t.home.chooseCity} icon="city-variant-outline" variant="secondary" onPress={() => router.push('/location')} />
        </View>
      )}
    </Card>
  );
}
