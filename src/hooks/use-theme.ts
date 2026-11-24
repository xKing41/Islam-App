import { useColorScheme } from 'react-native';

import { Colors, type ThemeColors } from '@/constants/theme';
import { useSettings } from '@/store/settings';

/** Aktuelles Farbschema – berücksichtigt die Einstellung (System/Hell/Dunkel). */
export function useScheme(): 'light' | 'dark' {
  const system = useColorScheme();
  const mode = useSettings((s) => s.theme);
  if (mode === 'system') return system === 'dark' ? 'dark' : 'light';
  return mode;
}

export function useTheme(): ThemeColors {
  return Colors[useScheme()];
}
