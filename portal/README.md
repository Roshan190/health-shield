# HealthShield doctor portal (D-035)

Separate **Next.js** web app for clinicians. Not the marketing `site/`, not Expo web, not a sixth mobile tab.

Same Supabase project as the mobile app. **View-only** visit packs the patient granted.

## Run locally

```bash
cd portal
cp .env.example .env.local
# paste the same URL + anon key as the Expo app (never service_role)
npm install
npm run dev
```

Open http://localhost:3000 — sign in with the **doctor email** the patient typed.

## Do not

- Put `service_role` or OpenAI keys here
- Diagnose, prescribe, or claim HealthShield employs doctors
- Reuse family/household sharing as doctor access
