import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { appStorage } from './storage';

export type Language = 'de' | 'tr';
export type ThemeMode = 'system' | 'light' | 'dark';
export type PrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type CalcMethod =
  | 'Turkey'
  | 'MuslimWorldLeague'
  | 'NorthAmerica'
  | 'Egyptian'
  | 'Karachi'
  | 'UmmAlQura'
  | 'MoonsightingCommittee';
export type HighLatRule = 'auto' | 'middleofthenight' | 'seventhofthenight' | 'twilightangle';
export type NotificationSound = 'azan_a' | 'azan_b' | 'azan_short' | 'default' | 'silent';
export type TranslationDe = 'de_bubenheim';
export type TranslationTr = 'tr_diyanet' | 'tr_vakfi';

export type SavedLocation = {
  latitude: number;
  longitude: number;
  name: string;
  source: 'gps' | 'city';
};

export type PrayerNotify = { enabled: boolean; sound: NotificationSound };

export type SettingsState = {
  language: Language;
  theme: ThemeMode;
  // Koran
  translationDe: TranslationDe;
  translationTr: TranslationTr;
  showTranslation: boolean;
  arabicFontSize: number;
  translationFontSize: number;
  reciter: string;
  keepAwake: boolean;
  // Standort & Gebetszeiten
  location: SavedLocation | null;
  method: CalcMethod;
  madhab: 'shafi' | 'hanafi';
  highLatRule: HighLatRule;
  adjustments: Record<PrayerKey, number>;
  notify: Record<PrayerKey, PrayerNotify>;
  preReminder: number;
  reliableAlarms: boolean;
  hijriOffset: number;
};

type SettingsActions = {
  set: (patch: Partial<SettingsState>) => void;
  setAdjustment: (key: PrayerKey, minutes: number) => void;
  setNotify: (key: PrayerKey, patch: Partial<PrayerNotify>) => void;
};

function defaultLanguage(): Language {
  try {
    return getLocales()[0]?.languageCode === 'tr' ? 'tr' : 'de';
  } catch {
    return 'de';
  }
}

export const defaultSettings: SettingsState = {
  language: defaultLanguage(),
  theme: 'system',
  translationDe: 'de_bubenheim',
  translationTr: 'tr_diyanet',
  showTranslation: true,
  arabicFontSize: 28,
  translationFontSize: 16,
  reciter: 'Alafasy_128kbps',
  keepAwake: true,
  location: null,
  method: 'Turkey',
  madhab: 'shafi',
  highLatRule: 'auto',
  adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  notify: {
    fajr: { enabled: true, sound: 'azan_short' },
    sunrise: { enabled: false, sound: 'default' },
    dhuhr: { enabled: true, sound: 'azan_short' },
    asr: { enabled: true, sound: 'azan_short' },
    maghrib: { enabled: true, sound: 'azan_short' },
    isha: { enabled: true, sound: 'azan_short' },
  },
  preReminder: 0,
  reliableAlarms: false,
  hijriOffset: 0,
};

export const useSettings = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...defaultSettings,
      set: (patch) => set(patch),
      setAdjustment: (key, minutes) =>
        set((s) => ({ adjustments: { ...s.adjustments, [key]: minutes } })),
      setNotify: (key, patch) =>
        set((s) => ({ notify: { ...s.notify, [key]: { ...s.notify[key], ...patch } } })),
    }),
    {
      name: 'settings',
      version: 1,
      storage: appStorage,
      partialize: ({ set: _s, setAdjustment: _a, setNotify: _n, ...rest }) => rest,
      // Neue Felder späterer Versionen bekommen ihre Standardwerte.
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<SettingsState>) }),
    }
  )
);

/** Wartet, bis die gespeicherten Einstellungen geladen sind (z. B. im Hintergrund-Task). */
export async function ensureSettingsHydrated(): Promise<SettingsState> {
  if (!useSettings.persist.hasHydrated()) {
    await useSettings.persist.rehydrate();
  }
  return useSettings.getState();
}
