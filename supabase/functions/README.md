# Edge Functions

## `summarize-item` (Phase 4 / D-019)

Plain-language summaries of saved policy / medical-record **form fields**. Does not read PDFs.

### Deploy

Deployed to project `health-shield` via Supabase MCP / Dashboard. Repo source:

`supabase/functions/summarize-item/index.ts`

Re-deploy after edits:

```bash
npx supabase functions deploy summarize-item --project-ref yodcqlkkmqssellzketa
```

### Required secret (founder)

Set **once** in the Supabase Dashboard (never commit, never put in Expo `.env`):

1. Open [Edge Function secrets](https://supabase.com/dashboard/project/yodcqlkkmqssellzketa/settings/functions)
2. Add secret `OPENAI_API_KEY` = your OpenAI API key
3. Or CLI: `npx supabase secrets set OPENAI_API_KEY=sk-... --project-ref yodcqlkkmqssellzketa`

Until this is set, Summarize returns a clear “not configured” error in the app.
