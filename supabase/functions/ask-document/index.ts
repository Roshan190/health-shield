/**
 * Phase Q (D-026 / D-031; chat deepen D-036): chat about ONE owned policy PDF
 * or medical-record file. Grounded in that file only — can explain what the
 * document's wording says (coverage, exclusions, waiting periods) but never
 * diagnoses and never promises claim outcomes. Session-only history.
 *
 * Secret: OPENAI_API_KEY (Edge Function secrets — never ship in the app).
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const POLICY_BUCKET = 'policy-docs';
const RECORD_BUCKET = 'medical-records';

const ALLOWED_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const DISCLAIMER =
  'Answered from this one file only. It may be incomplete or wrong. This is not medical or insurance advice, and it does not diagnose, prescribe, or say whether a claim will be paid.';

const SYSTEM_PROMPT = `You are HealthShield's document assistant for an India-first personal health + insurance organizer.

The user is chatting about ONE file they already stored (an insurance policy PDF or a medical-record file). The file is attached to the latest message. Ground every answer in that file only.

What you SHOULD do:
- Answer factual questions from the file: numbers, dates, names, terms, definitions.
- For coverage-style questions ("is X covered?"), actively search the document's coverage sections, inclusions, exclusions, waiting periods, sub-limits, and definitions. Explain what the wording says and name or quote the clause/section you relied on (for example: "Under 'Exclusions', the policy lists..."). Frame it strictly as what this document says, never as a guarantee.
- If the document does not mention the topic at all, say clearly that this file does not mention it, and suggest checking the complete policy wording or asking the insurer.
- Use earlier turns of this conversation to understand follow-up questions (like "and what about hospitalization?").

Hard rules:
- Never say a claim WILL be approved, rejected, or paid. Coverage answers only describe the document's wording.
- Never diagnose, interpret labs as high/low/abnormal, prescribe, or give treatment advice.
- Never use knowledge from outside this file (no web facts, no general medical or insurance knowledge beyond reading this file).
- If the question is unrelated to this file (weather, news, chit-chat, other documents, general knowledge), politely decline in one sentence and remind the user you can only answer about this file.
- Keep answers short: a few sentences or a short bullet list. Plain text. No markdown headings.
- Calm, assistive tone. No clinical authority.`;

const OFF_TOPIC_REPLY =
  'I can only answer questions about this stored file. Try asking about what is inside it — for example its coverage, exclusions, amounts, dates, or names.';

const GATE_PROMPT = `You are a relevance filter for a document Q&A feature inside a personal health + insurance organizer.

The user stored ONE personal file and chats about it. You see the file's name and type, recent conversation turns, and the latest question — but NOT the file itself.

Reply with exactly one word:
- yes — the question could plausibly be answered by reading that file, or is a follow-up in the ongoing conversation about it (coverage, exclusions, waiting periods, amounts, dates, names, terms, definitions, "what about X?").
- no — only when the question is clearly unrelated to any personal insurance or medical document (travel planning, weather, news, recipes, coding, math homework, general chit-chat).

If unsure, reply yes.`;

type Kind = 'policy' | 'record';

type HistoryTurn = {
  role: 'user' | 'assistant';
  content: string;
};

type RequestBody = {
  kind?: string;
  id?: string;
  question?: string;
  history?: unknown;
};

const MAX_HISTORY_MESSAGES = 12; // ~6 question/answer turns
const MAX_HISTORY_CONTENT = 2000;

/** Keep only well-formed, recent turns; drop anything else silently. */
function sanitizeHistory(raw: unknown): HistoryTurn[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const turns: HistoryTurn[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const role = (entry as { role?: unknown }).role;
    const content = (entry as { content?: unknown }).content;
    if (role !== 'user' && role !== 'assistant') continue;
    if (typeof content !== 'string') continue;
    const text = content.trim();
    if (!text) continue;
    turns.push({ role, content: text.slice(0, MAX_HISTORY_CONTENT) });
  }
  return turns.slice(-MAX_HISTORY_MESSAGES);
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function extensionOf(path: string) {
  const base = path.split('/').pop() ?? '';
  const dot = base.lastIndexOf('.');
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : '';
}

function resolveMime(path: string, hinted?: string | null): string | null {
  const fromHint = hinted?.trim().toLowerCase() ?? '';
  if (fromHint && Object.values(ALLOWED_MIME).includes(fromHint)) {
    return fromHint;
  }
  return ALLOWED_MIME[extensionOf(path)] ?? null;
}

function bytesToBase64(bytes: Uint8Array) {
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function uploadOpenAiPdf(openaiKey: string, bytes: Uint8Array, fileName: string) {
  const form = new FormData();
  form.append('purpose', 'user_data');
  form.append('file', new Blob([bytes], { type: 'application/pdf' }), fileName);

  const response = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('OpenAI file upload error', response.status, detail.slice(0, 300));
    throw new Error('openai_file_upload_failed');
  }

  const payload = (await response.json()) as { id?: string };
  if (!payload.id) {
    throw new Error('openai_file_missing_id');
  }
  return payload.id;
}

async function deleteOpenAiFile(openaiKey: string, fileId: string) {
  try {
    await fetch(`https://api.openai.com/v1/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${openaiKey}` },
    });
  } catch {
    // Best-effort cleanup.
  }
}

