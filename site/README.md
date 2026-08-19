# HealthShield marketing site (D-028 / D-038)

Static landing only. **No login, no Supabase keys, no health API.**

Production host: [https://health-shield.in](https://health-shield.in) (Vercel). Doctor portal is a **separate** Vercel project: [https://portal.health-shield.in](https://portal.health-shield.in).

## Publish

```bash
npx vercel --cwd site --prod --yes --name health-shield
```

Attach custom domains on that Vercel project: `health-shield.in` + `www.health-shield.in`.

The Android APK is **not** in this folder. After `eas build -p android --profile production`, put the EAS artifact URL and SHA-256 in **both** `index.html` (current download) and `latest.json` (prepend a new object; keep previous public releases). `version` + `versionCode` must match `app.json` for that APK. Never commit `.apk` / `.aab`. Do not add unpublished builds (e.g. `d576dde7`).

`latest.json` is a JSON **array** of sideload releases (D-040). The Android app fetches it, uses the **highest `versionCode`**, and may show “Update available”. Site-only deploys do **not** need a version bump. Serve it with `Cache-Control: no-store` (see `vercel.json`). No secrets.

`app-reset.html` (`/app-reset`) is a **static** password-reset bounce (D-039): no Supabase keys. It forwards the query/hash to `healthshield://reset-password`. Redeploy this site before sending app reset emails.

## EAS production APK (founder machine)

`.env` is gitignored, so EAS will not see local keys. Set these on the Expo project as **plaintext or sensitive** (not `secret` — `EXPO_PUBLIC_*` must be inlinable into the client):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` (anon / publishable only — never `service_role`)
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (`pk.` only — never `sk.`)
- `EXPO_PUBLIC_DOCTOR_PORTAL_URL=https://portal.health-shield.in`

```bash
eas env:set production --name EXPO_PUBLIC_DOCTOR_PORTAL_URL --value https://portal.health-shield.in --visibility plaintext --non-interactive
eas build -p android --profile production
```

Never commit `.apk`, `.aab`, or signing keys. Do not put `OPENAI_API_KEY` or Mapbox Search `sk.` on EAS. Copy must not claim leaked-password / HaveIBeenPwned checking (D-037).
