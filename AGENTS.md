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

- Phase 1 Foundation exit met via **D-010** (real Android smoke; iOS deferred). Phase 2 Health tracking is **active**; cut = **D-011**. Slices **2.1–2.3** built; nav = **D-012** Health hub. Next polish **2.5**; **2.4 Apple Health** blocked on iOS. See `PROGRESS.md` + `ROADMAP.md`.
- Solo founder. Mobile-first Expo SDK **57**. Backend = Supabase project `health-shield` (profiles, policies, records, family, vitals, medications, `platform_health_daily`, emergency/export).
- Health Connect needs a **dev-client / EAS build** (not Expo Go). Not building AI, claims, or doctor portal yet. No Fitbit/Garmin/Samsung clones in 2.x.
- Phase 0 closed via D-007 without real user interviews — do not cite synthetic notes as validated research.
- Run iOS smoke before slice **2.4** Apple Health (D-010).

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
