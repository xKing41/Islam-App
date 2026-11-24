import * as Linking from 'expo-linking';
import { Pressable, View } from 'react-native';

import { AppText, Card, Icon, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { SOURCES } from '@/lib/sources';
import { useSettings } from '@/store/settings';

export default function SourcesScreen() {
  const t = useT();
  const theme = useTheme();
  const lang = useSettings((s) => s.language);

  return (
    <Screen>
      <AppText color="textSecondary">{t.sources.intro}</AppText>
      {SOURCES.map((s) => (
        <Card key={s.name} style={{ gap: Spacing.sm }}>
          <AppText variant="heading">{s.name}</AppText>
          <Field label={t.sources.usedFor} value={s.usedFor[lang]} />
          <Field label={t.sources.license} value={s.license[lang]} />
          {s.version !== '—' ? <Field label={t.sources.version} value={s.version} /> : null}
          <Pressable
            onPress={() => Linking.openURL(s.url)}
            accessibilityRole="link"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Icon name="open-in-new" size={16} color={theme.primary} />
            <AppText variant="caption" color="primary" style={{ fontWeight: '600' }}>
              {s.url.replace(/^https:\/\//, '')}
            </AppText>
          </Pressable>
        </Card>
      ))}
    </Screen>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <AppText variant="small" color="textMuted">
        {label}
      </AppText>
      <AppText variant="caption">{value}</AppText>
    </View>
  );
}
