# Product Requirements Document: EmbeddedLend — API-First SME Underwriting Layer

*Stage: PRD (architecture). Preceded by: problem-embeddedlend.md (problem statement). Next: build demo (dummy data).*

## 1. Goals & Non-Goals

### Goals
- Deliver an **API-first SME underwriting service** that lets licensed lenders originate, underwrite, and service business loans for the "missing middle": MSMEs too informal for collateral-based bank lending and too business-like for consumer micro-loans.
- Turn consented **mobile-money cash-flow** into a **defensible, explainable loan decision** — the unbuilt bridge between the data rail (BNR Open Finance) and the money rail (eKash).
- Make the regulator comfortable with **more lending, not less**: consent-first data pulls, audit trails, explainable decisions, data residency.

### Non-Goals (explicitly out of scope)
- **No UI/UX productization** in this PRD — no lender portal screens, no onboarding flows. The UI concern is deferred pending primary research on the player landscape; a demo interface is built separately as an outreach artifact.
- No direct consumer lending, no deposits, no holding a loan book (the Qianhe lesson — we never take credit risk; the lender remains the regulated entity).
- No ML model training or black-box scoring in the MVP — deterministic, transparent scoring first.
- No multi-bureau, multi-rail integration in the MVP.

## 2. Personas (Primary — who pays)

| Persona | Description | Consumes |
|---|---|---|
| **NDFSP (non-deposit-taking financial service provider)** | One of 80+ licensed digital lenders in Rwanda (e.g. Zamuka, IWACU, EXUUS). Tech-poor, small, needs plug-and-play origination + scoring. | Full stack: consent, data pull, score, decision, loan, disbursement, repayment |
| **MFI / SACCO** | Extends credit to women and micro-enterprises, runs on field-officer apps and paper. | Scoring API + decision API (brings own distribution) |
| **Vertical SaaS platform** | E-commerce, logistics, agritech, retail POS serving merchants (e.g. Kayko corridor). Wants embedded working capital for merchants without becoming a lender. | Embedded credit flow: score + decision + loan + eKash disbursement inside their product |

Secondary (future): regional banks preferring white-label APIs; digital lenders expanding into Rwanda.

## 3. Architecture Overview

A layered, API-first microservice integration layer. The lender's core banking system stays the system of record; our services sit beside it.

![Hand-drawn architecture diagram](architecture/diagram.png)

```
┌─────────────────────────────────────────────────────────────┐
│  COMPLIANCE & AUDIT (vertical slice)                        │
│  consent records · audit log · data residency · NCSA        │
├─────────────────────────────────────────────────────────────┤
│  L1  CONSENT & DATA ACCESS                                  │
│      API gateway → Consent service → Data aggregator        │
│      (Open Finance / bank APIs / MoMo APIs / MTN KYC /      │
│       bureau)                                               │
├─────────────────────────────────────────────────────────────┤
│  L2  SIGNAL EXTRACTION                                      │
│      cash-flow signals: income stability · concentration ·  │
│      seasonality · repayment capacity · savings behavior    │
├─────────────────────────────────────────────────────────────┤
│  L3  DECISION                                               │
│      deterministic scoring engine (explainable)             │
│      + policy rules → score, risk signals, decision trace   │
├─────────────────────────────────────────────────────────────┤
│  L4  LOAN OPERATIONS                                        │
│      origination · loan management · repayment scheduling   │
├─────────────────────────────────────────────────────────────┤
│  L5  MONEY MOVEMENT (eKash)                                 │
│      one integration → banks + MTN MoMo + Airtel + SACCOs   │
│      (disbursement, repayment collection, RWF20 flat)       │
└─────────────────────────────────────────────────────────────┘
```

**Design principle (FinRobot-style):** *numbers computed by code, narrative by AI.* The scoring engine computes deterministic values; an LLM narrates lender-facing recommendations with full provenance. No black-box scores.

## 4. Data Flow (Borrower Journey)

1. **Consent** — borrower consents via lender app; consent service records purpose, scope, duration (consent-first, Law 058/2021-aligned).
2. **Data pull** — aggregator fetches consented transaction data (mobile-money cash-flow via Open Finance/bank/MoMo APIs; KYC verification via MTN KYC API; optional bureau check).
3. **Signal extraction** — cash-flow signals computed: income stability, concentration, seasonality, repayment capacity, savings behavior.
4. **Score** — deterministic engine produces score + risk signals.
5. **Decision** — policy rules (limits, tenure, risk thresholds) produce decision + full decision trace.
6. **Disbursement** — via eKash, one integration, cheap, instant.
7. **Repayment** — collections via eKash; repayment history feeds back into future scores (network effect → credit-history moat).

