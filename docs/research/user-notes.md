# User notes (Phase 0 + ongoing)

**Status:** Synthetic S1–S8 (planning only) + **real feedback started 2026-07-27** (founder-shared).  
**Date:** 2026-07-24 (synthetic) · 2026-07-27 (first real log)

**Correction:** Synthetic notes must **not** be treated as validated research. Prefer the Real interview log below when making product cuts.

---

## Hypotheses (from competitive desk research)

Cross-check against `competitive-notes.md`. Treat as interview prompts, not facts.

| # | Hypothesis | What would falsify it |
|---|------------|------------------------|
| H1 | Family managers keep policies + reports in WhatsApp/Drive/email and hate searching during stress | People say one insurer app or DigiLocker is already enough |
| H2 | Spouse/parents often don’t know sum insured, insurer app login, or nominee | Families already share a password manager + folder |
| H3 | Users want renewals + document findability more than AI explanations | Users refuse to use an app without OCR/AI import |
| H4 | Distrust of “free” apps that call to sell insurance is high | Users are fine if we earn commission |
| H5 | Emergency card (blood group, allergies, policy + hospital contacts) is emotionally valued | Users say Medical ID / phone contacts are enough |
| H6 | Manual entry is acceptable for 1–3 policies if upload PDF is easy | Users abandon without auto-extract |

---

## Interview script (15–20 min)

Target: 25–45 with insurance + dependents, or anyone managing parents’ health.

1. Walk me through the last time someone in your family needed a medical report or insurance detail. Where did you look?
2. How many health-related policies does your household have? Where do PDFs live today?
3. Who in the family would know what to do if you were unconscious?
4. Have you used Policybazaar / insurer app / CoverSure / DigiLocker / Practo / 1mg / Apple Health? What worked / annoyed you?
5. Would you type policy details manually if you could attach the PDF? Why/why not?
6. What would make you **not** trust a health app with this data?
7. Rank: renewals, report storage, family access, emergency card, AI explanations, buying new insurance.

Capture: age band, city tier, #family members, iOS/Android, watch yes/no.

---

## Interview log — SYNTHETIC (not real people)

> Generated for product planning. Names and stories are fictional composites. Patterns intentionally mirror desk-research pain points; bias risk is high.

### Interview S1 — 2026-07-24 (synthetic)

- Persona: Family manager, 34, married + 1 kid (4), also helps parents in Pune. Works in IT. Tier-1 (Bengaluru). Household size 3 local + parents remote.
- Platform: Android + Samsung Watch. No password manager shared with spouse.
- Quotes:
  - “Dad’s angioplasty papers are in three WhatsApp chats — his, mine, and the hospital group.”
  - “Last renewal I paid from the SMS link. I still don’t know our room-rent limit.”
  - “If something happens to me, my wife knows we have ‘Star Health’… that’s about it.”
- Pain ranking: 1) find documents under stress 2) family access 3) renewals 4) emergency card 5) AI explain 6) buy new insurance
- Hypotheses: H1✓ H2✓ H3✓ H4 (mild) H5✓ H6✓ (“I’ll type 2–3 policies, not 15”)
- Product implication: Shared family view + PDF attach > fancy insights. Parents-as-remote-members matters.

### Interview S2 — 2026-07-24 (synthetic)

- Persona: Young professional, 28, single, employer group cover + one personal top-up. Mumbai. Lives alone.
- Platform: iPhone, Apple Watch.
- Quotes:
  - “I opened Policybazaar once for a quote. They called for two weeks. Never again.”
  - “Apple Health is fine for steps. Useless when HR asks for my last blood report.”
  - “I’d rather spend 10 minutes typing than give another app my number for ‘advice.’”
- Pain ranking: 1) report storage 2) renewals 3) AI explain 4) emergency card 5) family 6) buy insurance
- Hypotheses: H1✓ H3 partial (wants OCR later) H4✓✓ H5 weak H6✓
- Product implication: Non-selling trust is a feature. Solo users still need vault + renewals; family can be light.

### Interview S3 — 2026-07-24 (synthetic)

- Persona: Family manager, 41, spouse + 2 teens, manages mother-in-law’s chronic meds. Hyderabad.
- Platform: Android. No watch.
- Quotes:
  - “We have four health policies across three insurers. PDFs are in Gmail with subject lines like ‘FW: policy’.”
  - “During her admission, the TPA asked for the e-card. I found an old photo. Number was wrong.”
  - “Don’t tell me my cholesterol is high. Tell me where the latest lipid PDF is.”
- Pain ranking: 1) report storage/search 2) renewals 3) family access 4) emergency card 5) buy insurance 6) AI explain
- Hypotheses: H1✓ H2✓ H3✓ H5✓ H6✓ (manual OK if PDF stored)
- Product implication: Search + timeline for reports; store e-card / policy number prominently; avoid health-score theater.

### Interview S4 — 2026-07-24 (synthetic)

- Persona: Caregiver son, 36, parents in Indore (Tier-2), he in Delhi. Visits quarterly.
- Platform: iPhone.
- Quotes:
  - “Parents forward every lab PDF on WhatsApp. Nothing is named. ‘Report.pdf’ six times.”
  - “I made a Drive folder. They still don’t upload. WhatsApp is the system of record.”
  - “Emergency card on my phone doesn’t help if I’m on a flight.”
