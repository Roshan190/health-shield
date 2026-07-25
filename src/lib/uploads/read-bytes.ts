import { File } from 'expo-file-system';
import { getInfoAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

/**
 * Read a local document-picker URI into an ArrayBuffer for Supabase Storage.
 *
 * Android notes (Expo Go + SDK 57):
 * - Prefer reading immediately after pick (`copyToCacheDirectory: true`).
 * - Legacy `readAsStringAsync` / `copyAsync` often fail with "isn't readable"
 *   even for cache `file://` URIs.
 * - XMLHttpRequest + `responseType: 'arraybuffer'` is the reliable RN path
 *   for both `file://` and many `content://` URIs.
 */
export async function readLocalUriAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (!uri) {
    throw new Error('Missing file URI');
  }

  const normalized = normalizeFileUri(uri);

  if (Platform.OS !== 'web') {
    const info = await getInfoAsync(normalized).catch(() => null);
    if (info && 'exists' in info && info.exists === false) {
      throw new Error('Selected file is no longer accessible. Please pick it again.');
    }
  }

  const errors: string[] = [];

  try {
    return await readWithXhr(normalized);
  } catch (e) {
    errors.push(`xhr: ${messageOf(e)}`);
  }

  try {
    return await readWithFetch(normalized);
  } catch (e) {
    errors.push(`fetch: ${messageOf(e)}`);
  }

  try {
    return await readWithFileApi(normalized);
  } catch (e) {
    errors.push(`file-api: ${messageOf(e)}`);
  }

  throw new Error(
    `Could not read the selected file on this device. ${errors.join(' | ')}`
  );
}

function normalizeFileUri(uri: string) {
  if (uri.startsWith('/') && Platform.OS === 'android') {
    return `file://${uri}`;
  }
  return uri;
}

function messageOf(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/** Most reliable on React Native Android for local URIs. */
function readWithXhr(uri: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => {
      if (xhr.status !== 0 && xhr.status !== 200) {
        reject(new Error(`status ${xhr.status}`));
        return;
      }
      const buffer = xhr.response as ArrayBuffer | null;
      if (!buffer || buffer.byteLength === 0) {
        reject(new Error('empty response'));
        return;
      }
      resolve(buffer);
    };
    xhr.onerror = () => reject(new Error('network error'));
    xhr.open('GET', uri);
    xhr.send();
  });
}

async function readWithFetch(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  if (!response.ok && response.status !== 0) {
    throw new Error(`status ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  if (!buffer.byteLength) {
    throw new Error('empty response');
  }
  return buffer;
}

async function readWithFileApi(uri: string): Promise<ArrayBuffer> {
  const file = new File(uri);
  const buffer = await file.arrayBuffer();
  if (!buffer.byteLength) {
    throw new Error('empty file');
  }
  return buffer;
}
