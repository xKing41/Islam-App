/**
 * Wiederverwendbare Bausteine der Oberfläche (Text, Karten, Listenzeilen, Schalter …).
 */
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps, ReactNode } from 'react';
import {
  type ColorValue,
  Pressable,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  Switch,
  Text,
  type TextProps,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: ColorValue }) {
  const theme = useTheme();
  return <MaterialCommunityIcons name={name} size={size} color={(color ?? theme.text) as string} />;
}

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'small';

export function AppText({
  variant = 'body',
  color = 'text',
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: keyof ThemeColors }) {
  const theme = useTheme();
  return <Text style={[{ color: theme[color] }, textStyles[variant], style]} {...rest} />;
}

const textStyles = StyleSheet.create({
  display: { fontSize: 44, lineHeight: 50, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 23 },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 13, lineHeight: 18 },
  small: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
});

/** Bildschirm-Container mit Hintergrund, Innenabstand und optionalem Scrollen. */
export function Screen({
  children,
  scroll = true,
  topInset = false,
  contentStyle,
  ...rest
}: ScrollViewProps & { children: ReactNode; scroll?: boolean; topInset?: boolean; contentStyle?: ViewStyle }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const inner: ViewStyle = {
    padding: Spacing.lg,
    paddingTop: (topInset ? insets.top : 0) + Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  };
  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: theme.background }, inner, contentStyle]}>{children}</View>;
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[inner, contentStyle]}
      keyboardShouldPersistTaps="handled"
      {...rest}>
      {children}
    </ScrollView>
  );
}

export function Card({ style, children, tone = 'card', ...rest }: ViewProps & { tone?: 'card' | 'primary' | 'accent' | 'alt' }) {
  const theme = useTheme();
  const bg =
    tone === 'primary' ? theme.primary : tone === 'accent' ? theme.accentSoft : tone === 'alt' ? theme.cardAlt : theme.card;
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: Radius.lg,
          padding: Spacing.lg,
          borderWidth: tone === 'card' ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.border,
        },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <AppText variant="small" color="textSecondary" style={{ marginTop: Spacing.sm, marginBottom: -Spacing.sm }}>
      {children}
    </AppText>
  );
}

/** Gruppe von Listenzeilen in einer Karte. */
export function ListGroup({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: Radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.border,
        overflow: 'hidden',
      }}>
      {children}
    </View>
  );
}

export function ListRow({
  icon,
  iconColor,
  title,
  subtitle,
  right,
  onPress,
  chevron,
  last,
  accessibilityLabel,
}: {
  icon?: IconName;
  iconColor?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  last?: boolean;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth },
        pressed && { backgroundColor: theme.cardAlt },
      ]}>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: theme.primarySoft }]}>
          <Icon name={icon} size={20} color={iconColor ?? theme.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        {typeof title === 'string' ? <AppText variant="label">{title}</AppText> : title}
        {subtitle ? (
          typeof subtitle === 'string' ? (
            <AppText variant="caption" color="textSecondary">
              {subtitle}
            </AppText>
          ) : (
            subtitle
          )
        ) : null}
      </View>
      {right}
      {chevron ? <Icon name="chevron-right" size={22} color={theme.textMuted} /> : null}
    </Pressable>
  );
}

export function SwitchRow({
  title,
  subtitle,
  value,
  onValueChange,
  icon,
  last,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  icon?: IconName;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <ListRow
      icon={icon}
      title={title}
      subtitle={subtitle}
      last={last}
      onPress={() => onValueChange(!value)}
      right={
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ true: theme.primary, false: theme.border }}
          thumbColor={value ? theme.onPrimary : theme.card}
          accessibilityLabel={title}
        />
      }
    />
  );
}

export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const bg = variant === 'primary' ? theme.primary : variant === 'secondary' ? theme.primarySoft : 'transparent';
  const fg = variant === 'primary' ? theme.onPrimary : theme.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: theme.border },
        style,
      ]}>
      {icon ? <Icon name={icon} size={20} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 15, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.cardAlt }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && { backgroundColor: theme.card, ...styles.segmentActive }]}>
            <Text
              numberOfLines={1}
              style={{ color: active ? theme.text : theme.textSecondary, fontWeight: active ? '600' : '500', fontSize: 14 }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Auswahlliste mit Häkchen (z. B. Berechnungsmethode). */
export function ChoiceList<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; subtitle?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <ListGroup>
      {options.map((o, i) => (
        <ListRow
          key={String(o.value)}
          title={o.label}
          subtitle={o.subtitle}
          last={i === options.length - 1}
          onPress={() => onChange(o.value)}
          right={o.value === value ? <Icon name="check-circle" color={theme.primary} /> : <Icon name="circle-outline" color={theme.border} />}
        />
      ))}
    </ListGroup>
  );
}

export function Stepper({
  value,
  onChange,
  min = -30,
  max = 30,
  signed = true,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  /** Positive Werte mit "+" anzeigen (für Korrekturen). */
  signed?: boolean;
}) {
  const theme = useTheme();
  const btn = (delta: number, icon: IconName) => (
    <Pressable
      onPress={() => onChange(Math.min(max, Math.max(min, value + delta)))}
      accessibilityRole="button"
      style={({ pressed }) => [styles.stepBtn, { backgroundColor: theme.cardAlt, opacity: pressed ? 0.7 : 1 }]}>
      <Icon name={icon} size={18} color={theme.primary} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
      {btn(-1, 'minus')}
      <AppText variant="label" style={{ minWidth: 36, textAlign: 'center' }}>
        {signed && value > 0 ? `+${value}` : value}
      </AppText>
      {btn(1, 'plus')}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 56,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 13,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radius.sm + 1,
  },
  segmentActive: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
