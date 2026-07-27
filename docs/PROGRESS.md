# Progress

**Last updated:** 2026-07-27 (D-024 / Mapbox WebView map)  
**Current phase:** Phase N — Nearby hospitals + preferred (D-024)  
**Active slice:** N1 + N2 — Mapbox Search + WebView Mapbox GL; smoke pending  
**Status:** Mapbox list + Mapbox WebView map (Expo Go OK); Google / @rnmapbox native parked

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
| N Nearby hospitals | **In progress** (D-024) | Mapbox Search + preferred; smoke pending |

---

## Phase N — Nearby hospitals + preferred (D-024)

- [x] N1 Nearby list (`nearby-hospitals` → Mapbox Search Box; OSM parked)
- [x] N2 Preferred mark/unsave (`preferred_hospitals`)
- [x] List / Map toggle via Mapbox GL JS WebView (Expo Go OK; no Google / no @rnmapbox native)
- [x] Google Places + Google Maps SDK + OSM Overpass + `@rnmapbox/maps` parked
- [ ] Founder sets `MAPBOX_ACCESS_TOKEN` Edge secret (list)
- [ ] Founder sets `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (pk.) + restart Expo
- [ ] Android smoke
- [ ] Phase N exit

### Founder smoke checklist

1. Set Edge secret `MAPBOX_ACCESS_TOKEN` (Search)
2. Add `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk....` to `.env` → **restart** Expo
3. Emergency → Nearby hospitals → list appears
4. Switch to **Map** → Mapbox tiles + pins; tap pin → Open in Maps / Mark preferred
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

1. Founder: Mapbox Edge secret + `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` → restart Expo → Android smoke Phase N
2. Parked later: `@rnmapbox/maps` native · Google Maps/Places · email invites · record OCR · PDF Q&A · polish · Phase 5+

---

## Parked (do not start without a new decision)

- OSM Overpass nearby (parked after flaky production)
- Google Maps SDK / `react-native-maps` (billing account)
- `@rnmapbox/maps` native SDK (custom dev client only)
- Google Places for nearby hospitals
- Email delivery for household invites
- Medical-record OCR
- PDF Q&A / chat about documents
- Insurer-verified cashless network APIs (beyond user preferred)
- General polish pass
- Phase 5+ claims / doctor portal

---

## Done log (recent)

### 2026-07-27 (bugfixes — map scroll + multi-doc record)

- Parent page scroll locks while panning the hospital map.
- Multiple files attach to **one** medical record (`medical_record_documents`); e.g. scan + report together.

### 2026-07-27 (D-024 — Mapbox WebView map)

- Dropped `@rnmapbox/maps` (crashes in Expo Go without custom native build).
- In-app map = Mapbox GL JS inside `react-native-webview` — works in Expo Go with `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`.

### 2026-07-27 (D-024 — Mapbox Maps UI)

- Replaced `react-native-maps` / Google Maps tiles with `@rnmapbox/maps`.
- Public `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` for map UI; Edge `MAPBOX_ACCESS_TOKEN` for Search.

### 2026-07-27 (D-024 — Mapbox Search + bugfixes)

- Switched `nearby-hospitals` to Mapbox Search Box (`MAPBOX_ACCESS_TOKEN`); OSM Overpass parked.
- Hardened map markers (no `pinColor`/callout press path) to reduce Android release crash on pin tap.
- Emergency hub wrapped in `ScrollView`; hospitals Map mode disables parent scroll (gesture fight).
- Medical records: multi-file attach (up to 5) → one record per file.

### 2026-07-27 (D-024 — List + Map)

- Added List/Map toggle with `react-native-maps` pins (nearby teal / preferred amber).

### 2026-07-27 (D-024 — OSM Overpass)

- First cut used OpenStreetMap Overpass (free). Later replaced by Mapbox after founder report.

### 2026-07-27 (D-023 — Phase P exit)

- Draft from PDF + PDF-first Add policy.

---

## Next chat handoff (copy-paste prompt)

```
Continue HealthShield. Read docs/PROGRESS.md, docs/DECISIONS.md, docs/ROADMAP.md first.

Context:
- Phase N (D-024): nearby hospitals via Mapbox Search + preferred. OSM/Places parked.
- Founder must set MAPBOX_ACCESS_TOKEN; smoke pending on Android.
- Parked: Places, email invites, record OCR, PDF Q&A, Phase 5+.

Do not start Phase 5+ or parked items without a new decision.
```
