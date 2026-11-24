import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { PrayerConfig } from '@/lib/prayer-times';
import { useSettings } from '@/store/settings';

/** Berechnungs-Konfiguration aus den Einstellungen (null, solange kein Standort gesetzt ist). */
export function usePrayerConfig(): PrayerConfig | null {
  const { location, method, madhab, highLatRule, adjustments } = useSettings(
    useShallow((s) => ({
      location: s.location,
      method: s.method,
      madhab: s.madhab,
      highLatRule: s.highLatRule,
      adjustments: s.adjustments,
    }))
  );
  return useMemo(
    () =>
      location
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
            method,
            madhab,
            highLatRule,
            adjustments,
          }
        : null,
    [location, method, madhab, highLatRule, adjustments]
  );
}
