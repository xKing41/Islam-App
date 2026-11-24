import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { SavedLocation } from '@/store/settings';

export type LocateResult =
  | { ok: true; location: SavedLocation }
  | { ok: false; reason: 'denied' | 'error' };

function coordName(lat: number, lon: number) {
  return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
}

/** Bestimmt den Standort per GPS und ermittelt (wenn möglich) den Ortsnamen. */
export async function locateWithGps(): Promise<LocateResult> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return { ok: false, reason: 'denied' };

    let pos = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
    if (!pos) {
      pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    }
    const { latitude, longitude } = pos.coords;

    let name = coordName(latitude, longitude);
    if (Platform.OS !== 'web') {
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
        name = place?.city || place?.district || place?.subregion || place?.region || name;
      } catch {
        // Ortsname ist optional – Koordinaten genügen für die Berechnung.
      }
    }
    return { ok: true, location: { latitude, longitude, name, source: 'gps' } };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
