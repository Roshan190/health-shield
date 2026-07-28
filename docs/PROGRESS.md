# Progress

**Last updated:** 2026-07-28 (D-025 / Hospitals hub + cashless deep links)  
**Current phase:** Phase C — Hospitals hub + thin cashless assist (D-025)  
**Active slice:** C1–C4 shipped in code; smoke pending  
**Status:** `/hospitals` hub (Nearby | Preferred | Cashless); Home CTA; official insurer deep links only

Agents: read this file at the start of every session. Update it when phase/slice status changes.

---

## Snapshot

| Item | Value |
|------|--------|
| Product | HealthShield |
| Repo shape | Single Expo app (SDK 57) |
| Backend | Supabase project `health-shield` (`yodcqlkkmqssellzketa`) |
| Platform | Mobile-first (Android primary; iOS parked) |
| Team | Solo |

---

## Phase checklist

| Phase | Status | Notes |
|-------|--------|-------|
| 0 Research | **Done** (D-007 override) | Synthetic + real log R1 started |
| 1 Foundation MVP | **Done** (D-010) | Android smoke; iOS deferred |
| 2 Health tracking | **Done** (D-014) | Android smoked; 2.4 iOS parked |
| 3 Emergency | **Done** (D-016) | Thin SOS D-015; Android smoked |
| Q2 Deepen Foundation | **Done** (D-017) | Q2.1–Q2.5 shipped in code |
| 4 Thin AI summaries | **Done** (D-019 / D-020) | Metadata summarize; no PDF/OCR |
| Household invite/share | **Done** (D-018 / D-021) | Invite → accept → share → revoke smoked |
| P Policy PDF draft | **Done** (D-022 / D-023) | Draft from PDF + PDF-first Add policy |
| N Nearby hospitals | **In progress** (D-024) | Mapbox + preferred; smoke still pending |
| C Hospitals hub + cashless | **In progress** (D-025) | Hub + deep links shipped; smoke pending |

---

## Phase C — Hospitals hub + cashless deep links (D-025)

- [x] C1 Curated insurer → official network URL registry + fuzzy match
- [x] C2 Cashless segment + Policy detail deep links (system browser)
- [x] C3 `/hospitals` hub + Home “Hospitals” CTA; Emergency link retained; no 6th tab
- [x] C4 Map-first segments Nearby | Preferred | Cashless (no cashless Mapbox pins)
- [ ] Founder Android smoke (hub + deep link open)
- [ ] Phase C exit

### Founder smoke checklist (C)

1. Home → **Hospitals** opens `/hospitals`
2. Nearby map/list + Preferred still work (Mapbox secrets as before)
3. Cashless → matched policy opens insurer site; unmatched shows honest empty guidance
4. Policy detail → Open insurer network (when matched)
5. Copy never claims HealthShield verified cashless

---

## Phase N — Nearby hospitals + preferred (D-024)

- [x] N1 Nearby list (`nearby-hospitals` → Mapbox Search Box; OSM parked)
- [x] N2 Preferred mark/unsave (`preferred_hospitals`)
- [x] Map via Mapbox GL JS WebView (now on `/hospitals`)
- [x] Google Places + Google Maps SDK + OSM Overpass + `@rnmapbox/maps` parked
- [ ] Founder sets `MAPBOX_ACCESS_TOKEN` Edge secret (list)
- [ ] Founder sets `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (pk.) + restart Expo
- [ ] Android smoke
- [ ] Phase N exit

### Founder smoke checklist (N)

1. Set Edge secret `MAPBOX_ACCESS_TOKEN` (Search)
2. Add `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk....` to `.env` → **restart** Expo
3. Home → Hospitals → Nearby list appears
4. Map shows Mapbox tiles + pins; tap pin → Open in Maps / Mark preferred
5. Star a hospital → Preferred persists
6. Confirm copy does **not** claim insurer cashless or show fake ratings

---

## Blockers

- Apple Health + SOS **iOS runtime parked** (D-014 / D-016)
- Nearby hospitals Search: `MAPBOX_ACCESS_TOKEN` on Edge Functions
- In-app map tiles: `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (pk.) — WebView Mapbox GL (Expo Go OK)

---

## Founder Console checklist (parked / when ready)

1. [ ] Google Play Console → Store listing → category **Health & fitness**
2. [ ] Supabase Auth → Email → **leaked password protection**

---

## Next actions (priority order)

1. Founder: Mapbox secrets → restart Expo → smoke Phase N + Phase C (Home → Hospitals)
2. Parked later: scrape/partner cashless APIs · `@rnmapbox/maps` native · Google · email invites · record OCR · PDF Q&A · polish · Phase 5+

---

## Parked (do not start without a new decision)

- OSM Overpass nearby (parked after flaky production)
- Google Maps SDK / `react-native-maps` (billing account)
- `@rnmapbox/maps` native SDK (custom dev client only)
- Google Places for nearby hospitals
- Scraping / in-app cashless hospital result lists (beyond D-025 deep links)
- Email delivery for household invites
- Medical-record OCR
- PDF Q&A / chat about documents
- Partner/NHCX cashless verification APIs
- General polish pass
- Phase 5+ claims / doctor portal

---

## Done log (recent)

### 2026-07-28 (fix — hospital search Mapbox 502)

- Search Box `/forward` rejects `limit > 10`; v8 sent 25 → 502. Deployed v9 with cap + fallback without `poi_category`.

### 2026-07-28 (deploy — nearby-hospitals v8 search)

- Deployed `nearby-hospitals` Edge Function v8 with Mapbox `/forward` text search (`query`).
- Response includes `mode: search|nearby` so the app can show which branch ran.

### 2026-07-28 (fix — tab stack trap on Add / nested screens)

- Tabs: `popToTopOnBlur` so leaving Policies → Add (etc.) and returning lands on the tab root.
- Floating tab bar: re-tap or switch-back opens tab `index` instead of a buried nested screen.
- Cancel on Add screens uses `safeBack` with a list fallback when history is empty.

### 2026-07-28 (fix — Home quick actions + hospital search)

- Home Quick Actions: 2×2 wrap so four tiles (incl. Hospitals) no longer crush into one row.
- Hospitals hub: Mapbox name search on Nearby (Edge `query`); local filter on Preferred.

### 2026-07-28 (D-025 — Hospitals hub + cashless deep links)

- Accepted D-025: no scrape/API cashless claims; official insurer deep links only.
- New `/hospitals` hub (Nearby | Preferred | Cashless); Home quick action; Emergency redirects.
- Policy detail: Open insurer network when curated match exists.

### 2026-07-27 (bugfixes — map scroll + multi-doc record)

- Parent page scroll locks while panning the hospital map.
- Multiple files attach to **one** medical record (`medical_record_documents`); e.g. scan + report together.

### 2026-07-27 (D-024 — Mapbox WebView map)

- Dropped `@rnmapbox/maps` (crashes in Expo Go without custom native build).
- In-app map = Mapbox GL JS inside `react-native-webview` — works in Expo Go with `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`.

### 2026-07-27 (D-023 — Phase P exit)

- Draft from PDF + PDF-first Add policy.

---

## Next chat handoff (copy-paste prompt)

```
Continue HealthShield. Read docs/PROGRESS.md, docs/DECISIONS.md, docs/ROADMAP.md first.

Context:
- Phase C (D-025): /hospitals hub + insurer cashless deep links shipped; smoke pending.
- Phase N (D-024): Mapbox nearby still needs MAPBOX secrets + Android smoke.
- Do not scrape insurer networks or claim verified cashless.

Do not start Phase 5+ or parked items without a new decision.
```
