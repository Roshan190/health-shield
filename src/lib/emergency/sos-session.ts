import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'healthshield.sos_session.v1';

export type SosCoords = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  updatedAt: string;
};

export type SosSession = {
  active: boolean;
  startedAt: string | null;
  lastCoords: SosCoords | null;
  /** True after the user opened SMS/share at least once this session. */
  notifiedAt: string | null;
};

const DEFAULTS: SosSession = {
  active: false,
  startedAt: null,
  lastCoords: null,
  notifiedAt: null,
};

export async function loadSosSession(): Promise<SosSession> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      return { ...DEFAULTS };
    }
    const parsed = JSON.parse(raw) as Partial<SosSession>;
    return {
      active: Boolean(parsed.active),
      startedAt: typeof parsed.startedAt === 'string' ? parsed.startedAt : null,
      lastCoords: parsed.lastCoords ?? null,
      notifiedAt: typeof parsed.notifiedAt === 'string' ? parsed.notifiedAt : null,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveSosSession(session: SosSession) {
  await AsyncStorage.setItem(KEY, JSON.stringify(session));
}

export async function startSosSession(coords: SosCoords | null): Promise<SosSession> {
  const session: SosSession = {
    active: true,
    startedAt: new Date().toISOString(),
    lastCoords: coords,
    notifiedAt: null,
  };
  await saveSosSession(session);
  return session;
}

export async function updateSosCoords(coords: SosCoords): Promise<SosSession> {
  const current = await loadSosSession();
  const next = { ...current, lastCoords: coords };
  await saveSosSession(next);
  return next;
}

export async function markSosNotified(): Promise<SosSession> {
  const current = await loadSosSession();
  const next = { ...current, notifiedAt: new Date().toISOString() };
  await saveSosSession(next);
  return next;
}

export async function endSosSession(): Promise<SosSession> {
  const cleared = { ...DEFAULTS };
  await saveSosSession(cleared);
  return cleared;
}

export async function clearSosSession() {
  await AsyncStorage.removeItem(KEY);
}
