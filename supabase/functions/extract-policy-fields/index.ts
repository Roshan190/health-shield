/**
 * Phase P thin OCR (D-022): draft policy form fields from a PDF in private storage.
 * Policies only. Never invent coverage. User must review before save.
 *
 * Secret: OPENAI_API_KEY (Edge Function secrets — never ship in the app).
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'policy-docs';

const POLICY_TYPES = [
  'health',
  'term',
  'life',
  'personal_accident',
  'critical_illness',
  'other',
] as const;

const PREMIUM_FREQUENCIES = [
  'annual',
  'half_yearly',
  'quarterly',
  'monthly',
  'one_time',
] as const;

const SYSTEM_PROMPT = `You are HealthShield's policy document assistant for an India-first personal health + insurance organizer.

Your only job: read the attached insurance policy PDF and extract structured fields that match a simple vault form.

Hard rules:
- Extract ONLY facts clearly printed in the document. If a field is missing or unclear, return null for that field.
- Do NOT invent coverage benefits, exclusions, waiting periods, network hospitals, claim status, or advice.
- Do NOT diagnose or interpret medical content.
- Amounts are INR: return plain numbers only (no ₹, commas, or "lakhs"/"L"/"Cr" text). Convert lakhs/crores to absolute numbers when explicit (e.g. 5 lakh → 500000).
- Dates: normalize to YYYY-MM-DD. Indian documents often use DD/MM/YYYY or DD-MM-YYYY.
- policy_type must be one of: health, term, life, personal_accident, critical_illness, other — or null.
- premium_frequency must be one of: annual, half_yearly, quarterly, monthly, one_time — or null.
- nominee: named nominee person only if clearly printed; otherwise null.
- Prefer the primary / base policy schedule page over marketing pages.`;

const EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    insurer: { type: ['string', 'null'] },
    policy_number: { type: ['string', 'null'] },
    policy_type: {
      anyOf: [
        { type: 'string', enum: [...POLICY_TYPES] },
        { type: 'null' },
      ],
    },
    sum_insured: { type: ['number', 'null'] },
    premium_amount: { type: ['number', 'null'] },
    premium_frequency: {
      anyOf: [
        { type: 'string', enum: [...PREMIUM_FREQUENCIES] },
        { type: 'null' },
      ],
    },
    start_date: { type: ['string', 'null'] },
    renewal_date: { type: ['string', 'null'] },
    nominee: { type: ['string', 'null'] },
  },
  required: [
    'insurer',
    'policy_number',
    'policy_type',
    'sum_insured',
    'premium_amount',
    'premium_frequency',
    'start_date',
    'renewal_date',
    'nominee',
  ],
};

type RequestBody = {
  storage_path?: string;
};

type DraftFields = {
  insurer: string | null;
  policy_number: string | null;
  policy_type: (typeof POLICY_TYPES)[number] | null;
  sum_insured: number | null;
  premium_amount: number | null;
  premium_frequency: (typeof PREMIUM_FREQUENCIES)[number] | null;
  start_date: string | null;
  renewal_date: string | null;
  nominee: string | null;
};

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

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const dmy = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }
  return null;
}

function normalizeAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const n = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDraft(raw: Record<string, unknown>): DraftFields {
  const policyType = normalizeString(raw.policy_type);
  const frequency = normalizeString(raw.premium_frequency);

  return {
    insurer: normalizeString(raw.insurer),
    policy_number: normalizeString(raw.policy_number),
    policy_type:
      policyType && (POLICY_TYPES as readonly string[]).includes(policyType)
        ? (policyType as DraftFields['policy_type'])
        : null,
    sum_insured: normalizeAmount(raw.sum_insured),
    premium_amount: normalizeAmount(raw.premium_amount),
    premium_frequency:
      frequency && (PREMIUM_FREQUENCIES as readonly string[]).includes(frequency)
        ? (frequency as DraftFields['premium_frequency'])
        : null,
    start_date: normalizeDate(raw.start_date),
    renewal_date: normalizeDate(raw.renewal_date),
    nominee: normalizeString(raw.nominee),
  };
}

async function uploadOpenAiFile(openaiKey: string, bytes: Uint8Array, fileName: string) {
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
    // Best-effort cleanup; do not fail the request.
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
      error:
        'Policy PDF draft is not configured yet. Set the OPENAI_API_KEY secret on the Edge Functions.',
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

  const storagePath = typeof body.storage_path === 'string' ? body.storage_path.trim() : '';
  if (!storagePath || storagePath.includes('..') || !storagePath.toLowerCase().endsWith('.pdf')) {
    return json(400, {
      error: 'Body must include storage_path to a PDF under your private storage.',
      code: 'invalid_path',
    });
  }

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

  if (!storagePath.startsWith(`${user.id}/`)) {
    return json(403, { error: 'Storage path is not owned by the signed-in user.', code: 'forbidden_path' });
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);

  if (downloadError || !fileData) {
    return json(404, {
      error: downloadError?.message ?? 'PDF not found in storage.',
      code: 'pdf_not_found',
    });
  }

  const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
  if (pdfBytes.byteLength === 0) {
    return json(422, { error: 'PDF is empty.', code: 'empty_pdf' });
  }
  if (pdfBytes.byteLength > 10 * 1024 * 1024) {
    return json(413, { error: 'PDF must be 10MB or smaller.', code: 'pdf_too_large' });
  }

  const fileName = storagePath.split('/').pop() || 'policy.pdf';
  let openAiFileId: string | null = null;

  try {
    openAiFileId = await uploadOpenAiFile(openaiKey, pdfBytes, fileName);

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
          max_output_tokens: 600,
          instructions: SYSTEM_PROMPT,
          text: {
            format: {
              type: 'json_schema',
              name: 'policy_field_draft',
              strict: true,
              schema: EXTRACTION_SCHEMA,
            },
          },
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_file',
                  file_id: openAiFileId,
                },
                {
                  type: 'input_text',
                  text: 'Extract the policy vault form fields from this PDF. Return JSON only per the schema. Use null when unsure.',
                },
              ],
            },
          ],
        }),
      });
    } catch {
      return json(502, { error: 'Could not reach OpenAI. Try again shortly.' });
    }

    if (!openaiResponse.ok) {
      const detail = await openaiResponse.text();
      console.error('OpenAI extract error', openaiResponse.status, detail.slice(0, 300));
      return json(502, {
        error: 'Could not draft fields from this PDF. Try again, or enter details manually.',
        code: 'openai_error',
      });
    }

    const completion = (await openaiResponse.json()) as {
      output_text?: string;
      output?: {
        type?: string;
        content?: { type?: string; text?: string }[];
      }[];
    };

    let content = completion.output_text?.trim() ?? '';
    if (!content && Array.isArray(completion.output)) {
      for (const item of completion.output) {
        if (item.type !== 'message' || !Array.isArray(item.content)) {
          continue;
        }
        for (const part of item.content) {
          if (part.type === 'output_text' && part.text) {
            content = part.text.trim();
            break;
          }
        }
        if (content) {
          break;
        }
      }
    }

    if (!content) {
      return json(502, { error: 'AI returned an empty draft.', code: 'empty_draft' });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch {
      return json(502, { error: 'AI returned invalid draft JSON.', code: 'invalid_draft' });
    }

    const draft = normalizeDraft(parsed);
    const hasAny = Object.values(draft).some((v) => v !== null);
    if (!hasAny) {
      return json(422, {
        error:
          'Could not read usable fields from this PDF. Enter details manually, or try a clearer policy schedule PDF.',
        code: 'empty_fields',
      });
    }

    return json(200, {
      draft,
      disclaimer:
        'Drafted from your PDF for review. Fields may be incomplete or wrong — edit before saving. This is not insurance advice.',
    });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('openai_file')) {
      return json(502, {
        error: 'Could not upload the PDF for drafting. Try again shortly.',
        code: 'openai_file_error',
      });
    }
    return json(502, { error: 'Could not draft fields from this PDF.', code: 'extract_failed' });
  } finally {
    if (openAiFileId) {
      await deleteOpenAiFile(openaiKey, openAiFileId);
    }
  }
});
