import { getSupabase } from '@/lib/supabase/client';

export type AskDocumentKind = 'policy' | 'record';

export type AskDocumentHistoryTurn = {
  role: 'user' | 'assistant';
  content: string;
};

export type AskDocumentResult = {
  answer: string;
  disclaimer: string;
};

export class AskDocumentError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AskDocumentError';
    this.code = code;
  }
}

type FunctionErrorBody = {
  error?: string;
  code?: string;
};

export const ASK_DOCUMENT_DISCLAIMER =
  'Answered from this one file only. It may be incomplete or wrong. This is not medical or insurance advice, and it does not diagnose, prescribe, or say whether a claim will be paid.';

export async function askDocument(params: {
  kind: AskDocumentKind;
  id: string;
  question: string;
  /** Prior turns of this session's conversation, oldest first (max ~12 messages). */
  history?: AskDocumentHistoryTurn[];
}): Promise<AskDocumentResult> {
  const { data, error } = await getSupabase().functions.invoke('ask-document', {
    body: {
      kind: params.kind,
      id: params.id,
      question: params.question,
      history: params.history?.slice(-12) ?? [],
    },
  });

  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const body = (await context.clone().json()) as FunctionErrorBody;
        if (body.error) {
          throw new AskDocumentError(body.error, body.code);
        }
      } catch (e) {
        if (e instanceof AskDocumentError) {
          throw e;
        }
      }
    }
    throw new AskDocumentError(error.message || 'Could not answer from this file.');
  }

  const payload = data as (AskDocumentResult & FunctionErrorBody) | null;
  if (payload?.error) {
    throw new AskDocumentError(payload.error, payload.code);
  }
  if (!payload?.answer) {
    throw new AskDocumentError('AI returned an empty answer.', 'empty_answer');
  }

  return {
    answer: payload.answer,
    disclaimer: payload.disclaimer ?? ASK_DOCUMENT_DISCLAIMER,
  };
}
