# Architecture & Product Decisions

Record only decisions that change how we build. Newest first.

Format: **Status** → Context → Decision → Why → Consequences

---

## D-025 — Hospitals hub + thin cashless deep links (override)

**Status:** Accepted (2026-07-28) — founder approval after planning memo

**Context:** D-024 ships Mapbox nearby + preferred under Emergency with honest non-cashless copy. Founder wants (1) evaluation of true cashless lookup and (2) a more interactive hospitals UI quickly reachable outside Emergency. Evaluation: no universal public cashless API; NHCX ≠ consumer directory; partner APIs unavailable; scrape = legal/maintenance/false-claim risk; company+pincode in-app results not trustworthy without a feed.

**Decision — in scope (Phase C thin):**
- **C1** Curated major-insurer → official network-hospital URL (+ optional helpline); fuzzy-match free-text `policies.insurer`
- **C2** Cashless assist opens official URL in system browser; copy: HealthShield does not verify empanelment — confirm with insurer/hospital/TPA desk
- **C3** Promote hospitals to top-level `/hospitals` hub + Home quick action “Hospitals”. Keep Emergency hub link. Do **not** add a sixth bottom tab (D-012). Home quick actions may include Hospitals without becoming a full feature map
- **C4** Interactive redesign: map-first + list sheet; segments Nearby | Preferred | Cashless (deep-link cards only on Cashless). No cashless badges on Mapbox pins
- D-024 geographic nearby + preferred remain; cashless is assist-only

**Explicitly deferred / forbidden:** scraping/caching network lists; in-app cashless result pins; company+pincode HealthShield search results; NHCX/partner APIs; ratings; ambulance.

**Why:** Deep links keep the insurer as source of truth. Hub + Home CTA match urgency without burying hospitals in Emergency or inventing coverage.

**Consequences:** Do not market as cashless finder. Expand curated URL list carefully; unmatched insurers get guidance only. True API-backed cashless matching needs a future decision + partner path. Phase N Mapbox smoke remains independent.

---

## D-024 — Nearby hospitals list + user preferred (override)

**Status:** Accepted (2026-07-27) — founder override after D-023 park; **amended: Mapbox Search + Mapbox Maps UI (no Google Maps key)**

**Context:** D-023 parked cashless maps. Founder wants a feedback-ready hospital feature: nearby list plus user-marked preferred hospitals (self-tagged cashless / go-to), not insurer network verification. First cut used free OSM Overpass; founder reported flaky results and map press crashes on deployed Android — switched data source to Mapbox Search Box. Black Android map with `react-native-maps` required a Google Maps SDK key (billing account); founder rejected Google billing → switched map **UI** to `@rnmapbox/maps`.

**Decision — in scope:**
- **N1** Nearby hospitals via **Mapbox Search Box** category API (`hospital` / `clinic`) through Edge Function `nearby-hospitals` — secret `MAPBOX_ACCESS_TOKEN` (Edge only; never in the app)
- **N2** In-app **List** and **Map** toggle; map UI = **Mapbox GL JS in a WebView** (Streets); public `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (`pk.` only); works in Expo Go; **Open in Maps** for navigation
- **N3** User can **mark / unmark preferred** hospitals; stored in `preferred_hospitals` (owner RLS)
- Foreground location only; entry from Emergency hub (`/emergency/hospitals`)
- Copy: “Nearby” ≠ cashless network; “Preferred” = what the user marked — confirm with insurer
- **No star ratings**
- **Parked:** OpenStreetMap Overpass; Google Places; Google Maps SDK / `react-native-maps`; `@rnmapbox/maps` native SDK (needs custom dev client — WebView Mapbox preferred for Expo Go)

**Explicitly deferred:** Insurer-verified cashless matching, curated global hospital DB, hospital ratings/reviews, ambulance, auto-call 112, policy↔hospital FK matrix.

**Why (founder):** Mapbox for both search + tiles avoids Google Maps billing; WebView Mapbox avoids native rebuild / Expo Go crash from `@rnmapbox/maps`.

**Consequences:** Founder must set Edge `MAPBOX_ACCESS_TOKEN` (list) and app `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (pk. for map tiles), then restart Expo. Mapbox free tier covers early usage. Do not market as cashless finder. Do not invent ratings.

---

## D-023 — Phase P exit: policy PDF draft smoked; PDF-first Add policy

**Status:** Accepted (2026-07-27) — founder confirmation (Draft from PDF works; PDF-first UX)

**Context:** D-022 thin policy PDF field draft shipped. Founder confirmed extraction works on a real policy PDF. Asked to put PDF upload first on Add policy, then park further product work.

**Decision:**
- Mark Phase P / D-022 exit met.
- Add policy leads with **Attach PDF → Draft fields from PDF**; form fields follow for review. Manual entry remains available without a PDF.
- **Park for later (no next build track):** email invite delivery, medical-record OCR, PDF Q&A / chat, cashless hospital maps, general polish, Phase 5+ claims / doctor portal, Play category + leaked-password ops (founder Console when ready).

