import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText, ListGroup, ListRow, Screen } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

export default function MoreScreen() {
  const t = useT();
  const theme = useTheme();
  const soon = (
    <View style={{ backgroundColor: theme.accentSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
      <AppText variant="caption" color="accent" style={{ fontWeight: '600' }}>
        {t.common.comingSoon}
      </AppText>
    </View>
  );

  return (
    <Screen topInset>
      <AppText variant="title">{t.more.title}</AppText>
      <ListGroup>
        <ListRow icon="counter" title={t.more.tasbih} chevron onPress={() => router.push('/tasbih')} />
        <ListRow icon="calendar-month" title={t.more.calendar} chevron onPress={() => router.push('/calendar')} />
        <ListRow icon="weather-night" title={t.more.ramadan} chevron onPress={() => router.push('/ramadan')} />
        <ListRow icon="hands-pray" title={t.more.duas} right={soon} />
        <ListRow icon="microphone-outline" title={t.more.recitationCheck} right={soon} last />
      </ListGroup>
      <ListGroup>
        <ListRow icon="bell-ring-outline" title={t.more.prayerSettings} chevron onPress={() => router.push('/prayer-settings')} />
        <ListRow icon="map-marker-outline" title={t.more.location} chevron onPress={() => router.push('/location')} />
        <ListRow icon="cog-outline" title={t.more.settings} chevron onPress={() => router.push('/settings')} />
        <ListRow icon="information-outline" title={t.more.sources} chevron onPress={() => router.push('/sources')} last />
      </ListGroup>
    </Screen>
  );
}
