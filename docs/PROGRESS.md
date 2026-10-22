# Progress

**Last updated:** 2026-10-22 (D-041 — GitHub repo public)  
**Current phase:** Phase 6 thin — Doctor visit portal (D-035 / D-027) + public distribution (D-038)  
**Active slice:** Public APK **1.1.1** / `versionCode` 3 live on the site (D-039 + D-040 in that binary)  
**Status:** Founder said put it live. Domain `health-shield.in`. Site + portal **deployed on Vercel**. GitHub repo **public** (D-041; source-available, not OSS). Leaked-password still **off** (D-037). Email password reset **in code** (D-039); founder must allow-list redirect URLs and smoke. **D-040** sideload update prompt is in APK 1.1.1. Public download + `latest.json` point at **1.1.1** (1.1.0 kept in the release array). Play Store still parked (D-028).

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
| GitHub | Public (D-041) — source-available, not OSS |

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
| N Nearby hospitals | **Done** (D-024) | Mapbox nearby + preferred + search; founder smoke OK |
| C Hospitals hub + cashless | **Done** (D-025) | Hub + insurer deep links; founder smoke OK |
| G General polish | **Done** (D-030) | Copy, empty/error, keyboard; founder smoke OK |
| R Medical-record OCR | **Cancelled** (D-031) | Scrapped; policy PDF draft stays |
| Q Document Q&A | **Done** (D-032) | One owned file; founder smoke OK |
| 5 thin Claims assist | **Done** (D-033) | Checklist + status; founder smoke OK |
| D Distribution prep | **Public ship in progress** (D-038) | Site + portal hosts; new APK 1.1.0 |
| Doctor portal | **Active** (D-035) | Thin visit pack: `/visit` + `portal/` |
| Public APK + marketing site | **D-038 in progress** | `https://health-shield.in` + `https://portal.health-shield.in`. Play Store later (D-028). |

---

## Phase D — Distribution prep (D-033 / D-028 / D-029)

