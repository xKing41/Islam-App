import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import { AmiriQuran_400Regular } from '@expo-google-fonts/amiri-quran';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';

import { useScheme, useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { registerBackgroundReschedule } from '@/lib/background';
import { reschedulePrayerNotifications, setupNotificationHandler } from '@/lib/notifications';
import { useSettings } from '@/store/settings';

SplashScreen.preventAutoHideAsync().catch(() => {});
setupNotificationHandler();

function useSettingsHydrated() {
  return useSyncExternalStore(
    (onChange) => useSettings.persist.onFinishHydration(onChange),
    () => useSettings.persist.hasHydrated(),
    () => useSettings.persist.hasHydrated(),
  );
}

/** Plant Erinnerungen neu, sobald sich relevante Einstellungen ändern (mit kurzer Verzögerung). */
function useNotificationSync(enabled: boolean) {
  const s = useSettings();
  const key = JSON.stringify([s.location, s.method, s.madhab, s.highLatRule, s.adjustments, s.notify, s.preReminder, s.reliableAlarms, s.language]);
  useEffect(() => {
    if (!enabled) return;
    const id = setTimeout(() => {
      reschedulePrayerNotifications(useSettings.getState()).catch(() => {});
    }, 1500);
    return () => clearTimeout(id);
  }, [key, enabled]);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ AmiriQuran_400Regular, Amiri_400Regular, Amiri_700Bold });
  const hydrated = useSettingsHydrated();
  const ready = (fontsLoaded || !!fontError) && hydrated;
  const scheme = useScheme();
  const theme = useTheme();
  const t = useT();

  useNotificationSync(ready);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
      registerBackgroundReschedule();
    }
  }, [ready]);

  if (!ready) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.background,
      text: theme.text,
      border: theme.border,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.primary,
          headerTitleStyle: { color: theme.text, fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
          headerBackButtonDisplayMode: 'minimal',
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sura/[id]" options={{ title: '' }} />
        <Stack.Screen name="hadith/[id]" options={{ title: t.hadith.title }} />
        <Stack.Screen name="hadith/category/[id]" options={{ title: t.hadith.title }} />
        <Stack.Screen name="hadith/collection/[key]" options={{ title: t.hadith.title }} />
        <Stack.Screen name="hadith/favorites" options={{ title: t.hadith.favorites }} />
        <Stack.Screen name="qibla" options={{ title: t.qibla.title }} />
        <Stack.Screen name="tasbih" options={{ title: t.tasbih.title }} />
        <Stack.Screen name="calendar" options={{ title: t.calendar.title }} />
        <Stack.Screen name="ramadan" options={{ title: t.ramadan.title }} />
        <Stack.Screen name="settings" options={{ title: t.settings.title }} />
        <Stack.Screen name="reciters" options={{ title: t.reciters.title }} />
        <Stack.Screen name="prayer-settings" options={{ title: t.prayerSettings.title }} />
        <Stack.Screen name="location" options={{ title: t.location.title }} />
        <Stack.Screen name="sources" options={{ title: t.sources.title }} />
        <Stack.Screen name="recite" options={{ title: t.recite.title }} />
      </Stack>
    </ThemeProvider>
  );
}
