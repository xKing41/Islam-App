import { Coordinates, Qibla } from 'adhan';

/** Kaaba in Mekka. */
export const KAABA = { latitude: 21.422487, longitude: 39.826206 };

/** Qibla-Richtung in Grad von geografisch Nord (im Uhrzeigersinn). */
export function qiblaBearing(latitude: number, longitude: number): number {
  return Qibla(new Coordinates(latitude, longitude));
}

/** Großkreis-Entfernung zur Kaaba in km. */
export function distanceToKaaba(latitude: number, longitude: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(KAABA.latitude - latitude);
  const dLon = toRad(KAABA.longitude - longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latitude)) * Math.cos(toRad(KAABA.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Kleinster Winkelunterschied a→b im Bereich (-180, 180]. */
export function angleDiff(a: number, b: number): number {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/** Glättet Kompasswerte (berücksichtigt den Sprung 359° → 0°). */
export function smoothAngle(prev: number, next: number, factor = 0.2): number {
  return (prev + angleDiff(prev, next) * factor + 360) % 360;
}
