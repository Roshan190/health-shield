import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Apple HealthKit needs a custom Dev Client / EAS iOS build.
 * Expo Go and non-iOS platforms cannot load the native module.
 */
export function appleHealthUnsupportedReason(): string | null {
  if (Platform.OS !== 'ios') {
    return 'Apple Health is iOS-only. On Android, use Health Connect.';
  }
  if (Constants.appOwnership === 'expo') {
    return 'Apple Health needs a development build (not Expo Go). Use an EAS/dev-client build on an iPhone.';
  }
  return null;
}

export type AppleHealthModule = typeof import('apple-health').default;
export type AppleHealthKitQuery = typeof import('apple-health').HealthKitQuery;

let cachedModule: AppleHealthModule | null | undefined;
let cachedQuery: AppleHealthKitQuery | null | undefined;

export async function getAppleHealthModule(): Promise<AppleHealthModule | null> {
  if (appleHealthUnsupportedReason()) {
    return null;
  }
  if (cachedModule !== undefined) {
    return cachedModule;
  }
  try {
    const mod = await import('apple-health');
    cachedModule = mod.default;
    return cachedModule;
  } catch {
    cachedModule = null;
    return null;
  }
}

export async function getHealthKitQuery(): Promise<AppleHealthKitQuery | null> {
  if (appleHealthUnsupportedReason()) {
    return null;
  }
  if (cachedQuery !== undefined) {
    return cachedQuery;
  }
  try {
    const mod = await import('apple-health');
    cachedQuery = mod.HealthKitQuery;
    return cachedQuery;
  } catch {
    cachedQuery = null;
    return null;
  }
}
