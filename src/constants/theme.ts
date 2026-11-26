/**
 * Farben, Abstände und Schriften der App (hell & dunkel).
 */
export const Colors = {
  light: {
    text: '#13201C',
    textSecondary: '#5B6B66',
    textMuted: '#8A9792',
    background: '#F5F3EC',
    card: '#FFFFFF',
    cardAlt: '#EEF3EF',
    border: '#E2E6E1',
    primary: '#0E4D40',
    primarySoft: '#DCEBE5',
    onPrimary: '#FFFFFF',
    accent: '#B08A2E',
    accentSoft: '#F4ECD8',
    danger: '#B42318',
    dangerSoft: '#FBE4E1',
    success: '#1F7A4D',
    successSoft: '#DDF1E5',
    warning: '#B54708',
    warningSoft: '#FDEBD6',
    info: '#1D5E9E',
    infoSoft: '#DDEAF7',
    highlight: '#FFF6DB',
    tabBar: '#FFFFFF',
  },
  dark: {
    text: '#E8EFEC',
    textSecondary: '#A9B8B2',
    textMuted: '#7D8C86',
    background: '#0B1311',
    card: '#14201D',
    cardAlt: '#1A2925',
    border: '#24342F',
    primary: '#3FA88C',
    primarySoft: '#1C3A33',
    onPrimary: '#06110E',
    accent: '#D9B65C',
    accentSoft: '#3A311B',
    danger: '#F97066',
    dangerSoft: '#3B1A17',
    success: '#47CD89',
    successSoft: '#163526',
    warning: '#F7A440',
    warningSoft: '#3A2812',
    info: '#6CB2F0',
    infoSoft: '#16283A',
    highlight: '#2D2A17',
    tabBar: '#101A17',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

/** Schriftnamen, wie sie in useFonts() registriert werden. */
export const Fonts = {
  quran: 'AmiriQuran_400Regular',
  arabic: 'Amiri_400Regular',
  arabicBold: 'Amiri_700Bold',
} as const;

export const MaxContentWidth = 720;
