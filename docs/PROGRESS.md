# Progress

**Last updated:** 2026-07-26  
**Current phase:** Phase 2 — Health tracking (**exit met**, D-014)  
**Active slice:** Phase 2 complete (2.4 iOS **test pending**)  
**Status:** Slices 2.1–2.5 built; Android smoked by founder; Apple Health code-complete, iOS test pending

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
| 2 Health tracking | **Done** (D-014) | Android smoked; 2.4 iOS test pending |
| 3 Emergency | **Next** | Live SOS — distinct from static 1.5 card |
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
- [x] 2.4 Apple Health (iOS) — code complete; **device testing pending** (D-014)
- [x] 2.5 Polish — Home recent-vitals / next-med card
- [x] Phase 2 exit — Android verified by founder; iOS Apple Health test deferred (D-014)

---

## Done log

### 2026-07-26 (Phase 2.4 + Phase 2 exit)

- Slice **2.4**: `apple-health` package + config plugin (read-only share copy; no background delivery). Lib `src/lib/apple-health/*` — consent, sync last 7 days (steps / avg HR / sleep mins) → `platform_health_daily` (`apple_health`). Screen `/health/apple`; Health hub link. Account delete clears Apple Health prefs. **iOS runtime smoke still pending** (no device).
- **D-014:** Phase 2 exit accepted — founder confirmed Android works; Apple Health ship-untested on iOS.
- Updated HC unsupported copy to point at Apple Health on iOS. Set `ios.bundleIdentifier`.

### 2026-07-26 (Phase 2.5 + brand)

- Slice **2.5**: Home **Health snapshot** — next medication dose card (`findNextDose`) + recent vital card; empty states deep-link to add flows; focus refresh also resyncs med notifications. Export/delete already covered vitals/meds/platform health.
- **Brand (D-013):** New app icon + Android adaptive set + splash (deep blue / dark, larger mark, fade hide). Removed iOS Expo template `.icon`. Apple category wiring: `store.config.json` → `HEALTH_AND_FITNESS` (+ `MEDICAL` secondary), `LSApplicationCategoryType` healthcare-fitness. **Google Play “Health & fitness” must still be chosen in Play Console** (not available via `app.json`). Native rebuild required to see icon/splash on device.

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
- No iOS device yet — Apple Health **runtime test pending** (D-014); Phase 2 exit still accepted on Android smoke

---

## Next actions (priority order)

1. Phase **3** — Emergency system (live SOS / location) — write thin slice plan in `ROADMAP.md`, then build
2. When iOS access exists: smoke Apple Health (`/health/apple`) on a real device / Simulator with HealthKit data
3. In Google Play Console: set app category to **Health & fitness**
4. Enable leaked-password protection in Supabase Auth (advisor WARN)
