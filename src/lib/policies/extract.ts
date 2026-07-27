import { Platform } from 'react-native';

import { PREMIUM_FREQUENCIES } from '@/lib/policies/format';
import { type PickedPdf } from '@/lib/policies/upload';
import { getSupabase } from '@/lib/supabase/client';
import type { PolicyType } from '@/lib/supabase/database.types';
import { readLocalUriAsArrayBuffer } from '@/lib/uploads/read-bytes';

const BUCKET = 'policy-docs';

export type PolicyFieldDraft = {
  insurer: string | null;
  policy_number: string | null;
  policy_type: PolicyType | null;
  sum_insured: number | null;
  premium_amount: number | null;
  premium_frequency: (typeof PREMIUM_FREQUENCIES)[number] | null;
  start_date: string | null;
  renewal_date: string | null;
  nominee: string | null;
};

export type ExtractPolicyResult = {
  draft: PolicyFieldDraft;
  disclaimer: string;
};

export class ExtractPolicyError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ExtractPolicyError';
    this.code = code;
  }
}

type FunctionErrorBody = {
  error?: string;
  code?: string;
};

function sanitizeFileName(name: string) {
  const base = name.replace(/[^\w.\-]+/g, '_');
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

/** Upload a PDF for one-shot OCR under `{userId}/ocr-temp/...`. */
export async function uploadOcrTempPdf(params: { userId: string; pdf: PickedPdf }) {
  const supabase = getSupabase();
  const safeName = sanitizeFileName(params.pdf.name);
  const path = `${params.userId}/ocr-temp/${Date.now()}-${safeName}`;

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

  return path;
}

export async function deleteOcrTempPdf(path: string) {
  try {
    await getSupabase().storage.from(BUCKET).remove([path]);
  } catch {
    // Best-effort cleanup.
  }
}

/**
 * Calls extract-policy-fields with the signed-in user's JWT.
 * PDF must already be in private policy-docs storage.
 */
export async function extractPolicyFields(storagePath: string): Promise<ExtractPolicyResult> {
  const { data, error } = await getSupabase().functions.invoke('extract-policy-fields', {
    body: { storage_path: storagePath },
  });

  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const body = (await context.clone().json()) as FunctionErrorBody;
        if (body.error) {
          throw new ExtractPolicyError(body.error, body.code);
        }
      } catch (e) {
        if (e instanceof ExtractPolicyError) {
          throw e;
        }
      }
    }
    throw new ExtractPolicyError(error.message || 'Could not draft fields from this PDF.');
  }

  const payload = data as (ExtractPolicyResult & FunctionErrorBody) | null;
  if (payload?.error) {
    throw new ExtractPolicyError(payload.error, payload.code);
  }
  if (!payload?.draft) {
    throw new ExtractPolicyError('AI returned an empty draft.', 'empty_draft');
  }

  return {
    draft: payload.draft,
    disclaimer:
      payload.disclaimer ??
      'Drafted from your PDF for review. Fields may be incomplete or wrong — edit before saving. This is not insurance advice.',
  };
}
