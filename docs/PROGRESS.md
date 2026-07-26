# Progress

**Last updated:** 2026-07-25  
**Current phase:** Phase 2 — Health tracking  
**Active slice:** 2.5 Polish (next); 2.4 blocked on iOS access  
**Status:** Slices 2.1–2.3 built; Health hub nav (D-012)

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
| 1 Foundation MVP | **Done** (D-010) | Slices 1.0–1.5; real Android smoke; iOS deferred |
| 2 Health tracking | **Active** | Cut = D-011; slices in `ROADMAP.md` |
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
- [x] Phase 1 exit — founder confirmed real Android smoke (D-010); iOS Simulator still recommended before Apple Health

---

## Phase 2 — slices

- [x] 2.1 Manual vitals — BP / blood sugar / weight CRUD + simple list/trends
- [x] 2.2 Medications — manual meds + local dose reminders
- [x] 2.3 Health Connect (Android) — read-only steps/heart/sleep (thin)
- [ ] 2.4 Apple Health (iOS) — blocked until iOS access (D-010)
- [ ] 2.5 Polish — Home recent-vitals / next-med card

---

## Done log

### 2026-07-25 (Phase 2.3)

- Slice **2.3**: `platform_health_daily` table + enums (RLS owner-only) via migration `20260725200000_create_platform_health_daily.sql` (applied remotely). Packages: `react-native-health-connect`, `expo-health-connect`, `expo-build-properties` (minSdk 26). Screen `/health/connect` — consent, sync last 7 days (steps / avg HR / sleep mins), disconnect; Expo Go shows clear “needs development build” state. Health hub links to Connect. Export/delete includes platform health + clears local HC prefs. **Requires EAS/dev-client APK** for real sync (not Expo Go).

### 2026-07-25 (nav — Health hub)

- **D-012:** Bottom tabs = Home · Policies · **Health** · Family · Profile. Health hub at `/health` nests vitals/medications/records under `/health/...`. Home quick actions thinned to Health / Add policy / Emergency.

### 2026-07-25 (Phase 2.2)

- Slice **2.2**: `medications` table (RLS owner-only) via migration `20260725190000_create_medications.sql` (applied remotely via MCP). CRUD screens; up to 3 daily local reminder times (`expo-notifications` DAILY trigger); shared notification runtime helper. Routes under `/health/medications`. Export/delete includes medications. Expo Go Android may skip notifications (same as renewals).

### 2026-07-25 (Phase 2.1)

- Slice **2.1**: `vitals` table + `vital_type` enum (RLS owner-only) via migration `20260725180000_create_vitals.sql` (applied remotely via MCP). Screens: list with type filters + short spark trend, log/detail/edit/delete. Types: blood pressure (sys/dia mmHg), blood sugar (mg/dL), weight (kg). Copy: personal log only — not diagnosis. Routes under `/health/vitals`. Export/delete lifecycle includes `vitals`.

### 2026-07-25 (Phase 1 exit)

- **D-010:** Phase 1 exit accepted on real Android device smoke; iOS Simulator smoke deferred until before Apple Health.
- **D-011:** Phase 2 cut locked — manual vitals/meds first, then Health Connect / Apple Health read; OEM fitness apps deferred.
- `ROADMAP.md` Phase 2 slice plan written; Phase 2 unblocked.

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
- No iOS device yet — iOS smoke deferred (D-010); **blocks 2.4 Apple Health only**, not 2.1–2.3

---

## Next actions (priority order)

1. EAS preview/dev-client Android build to smoke Health Connect sync on device
2. Slice **2.5** polish — Home recent vitals / next med reminder card
3. Enable leaked-password protection in Supabase Auth (advisor WARN)
4. Later (when iOS access exists): Foundation smoke + slice 2.4 Apple Health
