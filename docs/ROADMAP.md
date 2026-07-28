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

- Same read-only thin set via HealthKit (`apple-health` Expo module)
- Screen `/health/apple`; upserts `platform_health_daily` with `source = apple_health`
- **Runtime test:** pending until iOS device/dev-client available (**D-014**). Code shipped; do not treat as verified.

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

**Entered:** 2026-07-26 after Phase 2 exit (**D-014**). Cut locked in **D-015**.

**Goal:** Live SOS / location-aware emergency — distinct from the static offline card in slice 1.5.

### Slice 3.1 — SOS entry + confirm

- Hub `/emergency`; SOS screen with explicit confirm Alert
- Reuse profile emergency contact fields + offline card snapshot
- Copy: app does not call emergency services

### Slice 3.2 — Notify contacts

- Prefill SMS to emergency contact phone (`expo-sms`) and/or system Share
- Message includes name/blood group (if set) + Google Maps link when coords exist
- Nothing leaves device until user taps Send in the OS composer

### Slice 3.3 — Foreground location (thin)

- `expo-location` when-in-use only; watch while SOS active
- End SOS clears local session and stops watch
- No background location permissions

### Slice 3.4 — Polish

- Home quick action → emergency hub; Profile links hub
- Account delete clears SOS session
- Offline static card remains available without SOS

**Deferred:** ambulance dispatch APIs, always-on background tracking, shake/fall detection, nearby hospitals, doctor portal emergency.

### Phase 3 exit criteria

1. SOS flow works on Android (primary)
2. User can cancel; contacts never receive data without explicit confirm
3. No secrets / real PII in repo; copy does not promise clinical outcomes
4. `PROGRESS.md` updated

**Closed:** 2026-07-27 via **D-016** (Android founder smoke; iOS SOS/Apple Health parked).

---

## Phase Q2 — Deepen Foundation (post–Phase 3)

**Entered:** 2026-07-27 after Phase 3 exit (**D-016**). Cut locked in **D-017**. Phase 4 AI stays deferred.

**Goal:** Make insurance, records, family, and notifications more useful for a household — without AI, OCR, or shared logins yet.

### Slice Q2.1 — Notification reliability

- Renewal + medication reminder sync on app focus / login / foreground
- Clear permission denied / unsupported states (`ReminderStatusCard`)
- Android smoke: schedule → receive on **dev-client** (Expo Go Android skips)

**Shipped:** 2026-07-27

### Slice Q2.2 — Records findability

- Filter by category; optional link to `family_members`
- Empty / no-match states; search remains

**Shipped:** 2026-07-27

### Slice Q2.3 — Policy ↔ member link

- Optional covered family member on policies
- Home upcoming renewals unchanged in spirit; member name when set

**Shipped:** 2026-07-27

### Slice Q2.4 — Family clarity (thin)

- D-008 stands: owner-managed, no invite yet
- Member detail lists linked policies/records
- UI copy: roles do not grant separate login access

**Shipped:** 2026-07-27

### Slice Q2.5 — Ops + feedback hygiene

- Google Play category **Health & fitness** (Play Console — founder)
- Supabase Auth leaked-password protection (Auth settings / Pro — founder)
- Real user feedback logged in `docs/research/user-notes.md`

**Shipped:** 2026-07-27 (repo + R1 feedback; Console steps checklist in `PROGRESS.md`)

### Q2 exit criteria

1. Q2.1–Q2.4 usable on Android with Supabase persistence where schema changes apply
2. No AI / secrets / real PII in repo; no invite RLS half-built
3. `PROGRESS.md` updated; Phase 4 still requires its own decision

**Closed:** 2026-07-27 — deepen cut met (D-017). Phase 4 AI still deferred.

**Deferred:** Phase 4 AI, OCR, invite + shared RLS, claims, doctor portal.

---

## Phase 4 — Thin AI summaries (OpenAI)

**Entered:** 2026-07-27 after Q2 exit (**D-017**). Cut locked in **D-019** (founder override; D-018 invite/share stays pending).

**Goal:** Plain-language summaries of policy and medical-record **form fields** the user already entered. Assistive only — never diagnose. No PDF/OCR.

### Slice 4.1 — Policy summarize

- Summarize button on `/policies/[id]`
- Edge Function loads owner row via RLS; sends structured fields to OpenAI
- Disclaimer copy on every result

### Slice 4.2 — Medical record summarize

- Same pattern on `/health/records/[id]` (title, category, date, tags, notes only)

### Phase 4 exit criteria

1. Summarize works for a saved policy and a saved record when `OPENAI_API_KEY` is set on the Edge Function
2. No OpenAI key in git or client bundle; PDFs never sent to the model
3. UI copy does not diagnose or prescribe
4. `PROGRESS.md` updated

**Closed:** 2026-07-27 via **D-020** (founder smoke + UI polish).

**Deferred from blueprint Phase 4:** OCR / explain full reports from files, doctor-visit packs, claim guidance, lifestyle suggestions, chat UI.

---

## Phase H — Household invite / share (D-018)

**Entered:** 2026-07-27 after Phase 4 exit (**D-020**). Cut locked in **D-018**.

**Goal:** Mom (separate login) can view items the manager **explicitly shares** after accepting an email invite. View-only. No fake sharing via family profiles alone.

### Slice H1 — Invite by email

