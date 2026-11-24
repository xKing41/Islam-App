import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';

import { AppText, Button, Card, Icon, ListGroup, ListRow, Screen, SectionTitle } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { CITIES, type City } from '@/lib/cities';
import { locateWithGps } from '@/lib/location';
import { requestNotificationPermission } from '@/lib/notifications';
import { normalizeLatin } from '@/lib/quran/text';
import { useSettings } from '@/store/settings';

export default function LocationScreen() {
  const t = useT();
  const theme = useTheme();
  const location = useSettings((s) => s.location);
  const set = useSettings((s) => s.set);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = normalizeLatin(query.trim());
    return q ? CITIES.filter((c) => normalizeLatin(c.name).includes(q)) : CITIES;
  }, [query]);

  async function gps() {
    setBusy(true);
    setError(null);
    const res = await locateWithGps();
    setBusy(false);
    if (res.ok) {
      set({ location: res.location });
      requestNotificationPermission().catch(() => {});
      router.back();
    } else {
      setError(res.reason === 'denied' ? t.location.permissionDenied : t.location.gpsError);
    }
  }

  function choose(c: City) {
    set({ location: { latitude: c.latitude, longitude: c.longitude, name: c.name, source: 'city' } });
    requestNotificationPermission().catch(() => {});
    router.back();
  }

  const groups: { key: City['group']; title: string }[] = [
    { key: 'de', title: t.location.germany },
    { key: 'tr', title: t.location.turkey },
    { key: 'other', title: t.location.other },
  ];

  return (
    <Screen>
      {location ? (
        <Card style={{ gap: 4 }}>
          <AppText variant="small" color="textSecondary">
            {t.location.current}
          </AppText>
          <AppText variant="heading">{location.name}</AppText>
          <AppText variant="caption" color="textMuted">
            {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}° · {location.source === 'gps' ? 'GPS' : t.location.cityList}
          </AppText>
        </Card>
      ) : null}

      {busy ? (
        <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', justifyContent: 'center', padding: Spacing.md }}>
          <ActivityIndicator color={theme.primary} />
          <AppText color="textSecondary">{t.location.gpsWorking}</AppText>
        </View>
      ) : (
        <Button title={t.location.gpsButton} icon="crosshairs-gps" onPress={gps} />
      )}
      {error ? <AppText color="danger">{error}</AppText> : null}

      <SectionTitle>{t.location.cityList}</SectionTitle>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          backgroundColor: theme.card,
          borderRadius: Radius.md,
          paddingHorizontal: Spacing.md,
          borderWidth: 1,
          borderColor: theme.border,
        }}>
        <Icon name="magnify" color={theme.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t.location.searchCity}
          placeholderTextColor={theme.textMuted}
          style={{ flex: 1, paddingVertical: 12, color: theme.text, fontSize: 16 }}
          autoCorrect={false}
        />
      </View>

      {groups.map((g) => {
        const items = filtered.filter((c) => c.group === g.key);
        if (!items.length) return null;
        return (
          <View key={g.key} style={{ gap: Spacing.md }}>
            <SectionTitle>{g.title}</SectionTitle>
            <ListGroup>
              {items.map((c, i) => (
                <ListRow
                  key={c.name}
                  title={c.name}
                  last={i === items.length - 1}
                  onPress={() => choose(c)}
                  right={location?.name === c.name ? <Icon name="check" color={theme.primary} /> : undefined}
                />
              ))}
            </ListGroup>
          </View>
        );
      })}
    </Screen>
  );
}
