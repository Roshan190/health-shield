# Architecture & Product Decisions

Record only decisions that change how we build. Newest first.

Format: **Status** → Context → Decision → Why → Consequences

---

## D-014 — Phase 2 exit: Apple Health built; iOS testing pending

**Status:** Accepted (2026-07-26) — founder override

**Context:** Slice 2.4 (Apple Health) was blocked on iOS access (D-010). Founder confirmed Android Phase 2 smoke (including Health Connect) works as expected. No iOS device yet for HealthKit verification.

**Decision:**
- Implement slice **2.4** with `apple-health` (Expo HealthKit): read-only steps / heart rate / sleep → `platform_health_daily` with `source = apple_health`. UI at `/health/apple`.
- Mark **iOS runtime testing as pending** (Simulator/device smoke later). Do not block Phase 2 exit on iOS verification.
- Phase 2 exit met: 2.1–2.3 + 2.5 verified on Android; 2.4 code-complete with pending iOS test.

**Why (founder):** Ship Apple Health parity in code; Android already validates the Phase 2 product cut.

**Consequences / risk:** HealthKit permission/query bugs may surface only when an iPhone/dev-client build is available. Until then, treat Apple Health as untested. Next phase (3 Emergency) may start after docs update.

---

## D-013 — Brand mark: shield + check on trust→care gradient

**Status:** Accepted (2026-07-26)

**Context:** Default Expo/template icon and teal splash read as unfinished. Need a premium, consistent mark for icon + splash across Android/iOS.

**Decision:**
- App icon / adaptive foreground: white glass **shield** with brand-blue **checkmark** (teal tip accent) on a diagonal **trust-blue → care-teal** gradient.
- Splash: deep blue `#1E3A8A` (dark `#0A101C`) with the same shield mark; fade-out on hide.
- Store category intent: Apple primary **Health & Fitness** (`store.config.json` + `LSApplicationCategoryType` healthcare-fitness). Google Play category is set in Play Console (not via Expo app config).

**Why:** Matches product name and in-app `shield-checkmark` language; blue/teal mirrors theme tokens (`Gradients.brand` / `care`). Avoids busy ECG overlays that look stock.

**Consequences:** Replace assets under `assets/images/`; rebuild native binaries (EAS/dev-client) to see icon/splash. Do not revert to Expo template `.icon` for iOS.

---

## D-012 — Health hub tab (keep bottom nav at five)

**Status:** Accepted (2026-07-25)

**Context:** Phase 2 added Vitals and Medications. Exposing each as a tab (or duplicating them with Records/Family on Home quick actions) overcrowds navigation.

**Decision:**
- Bottom tabs stay **five**: Home · Policies · **Health** · Family · Profile.
- **Health** is a stack hub: `/health` lists Vitals, Medications, and Records; nested routes live under `/health/vitals`, `/health/medications`, `/health/records` (and later Health Connect).
- Home quick actions stay thin: Health / Add policy / Emergency — not a second map of every feature.

**Why:** One health entry matches the product mental model; keeps the Health tab selected while drilling in; avoids a 6–7 item tab bar and redundant Home tiles.

**Consequences:** Records leave the top-level tab bar (one tap from Health). Prefer `/health/...` paths in new code. Do not add more bottom tabs without revisiting this decision.

---

## D-010 — Phase 1 exit on real Android smoke (iOS deferred)

**Status:** Accepted (2026-07-25) — founder override

**Context:** `ROADMAP.md` Phase 1 exit required iOS Simulator + Android Emulator smoke. Founder confirmed critical Foundation flows on **real Android devices**. Founder has **no iOS device** for testing now.

**Decision:** Mark Phase 1 Foundation MVP exit met and unblock Phase 2 planning/build. Accept real-Android verification in place of Android Emulator. **All iOS verification (Simulator and/or device) is deferred** — test later when access exists. Do not block Phase 2.1–2.3 on iOS.

**Why (founder):** Android-first; no iOS hardware yet; proceed.

**Consequences / risk:** iOS-specific regressions may surface later. Blueprint lists Apple Health; that is ambition — **slice 2.4 stays blocked** until iOS smoke is possible (borrowed device, Mac Simulator, or TestFlight). Until then, ship and validate on Android. Do not treat iOS as validated.

---

## D-011 — Phase 2 cut (manual first, then platform health read)

**Status:** Accepted (2026-07-25)

**Context:** Blueprint Phase 2 lists many wearables, vitals, dashboards, and timeline surfaces. Building all at once repeats the Foundation over-scope failure mode.

**Decision — in scope for Phase 2:**

- Manual vitals (blood pressure, blood sugar, weight) with simple trends
- Manual medications + local reminders
- Read-only Health Connect (Android), then Apple Health (iOS)
- Basic daily/weekly views — not full yearly analytics product

**Explicitly deferred (later / Phase 2.x+):** Fitbit, Garmin, Samsung Health, ECG, SpO2/temp device streams, rich workout product, AI interpretation of vitals.

**Why:** Competitive notes: read HealthKit / Health Connect; don’t reinvent fitness apps. Manual logs deliver India-relevant value (BP/sugar) without OEM partner work.

**Consequences:** Slice plan in `ROADMAP.md`. No diagnosis copy. Sensitive vitals stay behind RLS; no real PII in fixtures.

---

## D-009 — Account self-delete via SECURITY DEFINER RPC

**Status:** Accepted (2026-07-25)

