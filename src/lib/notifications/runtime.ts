import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

/**
 * Android Expo Go (SDK 53+) throws if `expo-notifications` is imported at all.
 * Local/dev-client/iOS still work. Never statically import the package.
 */
export function notificationsUnsupported(): boolean {
  if (Platform.OS === 'web') {
    return true;
  }
  if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
    return true;
  }
  return false;
}

export type NotificationsModule = typeof import('expo-notifications');

export type NotificationCapability =
  | { status: 'unsupported'; message: string }
  | { status: 'denied'; canAskAgain: boolean; message: string }
  | { status: 'undetermined'; message: string }
  | { status: 'granted'; message: string };

export type ReminderSyncResult = {
  scheduled: number;
  capability: NotificationCapability;
};

let notificationsModule: NotificationsModule | null | undefined;

export async function getNotificationsModule(): Promise<NotificationsModule | null> {
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

function unsupportedCapability(): NotificationCapability {
  if (Platform.OS === 'web') {
    return {
      status: 'unsupported',
      message: 'Reminders are not available on web. Use the Android or iOS app.',
    };
  }
  if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
    return {
      status: 'unsupported',
      message:
        'Local reminders need a development build on Android. Expo Go skips them.',
    };
  }
  return {
    status: 'unsupported',
    message: 'Reminders are not available on this device.',
  };
}

/** Read-only permission / capability check (does not prompt). */
export async function getNotificationCapability(): Promise<NotificationCapability> {
  if (notificationsUnsupported()) {
    return unsupportedCapability();
  }
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return unsupportedCapability();
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return {
      status: 'granted',
      message: 'Reminders are allowed on this device.',
    };
  }
  if (current.status === 'undetermined') {
    return {
      status: 'undetermined',
      message: 'Allow notifications so renewal and medication reminders can fire.',
    };
  }
  return {
    status: 'denied',
    canAskAgain: current.canAskAgain !== false,
    message: current.canAskAgain
      ? 'Notifications are off. Enable them for renewal and medication reminders.'
      : 'Notifications are blocked. Open system settings to allow HealthShield.',
  };
}

/** Prompt when undetermined / canAskAgain; otherwise return current capability. */
export async function ensureNotificationPermissions(): Promise<NotificationCapability> {
  const before = await getNotificationCapability();
  if (before.status === 'unsupported' || before.status === 'granted') {
    return before;
  }
  if (before.status === 'denied' && !before.canAskAgain) {
    return before;
  }

  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return unsupportedCapability();
  }
  const asked = await Notifications.requestPermissionsAsync();
  if (asked.granted) {
    return {
      status: 'granted',
      message: 'Reminders are allowed on this device.',
    };
  }
  return {
    status: 'denied',
    canAskAgain: asked.canAskAgain !== false,
    message: asked.canAskAgain
      ? 'Notifications are off. Enable them for renewal and medication reminders.'
      : 'Notifications are blocked. Open system settings to allow HealthShield.',
  };
}

export async function openSystemNotificationSettings() {
  await Linking.openSettings();
}
