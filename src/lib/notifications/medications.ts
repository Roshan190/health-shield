import { Platform } from 'react-native';

import { ensureNotificationHandler } from '@/lib/notifications/renewals';
import {
  ensureNotificationPermissions,
  getNotificationCapability,
  getNotificationsModule,
  type NotificationsModule,
  type ReminderSyncResult,
} from '@/lib/notifications/runtime';
import type { Medication } from '@/lib/supabase/database.types';

const CHANNEL_ID = 'medications';
const ID_PREFIX = 'med:';

function notificationId(medicationId: string, timeHHMM: string) {
  return `${ID_PREFIX}${medicationId}:${timeHHMM}`;
}

function parseHHMM(time: string): { hour: number; minute: number } | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!match) {
    return null;
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

async function ensureAndroidChannel(Notifications: NotificationsModule) {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Medication reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Cancel prior med reminders, then schedule daily repeats for enabled active meds. */
export async function syncMedicationNotifications(
  medications: Medication[]
): Promise<ReminderSyncResult> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return { scheduled: 0, capability: await getNotificationCapability() };
  }

  await ensureNotificationHandler();
  await ensureAndroidChannel(Notifications);

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );

  const enabled = medications.filter(
    (m) => m.active && m.reminder_enabled && m.reminder_times.length > 0
  );
  if (enabled.length === 0) {
    return { scheduled: 0, capability: await getNotificationCapability() };
  }

  const capability = await ensureNotificationPermissions();
  if (capability.status !== 'granted') {
    return { scheduled: 0, capability };
  }

  let scheduled = 0;

  for (const med of enabled) {
    for (const time of med.reminder_times) {
      const parsed = parseHHMM(time);
      if (!parsed) {
        continue;
      }

      await Notifications.scheduleNotificationAsync({
        identifier: notificationId(med.id, time),
        content: {
          title: 'Medication reminder',
          body: med.dose ? `${med.name} · ${med.dose}` : med.name,
          data: { medicationId: med.id, type: 'medication' },
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: parsed.hour,
          minute: parsed.minute,
          channelId: CHANNEL_ID,
        },
      });
      scheduled += 1;
    }
  }

  return { scheduled, capability };
}