- [x] D1 Repo secrets scan (see gate table below)
- [x] D1 Static `site/` landing (no keys; download not live)
- [x] D2 `eas.json` production/preview APK profiles + `environment` (EAS env, not git keys)
- [x] Founder: set `EXPO_PUBLIC_*` on EAS (`production`, plaintext/sensitive — not secret)
- [x] 2026-08-14: removed stray `OPEN_AI_API_KEY` from EAS (was on production/preview/development). OpenAI stays on Edge Functions only. **Rotate that OpenAI key** (it was listable as plaintext).
- [x] D-034: do **not** wait on leaked-password (Pro) to **start** the production APK build
- [ ] Founder: Supabase Auth **leaked password protection** — **parked** (D-037; Pro; revisit with revenue). Still actually **off**.
- [x] `eas build -p android --profile production` — **FINISHED** [d576dde7](https://expo.dev/accounts/roshan.shikhare/projects/HealthShield/builds/d576dde7-0e11-48bc-953d-0c0c136e0521) (do not commit the APK; not public)
- [x] D3 Founder sideload smoke of production APK
- [ ] D-029 recorded **PASS** (stays FAIL on leaked-password; D-037 waives that one check for publish)
- [x] Public host (D-038): Vercel `https://health-shield-flax.vercel.app` + `https://healthshield-portal.vercel.app`; custom domain pending DNS
- [x] Public APK download on the site (1.1.1 / `versionCode` 3; EAS [e5819432](https://expo.dev/accounts/roshan.shikhare/projects/HealthShield/builds/e5819432-6066-4401-9068-b7d79084bb7d); SHA-256 `73c6fa89b92791113aeafe4c3d502356e03b4effbc49ce72321abf2533f2fb1a`; APK not in git)
- [x] D-040 sideload update prompt **in APK 1.1.1** (Alert + Profile CTA; skip Expo Go). `site/latest.json` live with 1.1.1 + prior 1.1.0

### Founder smoke checklist (D3 production APK)

1. [x] Sideload production APK (unknown sources); not Expo Go
2. [x] Core loops work (founder: everything working up to now)
3. [x] Public download page — APK **1.1.1** on the marketing site (EAS artifact + SHA-256; 1.1.0 kept in `latest.json`)

### D-029 gate (re-checked 2026-08-19)

| Check | Result |
|-------|--------|
| Client env names only `EXPO_PUBLIC_SUPABASE_*` + `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (`pk.`) (+ `EXPO_PUBLIC_DOCTOR_PORTAL_URL`, a URL not a secret — D-035) | **PASS** |
| `.env` / `portal/.env.local` gitignored and not tracked; no `.apk` / `.aab` in git | **PASS** |
| No `service_role`, live `sk-` keys, or `eyJ` JWTs in tracked source | **PASS** (only a "never service_role" comment in `portal/.env.example`) |
| `site/` has no Supabase / OpenAI / Mapbox keys | **PASS** (README mentions env *names* only) |
| `portal/` public env is only `NEXT_PUBLIC_SUPABASE_URL` + anon key | **PASS** |
| EAS env (production/preview/development) has only the three `EXPO_PUBLIC_*` names — no OpenAI / Mapbox `sk.` | **PASS** (after deleting stray `OPEN_AI_API_KEY`) |
| Edge Functions (`summarize-item`, `extract-policy-fields`, `ask-document` v3, `nearby-hospitals`) `verify_jwt: true`; use user JWT + anon key | **PASS** (verified live 2026-08-19) |
| Claims + other public tables RLS enabled (owner-scoped) | **PASS** (security advisors show no RLS findings) |
| Supabase security advisors | 3 WARN on `SECURITY DEFINER` RPCs (`accept_household_invite`, `delete_own_account`, `revoke_vault_membership`) — **by design**: each checks `auth.uid()` internally; that is the intended self-service pattern |
| Auth leaked-password protection | **FAIL** (advisor 2026-08-19) — Pro-only; **parked** (D-037). Still off. Do not claim it is on. |
| Signed **production** APK built + scanned | **PASS** (secrets) — no `service_role` / OpenAI `sk-` / Mapbox `sk.` in the APK; SHA-256 `a07e39454cfdb862d1d54753354bcee48bcd989543f4bf11abecd501b6cc4b78` |
| **Public ship (this check)** | **Waived** by D-037. Founder put-it-live: **D-038**. Other D-029 items still must stay PASS. |

`extract-record-fields` is no longer listed on the project (D-031 cleanup).

---

## Phase 6 thin — Doctor visit portal (D-035)

- [x] 6.1 Schema: `visit_consents` + `visit_consent_items` (patient owner; doctor live-email read)
- [x] 6.1 Patient `/visit` stack from Profile (not a 6th tab)
- [x] 6.1 `portal/` Next.js view-only
- [x] 6.2 Portal design pass (D-036): shared layout + brand mark, status badges, skeletons, empty states, a11y; record primary file now signed into Files
- [x] D-039 Email password reset (app + portal): PKCE, HTTPS bounce, recovery gate, revoke other sessions
- [ ] Founder: Auth redirect allow-list for D-039 (see smoke below)
- [ ] Founder smoke: grant → doctor sees pack → revoke hides it
- [ ] Founder smoke: password reset (D-039)
- [ ] Phase 6 thin exit

### Founder smoke checklist (6.1)

1. Profile → Doctor visit → grant a pack (email + duration + at least one owned policy/record)
2. Sign in on `portal/` with **that** email; see only the pack (not the rest of the vault)
3. Open a file; copy does not diagnose or say HealthShield employs the doctor
4. Revoke (or wait for expiry) → doctor can no longer open the pack
5. Household Sharing is unchanged and is not used as doctor access

---

## Phase 5 thin — Claims assist (D-032) — done (D-033)

- [x] 5.1 Schema: `claims` + `claim_checklist_items` (owner RLS; claim tied to owned policy)
- [x] 5.1 `/claims` stack (not a 6th tab): list, new, detail
- [x] 5.1 Link vault records; user-set status; honest “we do not file” copy
- [x] 5.1 Entry: policy detail, Policies header, Home row under quick actions
- [x] Founder Android smoke
- [x] Phase 5 exit

### Founder smoke checklist (Phase 5)

1. Home → **Claims organizer** (or Policies → Claims) opens `/claims`
2. Start a checklist on a policy you **own**; shared policies are not offered
3. Tick items, **Link from vault**, set status Draft → Submitted (etc.)
4. Copy never says HealthShield files claims or guarantees payouts
5. Delete checklist; policy/records remain

---

## Phase C — Hospitals hub + cashless deep links (D-025)

- [x] C1 Curated insurer → official network URL registry + fuzzy match
- [x] C2 Cashless segment + Policy detail deep links (system browser)
- [x] C3 `/hospitals` hub + Home “Hospitals” CTA; Emergency link retained; no 6th tab
- [x] C4 Map-first segments Nearby | Preferred | Cashless (no cashless Mapbox pins)
- [x] Founder Android smoke (hub + deep link open)
- [x] Phase C exit

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
- [x] Founder sets `MAPBOX_ACCESS_TOKEN` Edge secret (list)
- [x] Founder sets `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (pk.) + restart Expo
- [x] Android smoke
- [x] Phase N exit

### Founder smoke checklist (N)

1. Set Edge secret `MAPBOX_ACCESS_TOKEN` (Search)
2. Add `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk....` to `.env` → **restart** Expo
3. Home → Hospitals → Nearby list appears
4. Map shows Mapbox tiles + pins; tap pin → Open in Maps / Mark preferred
5. Star a hospital → Preferred persists
6. Confirm copy does **not** claim insurer cashless or show fake ratings

---

## Phase G — General polish (D-026)

- [x] G1 Copy / disclaimer audit (AI, cashless, SOS)
- [x] G2 Empty / loading / error on core flows
- [x] G3 Leftover navigation / keyboard / overflow bugs
- [x] G4 Founder Android smoke (auth → policy → record → SOS → hospitals)
- [x] Phase G exit (then enter R — do not start OCR during G)

### Founder smoke checklist (G)

1. Sign-in persists; empty states are honest
2. Add policy + Add record still work
3. SOS confirm / cancel copy does not claim we call emergency services
4. Hospitals hub: Nearby / Preferred / Cashless still honest
5. No diagnosis language in AI summarize copy

---

## Phase R — Medical-record OCR — cancelled (D-031)

- [x] Scrapped: Add-record OCR UI + `extract-record-fields` source removed
- [ ] Founder: delete remote Edge Function `extract-record-fields` in Supabase dashboard if it is still listed

---

## Phase Q — Document Q&A (D-031) — done (D-032)

- [x] Q1 Edge Function `ask-document` (JWT + Storage + OpenAI; owner-only)
- [x] Q1 Ask card on policy detail and record detail (not a new tab)
- [x] Deploy `ask-document`
- [x] Founder Android smoke
- [x] Phase Q exit (then enter Phase 5 thin claims)

### Founder smoke checklist (Q)

1. Open a **policy you own** with a PDF → **Ask about this file** (e.g. sum insured)
2. Answer is from that PDF; disclaimer is not medical/insurance advice
3. Open a **record you own** with a PDF/JPEG/PNG/WebP → ask a factual question
4. No file attached → honest “attach first”; shared/viewer login cannot ask
5. Copy never diagnoses or promises a claim payout

---

## Blockers

- Apple Health + SOS **iOS runtime parked** (D-014 / D-016)
- New public APK **1.1.0** must finish before the site download button goes live (do not publish `d576dde7`)
- GoDaddy DNS for `health-shield.in` on Vercel (apex A + `www` / `portal` CNAME)
- Supabase Auth redirect allow-list must include `https://portal.health-shield.in/**`

---

## Founder Console checklist (parked / when ready)

1. [ ] Google Play Console → Store listing → category **Health & fitness** (after D-028 Play later)
2. [ ] Supabase Auth → Email → **leaked password protection** — **parked** (D-037; Pro; revisit with revenue)

---

## Next actions (priority order)

1. Finish D-038 hosts: Vercel `site/` → health-shield.in and Vercel `portal/` → portal.health-shield.in + GoDaddy DNS (if still pending)
2. Founder smoke 6.1 against **production** portal: grant pack → doctor signs in → revoke hides it
3. Founder smoke D-039 redirect allow-list + password reset (APK 1.1.1 / dev client, not Expo Go)
4. Founder smoke D-040: install 1.1.1, then temporarily a higher `versionCode` in `latest.json` should prompt; Later still leaves Profile Get update
5. Rotate the OpenAI API key (it was on EAS in plaintext). Put the new value only on Edge Function secrets as `OPENAI_API_KEY`.
6. Parked: Play Store, record OCR, email invites, cashless scrape/APIs, leaked-password (D-037 until revenue)

---

## Parked (do not start without a new decision)

- OSM Overpass nearby (parked after flaky production)
- Google Maps SDK / `react-native-maps` (billing account)
- `@rnmapbox/maps` native SDK (custom dev client only)
- Google Places for nearby hospitals
- Scraping / in-app cashless hospital result lists (beyond D-025 deep links)
- Email delivery for household invites
- Medical-record OCR (scrapped D-031)
- Partner/NHCX cashless verification APIs
- Doctor portal **prescription / clinic admin** (thin cut **in progress** — D-035; public host is D-038)
- Play Store as first distribution (D-028 — APK site first; D-038 is that site)
- Premium / enterprise / insurer claim-filing APIs

---

## Done log (recent)

### 2026-10-22 (D-041 — GitHub repo public)

- Recorded **D-041**. GitHub `Roshan190/health-shield` is **public**, source-available, all rights reserved (not MIT / not OSS).
- Purged `pdf/dummy.pdf` from git history (it was only in `c7700ad`; `/pdf/` stays gitignored). Local copy may remain on disk.
- Replaced Expo leftover MIT `LICENSE` with HealthShield proprietary terms. README states viewing is allowed, reuse is not.

### 2026-08-20 (public APK 1.1.1)

- EAS production Android APK **FINISHED** [e5819432](https://expo.dev/accounts/roshan.shikhare/projects/HealthShield/builds/e5819432-6066-4401-9068-b7d79084bb7d) — app **1.1.1** / `versionCode` 3 (D-039 password reset + D-040 sideload checker). Artifact not in git.
- SHA-256 `73c6fa89b92791113aeafe4c3d502356e03b4effbc49ce72321abf2533f2fb1a`. Secret scan of text-ish files: no `service_role` / OpenAI `sk-` / Mapbox `sk.`.
- `site/index.html` download + `site/latest.json` prepend 1.1.1; keep 1.1.0 in the array. People on 1.1.0 still update from the site (that APK has no checker).
- 2026-08-20: redeployed `site/` — `https://health-shield.in/latest.json` now lists 1.1.1 first.

### 2026-08-19 (D-040 — sideload update prompt)

- Recorded **D-040**. Public `site/latest.json` (JSON **array** of `version` / `versionCode` / APK URL / SHA-256 / download page). Android APK/dev-client fetches it, compares the **highest `versionCode`**, shows a dismissible **“Update available — please update”** Alert, and keeps a **Get update** CTA on Profile after Later. Opens `https://health-shield.in/#download`. Skip Expo Go / iOS / web. Not Play in-app updates, not `expo-updates` OTA, not a force-block.
- Bumped app to **1.1.1** / Android `versionCode` 3. Public ship of that APK is 2026-08-20.
- 2026-08-19: redeployed `site/` so `https://health-shield.in/latest.json` is a live **release array**.

### 2026-08-19 (D-039 — email password reset)

- Recorded **D-039**. Forgot-password on the Expo app and `portal/` via `resetPasswordForEmail` (email only; no enumeration). PKCE on the app client. Recovery session cannot open the vault or `/visits` until a new password is set. Other sessions revoked after reset. Min password 8 on the portal. App Profile can change password when signed in.
- Static bounce `site/app-reset.html` → `healthshield://reset-password` (no keys). Portal `/auth/confirm` + `/reset-password` + `hs_pw_recovery` cookie.
- **Founder (required):** Auth → URL configuration add `https://health-shield.in/app-reset`, `healthshield://reset-password`, `https://portal.health-shield.in/auth/confirm`, `https://portal.health-shield.in/reset-password`, `http://localhost:3000/auth/confirm`, `http://localhost:3000/reset-password`. Confirm a reset email arrives (check spam). Smoke app on **APK/dev client**, not Expo Go. Redeploy `site/` + `portal/` so production bounce/confirm exist before sending mail.

#### Founder smoke checklist (D-039)

1. Unknown email on app and portal → same success copy, no mail
2. App (APK/dev client): known email → HTTPS bounce → set password → vault opens → old session on another device is dead
3. Portal: known doctor email → set password → visits list (not the patient vault)
4. Open recovery link then Home or `/visits` **before** setting a password → still blocked
5. After reset, sign-in works on **both** surfaces with the new password
6. Expired/reused link → error, no session

### 2026-08-19 (D-038 — put it live)

- Founder: deploy app + site + portal; domain `health-shield.in`; **both web apps on Vercel**.
- Recorded **D-038**. Bumped app to **1.1.0** / Android `versionCode` 2. Do not publish APK `d576dde7`.
- Site copy no longer claims leaked-password must be on. Quiet footer link to the doctor portal origin.
- Vercel projects live: marketing [health-shield-flax.vercel.app](https://health-shield-flax.vercel.app), portal [healthshield-portal.vercel.app](https://healthshield-portal.vercel.app). Custom domains attached, waiting on GoDaddy DNS.
- 2026-08-19: redeployed `site/` (includes `/app-reset` bounce) and `portal/` (`/forgot-password`, `/auth/confirm`, `/reset-password`) for **D-039**. Aliases: `https://health-shield.in/app-reset`, `https://portal.health-shield.in/forgot-password`.
- Cursor MCP: official Vercel (`https://mcp.vercel.com`, OAuth) + official GoDaddy (`https://api.godaddy.com/v1/domains/mcp`, search-only). DNS writes use `gddy` CLI + skill, not the public GoDaddy MCP.

### 2026-08-19 (D-037 — park leaked-password)

- Founder: do not pay for Pro HaveIBeenPwned now; revisit with revenue.
- Recorded **D-037**: leaked-password stays **off** (D-029 not marked PASS). That one check is waived as a *publish* blocker. Live APK download still needs an explicit “put it live.”

### 2026-08-19 (Q&A cost gate + ask-document v3 deploy + D-029 re-check)

- Added a cheap relevance gate to `ask-document`: off-topic questions (travel, weather, chit-chat) are classified **without the file** (~a few hundred tokens) and get a fixed refusal — the storage download + OpenAI file upload + full model run only happen for plausibly on-document questions. Gate fails open so it never blocks a real question.
- Deployed `ask-document` **v3** (chat history + coverage prompt + gate) with `verify_jwt: true`.
- Re-ran the D-029 gate (table above): repo/secrets/RLS/edge-JWT all PASS; 3 advisor WARNs on `SECURITY DEFINER` RPCs are by design (each checks `auth.uid()`); leaked-password protection still **FAIL** (Pro-only). Public ship remains blocked pending founder decision (Pro toggle or explicit waiver).

### 2026-08-19 (D-036 — portal/site design pass + document Q&A chat)

- Portal redesigned: shared header/footer layout with brand mark, brand tokens + serif display, status badges (Active / Expires soon / Expired / Revoked), loading skeletons, grouped policy/record sections with icons, richer empty states, skip link + focus-visible. Fix: a record's own `document_path` is now signed into the Files list.
- `site/` polish: icon feature cards, phone-mock tab bar with real tab names, trust points, CSS-only motion (reduced-motion safe). Download still not live (D-029 unchanged).
- Document Q&A → chat: bubbles, suggestion chips, typing indicator, inline errors; session-only history (up to 12 messages) sent to `ask-document`; prompt now explains what the document's wording says about coverage/exclusions/waiting periods with clause citations, refuses off-document questions. **Deploy `ask-document` before smoking.**

### 2026-08-14 (D-035 — enter thin doctor visit portal)

- Founder: production APK working; chose doctor portal over public download.
- Recorded **D-035**: park unpublished distribution; enter `/visit` + `portal/` Next.js; do not reuse household shares for clinicians.
- Shipped slice 6.1 in code: visit consent schema/RLS, patient grant/revoke, doctor portal view-only. Founder smoke still required.

### 2026-08-14 (D3 — production APK founder smoke; no next phase)

- Founder: production APK / app working; asked to move to the next phase.
- Refused a new product phase: Phase D is not exited. D-034 still forbids public host + download. Doctor portal still needs its own enter decision (D-027). Play Store still later (D-028).

### 2026-08-14 (D-034 — production APK build without leaked-password)

- Founder: leaked-password needs Pro; proceed without it and start building.
- Recorded **D-034**: production `eas build` may run while HIBP is FAIL. D-029 stays FAIL. No public download.
- Production Android APK **FINISHED** ([d576dde7](https://expo.dev/accounts/roshan.shikhare/projects/HealthShield/builds/d576dde7-0e11-48bc-953d-0c0c136e0521)). APK secret scan **PASS**. SHA-256 `a07e39454cfdb862d1d54753354bcee48bcd989543f4bf11abecd501b6cc4b78`. Artifact not in git.

### 2026-08-14 (Phase D — stay in distribution; D-029 still FAIL)

- Founder asked to start the next phase. Refused: D-026/D-033 sequence is still **Phase D**. Doctor portal / Play Store / public APK stay parked.
- EAS already had the three `EXPO_PUBLIC_*` vars. Deleted stray `OPEN_AI_API_KEY` from EAS (all environments). Founder must rotate that OpenAI key and keep it on Edge Functions only.
- Leaked-password protection still **FAIL** (Supabase security advisor). No production APK yet.

### 2026-08-13 (Phase D2 — EAS APK profile)

- Site UI smoked. Next slice in Phase D: production/preview APK profiles with EAS `environment` (no keys in git).
- Founder still sets EAS `EXPO_PUBLIC_*` + leaked-password + `eas build`. Do not publish until D-029 PASS.
- Doctor portal still architecture-only (D-027).

### 2026-08-13 (D-033 — Phase 5 exit; Phase D distribution)

- Founder smoke: claims organizer working. Phase 5 closed.
- Entered distribution prep: D-029 repo scan PASS; leaked-password **FAIL**; static `site/` with no keys and no live download. Do not publish until gate PASS.
- Doctor portal still architecture-only (D-027).

### 2026-08-13 (D-032 — Phase Q exit; Phase 5 thin claims)

- Founder smoke: document Q&A working. Phase Q closed.
- Thin claims organizer: `claims` + checklist items (owner RLS); `/claims` stack; link vault records; statuses draft / submitted / more_info / settled.
- Copy: HealthShield does not file claims or guarantee payouts. No 6th tab (D-012).

### 2026-08-13 (D-031 — skip record OCR; Phase Q)

- Founder does not want medical-record OCR. Removed Add-record draft UI and `extract-record-fields` source.
- Policy PDF draft (D-022) unchanged.
- Phase Q: **Ask about this file** on policy and record detail; Edge Function `ask-document`; owner-only; never diagnoses.

### 2026-08-13 (Phase R — record OCR shipped, then cancelled)

- Briefly shipped then removed the same day (D-031).

### 2026-08-13 (Phase G — G1–G3 polish in code)

- Family copy: roles are labels only; Sharing is invite → accept → share item (D-018 is live, D-008 “not yet” language removed).
- Home trust copy: data is private unless you explicitly share.
- Empty/error: list load failures and missing detail screens use EmptyState + retry/back.
- Keyboard: Screen scrolls with `automaticallyAdjustKeyboardInsets`; Android `softwareKeyboardLayoutMode: resize`.
- Hospitals cashless empty state + error shown near the hub segments.
- **G4 founder smoke still required** before Phase G exit / record OCR.

### 2026-08-13 (D-026–D-029 — sequence + distribution + security)

- Locked next build order: G polish → record OCR → document Q&A → thin claims.
- Doctor portal: separate web app later, same Supabase, consent/time-box — **not this sequence**.
- First public channel: marketing site + Android APK; Play Store later.
- Public ship requires D-029 secrets/RLS/client-bundle review.

### 2026-07-28 (exit — Phase N + Phase C)

- Founder smoke OK: Home → Hospitals; nearby list + map; preferred persist; cashless deep links; hospital name search (local filter + Mapbox v10 autocomplete).
- Phase N (D-024) and Phase C (D-025) marked complete.

### 2026-07-28 (fix — hospital search “Mau” / Mauli)

- Client: instant local substring filter on nearby list merged with remote Mapbox hits.
- Edge `nearby-hospitals` v10: `auto_complete=true`, `poi_category=hospital,clinic,pharmacy`.

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
- Active: D-038 public ship (`health-shield.in` + `portal.health-shield.in`) and Phase 6 thin doctor visit portal (D-035).
- Do not publish APK `d576dde7`. New 1.1.0 APK with `EXPO_PUBLIC_DOCTOR_PORTAL_URL=https://portal.health-shield.in`.
- Do not reuse family share as doctor access. Do not put APK/keys in git.
- Medical-record OCR is cancelled — do not rebuild without a new decision.
- Claims copy must never say we file claims or guarantee payouts.
- Do not scrape insurer networks or claim verified cashless. Do not claim leaked-password is on (D-037).

Play Store / record OCR stay parked.
```
