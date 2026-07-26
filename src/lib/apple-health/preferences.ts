import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'healthshield.apple_health.v1';

export type AppleHealthPrefs = {
  /** User opted in and completed the HealthKit authorization prompt. */
  connected: boolean;
  lastSyncedAt: string | null;
};

const DEFAULTS: AppleHealthPrefs = {
  connected: false,
  lastSyncedAt: null,
};

export async function loadAppleHealthPrefs(): Promise<AppleHealthPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      return { ...DEFAULTS };
    }
    const parsed = JSON.parse(raw) as Partial<AppleHealthPrefs>;
    return {
      connected: Boolean(parsed.connected),
      lastSyncedAt: typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveAppleHealthPrefs(prefs: AppleHealthPrefs) {
  await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
}

export async function clearAppleHealthPrefs() {
  await AsyncStorage.removeItem(KEY);
}
