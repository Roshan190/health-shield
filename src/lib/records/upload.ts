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
  const docs = await pickRecordDocuments({ multiple: false });
  return docs[0] ?? null;
}

/** Pick one or more PDF/image files for medical records (max 5). */
export async function pickRecordDocuments(options?: {
  multiple?: boolean;
  maxFiles?: number;
}): Promise<PickedRecordDoc[]> {
  const multiple = options?.multiple !== false;
  const maxFiles = options?.maxFiles ?? 5;

  const result = await DocumentPicker.getDocumentAsync({
    type: ALLOWED_TYPES,
    copyToCacheDirectory: true,
    multiple,
  });

  if (result.canceled || !result.assets?.length) {
    return [];
  }

  const assets = result.assets.slice(0, maxFiles);
  const picked: PickedRecordDoc[] = [];

  for (const asset of assets) {
    if (asset.size != null && asset.size > MAX_BYTES) {
      throw new Error(`"${asset.name || 'Document'}" must be 10MB or smaller.`);
    }

    const mimeType = asset.mimeType ?? 'application/pdf';
    if (!ALLOWED_TYPES.includes(mimeType)) {
      throw new Error('Only PDF and image files (JPEG, PNG, WebP, HEIC) are supported.');
    }

    const doc: PickedRecordDoc = {
      uri: asset.uri,
      name: asset.name || 'record',
      mimeType,
      size: asset.size,
      file: asset.file,
    };

    if (!(Platform.OS === 'web' && asset.file)) {
      doc.bytes = await readLocalUriAsArrayBuffer(asset.uri);
    }
    picked.push(doc);
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

/** Persist an uploaded file row (does not touch storage). */
export async function insertRecordDocumentRow(params: {
  userId: string;
  recordId: string;
  path: string;
  name: string;
  mime: string;
  sortOrder: number;
}) {
  const { data, error } = await getSupabase()
    .from('medical_record_documents')
    .insert({
      user_id: params.userId,
      record_id: params.recordId,
      document_path: params.path,
      document_name: params.name,
      document_mime: params.mime,
      sort_order: params.sortOrder,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw error ?? new Error('Could not save document metadata');
  }
  return data;
}

export async function listRecordDocuments(recordId: string) {
  const { data, error } = await getSupabase()
    .from('medical_record_documents')
    .select('*')
    .eq('record_id', recordId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }
  return data ?? [];
}

/** Upload one or more files onto an existing record; first file becomes primary on the record row. */
export async function attachDocumentsToRecord(params: {
  userId: string;
  recordId: string;
  docs: PickedRecordDoc[];
  /** Starting sort_order (use existing count when adding more). */
  startSortOrder?: number;
  /** When true and startSortOrder is 0, sync medical_records.document_* to the first file. */
  setPrimary?: boolean;
}) {
  if (params.docs.length === 0) {
    return [];
  }

  const start = params.startSortOrder ?? 0;
  const setPrimary = params.setPrimary !== false && start === 0;
  const created: Awaited<ReturnType<typeof insertRecordDocumentRow>>[] = [];

  for (let i = 0; i < params.docs.length; i += 1) {
    const doc = params.docs[i];
    const uploaded = await uploadRecordDocument({
      userId: params.userId,
      recordId: params.recordId,
      doc,
    });
    const row = await insertRecordDocumentRow({
      userId: params.userId,
      recordId: params.recordId,
      path: uploaded.path,
      name: uploaded.name,
      mime: uploaded.mime,
      sortOrder: start + i,
    });
    created.push(row);

    if (setPrimary && i === 0) {
      const { error } = await getSupabase()
        .from('medical_records')
        .update({
          document_path: uploaded.path,
          document_name: uploaded.name,
          document_mime: uploaded.mime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.recordId);
      if (error) {
        throw error;
      }
    }
  }

  return created;
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

export async function deleteRecordDocumentRow(params: {
  id: string;
  path: string;
  recordId: string;
  wasPrimary: boolean;
}) {
  await deleteRecordDocument(params.path);
  const { error } = await getSupabase()
    .from('medical_record_documents')
    .delete()
    .eq('id', params.id);
  if (error) {
    throw error;
  }

  if (params.wasPrimary) {
    const remaining = await listRecordDocuments(params.recordId);
    const next = remaining[0] ?? null;
    const { error: updateError } = await getSupabase()
      .from('medical_records')
      .update({
        document_path: next?.document_path ?? null,
        document_name: next?.document_name ?? null,
        document_mime: next?.document_mime ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.recordId);
    if (updateError) {
      throw updateError;
    }
  }
}