- Owner creates pending invite (email normalized)
- Invitee sees pending invites when logged in with that email

### Slice H2 — Accept → membership

- `accept_household_invite` RPC; creates/reactivates `vault_memberships`

### Slice H3 — Explicit item shares

- Owner shares individual policies / medical records with an active member
- Unshare + revoke membership

### Slice H4 — Viewer UX

- Shared items appear in lists with a Shared label
- Detail is read-only for non-owners; Open PDF when shared Storage allows

### Exit criteria

1. Invite → accept → share policy + record → viewer can read on their login
2. Revoke removes access; no secrets / real PII in repo
3. `PROGRESS.md` updated

**Closed:** 2026-07-27 via **D-021** (founder two-account smoke).

**Deferred:** Email delivery, share-all, invitee edit, vitals/meds/SOS share, full household roles matrix.

---

## Phase P — Policy PDF field draft (D-022)

**Entered:** 2026-07-27 after household invite/share exit (**D-021**). Cut locked in **D-022**.

**Goal:** User attaches a policy PDF on Add policy; the app drafts form fields for review before save. Assistive only — never invent coverage. Policies only.

### Slice P1 — Draft from PDF on Add policy

- Attach PDF (existing) → **Draft fields from PDF**
- Edge Function `extract-policy-fields` downloads from `policy-docs` ocr-temp path → OpenAI PDF extract → JSON fields
- Prefill Add policy form; banner: review before save
- Save unchanged: insert row + permanent PDF upload; clean up ocr-temp

### Phase P exit criteria

1. Draft from PDF prefills at least some fields on a real India-style policy PDF when `OPENAI_API_KEY` is set
2. User can edit all fields before save; unclear fields stay empty (no invented coverage)
3. No OpenAI key in git or client bundle; medical-record OCR still out
4. `PROGRESS.md` updated

**Deferred:** Record OCR, edit-screen OCR, claim/coverage interpretation, auto-save.

**Closed:** 2026-07-27 via **D-023** (founder smoke OK; PDF-first Add policy polish).

---

## Phase N — Nearby hospitals + preferred (D-024)

**Entered:** 2026-07-27 after Phase P exit (**D-023**). Cut locked in **D-024**.

**Goal:** Show hospitals near the user (Mapbox Search + Mapbox map UI) and let them mark preferred ones. Honest copy — not insurer cashless.

### Slice N1 — Nearby list + map

- Edge Function `nearby-hospitals` (Mapbox Search Box; secret `MAPBOX_ACCESS_TOKEN`) + foreground location
- List / Map toggle with Mapbox GL JS WebView (public `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`); Open in Maps from **Hospitals hub** (`/hospitals`; also linked from Emergency)
- No ratings; OSM / Google Maps / `@rnmapbox/maps` parked

### Slice N2 — Preferred hospitals

- Save/unsave from list or map → `preferred_hospitals` (owner RLS)
- Preferred section visible even if location denied

### Exit criteria

1. Nearby list works with location (Mapbox Search; `MAPBOX_ACCESS_TOKEN` set)
2. Map view shows Mapbox tiles + pins (WebView); List/Map toggle works in Expo Go
3. Preferred mark/unmark persists; Open in Maps works
4. Copy does not claim insurer-verified cashless or invent ratings
5. `PROGRESS.md` updated

**Deferred:** Google Maps/Places / ratings, insurer network APIs (superseded for thin cut by **D-025** deep links), ambulance.

---

## Phase C — Hospitals hub + thin cashless deep links (D-025)

**Entered:** 2026-07-28 after founder override (**D-025**).

**Goal:** Promote hospitals to a Home-reachable hub; assist cashless via **official insurer deep links** only — never invent in-app cashless results.

### Slice C1–C2 — Cashless assist

- Curated insurer → official network URL (+ optional helpline); fuzzy-match `policies.insurer`
- Open in system browser; honest non-verification copy
- Policy detail CTA when matched

### Slice C3–C4 — Hub UI / nav

- Top-level `/hospitals` + Home “Hospitals” quick action; Emergency keeps a link; no sixth tab
- Segments Nearby | Preferred | Cashless; map-first for geographic segments; Cashless = deep-link cards only

### Exit criteria

1. Home → Hospitals opens hub
2. Nearby / Preferred still work (Mapbox)
3. Cashless opens official insurer tool for curated matches; unmatched is honest
4. Copy does not claim HealthShield-verified cashless
5. `PROGRESS.md` updated

**Deferred:** scrape/cache network lists; in-app cashless pins; partner/NHCX APIs; company+pincode HealthShield search results.

---

## Phase 5+ — Claims, doctor portal, premium, enterprise

Do **not** start early. Blueprint Phases 5–8 stay deferred until a thin cut + override is recorded in `DECISIONS.md`.

**Recent exits:** Phase 4 AI (**D-020**); household (**D-021**); policy PDF (**D-023**). Phase N (nearby) + Phase C (hub/cashless assist) in progress via **D-024** / **D-025**.

---

## 12-month intent (coarse)

| Quarter | Focus |
|---------|--------|
| Q1 | Research + Foundation MVP |
| Q2 | Deepen insurance/records/family + notifications reliability |
| Q3 | Wearables + emergency + cautious AI summaries |
| Q4 | Claims assist / doctor portal pilots only if adoption warrants |

Adjust dates in `PROGRESS.md`, not by rewriting history here without a decision note.
