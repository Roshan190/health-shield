# Edge Functions

## `summarize-item` (Phase 4 / D-019)

Plain-language summaries of saved policy / medical-record **form fields**. Does not read PDFs.

```bash
npx supabase functions deploy summarize-item --project-ref yodcqlkkmqssellzketa
```

---

## `extract-policy-fields` (Phase P / D-022)

Drafts Add-policy form fields from a PDF in private `policy-docs` storage. Sends the PDF to OpenAI.

```bash
npx supabase functions deploy extract-policy-fields --project-ref yodcqlkkmqssellzketa
```

---

## `nearby-hospitals` (Phase N / D-024)

Nearby hospitals via **Mapbox Search Box** (`hospital` / `clinic`). OSM Overpass parked. Not an insurer cashless network.

```bash
npx supabase functions deploy nearby-hospitals --project-ref yodcqlkkmqssellzketa
```

Repo source: `supabase/functions/nearby-hospitals/index.ts`

**Parked:** OpenStreetMap Overpass; Google Places (`GOOGLE_PLACES_API_KEY`).

---

## Required secrets (founder)

Never commit; never put in Expo `.env`.

### OpenAI (Summarize + Draft from PDF)

1. [Edge Function secrets](https://supabase.com/dashboard/project/yodcqlkkmqssellzketa/settings/functions)
2. `OPENAI_API_KEY` = your OpenAI API key
3. Or: `npx supabase secrets set OPENAI_API_KEY=sk-... --project-ref yodcqlkkmqssellzketa`

### Mapbox (Nearby hospitals list)

1. Create a [Mapbox access token](https://account.mapbox.com/access-tokens/) with Search Box / Geocoding access
2. Set Edge secret `MAPBOX_ACCESS_TOKEN` (same dashboard link above)
3. Or: `npx supabase secrets set MAPBOX_ACCESS_TOKEN=pk.... --project-ref yodcqlkkmqssellzketa`

### Google Maps SDK (parked)

Not used. In-app map tiles are Mapbox (`@rnmapbox/maps`). Do not add `GOOGLE_MAPS_API_KEY`.

### Mapbox map tiles (app)

1. Create a **public** token (`pk.`) at [Mapbox tokens](https://account.mapbox.com/access-tokens/)
2. Add to `.env`: `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk....`
3. Restart Expo (`npx expo start -c` if needed)
4. Map uses Mapbox GL JS in a WebView — works in Expo Go (no Google key, no `@rnmapbox/maps` rebuild)
