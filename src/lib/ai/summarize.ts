import { getSupabase } from '@/lib/supabase/client';

export type SummarizeKind = 'policy' | 'record';

export type SummarizeResult = {
  summary: string;
  disclaimer: string;
};

export class SummarizeError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'SummarizeError';
    this.code = code;
  }
}

type FunctionErrorBody = {
  error?: string;
  code?: string;
};

/**
 * Calls the summarize-item Edge Function with the signed-in user's JWT.
 * Summarizes saved structured fields only (no PDFs).
 */
export async function summarizeItem(
  kind: SummarizeKind,
  id: string
): Promise<SummarizeResult> {
  const { data, error } = await getSupabase().functions.invoke('summarize-item', {
    body: { kind, id },
  });

  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const body = (await context.clone().json()) as FunctionErrorBody;
        if (body.error) {
          throw new SummarizeError(body.error, body.code);
        }
      } catch (e) {
        if (e instanceof SummarizeError) {
          throw e;
        }
      }
    }
    throw new SummarizeError(error.message || 'Could not create a summary.');
  }

  const payload = data as (SummarizeResult & FunctionErrorBody) | null;
  if (payload?.error) {
    throw new SummarizeError(payload.error, payload.code);
  }
  if (!payload?.summary) {
    throw new SummarizeError('AI returned an empty summary.', 'empty_summary');
  }

  return {
    summary: payload.summary,
    disclaimer:
      payload.disclaimer ??
      'HealthShield rewrites what you already saved. This is not medical or insurance advice, and it does not diagnose or prescribe.',
  };
}
