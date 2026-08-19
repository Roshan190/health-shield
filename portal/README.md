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

Production: [https://portal.health-shield.in](https://portal.health-shield.in) (Vercel). Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` on the Vercel project (same values as the Expo app — never `service_role`).

```bash
cd portal
npx vercel --prod --yes
```

Add these to Supabase Auth → URL configuration → Redirect URLs (D-038 / D-039):

- `https://portal.health-shield.in/**`
- `https://portal.health-shield.in/auth/confirm`
- `https://portal.health-shield.in/reset-password`
- `http://localhost:3000/**` (local)
- `http://localhost:3000/auth/confirm`
- `http://localhost:3000/reset-password`

App recovery bounce (same project): `https://health-shield.in/app-reset` and `healthshield://reset-password`. Do not add `exp://**` in production.

Forgot password: `/forgot-password`. The email link must land on `/auth/confirm` then `/reset-password` — a recovery session must **not** open `/visits` until a new password is set. One email = one password for the app and this portal.

## Do not

- Put `service_role` or OpenAI keys here
- Diagnose, prescribe, or claim HealthShield employs doctors
- Reuse family/household sharing as doctor access
