# Architecture & Product Decisions

Record only decisions that change how we build. Newest first.

Format: **Status** → Context → Decision → Why → Consequences

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
