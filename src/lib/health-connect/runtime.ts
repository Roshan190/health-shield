import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Health Connect needs a custom Dev Client / EAS build.
 * Expo Go and non-Android platforms cannot load the native module.
 */
export function healthConnectUnsupportedReason(): string | null {
  if (Platform.OS !== 'android') {
    return 'Health Connect is Android-only. Apple Health comes later (slice 2.4).';
  }
  if (Constants.appOwnership === 'expo') {
    return 'Health Connect needs a development build (not Expo Go). Use an EAS/dev-client APK on your Android device.';
  }
  return null;
}

export type HealthConnectModule = typeof import('react-native-health-connect');

let cached: HealthConnectModule | null | undefined;

export async function getHealthConnectModule(): Promise<HealthConnectModule | null> {
  if (healthConnectUnsupportedReason()) {
    return null;
  }
  if (cached !== undefined) {
    return cached;
  }
  try {
    cached = await import('react-native-health-connect');
    return cached;
  } catch {
    cached = null;
    return null;
  }
}
