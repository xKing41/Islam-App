import { Tabs } from 'expo-router/tabs';
import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

export default function TabLayout() {
  const theme = useTheme();
  const t = useT();
  const icon = (name: IconName) =>
    function TabIcon({ color }: { color: ColorValue }) {
      return <Icon name={name} size={24} color={color} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.tabBar, borderTopColor: theme.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: t.tabs.prayer, tabBarIcon: icon('mosque') }} />
      <Tabs.Screen name="quran" options={{ title: t.tabs.quran, tabBarIcon: icon('book-open-page-variant') }} />
      <Tabs.Screen name="hadith" options={{ title: t.tabs.hadith, tabBarIcon: icon('book-open-variant') }} />
      <Tabs.Screen name="qibla" options={{ title: t.tabs.qibla, tabBarIcon: icon('compass-outline') }} />
      <Tabs.Screen name="more" options={{ title: t.tabs.more, tabBarIcon: icon('dots-horizontal-circle-outline') }} />
    </Tabs>
  );
}