- Pain ranking: 1) family access 2) report storage 3) emergency card 4) renewals 5) AI 6) buy
- Hypotheses: H1✓ H2✓ H5✓ (but wants shareable/offline for parents’ phone too) H6✓
- Product implication: Low-friction share to parents’ device; emergency card on *their* phone, not only manager’s.

### Interview S5 — 2026-07-24 (synthetic)

- Persona: New parent, 31, spouse, 8-month baby. Pune. Bought term + enhanced health cover last year via agent.
- Platform: Android.
- Quotes:
  - “Agent WhatsApp’d the policies. I never logged into the insurer app.”
  - “Vaccination card is physical. Prescriptions are photos. I’m scared of losing the baby’s history.”
  - “If the app starts recommending ‘buy this rider,’ I’ll delete it same day.”
- Pain ranking: 1) report storage 2) renewals 3) family access 4) emergency card 5) AI 6) buy
- Hypotheses: H1✓ H4✓✓ H5✓ H6✓ H3✓
- Product implication: Categories for pediatric records; hard rule against upsell in product.

### Interview S6 — 2026-07-24 (synthetic)

- Persona: Senior-aware professional, 45, corporate insurance + parents on separate retail policies. Chennai.
- Platform: Android + DigiLocker user.
- Quotes:
  - “DigiLocker has my motor policy. Health PDFs still come on email. Half the hospitals aren’t on ABHA in practice.”
  - “I tried 1mg insights after a master checkup — nice charts, but I already bought the tests there. Feels salesy.”
  - “I’ll pay later for claims help. First I need one place that isn’t trying to sell me a bottle of vitamin D.”
- Pain ranking: 1) find docs 2) renewals 3) family 4) emergency 5) buy 6) AI explain
- Hypotheses: H1✓ H3✓ H4✓ H6✓; ABHA not a Foundation blocker
- Product implication: Don’t depend on ABHA/DigiLocker for MVP; optional later.

### Interview S7 — 2026-07-24 (synthetic)

- Persona: Skeptical power user, 29, fintech. Bangalore. Uses Notion + Drive already.
- Platform: iPhone.
- Quotes:
  - “I already have a Drive folder. Why do I need you?”
  - “Only if you do renewals, nominee, and one-tap share to my wife better than Drive.”
  - “Manual entry is a dealbreaker if I have more than five documents. Auto-read the PDF or I’m out.”
- Pain ranking: 1) OCR/AI import 2) renewals 3) family share 4) report search 5) emergency 6) buy
- Hypotheses: H3 rejected for this persona H6 rejected H4✓ H1 partial
- Product implication: Segment risk — power users will demand OCR early. Foundation can still ship manual for majority; track this as upgrade pressure, not day-1 scope change.

### Interview S8 — 2026-07-24 (synthetic)

- Persona: Spouse of family manager, 33, rarely touches insurance paperwork. Ahmedabad.
- Platform: Android.
- Quotes:
  - “He handles everything. I only know the hospital we usually go to.”
  - “If he travels and the kid has an emergency, I don’t know the policy number.”
  - “A simple card with blood group, allergies, insurer helpline — that I’d actually open.”
- Pain ranking: 1) emergency card 2) family access 3) find docs 4) renewals 5) AI 6) buy
- Hypotheses: H2✓✓ H5✓✓ H1 (indirect)
- Product implication: Emergency card + read-only family access is high emotional ROI even when “manager” does data entry.

---

## Synthetic synthesis (planning only)

| Theme | Signal strength in S1–S8 |
|-------|--------------------------|
| WhatsApp/email as system of record | Strong |
| Family doesn’t know coverage | Strong |
| Hate sales callbacks | Strong |
| Manual entry OK for few policies | Majority; rejected by power user S7 |
| Emergency card valued | Strong among caregivers/spouses |
| AI lab explanation | Nice-to-have; distrust if tied to selling |
| ABHA/DigiLocker replaces vault | Weak in practice |

**Does this change D-001?** As *fiction*, it supports keeping D-001. Power-user OCR demand (S7) is a watch-out for Phase 1.x — not a reason to delay Foundation.

---

## Real interview / feedback log

Log real people only. No PII beyond age band / city tier / platform. Expand as chats accumulate.

### Feedback R1 — 2026-07-27 (founder-shared; informal)

- Persona: Real users the founder shared the Android build with (household / acquaintances). Exact personas not captured in a formal script pass.
- Platform: Android (primary)
- Quotes / summary (paraphrased by founder):
  - Liked the **idea** and the **app as built** (Foundation + health tracking + SOS).
- Pain ranking: Not captured in ranked form this round.
- Hypotheses: Informal support for continuing Foundation deepen before AI (aligned with H3: organizer value before AI).
- Product implication: Founder chose **Q2 deepen Foundation (D-017)** over starting Phase 4 AI. Follow up with a fuller script interview when possible.

### Template — YYYY-MM-DD

- Persona:
- Platform:
- Quotes:
- Pain ranking:
- Hypotheses supported / rejected:
- Product implication:

---

## After 5–8 **real** chats

Update:

1. Top 5 pain points (replace desk + synthetic lists if needed)
2. `DECISIONS.md` D-001 — confirm or amend if evidence conflicts
3. Keep logging here; do not invent quotes
