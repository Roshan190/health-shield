# Architecture & Product Decisions

Record only decisions that change how we build. Newest first.

Format: **Status** → Context → Decision → Why → Consequences

---

## D-041 — GitHub repo public; source-available, not OSS

**Status:** Accepted (2026-10-22) — founder: make `Roshan190/health-shield` public after secrets / PII / license hygiene

**Context:** The GitHub repo was private (D-038). Founder asked to make it public. Blockers: tracked `pdf/dummy.pdf` (password-protected document in `/pdf/`, which is gitignored because it may be real health/insurance PII) and the leftover Expo MIT `LICENSE` covering the whole product.

**Decision:**
- GitHub visibility **public**: https://github.com/Roshan190/health-shield
- License: **all rights reserved** (viewing allowed). Not MIT. Not an invitation to use, copy, or ship HealthShield as open-source software.
- Purge `pdf/dummy.pdf` from git history. It lived only in commit `c7700ad` (`pdf upload`). Keep `/pdf/` gitignored. Local sample PDFs may stay on disk.
- D-029 secret rules unchanged: no `.env`, APKs, `service_role`, OpenAI `sk-`, or Mapbox `sk.` in git.

**Why:** Founder wants the source visible; HealthShield is a product, not an MIT codebase.

**Consequences:** `main` was force-pushed to drop `c7700ad`. Anyone who already cloned that commit may still have the blob locally. GitHub MIT detection should clear after the `LICENSE` change. Founder still owns OpenAI key rotation (the key that sat on EAS as plaintext) and Mapbox public-token URL restrictions.

---

## D-040 — Sideload “update available” prompt (not Play, not OTA)

**Status:** Accepted (2026-08-19) — founder queued after D-039; Profile CTA if they dismiss the popup

**Context:** First distribution is a marketing-site Android APK (D-028 / D-038), not Play Store. Sideloaded users otherwise sit on old builds. Play in-app updates and `expo-updates` OTA are out of this cut.

**Decision:**
- Public static `site/latest.json` on `https://health-shield.in`: a JSON **array** of releases (`version`, `versionCode`, `apkUrl`, `sha256`, `downloadPage`), newest `versionCode` is current. Keep prior public APKs in the array (do not list unpublished `d576dde7`). No secrets. `Cache-Control: no-store`. Keep the **first/current** row in lockstep with the site download section after each production APK. The app compares installed `versionCode` to the highest in the array.
- Android production / dev-client only. Skip Expo Go (`Constants.appOwnership === 'expo'`), iOS, and web. Compare `expo-application` `nativeBuildVersion` to `versionCode`.
- Soft Alert on launch and return-to-foreground: **“Update available — please update”**. Update opens `https://health-shield.in/#download` (checksum visible). **Later** dismisses that `versionCode` (AsyncStorage). Offline / parse errors: silent. Throttle repeated Alerts. Not a force-block.
- Profile keeps an **App version** card with a **Get update** CTA even after Later.
- **Out:** Play in-app updates, `expo-updates` OTA, auto-download APK, blocking the vault, doctor portal involvement.

**Why:** Sideload users need a nudge without pretending we are on Play Store or shipping JS OTA over a health vault.

**Consequences:** The prompt only exists in APKs that contain this code (1.1.1+). People on 1.1.0 still update from the site. After each EAS production build, update `latest.json` and `site/index.html` together before telling users to update. Play Store stays later (D-028).

---

## D-039 — Email password reset (app + doctor portal)

**Status:** Accepted (2026-08-19) — founder: no way back in if the password is forgotten; add reset, securely

**Context:** Public ship (D-038) uses email/password on the Expo app and `portal/`. There was no recovery path. Same Supabase Auth project for both surfaces. Leaked-password protection stays off (D-037).