## 5. Component Map

| Component | Responsibility |
|---|---|
| **API Gateway** | AuthN/AuthZ, rate limiting, tenant isolation per lender |
| **Consent Service** | Capture, record, revoke consent; audit-gated |
| **Data Aggregator** | Normalize Open Finance / bank / MoMo / KYC / bureau data into one schema |
| **Signal Extractor** | Compute cash-flow signals (deterministic) |
| **Scoring Engine** | Deterministic, explainable score + risk signals |
| **Decision Service** | Policy rules, limits, decision trace |
| **Loan Manager** | Origination, loan lifecycle, repayment scheduling |
| **eKash Connector** | Disbursement + repayment over the national rail |
| **Audit Store** | Tamper-proof decision + consent audit trail |

## 6. API Surface Sketch

| Endpoint | Purpose |
|---|---|
| `POST /v1/consent` | Create borrower data-sharing consent |
| `GET /v1/data/summary` | Fetch consented, aggregated data + cash-flow signals |
| `POST /v1/score` | Compute deterministic score + risk signals |
| `POST /v1/decisions` | Apply policy rules → decision + trace |
| `POST /v1/loans` | Originate a loan |
| `POST /v1/disbursements` | Disburse via eKash |
| `POST /v1/repayments` | Record/collect repayment via eKash |

## 7. Compliance Architecture

- **Consent-first** data pulls with purpose limitation (Law 058/2021 + GDPR-style rights: explainability, correction, portability).
- **NCSA posture** — data processor/controller certification path per Open Finance roadmap.
- **Data residency** in jurisdiction; tamper-proof decision traces; full audit log.
- **Explainability** — every decision carries its risk signals and reasoning; the "numbers computed, narrative by AI" principle keeps the LLM as narrator, never the decider.

## 8. MVP Slice (Flagged — what we build first)

**The "one livable room" that proves the core bet:** a lender can plug in, get a borrower's mobile-money data, get a defensible score, and disburse/repay via eKash.

| In MVP | Out of MVP (later) |
|---|---|
| Consent flow (one) | Loan-management dashboards |
| One data source (mobile-money cash-flow) | Multiple bureaus |
| Scoring engine (deterministic, explainable) | KYC vendor integrations |
| Decision service + trace | ML model training |
| eKash connector (disburse + repay) | Fancy reporting / analytics |
| Core endpoints: consent, data/summary, score, decisions, loans, disbursements, repayments | Multi-country expansion |

**MVP success metric:** a pilot lender originates a real business loan to a thin-file borrower using consented mobile-money data, with a defensible decision trace — proving willingness-to-pay and the data-layer feasibility.

## 9. Tech Stack

- **Backend:** Node/TypeScript, Postgres
- **Infra:** API-first microservices, containerized
- **Money rail:** eKash (one integration → whole ecosystem)
- **Data rail:** Open Finance / bank / MoMo consent APIs; MTN KYC API
- **Decision:** deterministic scoring engine (pure compute) + optional LLM narration layer (config at deploy time)

## 10. Evidence Ledger (PRD-specific)

| Claim | Source | Grade |
|---|---|---|
| eKash = one integration for the whole ecosystem (banks, MTN MoMo, Airtel, SACCOs, MFIs), RWF20 flat, RWF10m cap | New Times, African Business, RISA (Jul 2026) | ✅ Observed |
| eKash is a payments rail only — no credit scoring/loan decisioning | Launch coverage | ✅ Observed |
| BNR Open Finance objective #1 = alternative scoring for MSMEs; voluntary Phase 1 now, mandatory Phase 2 (2026-28), central platform Phase 4 w/ private partner | BNR Open Finance Position Paper | ✅ Observed |
| MTN KYC API exists, consent-gated, use case "digital lending" | MTN Rwanda | ✅ Observed |
| BK Open API (Mar 2026) enables payments/credit access/data exchange | KT Press | ✅ Observed |
| 80+ licensed NDFSPs; Jali Finance: "credit reference systems remain a structural challenge" | BNR list; allAfrica (Apr 2026) | ✅ Observed |
| Deterministic-compute + LLM-narration pattern validated in finance (FinRobot) | FinRobot repo/AI4Finance | 🟡 Secondary |
| Willingness-to-pay by Rwandan lenders | No interviews yet | ❓ Assumption |
