/**
 * Hintergrund-Aufgabe: plant die Gebetserinnerungen regelmäßig neu,
 * auch wenn die App einige Tage nicht geöffnet wird.
 * Muss früh (beim Laden des Root-Layouts) importiert werden, damit Android die Aufgabe findet.
 */
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { reschedulePrayerNotifications } from '@/lib/notifications';
import { ensureSettingsHydrated } from '@/store/settings';

export const RESCHEDULE_TASK = 'prayer-reschedule';

if (Platform.OS !== 'web') {
  TaskManager.defineTask(RESCHEDULE_TASK, async () => {
    try {
      const settings = await ensureSettingsHydrated();
      await reschedulePrayerNotifications(settings);
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function registerBackgroundReschedule() {
  if (Platform.OS === 'web') return;
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    const registered = await TaskManager.isTaskRegisteredAsync(RESCHEDULE_TASK);
    if (!registered) {
      await BackgroundTask.registerTaskAsync(RESCHEDULE_TASK, { minimumInterval: 12 * 60 });
    }
  } catch {
    // Hintergrund-Aufgaben sind ein Zusatz – die App funktioniert auch ohne.
  }
}
