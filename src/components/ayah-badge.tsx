import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';

/** Nummer in einer gedrehten Raute (achtzackiger Stern angedeutet). */
export function NumberBadge({ n, size = 38, active }: { n: number; size?: number; active?: boolean }) {
  const theme = useTheme();
  const color = active ? theme.onPrimary : theme.primary;
  const bg = active ? theme.primary : theme.primarySoft;
  const inner = size * 0.72;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: inner, height: inner, backgroundColor: bg, borderRadius: 6, transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute', width: inner, height: inner, backgroundColor: bg, borderRadius: 6 }} />
      <AppText style={{ color, fontSize: n > 99 ? 11 : 13, fontWeight: '700' }}>{n}</AppText>
    </View>
  );
}
