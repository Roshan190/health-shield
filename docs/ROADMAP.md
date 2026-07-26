# HealthShield Roadmap

Living plan. Vision = north star (`project-vision-document.md`). Blueprint = full ambition (`project-blueprint.md`). This file = what we actually build, in order.

**Rule:** Do not start a later phase until the current phase exit criteria are met (or an explicit decision is recorded in `DECISIONS.md`).

---

## Phase 0 — Short research (1 week)

**Goal:** Validate the MVP cut and learn from competitors before coding product features.

### Do

- Competitive teardown (pick 5–8): CoverSure, insurer apps, Practo, 1mg, Apple Health / Health Connect notes, DigiLocker/ABHA awareness
- 5–8 informal user conversations (not 30 — solo + one week cannot do 30 well)
- Write `docs/research/competitive-notes.md` and `docs/research/user-notes.md`
- Confirm or adjust D-001 MVP cut in `DECISIONS.md`

### Exit criteria

- [x] Research notes exist and list top 5 pain points
- [x] Explicit go/no-go on Foundation MVP cut (D-001 confirmed via D-007)
- [x] `PROGRESS.md` updated to Phase 1

**Closed:** 2026-07-24 via **D-007** (founder override — real interviews skipped). See `DECISIONS.md`.

**Correction:** Blueprint “2 weeks + 30 interviews” is wrong for a solo day-1 start. Depth beats fake sample size.

---

## Phase 1 — Foundation MVP (mobile)

**Goal:** Best *manual* insurance + health document organizer for a household.

### Slice 1.0 — App shell & governance complete

- Expo app cleaned of template noise
- Auth-ready navigation shell
- Design tokens / basic screens scaffolding

### Slice 1.1 — Auth & profile

- Email sign-up / sign-in (Supabase Auth)
- Session persistence
- Basic profile (name, DOB, blood group, emergency contact fields)

### Slice 1.2 — Insurance (manual)

- CRUD policies
- Store PDF
- Renewal date + reminder hook
- Summary list + detail

### Slice 1.3 — Medical records

- Upload PDF/image
- Categories + tags
- Timeline / list + basic search

### Slice 1.4 — Family (basic)

- Add members
- Simple viewer vs manager (keep thin)
- Shared vs private defaults documented

### Slice 1.5 — Emergency card + polish

- Static emergency card (offline-capable target)
- Local notifications for renewals
- Account delete / data export path (DPDP-minded)

### Phase 1 exit criteria (definition of done)

A slice is done when:

1. Works on iOS Simulator **and** Android Emulator
2. Data persists via Supabase (not only local mock)
3. Empty, loading, and error states exist
4. No secrets or real PII in repo
5. `PROGRESS.md` updated; GitHub Issues closed/moved

Foundation MVP is done when all slices 1.1–1.5 meet the above. TestFlight/Play internal track is a **stretch**, not a blocker for calling Foundation complete.

---

## Phase 2 — Health tracking

**Entered:** 2026-07-25 after Phase 1 exit (**D-010**). Cut locked in **D-011**. Blueprint Phase 2 is ambition; this section is what we build.

**Goal:** Manual vitals + meds first (India-relevant), then thin read-only platform health sync. No diagnosis copy. No OEM fitness clones.

### Slice 2.1 — Manual vitals

- Types: blood pressure, blood sugar, weight
- CRUD + date/time; owner RLS on Supabase
- Simple list + short trend (not a full analytics product)
- Empty / loading / error states

### Slice 2.2 — Medications

- Manual medication list (name, dose, schedule notes)
- Local dose reminders (`expo-notifications`)
- No pharmacy marketplace / adherence AI

### Slice 2.3 — Health Connect (Android)

- Read-only permissions for a thin set (e.g. steps, heart rate, sleep) via Expo/SDK 57–compatible path
- Consent-first UX; user can disconnect
- Persist last-sync metadata; do not invent missing samples

### Slice 2.4 — Apple Health (iOS)

- Same read-only thin set via HealthKit
- **Prerequisite:** iOS access (device and/or Mac Simulator) + Foundation smoke — deferred per **D-010** (founder has no iOS device yet). Do not start 2.4 early.

### Slice 2.5 — Polish

- Home hooks for recent vitals / next med reminder
- Export/delete paths include new tables
- Confirm Android + (for 2.4) iOS smoke

### Phase 2 exit criteria

1. 2.1–2.2 work with Supabase persistence on Android (primary; matches D-010)
2. At least one of 2.3 or 2.4 ships read-only sync on its platform, or explicit deferral recorded in `DECISIONS.md`
3. No secrets / real health PII in repo; copy does not diagnose
4. `PROGRESS.md` updated

**Deferred from blueprint Phase 2:** Fitbit, Garmin, Samsung Health, ECG, SpO2/temp device streams, yearly dashboard product, rich workout tracker.

---

## Phase 3 — Emergency system

Live location, SOS flows — after Phase 2.

---

## Phase 4+ — AI, claims, doctor portal, premium, enterprise

Do **not** start early. Blueprint Phases 4–8 stay deferred until retention validates Foundation.

---

## 12-month intent (coarse)

| Quarter | Focus |
|---------|--------|
| Q1 | Research + Foundation MVP |
| Q2 | Deepen insurance/records/family + notifications reliability |
| Q3 | Wearables + emergency + cautious AI summaries |
| Q4 | Claims assist / doctor portal pilots only if adoption warrants |

Adjust dates in `PROGRESS.md`, not by rewriting history here without a decision note.
