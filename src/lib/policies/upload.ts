import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

import { getSupabase } from '@/lib/supabase/client';
import { readLocalUriAsArrayBuffer } from '@/lib/uploads/read-bytes';

const BUCKET = 'policy-docs';
const MAX_BYTES = 10 * 1024 * 1024;

export type PickedPdf = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  /** Web File from the picker */
  file?: globalThis.File;
  /** Native: bytes read immediately after pick (Android URI access is short-lived). */
  bytes?: ArrayBuffer;
};

export async function pickPolicyPdf(): Promise<PickedPdf | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  if (asset.size != null && asset.size > MAX_BYTES) {
    throw new Error('PDF must be 10MB or smaller.');
  }

  const picked: PickedPdf = {
    uri: asset.uri,
    name: asset.name || 'policy.pdf',
    mimeType: asset.mimeType || 'application/pdf',
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
  const base = name.replace(/[^\w.\-]+/g, '_');
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

export async function uploadPolicyPdf(params: {
  userId: string;
  policyId: string;
  pdf: PickedPdf;
  previousPath?: string | null;
}) {
  const supabase = getSupabase();
  const safeName = sanitizeFileName(params.pdf.name);
  const path = `${params.userId}/${params.policyId}/${Date.now()}-${safeName}`;

  let body: ArrayBuffer | Blob;
  if (Platform.OS === 'web' && params.pdf.file) {
    body = params.pdf.file;
  } else if (params.pdf.bytes) {
    body = params.pdf.bytes;
  } else {
    body = await readLocalUriAsArrayBuffer(params.pdf.uri);
  }

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: 'application/pdf',
    upsert: false,
  });

  if (uploadError) {
    throw uploadError;
  }

  if (params.previousPath) {
    await supabase.storage.from(BUCKET).remove([params.previousPath]);
  }

  return { path, name: safeName };
}

export async function createSignedPolicyUrl(path: string) {
  const { data, error } = await getSupabase()
    .storage.from(BUCKET)
    .createSignedUrl(path, 60 * 10);

  if (error) {
    throw error;
  }
  return data.signedUrl;
}

export async function deletePolicyPdf(path: string) {
  const { error } = await getSupabase().storage.from(BUCKET).remove([path]);
  if (error) {
    throw error;
  }
}
