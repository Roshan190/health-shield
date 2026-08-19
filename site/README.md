# HealthShield marketing site (D-028)

Static landing only. **No login, no Supabase keys, no health API.**

Host the contents of this folder as the web root (Cloudflare Pages / GitHub Pages `site/` directory).

## Do not publish yet

Public download is blocked until **D-029** is recorded **PASS** in `docs/PROGRESS.md`:

1. Supabase Auth → leaked password protection **on**
2. Signed Android APK built with EAS (not committed to git)
3. This page’s download link points at that artifact (checksum or EAS URL), with honest sideload copy

## Android APK (founder machine)

`.env` is gitignored, so EAS will not see local keys. Set these on the Expo project as **plaintext or sensitive** (not `secret` — `EXPO_PUBLIC_*` must be inlinable into the client):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` (anon / publishable only — never `service_role`)
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (`pk.` only — never `sk.`)

```bash
eas env:set --name EXPO_PUBLIC_SUPABASE_URL --value https://YOUR_PROJECT_REF.supabase.co --environment production --visibility plaintext
eas env:set --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value YOUR_ANON_KEY --environment production --visibility sensitive
eas env:set --name EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN --value pk.YOUR_PUBLIC_TOKEN --environment production --visibility plaintext

eas build -p android --profile production
```

Repeat `--environment preview` if you use the preview profile.

Never commit `.apk`, `.aab`, or signing keys. Do not put `OPENAI_API_KEY` or Mapbox Search `sk.` on EAS. After a URL exists, replace the “Download is not live yet” copy in `index.html` with a single download link — still no keys on this origin.
