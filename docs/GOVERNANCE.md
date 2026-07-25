# Governance

How this repo stays coherent across chats and weeks.

---

## Source of truth (read in this order)

1. `AGENTS.md` — always-on operating brief for humans and agents
2. `docs/PROGRESS.md` — where we are right now
3. `docs/ROADMAP.md` — what we build next, in order
4. `docs/DECISIONS.md` — locked choices (do not silently reverse)
5. `docs/project-vision-document.md` — north star (not a build checklist)
6. `docs/project-blueprint.md` — full ambition (not a license to build everything now)

---

## Session protocol (agents)

1. Read `PROGRESS.md` and current phase in `ROADMAP.md` before coding.
2. Obey phase order. If asked to skip ahead, refuse or require a new decision entry.
3. Correct the founder when wrong (scope, security, privacy, phase order, fake timelines).
4. After meaningful work: update `PROGRESS.md` (and Issues if used).
5. New irreversible tech/product choice → add to `DECISIONS.md`.
6. Expo work: use SDK 57 docs (`https://docs.expo.dev/versions/v57.0.0/`).

---

## Dual tracking

| Tool | Purpose |
|------|---------|
| `docs/PROGRESS.md` + `ROADMAP.md` | Context for agents and humans |
| GitHub Issues | Executable tasks; label by phase (`phase-0`, `phase-1`, …) |

Issues without a phase label are incomplete. Closing an Issue that finishes a slice requires a Progress update.

---

## Definition of done (slices)

See `ROADMAP.md` Phase 1 exit criteria. UI-only without persistence is **not** done for Foundation slices that store data.

---

## Correction culture

Being “nice” and shipping the wrong thing is a failure mode.

Agents must challenge:

- Building AI / claims / doctor portal before Foundation
- Storing health data without auth/RLS
- Claiming research is done with zero notes
- Monorepo / microservices theater for a solo MVP
- Medical diagnosis language in product copy

Founder may override — only via an explicit entry in `DECISIONS.md`.
