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
- **Phase Q2 deepen complete (D-017)**. **Phase 4 thin AI exited (D-019 / D-020)**. **Household invite/share exited (D-018 / D-021)** — invite by email → accept → explicit policy/record share → view-only → revoke.
- Solo founder. Mobile-first Expo SDK **57**. Backend = Supabase project `health-shield` (profiles, policies, records, family, vitals, medications, `platform_health_daily`, emergency/export, `summarize-item`, household invites / vault shares).
- Health Connect / Apple Health need a **dev-client / EAS build** (not Expo Go). SOS uses foreground location + SMS/Share only — no background tracking. OpenAI key is Edge Function secret only — never in the app. `family_member_id` remains organize-only; real sharing is D-018.
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
