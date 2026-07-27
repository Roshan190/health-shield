/**
 * Phase 4 thin AI (D-019): plain-language summary of policy / medical_record
 * structured fields only. Never reads PDFs. Never diagnoses.
 *
 * Secret: OPENAI_API_KEY (Edge Function secrets — never ship in the app).
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const DISCLAIMER =
  'HealthShield rewrites what you already saved. This is not medical or insurance advice, and it does not diagnose or prescribe.';

const SYSTEM_PROMPT = `You are HealthShield's vault assistant for an India-first personal health + insurance organizer.

Your only job: rewrite the provided structured fields into a short, plain-language summary so the user can quickly recall what they stored.

Format (strict):
- First line: one short intro sentence.
- Then 3–6 lines, each exactly: "- Label: value" (example: "- Sum insured: ₹5,00,000").
- Plain text only. Do NOT use markdown (no **, __, #, backticks, or numbered lists).

Hard rules:
- Use ONLY the fields provided. Do not invent coverage, diagnoses, lab values, or advice.
- Do NOT diagnose, interpret symptoms, recommend medicines, or judge whether a policy is "good".
- Do NOT claim to have read any PDF or attached document (you are not given documents).
- If fields are sparse, say what is known and what is missing — briefly.
- Keep a calm, helpful tone. No clinical authority. No scare language.
- Prefer INR / Indian date phrasing when amounts or dates appear.`;

type Kind = 'policy' | 'record';

type RequestBody = {
  kind?: string;
  id?: string;
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

function asFields(row: Record<string, unknown>, keys: string[]) {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined || value === '') {
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }
    out[key] = value;
  }
  return out;
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
        'AI summaries are not configured yet. Set the OPENAI_API_KEY secret on the summarize-item Edge Function.',
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

  const kind = body.kind as Kind | undefined;
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if ((kind !== 'policy' && kind !== 'record') || !id) {
    return json(400, { error: 'Body must include kind ("policy" | "record") and id.' });
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

  const table = kind === 'policy' ? 'policies' : 'medical_records';
  const { data: row, error: loadError } = await supabase.from(table).select('*').eq('id', id).maybeSingle();

  if (loadError) {
    return json(500, { error: loadError.message });
  }
  if (!row) {
    return json(404, { error: kind === 'policy' ? 'Policy not found.' : 'Record not found.' });
  }

  const fields =
    kind === 'policy'
      ? asFields(row as Record<string, unknown>, [
          'insurer',
          'policy_number',
          'policy_type',
          'sum_insured',
          'premium_amount',
          'premium_frequency',
          'start_date',
          'renewal_date',
          'nominee',
          'notes',
        ])
      : asFields(row as Record<string, unknown>, [
          'title',
          'category',
          'record_date',
          'tags',
          'notes',
        ]);

  if (Object.keys(fields).length === 0) {
    return json(422, {
      error: 'Not enough saved details to summarize. Add a few fields and save first.',
      code: 'empty_fields',
    });
  }

  const userPrompt =
    kind === 'policy'
      ? `Summarize this saved insurance policy for the account owner:\n${JSON.stringify(fields, null, 2)}`
      : `Summarize this saved medical record metadata for the account owner (organizer notes only — not a clinical report):\n${JSON.stringify(fields, null, 2)}`;

  let openaiResponse: Response;
  try {
    openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
  } catch {
    return json(502, { error: 'Could not reach OpenAI. Try again shortly.' });
  }

  if (!openaiResponse.ok) {
    const detail = await openaiResponse.text();
    console.error('OpenAI error', openaiResponse.status, detail.slice(0, 500));
    return json(502, {
      error: 'AI summary failed. Check the OpenAI key and quota, then try again.',
      code: 'openai_error',
    });
  }

  const completion = (await openaiResponse.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const summary = completion.choices?.[0]?.message?.content?.trim();
  if (!summary) {
    return json(502, { error: 'AI returned an empty summary.', code: 'empty_summary' });
  }

  return json(200, { summary, disclaimer: DISCLAIMER, kind, id });
});
