# Progress

**Last updated:** 2026-07-25  
**Current phase:** Phase 1 — Foundation MVP  
**Active slice:** Phase 1 complete (pending device smoke tests)  
**Status:** Slice 1.5 Emergency card + polish built

Agents: read this file at the start of every session. Update it when phase/slice status changes.

---

## Snapshot

| Item | Value |
|------|--------|
| Product | HealthShield |
| Repo shape | Single Expo app (SDK 57) |
| Backend | Supabase project `health-shield` (`yodcqlkkmqssellzketa`) |
| Platform | Mobile-first |
| Team | Solo |

---

## Phase checklist

| Phase | Status | Notes |
|-------|--------|-------|
| 0 Research | **Done** (D-007 override) | Competitive desk + synthetic users; real chats skipped |
| 1 Foundation MVP | **Built** (smoke tests pending) | Slices 1.0–1.5 implemented |
| 2 Health tracking | Blocked | After Phase 1 exit criteria / smoke tests |
| 3 Emergency | Blocked | After Phase 2 (live SOS — distinct from static 1.5 card) |
| 4+ AI / claims / doctor / etc. | Blocked | After validation |

---

## Phase 1 — slices

- [x] 1.0 App shell (strip template, auth-ready nav, placeholders)
- [x] 1.1 Auth & profile (Supabase email + `profiles` RLS)
- [x] 1.2 Insurance (manual) — CRUD + private PDF storage + renewal list hook
- [x] 1.3 Medical records — CRUD + PDF/image upload + categories/tags + timeline/search
- [x] 1.4 Family (basic) — member CRUD + thin viewer/manager roles + shared/private defaults (D-008)
- [x] 1.5 Emergency card + polish — offline-capable card, local renewal notifications, export/delete (D-009)

---

## Done log

### 2026-07-25 (continued)

- Slice **1.5**: Emergency card screen (`/profile/emergency`) with offline AsyncStorage snapshot; local renewal reminders via `expo-notifications` (30d / 7d / day-of, synced from Home); Profile **Export my data** + **Delete account** (`delete_own_account` RPC, D-009). Migration `20260725140000_delete_own_account.sql` applied remotely.
- **Identity card polish**: full-bleed brand gradient, watermark shield, glass avatar ring, blood group / DOB chips.
- **Android upload fix (v2)**: `copyAsync` / FileSystem reads fail with “isn't readable” on Expo Android even for cache URIs. Fix: read bytes **immediately at pick** via XHR `arraybuffer` (fetch/File API fallbacks), store `bytes` on the picked asset, upload from memory — no late re-read of the URI.

### 2026-07-25

- Slice **1.4**: `family_members` table (RLS owner-only) + enums `family_relationship` / `family_role` via migration `20260725120000_create_family_members.sql` (applied remotely via MCP). Family stack: list / new / detail with relationship chips, intended role (viewer|manager), DOB, blood group, notes, delete. Documented shared-vs-private defaults in UI + **D-008** (policies/records stay owner-private; roles are intent-only until invites). Home quick action + Coming next retargeted to emergency card.
- **Date picker UX**: new `DateField` using `@expo/ui/community/datetime-picker` (Android dialog, iOS spinner sheet; web native `type="date"`). Replaced manual `YYYY-MM-DD` text entry on profile, policies, and records forms.

### 2026-07-24

- Governance + decisions D-001…D-007
- Slice **1.0** shell
- Slice **1.1** auth + profiles
- Slice **1.2**: `policies` table + `policy-docs` private bucket, list/new/detail, PDF attach, Home upcoming renewals
- Migrations: `20260724120000_create_profiles.sql`, `20260724130000_create_policies.sql`
- **UI redesign pass** (all existing screens, no scope change): expanded design tokens (tints, gradients, type scale), new component kit (IconBadge, Chip/SelectChip, Skeleton, EmptyState, SectionHeader, PressableCard), gradient Home hero + real portfolio stats + quick actions, redesigned policies list/detail/new with sectioned forms and status chips, illustrated empty states for Records/Family, branded auth screens. Added `expo-linear-gradient`; `expo lint` auto-configured ESLint. Declined (phase discipline): promo carousel, featured products, fake activity/charts.
- **Android layout fix**: `Screen` SafeAreaView had `alignItems: 'center'`, collapsing the ScrollView width on native (content rendered ~171pt wide); web was unaffected. Fixed by stretching the scroll view and centering via `alignSelf` on the inner container.
- **Theme centralization + in-app appearance**: colors/tints/gradients/overlay tokens centralized; `useThemeName()` resolves scheme from Profile → Appearance preference (`system` | `light` | `dark`), persisted in AsyncStorage. `app.json` `userInterfaceStyle: "automatic"`. StatusBar follows active scheme.
- Slice **1.3**: `medical_records` table (RLS owner-only) + `medical-records` private bucket (PDF/JPEG/PNG/WebP/HEIC, 10MB) via migration `20260724170000_create_medical_records.sql` (applied remotely via MCP); records list with month timeline, client-side search, category filter chips; add/detail/edit screens with document attach/open/replace; Home quick action activated. Advisors clean (only pre-existing leaked-password WARN). Lint/typecheck fully clean.

---

## Blockers

- Real user validation still absent (accepted risk per D-007)
- Phase 1 exit still needs iOS Simulator + Android Emulator smoke pass

---

## Next actions (priority order)

1. Device smoke test: Android file upload (policies + records), emergency card offline, renewal notification permission, export/delete (careful — destructive)
2. Enable leaked-password protection in Supabase Auth (advisor WARN)
3. After smoke pass: mark Phase 1 exit met; only then plan Phase 2 health tracking