type ResponsesCompletion = {
  output_text?: string;
  output?: { type?: string; content?: { type?: string; text?: string }[] }[];
};

function extractOutputText(completion: ResponsesCompletion): string {
  let text = completion.output_text?.trim() ?? '';
  if (!text && Array.isArray(completion.output)) {
    for (const item of completion.output) {
      if (item.type !== 'message' || !Array.isArray(item.content)) {
        continue;
      }
      for (const part of item.content) {
        if (part.type === 'output_text' && part.text) {
          text = part.text.trim();
          break;
        }
      }
      if (text) {
        break;
      }
    }
  }
  return text;
}

/**
 * Cheap relevance gate: classify the question WITHOUT the file (a few hundred
 * input tokens) so clearly off-topic questions never trigger the storage
 * download + file upload + full model run. Fails open on any error so a gate
 * hiccup never blocks a legitimate question.
 */
async function isQuestionRelevant(params: {
  openaiKey: string;
  question: string;
  history: HistoryTurn[];
  fileLabel: string;
  kind: Kind;
}): Promise<boolean> {
  const historyText = params.history
    .slice(-4)
    .map((turn) => `${turn.role}: ${turn.content.slice(0, 300)}`)
    .join('\n');
  const context = [
    `File: "${params.fileLabel}" (${params.kind === 'policy' ? 'insurance policy' : 'medical record'})`,
    historyText ? `Recent conversation:\n${historyText}` : '',
    `Latest question: ${params.question}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_output_tokens: 16,
        instructions: GATE_PROMPT,
        input: [{ role: 'user', content: context }],
      }),
    });
    if (!response.ok) {
      return true;
    }
    const completion = (await response.json()) as ResponsesCompletion;
    const verdict = extractOutputText(completion).toLowerCase();
    return !verdict.startsWith('no');
  } catch {
    return true;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const openaiKey = Deno.env.get('OPENAI_API_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    return json(500, { error: 'Supabase environment is not configured on this function.' });
  }
  if (!openaiKey) {
    return json(503, {
      error: 'Document Q&A is not configured yet. Set OPENAI_API_KEY on Edge Functions.',
      code: 'missing_openai_key',
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json(401, { error: 'Missing authorization.' });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }

  const kind = body.kind === 'policy' || body.kind === 'record' ? (body.kind as Kind) : null;
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  const question = typeof body.question === 'string' ? body.question.trim() : '';

  if (!kind || !id) {
    return json(400, { error: 'Body must include kind (policy|record) and id.', code: 'invalid_body' });
  }
  if (question.length < 4 || question.length > 500) {
    return json(400, { error: 'Ask a short question (4–500 characters).', code: 'invalid_question' });
  }
  const history = sanitizeHistory(body.history);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return json(401, { error: 'Unauthorized.' });
  }

  let bucket: string;
  let storagePath: string | null = null;
  let mimeHint: string | null = null;
  let fileLabel = 'document';

  if (kind === 'policy') {
    const { data: policy, error } = await supabase
      .from('policies')
      .select('id, user_id, document_path, document_name')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      return json(500, { error: error.message });
    }
    if (!policy || policy.user_id !== user.id) {
      return json(403, { error: 'You can only ask about a policy you own.', code: 'forbidden' });
    }
    storagePath = policy.document_path;
    fileLabel = policy.document_name || 'policy.pdf';
    bucket = POLICY_BUCKET;
  } else {
    const { data: record, error } = await supabase
      .from('medical_records')
      .select('id, user_id, document_path, document_name, document_mime')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      return json(500, { error: error.message });
    }
    if (!record || record.user_id !== user.id) {
      return json(403, { error: 'You can only ask about a record you own.', code: 'forbidden' });
    }
    storagePath = record.document_path;
    mimeHint = record.document_mime;
    fileLabel = record.document_name || 'record';
    bucket = RECORD_BUCKET;

    if (!storagePath) {
      const { data: docs } = await supabase
        .from('medical_record_documents')
        .select('document_path, document_name, document_mime')
        .eq('record_id', id)
        .order('sort_order', { ascending: true })
        .limit(1);
      const first = docs?.[0];
      if (first) {
        storagePath = first.document_path;
        mimeHint = first.document_mime;
        fileLabel = first.document_name || fileLabel;
      }
    }
  }

  if (!storagePath) {
    return json(422, {
      error: 'Attach a PDF or photo to this item first, then ask about it.',
      code: 'no_document',
    });
  }
  if (!storagePath.startsWith(`${user.id}/`)) {
    return json(403, { error: 'Storage path is not owned by the signed-in user.', code: 'forbidden_path' });
  }

  const mime = resolveMime(storagePath, mimeHint);
  if (!mime) {
    return json(422, {
      error: 'Q&A supports PDF or JPEG/PNG/WebP. HEIC is not supported — attach a PDF or JPEG.',
      code: 'unsupported_type',
    });
  }

  const relevant = await isQuestionRelevant({ openaiKey, question, history, fileLabel, kind });
  if (!relevant) {
    return json(200, { answer: OFF_TOPIC_REPLY, disclaimer: DISCLAIMER, offTopic: true });
  }

  const { data: fileData, error: downloadError } = await supabase.storage.from(bucket).download(storagePath);
  if (downloadError || !fileData) {
    return json(404, { error: downloadError?.message ?? 'File not found in storage.', code: 'file_not_found' });
  }

  const bytes = new Uint8Array(await fileData.arrayBuffer());
  if (bytes.byteLength === 0) {
    return json(422, { error: 'File is empty.', code: 'empty_file' });
  }
  if (bytes.byteLength > 10 * 1024 * 1024) {
    return json(413, { error: 'File must be 10MB or smaller.', code: 'file_too_large' });
  }

  let openAiFileId: string | null = null;

  try {
    const isPdf = mime === 'application/pdf';
    if (isPdf) {
      openAiFileId = await uploadOpenAiPdf(openaiKey, bytes, fileLabel);
    }

    const content = isPdf && openAiFileId
      ? [
          { type: 'input_file', file_id: openAiFileId },
          { type: 'input_text', text: `Question about this document:\n${question}` },
        ]
      : [
          { type: 'input_image', image_url: `data:${mime};base64,${bytesToBase64(bytes)}` },
          { type: 'input_text', text: `Question about this document:\n${question}` },
        ];

    const input = [
      ...history.map((turn) => ({ role: turn.role, content: turn.content })),
      { role: 'user', content },
    ];

    let openaiResponse: Response;
    try {
      openaiResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0,
          max_output_tokens: 700,
          instructions: SYSTEM_PROMPT,
          input,
        }),
      });
    } catch {
      return json(502, { error: 'Could not reach OpenAI. Try again shortly.' });
    }

    if (!openaiResponse.ok) {
      const detail = await openaiResponse.text();
      console.error('OpenAI ask-document error', openaiResponse.status, detail.slice(0, 300));
      return json(502, {
        error: 'Could not answer from this file. Try again shortly.',
        code: 'openai_error',
      });
    }

    const completion = (await openaiResponse.json()) as ResponsesCompletion;
    const text = extractOutputText(completion);

    if (!text) {
      return json(502, { error: 'AI returned an empty answer.', code: 'empty_answer' });
    }

    return json(200, { answer: text, disclaimer: DISCLAIMER });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('openai_file')) {
      return json(502, { error: 'Could not upload the file for Q&A. Try again shortly.', code: 'openai_file_error' });
    }
    return json(502, { error: 'Could not answer from this file.', code: 'ask_failed' });
  } finally {
    if (openAiFileId) {
      await deleteOpenAiFile(openaiKey, openAiFileId);
    }
  }
});
