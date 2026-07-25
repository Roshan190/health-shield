import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'healthshield.emergency-card.v1';

export type EmergencyCardSnapshot = {
  fullName: string | null;
  dateOfBirth: string | null;
  bloodGroup: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  updatedAt: string;
};

export async function saveEmergencyCardSnapshot(snapshot: Omit<EmergencyCardSnapshot, 'updatedAt'>) {
  const payload: EmergencyCardSnapshot = {
    ...snapshot,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  return payload;
}

export async function loadEmergencyCardSnapshot(): Promise<EmergencyCardSnapshot | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as EmergencyCardSnapshot;
  } catch {
    return null;
  }
}

export async function clearEmergencyCardSnapshot() {
  await AsyncStorage.removeItem(KEY);
}