**Context:** Slice 1.5 needs DPDP-minded account deletion. Client cannot delete `auth.users` with the anon key.

**Decision:** Expose `public.delete_own_account()` as `SECURITY DEFINER` with `search_path = ''`, requiring `auth.uid()`, deleting only the caller’s `auth.users` row. Client removes storage objects first; FKs cascade app tables. Advisor WARN for authenticated EXECUTE on DEFINER is accepted (intentional).

**Why:** Least-privilege alternative to shipping a service-role Edge Function for Foundation.

**Consequences:** Keep the function body minimal; never trust client-supplied user ids.

---

## D-008 — Family members are owner-managed profiles (thin roles)

**Status:** Accepted (2026-07-25)

**Context:** Slice 1.4 needs “viewer vs manager” and shared vs private defaults without building invite/auth sharing yet.

**Decision:**
- `family_members` rows belong to the signed-in account owner (RLS owner-only).
- Members are household profiles (name, relationship, DOB, blood group, notes) — not separate logins in Foundation.
- `role` is `viewer` | `manager` and is **intent only** until invite/share ships.
- **Default privacy:** policies and medical records remain private to the account owner. No cross-member read/write in 1.4.

**Why:** Matches D-001 “simple roles; not full permission matrix.” Avoids half-built sharing that looks secure but isn’t.

**Consequences:** UI must say roles don’t grant access yet. Invite + real shared RLS is a later decision when Phase 1 polish or Q2 deepening starts.

---

## D-007 — Close Phase 0 without real user interviews (founder override)

**Status:** Accepted (2026-07-24) — founder override

**Context:** Phase 0 exit required 5–8 real chats. Only desk competitive research + synthetic interviews S1–S8 exist.

**Decision:** Mark Phase 0 complete and start Phase 1 Foundation. Treat D-001 MVP cut as confirmed for build purposes.

**Why (founder):** Proceed to building now.

**Consequences / risk:** Product assumptions are weakly validated. Real interviews remain recommended and should be logged under `docs/research/user-notes.md` → Real interview log when done. Agents must not pretend synthetic notes are validated research.

---

## D-006 — Agent must correct the founder

**Status:** Accepted (2026-07-24)

**Decision:** Agents and docs push back when ideas conflict with vision, security, scope, or phase order.

**Why:** Solo development has no peer review. Unchecked drift is the main failure mode.

**Consequences:** Expect pushback on premature features (AI, claims, doctor portal), weak privacy, and scope creep.

---

## D-005 — Non-negotiables from day 1

**Status:** Accepted (2026-07-24)

1. Privacy first — consent, least privilege, deletable data.
2. India-first product; design for DPDP Act.
3. AI assists; never diagnoses or replaces clinical judgment.
4. No secrets in git; no real health PII in logs or fixtures.
5. Mobile-first; web/admin are not early milestones.
6. Vision is the north star; roadmap may change; do not build Phase 4+ early.

---

## D-004 — Stack for Foundation

**Status:** Accepted (2026-07-24)

| Layer | Choice |
|-------|--------|
| App | Expo SDK 57 + Expo Router (existing) |
| UI | NativeWind 4 + existing theme tokens |
| Forms/validation | react-hook-form + Zod |
| Client state | Zustand |
| Server state | TanStack Query (add when API lands) |
| Backend | Supabase (Auth, Postgres, Storage, RLS) |
| Notifications | `expo-notifications` (local first) |

**Deferred:** custom Nest/Express API, monorepo packages, OCR/AI SDKs, insurer APIs.

**Why:** Matches current repo; minimizes solo ops; RLS matches family/permissions model.

---

## D-003 — Repo shape: single Expo app (not monorepo yet)

**Status:** Accepted (2026-07-24)

**Decision:** Keep one Expo app. Do not scaffold `apps/` / `packages/` monorepo on day 1.

**Why:** Blueprint monorepo is correct later; premature structure slows a solo founder.

**Revisit when:** adding admin web, shared packages across 2+ apps, or a custom API service.

---

## D-002 — Backend now (thin), not mock-forever

**Status:** Accepted (2026-07-24)

**Decision:** Introduce a real backend at the start of Phase 1 (after short research), using Supabase. No long-lived mock-only architecture.

**Why:**

- Health/insurance data needs auth, authorization, and storage from the first real feature.
- Family permissions and account deletion are painful to retrofit.
- Solo speed: Auth + Postgres + Storage + RLS without running infra.
- Custom backend later if Supabase limits us.

**Consequences:** Schema and RLS designed carefully in Phase 1. Avoid dumping everything client-side.

---

## D-001 — MVP cut (Foundation)

**Status:** Accepted (2026-07-24)

**In scope for first shippable product:**

- Email auth (+ biometric unlock later in Foundation)
- Basic profile
- Manual insurance policy CRUD + policy PDF upload (no OCR)
- Medical report upload, categories, basic search
- Basic family members (simple roles; not full permission matrix)
- Renewal reminders (local notifications)
- Static emergency card

**Explicitly out of Foundation MVP:**

- OCR / AI extraction / email parsing
- Hospital maps / cashless finder
- Wearables
- Claims assistant
- Doctor portal
- Subscriptions / enterprise
- Phone OTP / Google / Apple Sign-In (can follow email if time allows)

**Why:** Blueprint Phase 1 as written is ~3 products. First shippable value = organized insurance + records for one family.