**Decision:**
- **Email only** via `resetPasswordForEmail`. No SMS, security questions, or admin-set passwords.
- **No enumeration:** the UI always says an account *if it exists* was emailed. Unknown addresses still look like success.
- **PKCE** on the Expo client (`flowType: 'pkce'`). Portal already uses PKCE via `@supabase/ssr`.
- **Per-surface `redirectTo` on the allow-list:** app → `https://health-shield.in/app-reset` (static bounce, no keys) then `healthshield://reset-password`; portal → `https://portal.health-shield.in/auth/confirm` then `/reset-password`. Local portal: `http://localhost:3000/auth/confirm`. Do not add `exp://**` in production. Smoke the app path on a **dev client or APK**, not Expo Go.
- **Recovery gate:** the email link must not open the vault or visit packs. Show only “choose a new password” until `updateUser({ password })` succeeds. Persist the gate across app restarts until then.
- **Revoke other sessions** after a successful reset (`signOut({ scope: 'others' })`).
- **One password per email** for the app and the doctor portal — copy says so. Min 8 characters. Do not claim HaveIBeenPwned (D-037).
- **Signed-in change password** on app Profile (current + new) uses the same update + revoke-others path. Portal stays view-only besides this recovery flow.
- Leave the default recovery email template (it honors `redirect_to`). Do not point it only at Site URL.

**Why:** Account lockout is a ship blocker; custom-scheme-only links fail in Gmail; PKCE stops a stolen `healthshield://` code from being exchanged without the verifier on the requesting device.

**Consequences:** Founder must add the redirect URLs in Auth → URL configuration and confirm mail delivery (built-in SMTP is rate-limited / spam-prone). App recovery needs a new APK. Portal can ship on Vercel independently. Custom SMTP, App Links / Universal Links, magic-link-only login, and leaked-password Pro stay out.

---

## D-038 — Public ship: health-shield.in (Vercel for site + portal)

**Status:** Accepted (2026-08-19) — founder: put the Android APK, marketing site, and doctor portal live; **host both web surfaces on Vercel** (not Cloudflare)

**Context:** D-037 waived leaked-password as a *publish* blocker and required an explicit “put it live.” Founder bought `health-shield.in` (GoDaddy). GitHub repo `Roshan190/health-shield` is **private**. Play Store stays later (D-028). First host pick was Cloudflare Pages + Vercel; founder then chose **Vercel only**. The Aug 14 production APK (`d576dde7`) predates `/visit` + `portal/` and must not be the public file.

**Decision:**
- **Marketing site** (`site/`): Vercel project at `https://health-shield.in` (and `www`). Static only — no Supabase, OpenAI, or Mapbox keys. Android download = EAS artifact URL + SHA-256 checksum. Copy is honest sideload / unknown-sources; not Play Store; do not claim HaveIBeenPwned / leaked-password checking (D-037).
- **Doctor portal** (`portal/`): second Vercel project at `https://portal.health-shield.in`. Same Supabase project; public env is only `NEXT_PUBLIC_SUPABASE_URL` + anon/publishable key. View-only visit packs. A quiet footer link from the marketing site is allowed so clinicians can find it; the landing page is still not a patient or doctor web app.
- **App:** new EAS `production` Android APK with `EXPO_PUBLIC_DOCTOR_PORTAL_URL=https://portal.health-shield.in` (plaintext/sensitive, not secret). Bump `android.versionCode`. APK stays off git.
- **DNS (GoDaddy):** keep nameservers at GoDaddy. Apex two `A` records as Vercel shows on `vercel domains verify` (currently `216.198.79.1` and `64.29.17.1`); `www` and `portal` `CNAME` to the project-specific `*.vercel-dns-017.com` targets (not a shared generic CNAME). `gddy` CLI (not the public GoDaddy MCP) is how agents write those records after `gddy auth login`.
- **Auth:** add `https://portal.health-shield.in/**` (and local `http://localhost:3000/**`) to Supabase redirect allow-list. Never put `service_role` on Vercel.

**Why (founder):** First public distribution on an owned domain; one host (Vercel) for both web apps.

