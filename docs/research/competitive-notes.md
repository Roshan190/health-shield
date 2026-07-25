# Competitive notes (Phase 0)

**Date:** 2026-07-24  
**Method:** Desk research (public sites, store listings, product pages). Not hands-on app audits.  
**Status:** Competitive teardown complete enough to confirm MVP direction. Hands-on installs still useful later.

---

## Landscape map

| Cluster | Examples | Job they own |
|---------|----------|----------------|
| Insurance marketplace / sales | Policybazaar, insurer apps | Buy / renew / upsell |
| Insurance organizer / advisory | CoverSure, ThePolicyBox, Polifyx | Understand & track policies (sometimes claims help) |
| Care marketplace | Practo, Tata 1mg | Doctors, meds, labs, consults |
| Records / PHR | Practo Drive, 1mg Health Insights, ABHA app | Store / interpret clinical docs |
| OS health hubs | Apple Health / HealthKit, Android Health Connect | Wearables + on-device health data |
| Gov document rails | DigiLocker, ABHA / ABDM | Issued docs + consent-based health ID |

**HealthShield wedge:** Insurance + medical documents + family emergency readiness in one privacy-first companion — not a marketplace, not a pharmacy, not a wearable OS.

---

## 1. CoverSure

**What it is:** IRDAI-licensed insurance advisory / portfolio app (Corporate Agent).

**Strengths**

- Multi-insurer policy portfolio + family tracking + renewal alerts
- “Know Your Policy” / policy health check (coverage gap framing)
- Risk / coverage calculators; card-benefit discovery narrative
- Positioned as guidance, not only “buy more”

**Gaps vs HealthShield vision**

- Insurance-centric; weak as lifelong *medical* record OS
- Emergency card / hospitalization prep not the core story
- Advisory license = trust upside and sales-conflict perception risk

**Lesson:** Policy aggregation + plain-language coverage + renewals are table stakes. Do not start by selling insurance.

---

## 2. ThePolicyBox

**What it is:** Family insurance vault — upload PDF/photo, AI extracts fields, share by phone, renewals, “explain policy.” Explicitly: *does not sell insurance*.

**Strengths**

- Pain narrative matches ours: WhatsApp/email/file chaos; family doesn’t know coverage; missed renewals
- Zero-typing import + family share is the UX users will compare us against
- Privacy marketing (“no spam calls”) contrasts Policybazaar-style lead gen

**Gaps**

- Insurance vault, not health records / emergency / wearables
- Agent CRM side-quest dilutes consumer focus
- AI extraction quality unknown without hands-on test

**Lesson:** Closest *insurance-organizer* competitor. Our differentiation must be **records + emergency + family health**, not “another AI PDF reader.” Manual entry first (D-001) is still right; OCR is a later unlock, not day-1 identity.

---

## 3. Policybazaar (+ typical insurer apps)

**What it is:** Dominant compare-and-buy marketplace; “My Policies” after purchase.

**Strengths**

- Discovery, quotes, purchase funnel; huge brand awareness
- Post-purchase policy list inside their ecosystem

**Weaknesses (from public reviews / commentary patterns)**

- Aggressive callbacks / sales pressure after lead capture
- After-sales / claim support inconsistency in user complaints
- Optimized for conversion, not lifelong family health ops

**Lesson:** Users distrust “free organizers” that become sales funnels. HealthShield must stay **non-marketplace** in Foundation. Never require a phone number for a callback funnel.

---

## 4. Practo (+ Practo Drive)

**What it is:** Doctor discovery, appointments, teleconsult, meds/labs; Drive = upload/store records, reminders, offline view claims.

**Strengths**

- Habit around *getting care*
- Records feature exists; provider-shared docs possible
- Medicine reminders

**Gaps**

- Records are secondary to marketplace monetization
- Weak insurance / nominee / cashless / emergency OS story
- Family health manager as primary persona is thin

**Lesson:** People will not leave Practo for appointments. Win on **vault + insurance + emergency**, integrate care later if ever.

---

## 5. Tata 1mg (Health Insights Hub)

**What it is:** Pharmacy + labs + consults; Health Insights Hub for report interpretation, trends, family hub, external report upload, AI Q&A on labs.

**Strengths**

- Strong lab-report literacy product (charts, body systems, health score)
- Family hub + external PDFs + prescriptions directionally aligned with us
- Commerce loop (tests, supplements, consults) funds the feature

**Gaps**

- Anchored to pharmacy/diagnostics commerce
- Insurance portfolio / emergency readiness not core
- Insight quality tied to their lab ecosystem (third-party improving but commerce-biased)

**Lesson:** Report *interpretation* is a Phase 4+ temptation. Foundation should **store, categorize, search, timeline** without medical claims. “AI explains your CBC” is crowded and compliance-heavy.

