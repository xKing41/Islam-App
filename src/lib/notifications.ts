/**
 * Erinnerungen zu den Gebetszeiten (lokale Benachrichtigungen, kein Server nötig).
 *
 * Android legt den Ton pro "Kanal" fest und erlaubt nachträglich keine Änderung.
 * Deshalb gibt es für jeden Ton einen eigenen Kanal.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getDictionary } from '@/i18n';
import { getDayTimes, PRAYER_KEYS } from '@/lib/prayer-times';
import { addDays, formatTime } from '@/lib/time';
import type { NotificationSound, PrayerKey, SettingsState } from '@/store/settings';

const DAYS_AHEAD = 7;

const CHANNELS: Record<NotificationSound, { id: string; sound: string | null; name: string }> = {
  azan_a: { id: 'prayer-azan-a', sound: 'azan_a.ogg', name: 'Azan 1' },
  azan_b: { id: 'prayer-azan-b', sound: 'azan_b.ogg', name: 'Azan 2' },
  azan_short: { id: 'prayer-azan-short', sound: 'azan_short.ogg', name: 'Azan (kurz)' },
  default: { id: 'prayer-default', sound: 'default', name: 'Gebetszeit' },
  silent: { id: 'prayer-silent', sound: null, name: 'Gebetszeit (stumm)' },
};
const PRE_CHANNEL = { id: 'prayer-pre', name: 'Vorab-Erinnerung' };

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

export async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  for (const ch of Object.values(CHANNELS)) {
    await Notifications.setNotificationChannelAsync(ch.id, {
      name: ch.name,
      importance: ch.sound ? Notifications.AndroidImportance.MAX : Notifications.AndroidImportance.DEFAULT,
      sound: ch.sound,
      vibrationPattern: ch.sound ? [0, 400, 200, 400] : null,
      enableVibrate: !!ch.sound,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
  await Notifications.setNotificationChannelAsync(PRE_CHANNEL.id, {
    name: PRE_CHANNEL.name,
    importance: Notifications.AndroidImportance.HIGH,
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

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
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

  await ensureChannels();
  const t = getDictionary(s.language);
  const cfg = { ...s.location, method: s.method, madhab: s.madhab, highLatRule: s.highLatRule, adjustments: s.adjustments };
  const now = Date.now();
  const delivery = s.reliableAlarms ? 'alarmClock' : 'bestEffort';
  let count = 0;

  for (let d = 0; d < DAYS_AHEAD; d++) {
    const times = getDayTimes(addDays(new Date(), d), cfg);
    for (const key of PRAYER_KEYS) {
      const pref = s.notify[key];
      if (!pref?.enabled) continue;
      const at = times[key];
      const name = t.prayers[key as PrayerKey];
      if (at.getTime() > now + 5000) {
        const ch = CHANNELS[pref.sound] ?? CHANNELS.default;
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
  await ensureChannels();
  const t = getDictionary(s.language);
  const ch = CHANNELS[sound];
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