**Consequences:** Agents host `site/` and `portal/` on Vercel and start a **new** production APK. Do not mark D-029 PASS (leaked-password still off). Play Store, iOS, and GitHub Pages stay parked. GitHub visibility is **public** as of D-041 (this decision's "repo is private" line is historical).

---

## D-037 — Park leaked-password protection; waive it as a public-ship blocker

**Status:** Accepted (2026-08-19) — founder: Pro HaveIBeenPwned toggle is too expensive; park until the app has revenue

**Context:** D-029 required Auth leaked-password protection before a **public** APK or download page. D-034 waived that only for *building* the APK. The check is still **off** (Supabase Free; Pro-only). Founder does not want to pay for Pro now.

**Decision:**
- **Park leaked-password protection.** Do not upgrade to Pro solely for HaveIBeenPwned. Revisit when there is app revenue (or the project is already on Pro for another reason).
- **Do not mark D-029 PASS.** The toggle is still actually off; the gate table stays honest.
- **Waive leaked-password as a *publish* blocker.** D-034's "build only" limit is lifted for this one check. Other D-029 items (no secrets in git, no keys on `site/`, JWT on Edge Functions, RLS) still must stay PASS.
- **Does not auto-publish.** Hosting `site/` with a live APK link, Play Store, and doctor-portal production host still need an explicit "put it live" step. Agents still do not commit `.apk` / `.aab` / signing keys.

**Why (founder):** Pro is a pain / cost with no revenue yet.

**Consequences:** Agents may proceed with public-ship *work* (hosting, download copy) when the founder asks to put it live. Agents must not pretend leaked-password is on. Copy must not claim HaveIBeenPwned checking.

---

## D-036 — Portal/site design pass + document Q&A chat (grounded coverage answers)

**Status:** Accepted (2026-08-19)

**Context:** Phase 6 thin is active (D-035). `portal/` and `site/` shipped functional but visually bare (plain CSS, no loading/empty states, consent `status` fetched but never shown). Phase Q "Ask about this file" (D-026 / D-032, exited) refused coverage-style questions ("is food poisoning covered?") because the prompt banned all insurance interpretation, and the UI was a single question box with no conversation.

**Decision:**
- **Portal design pass (within Phase 6):** shared layout header/footer + brand mark, brand tokens (trust blue / care teal, serif display matching `site/`), status badges (Active / Expires soon / Expired / Revoked), `loading.tsx` skeletons, richer empty states, a11y basics (skip link, focus-visible). Functional fix: a record's own `document_path` is now signed into the Files list (previously only `medical_record_documents` + policy files). Still view-only; no new access paths.
- **`site/` polish:** icon feature cards, phone-mock tab bar, trust points, CSS-only motion. Download stays **not live** (D-029 unchanged; no portal link).
- **Document Q&A deepen (scoped enhancement, not a new phase):** chat-style card (session-only bubbles, suggestion chips, typing indicator, inline errors); `ask-document` accepts up to 12 prior turns of **session** history for follow-ups; prompt now allows explaining what *this document's wording* says about coverage / exclusions / waiting periods, citing the clause relied on, and saying plainly when the file is silent. `max_output_tokens` 500 → 700.
- **Unchanged guardrails:** one owned file, owner-only, never diagnose, never promise claim approval/rejection/payout, off-document questions politely refused, disclaimer on every answer, **no chat persistence**, no multi-doc vault RAG, no general medical chatbot, no doctor chat.

**Why (founder):** portal/site looked "basic and boring"; Q&A could not answer grounded coverage questions and should feel like a chat.

**Consequences:** Redeploy `ask-document` before smoking the chat. History lives only in component state — nothing new stored server-side. Phase Q scope limits (D-026 / D-032) otherwise remain; agents still refuse a general chatbot or vault-wide Q&A without a new decision.

---

## D-035 — Enter thin doctor visit portal (park unpublished distribution)

**Status:** Accepted (2026-08-14) — founder: production APK smoked; next = doctor portal (not public APK)

**Context:** Phase D built a production APK (D-034) that the founder smoked. Public host + download stay blocked (D-029 leaked-password FAIL; D-034 is build-only). Founder chose to **park distribution unpublished** and enter the doctor portal. D-027 already locked *where* (separate web, same Supabase, time-boxed consent). This is the **enter + thin cut**. D-003 revisit: a second surface is now real.

**Decision:**
- **Park Phase D public ship.** Do not host `site/` with a live APK link. Do not mark D-029 PASS.
- **Enter Phase 6 thin — Doctor visit portal.**
- **Repo (D-003 revisit):** `portal/` Next.js app in this git repo. Not Expo web, not `site/`, not a sixth mobile tab, not a turbo `apps/` / `packages/` monorepo.
- **Patient (Expo):** `/visit` stack from Profile (D-012 — not a 6th tab). Grant a time-boxed pack to a **doctor email**: owned policies + medical records the patient picks; duration 24h / 72h / 7 days (max 7 days). List + revoke. Honest copy: HealthShield does not employ or verify doctors; anyone who can sign in with that email can view the pack until expiry or revoke.
- **Doctor (`portal/`):** same Supabase Auth email/password. View-only list of **live** consents for that email; open selected policies/records and their files. No edit, no diagnosis UI, no prescription upload.
- **Data:** new `visit_consents` + `visit_consent_items`. Do **not** reuse household `vault_memberships` / D-018 shares (family ≠ clinician).
- **Out of this cut:** clinic admin, doctor directory/verification, teleconsult, prescription upload, session notes, email delivery of the invite, vitals/meds/SOS/claims in the pack, sharing the whole vault, Play Store, public APK.

**Why (founder):** App working through production APK; start the doctor surface next.

**Consequences:** Agents build `portal/` + patient grant/revoke. Agents still refuse a public download page. Copy never implies HealthShield clinicians or diagnoses.

---

## D-034 — Build production APK without leaked-password (Free plan)

**Status:** Accepted (2026-08-14) — founder: leaked-password needs Pro; proceed without it and start building

**Context:** D-029 requires Auth leaked-password protection (HaveIBeenPwned) before a **public** APK or download page. That toggle is Pro-only. The project is on Free, so the check cannot pass. Founder does not want to wait on a paid plan to run the first signed production APK.

**Decision:**
- **Build now:** `eas build -p android --profile production` may run while leaked-password is still **FAIL**. Do not wait for Pro.
- **Do not mark D-029 PASS.** Leaked-password remains recorded FAIL.
- **Do not publish:** no public host, no live download link, no marketing of the APK until either (a) leaked-password is on, or (b) a later decision explicitly waives **public** ship.
- APK stays off git. Play Store, iOS, and doctor portal stay parked.

**Why (founder):** Pro is required for the Auth toggle; start the production APK anyway.

**Consequences:** Agents may start the EAS production Android APK. Agents must still refuse a public `site/` download and must not record D-029 PASS. Revisit HIBP when the project is on Pro.

---

## D-033 — Phase 5 exit; enter distribution prep (D-029 then D-028)

**Status:** Accepted (2026-08-13) — founder smoke: claims organizer works

**Context:** D-026 sequence (G polish → skip record OCR → document Q&A → Phase 5 thin claims) is complete. Locked next work is marketing site + Android APK (D-028), blocked on the D-029 security gate. Doctor portal still needs its **own** enter decision (D-027) after Phase 5 — that is not this phase.

**Decision:**
- Mark Phase 5 thin claims exit met.
- Enter **Phase D — Distribution prep**: run D-029 (secrets / RLS / git / Auth checklist); scaffold static `site/` with no keys and no APK in git. **Do not publish** a download page or APK until D-029 is recorded **PASS** in `PROGRESS.md` (including leaked-password protection).
- Play Store, iOS, doctor portal **build**, record OCR, and insurer claim APIs stay parked.

**Why (founder):** Claims tested working; proceed to the next sequenced slice.

**Consequences:** Agents must refuse doctor UI (D-027). Do not commit `.apk` / `.aab` / signing keys. Marketing copy must not diagnose or claim we file insurance claims.

---

## D-032 — Phase Q exit; enter thin claims assist

**Status:** Accepted (2026-08-13) — founder smoke: document Q&A works

**Context:** D-026 / D-031 sequenced polish → (skip record OCR) → document Q&A → Phase 5 thin claims. Founder confirmed Ask-about-this-file on owned policy/record.

**Decision:** Mark Phase Q exit met. Enter **Phase 5 thin — Claims assist**: manual organizer tied to an **owned** policy; India health-claim document checklist; link vault records; user-set status (`draft` / `submitted` / `more_info` / `settled`). Entry from policy detail + `/claims` stack (not a 6th tab — D-012). Honest copy: HealthShield does **not** file claims or guarantee payouts.

**Out:** insurer/TPA APIs, auto-file, payout prediction, doctor portal, claim Q&A/chat.

**Why (founder):** Q&A tested working; proceed to the next sequenced slice.

**Consequences:** Do not start doctor portal (D-027), marketing site / public APK (D-028 / D-029), Play Store, or record OCR (D-031) during this phase.

---

## D-031 — Skip medical-record OCR; enter document Q&A

**Status:** Accepted (2026-08-13) — founder: scrap Phase R

**Context:** D-026 sequenced polish → record OCR → document Q&A → thin claims. Phase R shipped in code (extract-record-fields + Add-record draft). Founder does not want medical-record OCR.

**Decision:**
- **Remove** Phase R from the product: no Add-record field draft from files. Policy PDF draft (D-022) stays.
- Park record OCR until a new decision. Delete the client path and repo function source; do not call `extract-record-fields`.
- Amend D-026 order: after G, next is **Phase Q** (one-document Q&A), then Phase 5 thin claims.
- Enter Phase Q now.

**Why (founder):** Do not want medical-record OCR; proceed to the next sequenced slice.

**Consequences:** Agents must not rebuild record OCR without a new decision. D-030’s “enter R” is superseded. Remote `extract-record-fields` should be deleted from the Supabase project if it is still deployed.

---

## D-030 — Phase G exit: polish smoked; enter record OCR

**Status:** Accepted (2026-08-13) — founder confirmation

**Context:** D-026 G1–G3 shipped (copy, empty/error, keyboard). Founder confirmed core loops look good (G4).

**Decision:** Mark Phase G exit met. Enter **Phase R** (medical-record OCR) per D-026: Add record → attach PDF/image → draft title/category/date/tags/notes → review before save. Same `OPENAI_API_KEY` Edge secret as D-022. Never diagnose or interpret labs.

**Why (founder):** Polish looks good; proceed to the next sequenced slice.

**Consequences:** Do not start Phase Q (document Q&A) or thin claims until R exits. Doctor portal remains architecture-only (D-027).

---

## D-029 — Pre-release security gate (app + marketing site)

**Status:** Accepted (2026-08-13) — founder: must pass before first public APK / website

**Context:** First public distribution will be a marketing site + sideloaded Android APK (D-028), not Play Store. Health data + Edge Function secrets (OpenAI, Mapbox Search) make a leaked key a real incident. This gate is easy to skip under launch pressure — so it is a locked ship blocker.

**Decision — must pass before public APK or public download page goes live:**

1. **Secrets inventory.** Client / EAS public env / git may only contain: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (anon/publishable), `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (`pk.` only). Forbidden in git, Expo bundle, EAS public env, and the marketing site: `service_role`, `OPENAI_API_KEY`, Mapbox `sk.` / secret Search token, any JWT signing secret, database passwords.
2. **Scan.** Repo + built APK + marketing site HTML/JS: no `.env` committed; `.gitignore` covers `.env`; grep for `service_role`, `sk-`, `eyJ` service JWT, `OPENAI`, Mapbox secret. Marketing site has **no** Supabase keys at all (it is static; download only).
3. **Backend.** Supabase Auth leaked-password protection on. RLS still owner/share-scoped; Edge Functions require user JWT and never return secrets. No health PII in function logs.
4. **APK.** Release signing key not in git; version + “sideload / unknown sources” copy honest. Prefer a checksum or EAS artifact URL over a random Drive file.
5. **Record.** Findings go in `PROGRESS.md` (pass/fail). Fail = do not publish. Re-run this gate after any secret rotation or before a later Play Store upload.

**Why:** Sideloaded APKs are easier to tamper with and inspect. A public site plus a leaked service-role key is a DPDP-class failure.

**Consequences:** Agents must not treat “ship the APK” as done without this checklist. Play Store later still re-runs the gate. This is not a pentest vendor engagement — it is a secrets + RLS + client-bundle review.

---

## D-028 — First distribution: marketing site + Android APK (Play Store later)

**Status:** Accepted (2026-08-13) — founder override of Play-first

**Context:** Play Console listing costs money and process. Founder wants the app reachable for marketing now: a website where people download the Android APK. iOS remains parked (D-014 / D-016).

**Decision:**
- **Marketing site** = static landing (product story + Android download). Not an authenticated HealthShield web app. Not Expo web as the product. Not the doctor portal (D-027). Same repo may hold a simple `site/` (or equivalent) static folder — this does **not** open a monorepo (D-003).
- **Android** = EAS production APK (or AAB→APK), signed, versioned, linked from the site. Copy must say the app is **not** on Play Store yet and installing requires allowing unknown sources.
- **Play Store** stays parked until after marketing traction (and the D-029 gate). Play category **Health & fitness** remains a Console step when that day comes.
- **Host** = cheap static host (e.g. GitHub Pages / Cloudflare Pages / similar). No health API on that origin.

**Explicitly deferred:** iOS TestFlight, Play internal track as the *first* public channel, in-browser use of the Expo app, collecting health data on the website.

**Why (founder):** Get the Android app in people’s hands without Play fees first; Play Store after marketing.

**Consequences:** Sideload trust, update, and malware-perception risk is accepted for v1. Auto-update via Play will not exist until Store. Public ship is blocked on **D-029**. Do not put the APK in git. Do not use the landing page as a doctor or patient web app.

---

## D-027 — Doctor portal: where and how (build later)

**Status:** Accepted (2026-08-13) — location/architecture locked; **do not build in this sequence**

**Context:** Founder asked where the doctor portal will live. Blueprint Phase 6 (temporary access, consent, view history/reports/insurance, prescription upload) is still too early. D-003 keeps a single Expo app until a second surface is real. D-026 sequence does **not** include building the portal.

**Decision — when we do build it (after Phase 5 thin claims exit + a new enter decision):**
- **Where:** a **separate web app** (Next.js acceptable; matches blueprint frontend). Not inside the Expo mobile app, not a sixth tab, not the marketing landing (D-028).
- **Auth / data:** same Supabase project `health-shield`. Doctors are a distinct role (not “log in as the patient”). Access only via **patient-granted, time-boxed consent** to a selected pack (records / policies the patient chooses). Default is view-only. Revoke ends access.
- **Repo:** starting the portal is the D-003 revisit trigger (then a small monorepo or a second app + shared types is allowed). Until then, do not scaffold `apps/` / doctor routes.
- **Copy:** assistive organizer for a visit; never diagnose; never imply the doctor is employed by HealthShield.

**Explicitly out until that enter decision:** doctor signup, clinic admin, teleconsult, prescription marketplace, emergency doctor dispatch, sharing the whole vault by default.

**Why:** Doctors work at a desk; patients work on a phone. Mixing both in Expo (or on a download landing page) would blur consent and delay the consumer app.

**Consequences:** Agents must refuse to implement doctor UI now. Phase 5 thin claims does not include a portal. Household share (D-018) is family-only — do not reuse it as “doctor access” without this model.

---

## D-026 — Next sequence after Phase C (override)

**Status:** Accepted (2026-08-13) — founder chose order + thin cuts

**Context:** Phase N + C exited (D-024 / D-025). Parked list included polish, record OCR, PDF Q&A, Phase 5+, doctor portal. Founder wants those product slices, then thin claims, plus distribution and security decisions (D-027–D-029). Blueprint Phase 5–8 must not start as a blob.

**Decision — build in this order (one active phase at a time):**

1. **Phase G — General polish** (now). Copy/disclaimer audit; empty/loading/error on core flows; leftover navigation/keyboard/overflow bugs; founder smoke of auth → policy → record → SOS → hospitals. **Out:** visual redesign, new features, iOS unpark, Play Store, doctor portal.
2. **Phase R — Medical-record OCR.** Same pattern as D-022: on Add record, attach PDF/image → Edge Function drafts title/category/date/tags/notes → user reviews before save. Never invent diagnoses or lab “interpretations.” `OPENAI_API_KEY` stays a function secret. **Out:** chat, claims, auto-save, OCR on edit/detail unless a later slice says so.
3. **Phase Q — PDF / document Q&A.** Chat about **one** document the user owns (policy PDF or record file). Edge Function + user JWT + Storage download; answers grounded in that file; disclaimer every reply. **Never diagnose, prescribe, or promise claim outcomes.** **Out:** general medical chatbot, multi-doc vault RAG, sixth tab, doctor chat.
4. **Phase 5 thin — Claims assist.** Manual claim organizer tied to a policy: checklist of typical India health-claim documents, link to vault items, user-set status (e.g. draft / submitted / more-info / settled). **Out:** insurer/TPA APIs, auto-file, payout prediction, doctor portal.

**Still parked (not in this sequence):** doctor portal **implementation** (architecture only: D-027), Play Store (D-028), email invite delivery, scrape/partner cashless, Google Maps / `@rnmapbox/maps` native, iOS runtime.

**Public APK + marketing site** (D-028) only after **D-029** security gate — typically after this sequence, not instead of it.

**Why (founder):** Polish then deepen document AI, then a thin claims wedge; skip Play fees until marketing; decide doctor portal location now so we do not bolt it onto Expo.

**Consequences:** Do not start R/Q/Phase 5/doctor portal/Play while G is active. Each phase still needs its own exit in `PROGRESS.md`. Product copy remains assistive, never clinical or “we filed your claim.”

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
