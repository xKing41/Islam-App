/**
 * Erinnerungen zu den Gebetszeiten (lokale Benachrichtigungen, kein Server nötig).
 *
 * Android legt den Ton pro "Kanal" fest und erlaubt nachträglich keine Änderung.
 * Deshalb gibt es für jeden Ton einen eigenen Kanal.
 */
import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';
import { Platform } from 'react-native';

import { type Dictionary, getDictionary } from '@/i18n';
import { AZAN_FILES, isAzanSound, parseAzanSound, soundForPrayer } from '@/lib/azan';
import { getDayTimes, PRAYER_KEYS } from '@/lib/prayer-times';
import { addDays, formatTime } from '@/lib/time';
import { type NotificationSound, type PrayerKey, type SettingsState, useSettings } from '@/store/settings';

const DAYS_AHEAD = 7;

type Channel = { id: string; sound: string | null; name: string };

/** Kanal-Kennungen der ersten Töne bleiben unverändert, damit bestehende Kanäle weiter gelten. */
const LEGACY_CHANNEL_IDS: Record<string, string> = { azan_a: 'prayer-azan-a', azan_b: 'prayer-azan-b', azan_short: 'prayer-azan-short' };
const PRE_CHANNEL = { id: 'prayer-pre', name: 'Vorab-Erinnerung' };

/** Kanal zu einer Tondatei („azan_medina_short“ → Kanal „prayer-azan-medina-short“ mit Ton „azan_medina_short.ogg“). */
export function channelFor(sound: string, t: Dictionary): Channel {
  if (sound === 'silent') return { id: 'prayer-silent', sound: null, name: t.prayerSettings.sounds.silent };
  if (!isAzanSound(sound)) return { id: 'prayer-default', sound: 'default', name: t.prayerSettings.sounds.default };
  const parsed = parseAzanSound(sound);
  const name = parsed
    ? `${t.azan.channel}: ${t.azan.voices[parsed.voice.id as keyof typeof t.azan.voices].name}${parsed.length === 'short' ? ` (${t.azan.short})` : ''}`
    : `${t.azan.channel}: ${t.azan.fajr}`; // Fadschr-Ruf
  return { id: LEGACY_CHANNEL_IDS[sound] ?? `prayer-${sound.replace(/_/g, '-')}`, sound: `${sound}.ogg`, name };
}

/** Alle Töne, die eine Erinnerung verwenden kann. */
export const ALL_SOUNDS: string[] = [...AZAN_FILES, 'default', 'silent'];

let handlerSet = false;

/** Muss beim App-Start aufgerufen werden, damit Erinnerungen auch im Vordergrund erscheinen. */
export function setupNotificationHandler() {
  if (handlerSet || Platform.OS === 'web') return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Legt die Kanäle für die angegebenen Töne an (bzw. aktualisiert ihren Namen). */
export async function ensureChannels(t: Dictionary, sounds: Iterable<string> = ALL_SOUNDS) {
  if (Platform.OS !== 'android') return;
  const seen = new Set<string>();
  for (const sound of sounds) {
    const ch = channelFor(sound, t);
    if (seen.has(ch.id)) continue;
    seen.add(ch.id);
    await Notifications.setNotificationChannelAsync(ch.id, {
      name: ch.name,
      importance: ch.sound ? AndroidImportance.MAX : AndroidImportance.DEFAULT,
      sound: ch.sound,
      vibrationPattern: ch.sound ? [0, 400, 200, 400] : null,
      enableVibrate: !!ch.sound,
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    });
  }
  await Notifications.setNotificationChannelAsync(PRE_CHANNEL.id, {
    name: t.prayerSettings.preReminder,
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
}

export type PermissionState = { notifications: boolean; exactAlarms: boolean };

export async function getPermissionState(): Promise<PermissionState> {
  if (Platform.OS === 'web') return { notifications: false, exactAlarms: false };
  const n = await Notifications.getPermissionsAsync();
  let exact = true;
  if (Platform.OS === 'android') {
    try {
      exact = (await Notifications.getExactAlarmPermissionsAsync()).granted;
    } catch {
      exact = true;
    }
  }
  return { notifications: n.granted, exactAlarms: exact };
}

/** Fragt nach der Benachrichtigungs-Erlaubnis und plant bei Erfolg sofort alle Erinnerungen. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (granted && !current.granted) {
    reschedulePrayerNotifications(useSettings.getState()).catch(() => {});
  }
  return granted;
}

export async function requestExactAlarmPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    return (await Notifications.requestExactAlarmPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/**
 * Löscht alle geplanten Erinnerungen und plant sie für die nächsten Tage neu.
 * Gibt die Anzahl der geplanten Erinnerungen zurück.
 */
export async function reschedulePrayerNotifications(s: SettingsState): Promise<number> {
  if (Platform.OS === 'web') return 0;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!s.location) return 0;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return 0;

  const t = getDictionary(s.language);
  await ensureChannels(t);
  const cfg = { ...s.location, method: s.method, madhab: s.madhab, highLatRule: s.highLatRule, adjustments: s.adjustments };
  const now = Date.now();
  const delivery = s.reliableAlarms ? 'alarmClock' : 'bestEffort';
  const azanOpts = { rotate: s.azanRotate, fajrAzan: s.fajrAzan };
  const prayersWithAzan: PrayerKey[] = PRAYER_KEYS.filter((k) => k !== 'sunrise');
  let count = 0;

  for (let d = 0; d < DAYS_AHEAD; d++) {
    const times = getDayTimes(addDays(new Date(), d), cfg);
    for (const key of PRAYER_KEYS) {
      const pref = s.notify[key];
      if (!pref?.enabled) continue;
      const at = times[key];
      const name = t.prayers[key as PrayerKey];
      if (at.getTime() > now + 5000) {
        const file = soundForPrayer(pref.sound, azanOpts, Math.max(0, prayersWithAzan.indexOf(key)), key === 'fajr', at);
        const ch = channelFor(file, t);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: t.prayerSettings.notifTitle(name),
            body: t.prayerSettings.notifBody(formatTime(at), s.location.name),
            sound: ch.sound ?? false,
            data: { kind: 'prayer', prayer: key },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: at,
            channelId: ch.id,
            delivery,
          },
        });
        count++;
      }
      if (s.preReminder > 0 && key !== 'sunrise') {
        const pre = new Date(at.getTime() - s.preReminder * 60000);
        if (pre.getTime() > now + 5000) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: t.prayerSettings.preNotifTitle(name, s.preReminder),
              body: t.prayerSettings.notifBody(formatTime(at), s.location.name),
              sound: 'default',
              data: { kind: 'prayer-pre', prayer: key },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: pre,
              channelId: PRE_CHANNEL.id,
              delivery,
            },
          });
          count++;
        }
      }
    }
  }
  return count;
}

/** Test-Erinnerung in 5 Sekunden mit dem gewählten Ton. */
export async function sendTestNotification(s: SettingsState, sound: NotificationSound) {
  if (Platform.OS === 'web') return;
  const t = getDictionary(s.language);
  await ensureChannels(t);
  const ch = channelFor(sound, t);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: t.prayerSettings.notifTitle(t.prayers.dhuhr),
      body: t.prayerSettings.notifBody(formatTime(new Date(Date.now() + 5000)), s.location?.name ?? ''),
      sound: ch.sound ?? false,
      data: { kind: 'test' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: ch.id,
    },
  });
}
