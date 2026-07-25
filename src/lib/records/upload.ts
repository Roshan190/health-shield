import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

import { getSupabase } from '@/lib/supabase/client';
import { readLocalUriAsArrayBuffer } from '@/lib/uploads/read-bytes';

const BUCKET = 'medical-records';
const MAX_BYTES = 10 * 1024 * 1024;

/** Mirrors the bucket's allowed_mime_types. */
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export type PickedRecordDoc = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  /** Web File from the picker */
  file?: globalThis.File;
  /** Native: bytes read immediately after pick (Android URI access is short-lived). */
  bytes?: ArrayBuffer;
};

export async function pickRecordDocument(): Promise<PickedRecordDoc | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ALLOWED_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  if (asset.size != null && asset.size > MAX_BYTES) {
    throw new Error('Document must be 10MB or smaller.');
  }

  const mimeType = asset.mimeType ?? 'application/pdf';
  if (!ALLOWED_TYPES.includes(mimeType)) {
    throw new Error('Only PDF and image files (JPEG, PNG, WebP, HEIC) are supported.');
  }

  const picked: PickedRecordDoc = {
    uri: asset.uri,
    name: asset.name || 'record',
    mimeType,
    size: asset.size,
    file: asset.file,
  };

  // Read while the cache copy / URI grant is still valid.
  if (!(Platform.OS === 'web' && asset.file)) {
    picked.bytes = await readLocalUriAsArrayBuffer(asset.uri);
  }

  return picked;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, '_');
}

export async function uploadRecordDocument(params: {
  userId: string;
  recordId: string;
  doc: PickedRecordDoc;
  previousPath?: string | null;
}) {
  const supabase = getSupabase();
  const safeName = sanitizeFileName(params.doc.name);
  const path = `${params.userId}/${params.recordId}/${Date.now()}-${safeName}`;

  let body: ArrayBuffer | Blob;
  if (Platform.OS === 'web' && params.doc.file) {
    body = params.doc.file;
  } else if (params.doc.bytes) {
    body = params.doc.bytes;
  } else {
    body = await readLocalUriAsArrayBuffer(params.doc.uri);
  }

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: params.doc.mimeType,
    upsert: false,
  });

  if (uploadError) {
    throw uploadError;
  }

  if (params.previousPath) {
    await supabase.storage.from(BUCKET).remove([params.previousPath]);
  }

  return { path, name: safeName, mime: params.doc.mimeType };
}

export async function createSignedRecordUrl(path: string) {
  const { data, error } = await getSupabase()
    .storage.from(BUCKET)
    .createSignedUrl(path, 60 * 10);

  if (error) {
    throw error;
  }
  return data.signedUrl;
}

export async function deleteRecordDocument(path: string) {
  const { error } = await getSupabase().storage.from(BUCKET).remove([path]);
  if (error) {
    throw error;
  }
}
