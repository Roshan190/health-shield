# Progress

**Last updated:** 2026-07-27 (session handoff)  
**Current phase:** Phase Q2 exited; Phase 4 AI still deferred  
**Active slice:** None — pick next: **D-018 invite/share** vs Phase 4 AI vs manager-only  
**Status:** D-017 complete in code; founder Console checklist open

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

---

## Phase checklist

| Phase | Status | Notes |
|-------|--------|-------|
| 0 Research | **Done** (D-007 override) | Synthetic + real log R1 started |
| 1 Foundation MVP | **Done** (D-010) | Android smoke; iOS deferred |
| 2 Health tracking | **Done** (D-014) | Android smoked; 2.4 iOS parked |
| 3 Emergency | **Done** (D-016) | Thin SOS D-015; Android smoked |
| Q2 Deepen Foundation | **Done** (D-017) | Q2.1–Q2.5 shipped in code |
| 4+ AI / claims / doctor | **Deferred** | Thin cut + override in `DECISIONS.md` |
| Household invite/share | **Pending** (D-018) | Founder asked; not approved to build |

---

## Phase Q2 — deepen Foundation (D-017) — all done

- [x] Q2.1 Notification reliability
- [x] Q2.2 Records findability (`medical_records.family_member_id`)
- [x] Q2.3 Policy ↔ member link (`policies.family_member_id`)
- [x] Q2.4 Family clarity (linked items on member detail; D-008 copy)
- [x] Q2.5 Ops + feedback (R1 in user-notes; Console checklist below)
- [x] Q2 exit

### Code shipped this session (2026-07-27)

| Area | Key paths |
|------|-----------|
| Notifications | `src/lib/notifications/runtime.ts`, `renewals.ts`, `medications.ts`, `resync.ts`; `src/hooks/use-reminder-resync.ts`; `src/components/reminder-status-card.tsx`; `(app)/_layout.tsx` |
| Records + member | `supabase/migrations/20260727140000_medical_records_family_member_id.sql`; `src/components/family-member-picker.tsx`; `health/records/*` |
| Policies + member | `supabase/migrations/20260727150000_policies_family_member_id.sql`; `policies/*`; Home renewals |
| Family clarity | `family/[id].tsx`, `family/index.tsx`, `lib/family/format.ts` |
| Docs | `DECISIONS.md` D-016–D-018; `research/user-notes.md` R1 |

Migrations applied to remote Supabase via MCP during session.

---

## Open product question (D-018)

**Founder ask:** If Mom downloads the app and logs in, should she see reports/details the manager added for her?

**Answer today:** No — separate login = empty account. Tagging Mom on a record only organizes *your* vault.

**Do not** fake sharing. Next build needs explicit **D-018** acceptance (invite + viewer RLS) or founder chooses manager-only / Phase 4 AI instead.

---

## Blockers

- Apple Health + SOS **iOS runtime parked** (D-014 / D-016)
- Invite + shared RLS **not built** (D-018 pending)

---

## Founder Console checklist (Q2.5 leftovers)

1. [ ] Google Play Console → Store listing → category **Health & fitness**
2. [ ] Supabase Auth → Email → **leaked password protection** ([Auth settings](https://supabase.com/dashboard/project/yodcqlkkmqssellzketa/auth/providers?provider=Email); Pro plan)

---

## Next actions (priority order)

1. **Decide next track:** D-018 invite/share **or** Phase 4 thin AI **or** stay manager-only
2. Tick founder Console checklist
3. Smoke Q2.1 reminders on Android dev-client (checklist in done log)
4. Log more real user chats in `docs/research/user-notes.md`
5. iOS smoke when device exists (Apple Health + SOS)

---

## Done log (recent)

### 2026-07-27 (session handoff)

- Closed Q2 deepen (D-017). Documented D-018 pending (Mom login / household share question).
- Founder: Android full smoke OK through Phase 3; real users liked app (R1).

### 2026-07-27 (Q2.5 + Q2 exit)

- Apple categories confirmed. Play + leaked-password = founder Console only.
- R1 feedback logged.

### 2026-07-27 (Q2.1–Q2.4)

- See prior entries below in git history / this file's session table.

### 2026-07-27 (Phase 3 exit — D-016)

- Android SOS smoke OK; iOS parked.

### 2026-07-27 (Q2 deepen chosen — D-017)

- Deepen before Phase 4 AI.

---

## Next chat handoff (copy-paste prompt)

```
Continue HealthShield. Read docs/PROGRESS.md, docs/DECISIONS.md, docs/ROADMAP.md first.

Context:
- Phases 1–3 done (Android). Q2 deepen (D-017) shipped in code this session.
- Phase 4 AI still deferred unless we record a new override.
- D-018 PENDING: founder asked if Mom can log in and see records tagged for her. Today: NO (D-008) — family_member_id is organize-only on owner's account; no invite/shared RLS.
- Uncommitted code may include: notifications resync, family_member_id on records/policies, family member detail links, migrations 20260727140000 + 20260727150000.

Founder Console still open: Play category Health & fitness; Supabase leaked-password (Pro).

Pick one next track and implement only after locking cut in DECISIONS.md:
A) D-018 thin household invite + viewer RLS (Mom sees shared items on her login)
B) Phase 4 thin AI (e.g. policy/record summarize only — never diagnose)
C) Manager-only polish / ops only

I want to proceed with: [A / B / C — founder fills in]
```