---

## 6. Apple Health / HealthKit & Google Health Connect

**What they are:** On-device hubs for wearables + (increasingly) FHIR clinical data; not cloud PHRs you own across life events.

**Strengths**

- Best wearable aggregation; permission UX users already know
- Clinical records where hospital networks support them (stronger on Apple historically; Health Connect adding FHIR medical records)

**Gaps for Indian family manager**

- Not an insurance OS
- Family sharing / parents’ policies / emergency card for India hospitals is not the product
- India clinical network linkage ≠ US Health Records coverage
- Data stays device-centric; poor “dad’s phone died in ER” story alone

**Lesson:** Phase 2 wearable sync should **read** HealthKit / Health Connect — not reinvent fitness tracking. Do not build wearable charts in Phase 1.

---

## 7. ABHA / ABDM + DigiLocker

**ABHA:** 14-digit health ID; consent-based link/share of records across ABDM-registered facilities; Scan & Share OPD registration; PHR apps (incl. official ABHA app).

**DigiLocker:** Government document wallet; many insurers issue/fetch policies; legally useful copies; also health-locker adjacent via ABDM.

**Strengths**

- National rails for issued docs and consent
- High trust potential; reduces “lost PDF” for *issued* documents

**Gaps**

- Adoption uneven across hospitals/labs/insurers
- Not a delightful family emergency / renewal / multi-insurer UX
- User still juggles WhatsApp reports from non-ABDM providers

**Lesson:** Treat as **future integration**, not Foundation dependency. Manual upload remains necessary for years. Design consent / revoke language now so ABHA later fits.

---

## 8. Polifyx (Insurance Samadhan)

**What it is:** Claims grievance / complaint assistance + policy document vault narrative.

**Lesson:** Claims help is a **later wedge** (blueprint Phase 5). Foundation should store claim numbers / contacts on policies without promising claim outcomes.

---

## Feature comparison (Foundation-relevant)

| Capability | CoverSure | ThePolicyBox | Policybazaar | Practo | 1mg | Apple/HC | DigiLocker/ABHA | **HS Foundation target** |
|------------|-----------|--------------|--------------|--------|-----|----------|-----------------|---------------------------|
| Multi-policy portfolio | Strong | Strong | Partial | — | — | — | Fetch if issued | **Yes (manual)** |
| Family share | Yes | Strong | Weak | Weak | Yes (hub) | Limited | Consent share | **Yes (basic)** |
| Renewal reminders | Yes | Yes | Yes | — | — | — | Weak | **Yes** |
| Medical report vault | Weak | — | — | Yes | Strong | Partial | Partial | **Yes** |
| Lab insight / AI | — | Policy explain | — | Weak | Strong | — | — | **No (later)** |
| OCR policy import | Likely | Core | — | — | Reports | — | Issued fetch | **Defer** |
| Emergency card | Weak | — | — | — | — | Medical ID-ish | — | **Yes (static)** |
| Sells insurance | Advisory | No | Yes | — | — | — | — | **No** |
| Wearables | — | — | — | — | Planned | Core | — | **Phase 2** |

---

## Top 5 pain points (desk-synthesized)

These are **hypotheses from competitor positioning + public complaints**, not validated interviews.

1. **Policies and reports live in WhatsApp, email, and PDFs** — can’t find them under stress.
2. **Family doesn’t know coverage, nominees, or where documents are** when something happens.
3. **Renewals and waiting periods are opaque** — people renew blindly or lapse.
4. **Marketplaces optimize for selling**, so “organizer” trust is low if monetized via callbacks.
5. **Clinical reports are unreadable** — but “AI doctor” is crowded and risky; storage + timeline is underserved as a *trusted* combo with insurance.

---

## Implications for HealthShield (confirm D-001)

| Keep | Change / watch |
|------|----------------|
| Manual policy + PDF vault first | Expect users to ask for AI scan soon (ThePolicyBox). Ship manual excellently; OCR is Phase 1.x or 2, not identity. |
| Medical records upload + categories + search | Do **not** copy 1mg health scores in Foundation. |
| Basic family + emergency card | This is the gap CoverSure/ThePolicyBox leave open. |
| Non-selling stance | Explicit product principle — beats Policybazaar trust problem. |
| Supabase + RLS | Needed for family share without becoming Drive-with-folders. |
| ABHA/DigiLocker | Roadmap later; don’t block MVP. |

**Go recommendation:** Proceed to Phase 1 with D-001 MVP cut unchanged after this teardown.

---

## Still worth doing (founder)

- [ ] Install CoverSure + ThePolicyBox + 1mg Health Insights; 20-min each, screenshot flows
- [ ] 5–8 real user chats using `user-notes.md` script
- [ ] Skim 1–2 insurer apps you/your family actually use
