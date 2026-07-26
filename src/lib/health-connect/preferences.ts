import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'healthshield.health_connect.v1';

export type HealthConnectPrefs = {
  /** User opted in and granted (or last attempted) Health Connect read access. */
  connected: boolean;
  lastSyncedAt: string | null;
};

const DEFAULTS: HealthConnectPrefs = {
  connected: false,
  lastSyncedAt: null,
};

export async function loadHealthConnectPrefs(): Promise<HealthConnectPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      return { ...DEFAULTS };
    }
    const parsed = JSON.parse(raw) as Partial<HealthConnectPrefs>;
    return {
      connected: Boolean(parsed.connected),
      lastSyncedAt: typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveHealthConnectPrefs(prefs: HealthConnectPrefs) {
  await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
}

export async function clearHealthConnectPrefs() {
  await AsyncStorage.removeItem(KEY);
}
