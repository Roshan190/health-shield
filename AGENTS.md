# HealthShield — Agent & Contributor Brief

This file is the always-on operating context for every chat and contributor.

## What we are building

**HealthShield** — a mobile-first personal health + insurance companion for individuals and families (India-first).

North star: *If something related to health happens, HealthShield is the first app you open.*

Vision: `docs/project-vision-document.md`  
Full ambition: `docs/project-blueprint.md`  
**What we build now:** `docs/ROADMAP.md` + `docs/PROGRESS.md`  
**Locked choices:** `docs/DECISIONS.md`  
**How we work:** `docs/GOVERNANCE.md`

## Current reality (do not invent otherwise)

- Phase 1 exit **D-010**. Phase 2 exit **D-014**. Phase 3 exit **D-016** (Android SOS smoke; iOS parked). Cut = **D-015**. Nav = **D-012**; brand = **D-013**. See `PROGRESS.md` + `ROADMAP.md`.
- **Phase Q2 deepen complete (D-017)**. **Phase 4 thin AI exited (D-019 / D-020)**. **Household invite/share exited (D-018 / D-021)**. **Phase P policy PDF draft exited (D-022 / D-023)**. **Phase N nearby hospitals exited (D-024)**. **Phase C hospitals hub / cashless deep links exited (D-025)** — `/hospitals` (Nearby + search + Preferred + Cashless); cashless = official insurer deep links only (no scrape / no verified network API).
- **Now: Phase 6 thin doctor visit portal (D-035) + public ship (D-038).** Domain `health-shield.in` — marketing `site/` and `portal/` both on Vercel (`portal.health-shield.in`). App version **1.1.1** / `versionCode` 3 (do not publish `d576dde7`). Phase 5 thin claims exited. Phase Q document Q&A exited. Medical-record OCR **scrapped** (D-031). Play Store later (D-028). Leaked-password still off (D-037); do not claim it is on. **Email password reset (D-039)** on the app and doctor portal (PKCE + recovery gate; one password per email). **Sideload update prompt (D-040)** in code — Alert + Profile CTA via `site/latest.json` (release array; highest `versionCode` wins); not Play, not OTA. Keep `latest.json` in lockstep with the site download section after each production APK.
- Solo founder. Mobile-first Expo SDK **57**. Backend = Supabase project `health-shield` (profiles, policies, records, family, vitals, medications, `platform_health_daily`, claims organizer, emergency/export, `summarize-item`, `extract-policy-fields`, `ask-document`, `nearby-hospitals`, `preferred_hospitals`, household invites / vault shares). Static marketing `site/` has no API keys.
- Health Connect / Apple Health need a **dev-client / EAS build** (not Expo Go). SOS uses foreground location + SMS/Share only — no background tracking. OpenAI + Mapbox Search tokens are Edge Function secrets only. In-app map uses public `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (`pk.`) via WebView Mapbox GL (Expo Go OK). `family_member_id` remains organize-only; real sharing is D-018.
- Phase 0 closed via D-007 without real user interviews — do not cite synthetic notes as validated research. Real feedback log started (R1 in `docs/research/user-notes.md`).
- iOS Apple Health + SOS runtime remain parked (D-014 / D-016) until device access exists.


Before any implementation: read `docs/PROGRESS.md`.

## Expo

Expo has changed. Use **exact** versioned docs: https://docs.expo.dev/versions/v57.0.0/

## Strict correction rule

**Push back.** If the founder (or a prompt) asks for something that violates phase order, privacy, MVP cut, or decisions:

1. Say what is wrong.
2. Point to the governing doc.
3. Offer the correct next step.
4. Only proceed after an explicit override recorded in `docs/DECISIONS.md`.

Do not silently comply with scope creep.

## Non-negotiables

- Privacy first; DPDP-minded; no real PII in git/logs/fixtures
- AI assists, never diagnoses
- Phase order: Research → Foundation → later blueprint phases
- Update `PROGRESS.md` when status changes

## Stack (Foundation)

Expo 57, Expo Router, NativeWind, Zustand, Zod, RHF, Supabase, TanStack Query (when API lands). Details: `docs/DECISIONS.md` D-004.
