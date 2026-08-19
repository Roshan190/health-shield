import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Alert, Linking, Platform } from 'react-native';
import { z } from 'zod';

export const SIDELOAD_LATEST_URL = 'https://health-shield.in/latest.json';
export const SIDELOAD_DOWNLOAD_PAGE = 'https://health-shield.in/#download';

const DISMISS_KEY = 'healthshield.sideload_update.dismissed_version_code';
const PROMPT_AT_KEY = 'healthshield.sideload_update.last_prompted_at';
const PROMPT_THROTTLE_MS = 12 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

const releaseSchema = z.object({
  version: z.string().trim().min(1),
  versionCode: z.coerce.number().int().positive(),
  apkUrl: z.string().url(),
  sha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
  downloadPage: z.string().url(),
});

const manifestSchema = z.union([z.array(releaseSchema).min(1), releaseSchema]);

export type SideloadLatest = z.infer<typeof releaseSchema>;

function pickNewestRelease(releases: SideloadLatest[]): SideloadLatest {
  return releases.reduce((best, release) =>
    release.versionCode > best.versionCode ? release : best
  );
}

export type SideloadUpdateStatus = {
  latest: SideloadLatest;
  installedVersionCode: number;
  installedVersionName: string;
  updateAvailable: boolean;
};

let promptInFlight = false;

/** Sideload version checks are Android APK / dev-client only. */
export function sideloadUpdateUnsupported(): boolean {
  if (Platform.OS !== 'android') {
    return true;
  }
  if (Constants.appOwnership === 'expo') {
    return true;
  }
  return false;
}

export function installedVersionCode(): number | null {
  const raw = Application.nativeBuildVersion;
  if (!raw) {
    return null;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function installedVersionName(): string {
  return Application.nativeApplicationVersion?.trim() || Constants.expoConfig?.version || 'unknown';
}

export async function fetchSideloadLatest(): Promise<SideloadLatest | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${SIDELOAD_LATEST_URL}?t=${Date.now()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    const json: unknown = await response.json();
    const parsed = manifestSchema.safeParse(json);
    if (!parsed.success) {
      return null;
    }
    const releases = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
    return pickNewestRelease(releases);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function evaluateSideloadUpdate(): Promise<SideloadUpdateStatus | null> {
  if (sideloadUpdateUnsupported()) {
    return null;
  }
  const installed = installedVersionCode();
  if (installed == null) {
    return null;
  }
  const latest = await fetchSideloadLatest();
  if (!latest) {
    return null;
  }
  return {
    latest,
    installedVersionCode: installed,
    installedVersionName: installedVersionName(),
    updateAvailable: latest.versionCode > installed,
  };
}

export async function openSideloadDownload(latest?: SideloadLatest | null) {
  const url = latest?.downloadPage || SIDELOAD_DOWNLOAD_PAGE;
  await Linking.openURL(url);
}

async function dismissedVersionCode(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(DISMISS_KEY);
    if (!raw) {
      return 0;
    }
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

async function lastPromptedAt(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(PROMPT_AT_KEY);
    if (!raw) {
      return 0;
    }
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export async function dismissSideloadVersion(versionCode: number) {
  await AsyncStorage.setItem(DISMISS_KEY, String(versionCode));
}

async function markPromptedNow() {
  await AsyncStorage.setItem(PROMPT_AT_KEY, String(Date.now()));
}

/**
 * Soft Alert when a newer sideload APK is listed. Later hides this versionCode
 * from Alerts only — Profile still shows Get update.
 */
export async function maybePromptSideloadUpdate() {
  if (promptInFlight || sideloadUpdateUnsupported()) {
    return;
  }
  promptInFlight = true;
  try {
    const status = await evaluateSideloadUpdate();
    if (!status?.updateAvailable) {
      return;
    }
    const dismissed = await dismissedVersionCode();
    if (dismissed >= status.latest.versionCode) {
      return;
    }
    const promptedAt = await lastPromptedAt();
    if (promptedAt > 0 && Date.now() - promptedAt < PROMPT_THROTTLE_MS) {
      return;
    }
    await markPromptedNow();

    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) {
          return;
        }
        settled = true;
        resolve();
      };
      Alert.alert(
        'Update available — please update',
        'A newer Android build is on the HealthShield site. Sideload from there — this app is not on Play Store yet.',
        [
          {
            text: 'Later',
            style: 'cancel',
            onPress: () => {
              void dismissSideloadVersion(status.latest.versionCode).finally(done);
            },
          },
          {
            text: 'Update',
            onPress: () => {
              void openSideloadDownload(status.latest).finally(done);
            },
          },
        ],
        { cancelable: true, onDismiss: done }
      );
    });
  } catch {
    // Offline or a parse miss — stay silent.
  } finally {
    promptInFlight = false;
  }
}
