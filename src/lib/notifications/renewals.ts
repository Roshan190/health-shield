import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { formatDate } from '@/lib/policies/format';
import type { Policy } from '@/lib/supabase/database.types';

const CHANNEL_ID = 'renewals';
const ID_PREFIX = 'renewal:';

/** Days before renewal to fire a local reminder. */
const OFFSETS_DAYS = [30, 7, 0] as const;

type NotificationsModule = typeof import('expo-notifications');

let handlerReady = false;
let notificationsModule: NotificationsModule | null | undefined;

/**
 * Android Expo Go (SDK 53+) throws if `expo-notifications` is imported at all.
 * Local/dev-client/iOS still work. Never statically import the package.
 */
function notificationsUnsupported(): boolean {
  if (Platform.OS === 'web') {
    return true;
  }
  // Expo Go on Android — remote push removed; module throws on import.
  if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
    return true;
  }
  return false;
}

async function getNotifications(): Promise<NotificationsModule | null> {
  if (notificationsUnsupported()) {
    return null;
  }
  if (notificationsModule !== undefined) {
    return notificationsModule;
  }
  try {
    notificationsModule = await import('expo-notifications');
    return notificationsModule;
  } catch {
    notificationsModule = null;
    return null;
  }
}

export async function ensureNotificationHandler() {
  if (handlerReady || notificationsUnsupported()) {
    return;
  }
  const Notifications = await getNotifications();
  if (!Notifications) {
    return;
  }
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerReady = true;
}

async function ensureAndroidChannel(Notifications: NotificationsModule) {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Policy renewals',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) {
    return false;
  }
  await ensureNotificationHandler();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

function parseLocalDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d, 9, 0, 0, 0);
}

function notificationId(policyId: string, offsetDays: number) {
  return `${ID_PREFIX}${policyId}:${offsetDays}`;
}

/** Cancel prior renewal reminders, then schedule for policies with future renewal dates. */
export async function syncRenewalNotifications(policies: Policy[]) {
  const Notifications = await getNotifications();
  if (!Notifications) {
    // Expo Go Android / web: skip quietly — use a development build for reminders.
    return { scheduled: 0, skipped: true as const };
  }

  await ensureNotificationHandler();
  await ensureAndroidChannel(Notifications);

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );

  const granted = await requestNotificationPermissions();
  if (!granted) {
    return { scheduled: 0, skipped: true as const };
  }

  const now = Date.now();
  let scheduled = 0;

  for (const policy of policies) {
    if (!policy.renewal_date) {
      continue;
    }
    const renewal = parseLocalDate(policy.renewal_date);

    for (const offset of OFFSETS_DAYS) {
      const fireAt = new Date(renewal);
      fireAt.setDate(fireAt.getDate() - offset);
      if (fireAt.getTime() <= now) {
        continue;
      }

      const title =
        offset === 0
          ? 'Policy renews today'
          : offset === 7
            ? 'Renewal in 7 days'
            : 'Renewal in 30 days';

      await Notifications.scheduleNotificationAsync({
        identifier: notificationId(policy.id, offset),
        content: {
          title,
          body: `${policy.insurer} · ${policy.policy_number} renews ${formatDate(policy.renewal_date)}.`,
          data: { policyId: policy.id, type: 'renewal' },
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
          channelId: CHANNEL_ID,
        },
      });
      scheduled += 1;
    }
  }

  return { scheduled, skipped: false as const };
}
