import Constants from 'expo-constants';
import { Platform } from 'react-native';

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