**Why (founder):** OCR path works; prefer PDF-first create; rest not now.

**Consequences:** No automatic blueprint Phase 5. Further product work needs an explicit new decision. Agents must not start hospitals, chat, claims, or record OCR without one.

---

## D-022 — Thin policy PDF field draft (OCR)

**Status:** Accepted (2026-07-27) — founder chose this after Phase H exit (D-021); **exited via D-023**

**Context:** Policy PDF attach/store already works. Manual form entry is still required. D-019 / D-020 deferred PDF/OCR; Summarize never reads documents. Founder wants “create policy from PDF” as a draft assist — policies only.

**Decision — in scope:**
- **P1** On Add policy (`/policies/new`): after attaching a PDF, **Draft fields from PDF** prefills form fields for review
- Extraction via Supabase Edge Function `extract-policy-fields`; `OPENAI_API_KEY` is a function secret only — never in the app
- Model: `gpt-4o-mini` + PDF input + strict JSON for form fields (insurer, policy number, type, amounts, dates, nominee, premium frequency)
- PDF is uploaded to private `policy-docs` under `{userId}/ocr-temp/…`, then downloaded by the function with the user JWT (RLS); **PDF content is sent to OpenAI for this cut** (unlike Summarize)
- User **must** review/edit before Save; null/omit unclear fields; never invent coverage, benefits, or diagnoses
- India-first: INR amounts as plain numbers; dates normalized to `YYYY-MM-DD`
- Cost: pay-per-extract; no batch/cron; no server-side draft persistence

**Explicitly deferred:** Medical-record OCR, OCR on policy edit/detail, claim guidance, coverage interpretation, auto-save without review, chat, changing `summarize-item` to read PDFs, email parsing.

**Why (founder):** Reduce typing when the PDF already exists; keep human review as the source of truth.

**Consequences:** Agents must not expand OCR to records or claims without a new decision. Product copy must say draft may be wrong/incomplete and is not insurance advice.

---

## D-021 — Household invite / share exit (D-018 smoke)

**Status:** Accepted (2026-07-27) — founder confirmation

**Context:** D-018 thin invite + explicit share shipped. Founder smoke-tested invite → accept → share → view-only → revoke (including web confirm fix for revoke).

**Decision:** Mark Phase H / D-018 exit met for the thin cut. Email delivery of invites, share-all, invitee edit, and vitals/meds/SOS share remain deferred.

**Why (founder):** Two-account flow works as expected.

**Consequences:** Next work needs a new pick (ops checklist, OCR PDF import, email invites, Phase 5+, polish). Do not expand sharing without a new decision.

---

## D-020 — Phase 4 exit: thin AI summaries verified

**Status:** Accepted (2026-07-27) — founder confirmation (Summarize works; UI polish shipped)

**Context:** D-019 thin AI shipped. Founder confirmed Summarize on a saved policy. Summary UI polished (fact rows; no raw markdown). OpenAI key lives on Edge Function secrets only.

**Decision:** Mark Phase 4 exit met for the D-019 cut. OCR / PDF-read / chat / claims remain deferred.

**Why (founder):** Proceed to household invite/share (D-018).

**Consequences:** Next track was **D-018** thin invite + viewer. Do not expand AI without a new decision.

---

## D-019 — Phase 4 thin AI: OpenAI metadata summaries (override)

**Status:** Accepted (2026-07-27) — founder override; **exited via D-020**

**Context:** Q2 deepen (D-017) complete. Founder has an OpenAI API key and chose thin AI over household invite/share for the next track. Blueprint Phase 4 lists explain reports, doctor visit packs, claim guidance, lifestyle — too broad for a first cut. D-016 said Phase 4 stays blocked until retention validates unless a separate override is recorded.

**Decision — in scope:**
- **4.1** Plain-language **Summarize** on policy detail from **structured form fields only** (insurer, type, amounts, dates, nominee, notes) — no PDF/OCR
- **4.2** Same for medical record detail (title, category, date, tags, notes) — no PDF/image reading
- OpenAI via **Supabase Edge Function** (`summarize-item`); `OPENAI_API_KEY` is a function secret only — never `EXPO_PUBLIC_*` / never in the app bundle
- Copy: assistive organizer language; **never diagnose, prescribe, or replace a doctor**

**Explicitly deferred:** PDF/OCR, claim guidance, doctor-visit summaries, lifestyle tips, chat UI, invite + shared RLS (moved to D-018), claims assistant, doctor portal.

**Why (founder):** OpenAI key available; want useful plain-language help on vault items before household sharing.

**Consequences / risk:** Accepts early-AI validation risk from D-016. Agents must not expand into blueprint Phase 4 capabilities without a new decision.

---

