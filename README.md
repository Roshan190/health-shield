# HealthShield

Mobile-first personal health and insurance companion (India-first).

> If something related to health happens, HealthShield is the first app you open.

This repository is **source-available, not open source.** You may view the code. You may not copy, modify, or use it without permission. See [LICENSE](./LICENSE).

Public Android download: [health-shield.in](https://health-shield.in)

## Start here (humans & agents)

| Doc | Purpose |
|-----|---------|
| [AGENTS.md](./AGENTS.md) | Always-on project brief |
| [docs/PROGRESS.md](./docs/PROGRESS.md) | Current phase & status |
| [docs/ROADMAP.md](./docs/ROADMAP.md) | What we build, in order |
| [docs/DECISIONS.md](./docs/DECISIONS.md) | Locked product/tech choices |
| [docs/GOVERNANCE.md](./docs/GOVERNANCE.md) | How we work |
| [docs/project-vision-document.md](./docs/project-vision-document.md) | North star vision |
| [docs/project-blueprint.md](./docs/project-blueprint.md) | Full product ambition |

**Current phase:** see `docs/PROGRESS.md`.

## Develop

Copy `.env.example` to `.env` and fill in your own Supabase anon URL + key (never `service_role`). Mapbox and OpenAI secrets stay off the Expo client — see `.env.example`.

```bash
npm install
npx expo start
```

Expo SDK **57** — use versioned docs: https://docs.expo.dev/versions/v57.0.0/

## Stack (Foundation)

Expo 57 · Expo Router · NativeWind · Zustand · Zod · React Hook Form · Supabase

## License

Copyright (c) 2026 Roshan Shikhare. All rights reserved. Details in [LICENSE](./LICENSE).