## D-018 — Household invite / shared vault (thin invite + viewer)

**Status:** Accepted (2026-07-27) — founder chose this after Phase 4 exit (D-020); **exited via D-021**

**Context:** Founder asked: if Mom downloads the app and logs in, should she see records the manager added for her? `family_member_id` is organize-only (D-008). Separate login stays empty until explicit invite + share.

**Decision — in scope:**
- **H1** Owner invites by **email** (in-app pending invite; no email provider required for this cut)
- **H2** Invitee with matching account email can **accept** → `vault_memberships` (viewer)
- **H3** Owner **explicitly shares** individual policies and/or medical records with an active member
- **H4** Member gets **view-only** RLS on shared rows (+ read shared Storage objects); cannot edit/delete owner's data
- **H5** Owner can **revoke** membership (and clear shares) or unshare a single item
- Copy: tagging a family profile ≠ sharing with a login

**Explicitly deferred:** Full account merge, manager role for invitees, share-all-by-default, email/SMS delivery of invites, editing shared items, sharing vitals/meds/SOS.

**Why (founder):** Household usefulness after Foundation + thin AI.

**Consequences:** Requires schema + RLS + consent/revoke UX. Do not fake sharing via `family_members` alone.

---

## D-017 — Q2 deepen Foundation before Phase 4 AI

**Status:** Accepted (2026-07-27) — founder choice; **Q2 exit complete same day**

**Context:** Phase 3 exited (D-016). Founder shared app with real users who liked the idea. Chose deepen existing Foundation (roadmap Q2) before blueprint Phase 4 AI.

**Decision — track completed (no AI yet):**
- **Q2.1** Notification reliability — renewal + medication reminders: permission UX, resync on app focus, Android smoke checklist
- **Q2.2** Records findability — category filter + optional `family_member_id` on medical records; clearer search empty states
- **Q2.3** Policy ↔ member link — optional covered-member on policies; Home renewals stay clear
- **Q2.4** Family clarity (thin) — keep D-008 owner-managed profiles; copy that roles are not yet shared logins; member detail shows linked policies/records
- **Q2.5** Ops + feedback hygiene — Play **Health & fitness** category; Supabase leaked-password protection; log real user notes under `docs/research/user-notes.md`

**Explicitly deferred:** Phase 4 AI / LLM, OCR policy import, invite + shared RLS (separate decision when needed), claims, doctor portal, shake/background SOS expansions.

**Why (founder):** Make the organizer trustworthy and household-useful first; AI later.

**Consequences:** Q2 shipped in code (see `PROGRESS.md` done log). Phase 4 requires new decision. Invite/auth sharing deferred to **D-018** (pending founder choice).

---

## D-016 — Phase 3 exit: Android SOS smoke; iOS parked

**Status:** Accepted (2026-07-27) — founder confirmation

**Context:** Phase 3 thin SOS (D-015) shipped in code. Founder confirmed Android smoke (permission → confirm → SMS/Share → End SOS) works. No iOS device for SOS / Apple Health runtime verification.

**Decision:**
- Mark Phase 3 exit met on Android verification.
- Keep **iOS runtime smoke parked** (Apple Health D-014 + SOS on iPhone) until device/dev-client access exists. Do not block further product work on iOS verification.
- Phase 4+ (AI / claims / doctor portal) remains **blocked** per `ROADMAP.md` until retention validates Foundation, unless a separate explicit override is recorded.

**Why (founder):** Android validates the Phase 3 product cut; iOS can wait.

**Consequences:** Treat SOS as verified on Android only. Do not start blueprint Phase 4 AI (or 5–8) without a new decision that defines cut + acceptance of validation risk.

---

## D-015 — Phase 3 cut: thin SOS (confirm → foreground location → SMS/Share)

**Status:** Accepted (2026-07-26)

**Context:** Blueprint Phase 3 lists shake/fall detection, live share, insurance, nearby hospitals. Building all at once repeats over-scope failure.

**Decision — in scope for Phase 3:**
- **3.1** SOS entry + explicit confirm (Alert) — no auto-send
- **3.2** Notify via device SMS (`expo-sms`) and/or Share sheet with prefilled message (maps link)
- **3.3** Foreground location only while SOS session active (`expo-location`); clear End SOS
- **3.4** Hub at `/emergency` linking static card (`/profile/emergency`); offline card unchanged
- Local SOS session in AsyncStorage; no server “emergency events” table yet; no background tracking

**Explicitly deferred:** Shake/fall detection, always-on background location, ambulance dispatch, nearby covered hospitals, auto-call 112/108, doctor portal emergency.

**Why:** Least-privilege, India-first notify via user-owned messaging; distinct from static 1.5 card; Android-primary verification.

**Consequences:** Copy must say HealthShield does not call emergency services. Contacts never get data without user tapping Send. Keep bottom tabs at five (emergency is a hidden stack).

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
