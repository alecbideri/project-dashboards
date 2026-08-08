# Deep Research: Embedded Lending API (Rwanda / EAC)

*Research run 2026-08-01 via vibe-research (Developer path, Level B). Built on the Qianhe autopsy (Stage: autopsy → research). Working title — rename at PRD stage.*
*Updated 2026-08-08: eKash national payment switch launch, Uganda "data bridge" signal, CFI data-trust findings, Bank of Kigali Open API.*

## 1. Project name

**EmbeddedLend (working title)** — an API-first embedded-lending infrastructure for East Africa: AI underwriting, loan origination, and servicing APIs sold to licensed banks, microfinance institutions (MFIs), SACCOs, and vertical SaaS platforms, with an initial focus on **Rwanda and the EAC**. We sell the technology layer, never the lending (the Qianhe lesson).

## 2. Core concept

What it is: a B2B2C API platform. Licensed lenders integrate our REST APIs to originate, underwrite, disburse, and service digital loans. We never take deposits, never hold a loan book, never touch consumer funds directly — the lender remains the regulated entity.

Problem it solves: East Africa has a deep SME credit gap but lenders lack the underwriting tech to serve it profitably. In Rwanda, formal MSMEs face an estimated **~$1.2B annual financing shortfall**; Africa-wide the MSME gap is **~$331B**. Borrowers are "thin-file" (no collateral history), banks demand collateral of up to **5x the loan amount**, and MFI/SACCO tech is legacy.

Why now: three converging tailwinds —
1. **Policy push:** Rwanda's FSDS 2025-29, the RSSB-anchored **$100M Rwanda SME Growth Fund**, the **BNR regulatory sandbox** (open to local and foreign fintechs, ~3-month licensing path), and Kigali International Financial Centre explicitly target SME credit and fintech.
2. **Data now exists:** 96% financial inclusion in Rwanda, mobile money ubiquity (MTN MoMo, Airtel), RwandaPay rails, and real-time payments (eKash, the national instant payment switch) make alternative-data underwriting viable and loan disbursement/repayment cheap and instant.
3. **Market shift:** East African fintech is moving from payments toward "data-as-a-service" that feeds credit decisions — the exact wedge our API occupies.

## 2b. National payment rail: eKash (live July 2026)

Rwanda launched **eKash**, its national instant payment system (operated by RSwitch, overseen by BNR), fully live **14 July 2026** — two weeks ago. It is a single interoperable national switch connecting **22 financial institutions**: commercial banks (Bank of Kigali, Ecobank, I&M…), MTN Mobile Money, Airtel Money, SACCOs, and microfinance institutions.

What it changes:
- **One integration = the whole ecosystem.** Every institution connects once to eKash instead of maintaining bilateral links; the same applies to fintechs via **open APIs at lower cost** (RSwitch COO Jean Jacques Kajuga, Kigali Times). Bank of Kigali separately launched an **Open API (Mar 2026)** enabling "payments, credit access, and secure data exchange" for fintechs.
- **Cheap, instant, interoperable money movement:** flat **RWF20/transfer** (down from up to RWF5,000), up to **RWF10m/transaction**, four transfer types (account↔account, account↔wallet, wallet↔account, wallet↔wallet). No new consumer app — customers keep using existing banking/mobile-money/USSD channels.
- **Government-backed public good:** built with RISA, RSwitch, AFR, AfricaNenda, Bill & Melinda Gates Foundation, and the Mojaloop community (World Bank FASTT profile).

**The key finding: eKash is a payments rail, NOT a credit system.** It moves money; it does not score borrowers, build credit histories, or make loan decisions. The "loan part" the user asked about is untouched — and that is precisely the wedge. eKash gives EmbeddedLend the disbursement/repayment plumbing (one integration, cheap instant transfers), but the underwriting/origination brain on top of it does not exist yet.

**The data bridge is validated externally.** A Uganda fintech pitch (TMS Ruge, Instagram, Jul 2026) states the exact thesis: *"The most complete financial record most Ugandan small business owners have is their mobile money statement… We built the credit history. We built it on a network that processes more transactions than any bank branch system in the country. The bridge between that data and a loan is a product decision waiting to be made."* Rwanda's equivalent "network" is eKash — making the data-layer feasibility real, not hypothetical. What's still missing everywhere is the credit decisioning layer on top: our API.

**Data trust is proven favorable — with limits.** A Center for Financial Inclusion study of Rwandan mobile-money users found people deem **financial history and mobile-money transactions fair** inputs for credit decisions, but strongly distrust "creepy" alternative data (phone model, texts, social media, geolocation), and two-thirds would demand correction of wrong data. Implication for product design: score on **cash-flow / MoMo behavior** (accepted), keep decisions **explainable + correctable**, and build consent-first data pulls (aligns with Rwanda's GDPR-style Law 058/2021).

**Implication for the moat:** because eKash standardizes the pipes (open APIs, one integration), the durable moat is no longer "we own the connections" — it is **the aggregated credit-history dataset + lender relationships + the scoring layer** built on top of the open rail. Data access is the castle; eKash made the road to it public, so we must be the ones who build the history.

## 3. Target users

Primary (who pays):
- **Licensed digital lenders / NDFSPs in Rwanda** — BNR lists 80+ licensed lending NDFSPs (Zamuka, IWACU, EXUUS, Flow Rwanda, Manzi, Novacore…). Most are small, tech-poor, and need plug-and-play origination + scoring.
- **MFIs & SACCOs** — the sector extends credit heavily to women and micro-enterprises but runs on field-officer apps and paper.
- **Vertical SaaS platforms** (e-commerce, logistics, agritech, retail POS) that want embedded working capital for their merchants — e.g. the Kayko micro-ERP corridor.

Secondary (channel partners):
- Regional banks (Bank of Kigali, Ecobank Rwanda, I&M) that prefer white-label APIs over building in-house.
- Digital lenders expanding into Rwanda (Numida entered March 2026, collateral-free SME loans).

Pain points: no verifiable borrower records; manual underwriting; days-long approvals; high default fear blocking thin-file lending; legacy core banking (Temenos T24, Mambu, Musoni) with no clean API layer.

## 4. Technical decisions (if any)

Directional only — deep architecture is the Tech Design step. Given your **Node/TypeScript** stack:
- **Architecture:** API-first microservice integration layer. The lender's core banking system stays the system of record; our services sit beside it (origination flow, scoring engine, decisioning, servicing webhooks) — the PEMiG pattern (single `POST /v1/score` returning a score + explanation + risk signals).
- **Integrations:** money movement via the national **eKash** switch (one integration → banks + MTN MoMo + Airtel Money + SACCOs, RWF20 flat, RWF10m cap), mobile money (MTN MoMo / Airtel via RwandaPay or direct), bank/mobile statements, credit bureaus (TransUnion, Metropol, Creditinfo Kenya), KYC/KYB + AML vendors (Xcobean, Zeeh, Oystr TH), digital ID.
- **Model:** a hybrid rules engine + ML scoring over alternative data (transaction telemetry, cash-flow signals) rather than pure bureau scoring — thin-file friendly.
- **Compliance as code:** consent-first data pulls, audit logging, tamper-proof decision traces, data residency in the jurisdiction (Rwanda's Law 058/2021 + NCSA expectations).
- **Integrations timeline benchmark:** PEMiG reports 6–10 weeks contract→pilot for API-capable lenders.

## 5. Competitor insights

The landscape splits into four groups — all are potential co-opetition, and there is no dominant Rwanda-native API-underwriting player yet:

| Player | Model | Region | Gap/lesson |
|---|---|---|---|
| **PEMiG** (Philex Labs) | Causal-AI scoring API, B2B SaaS + per-assessment fees | Kenya → expanding EA/Rwanda | Closest analogue; proves lender appetite + pricing (subscription + volume fees). Weakness: scoring-only, no origination/servicing. |
| **CreditChek** | Credit intelligence/income verification APIs, pay-as-you-go | Nigeria → KE/UG/RW (raised $600K, June 2026) | Validates the data-infra wedge and the Rwanda entry thesis. |
| **Kayko** | Micro-ERP capturing merchant data → bankable signals, $1.2M seed | Rwanda (8,500 merchants) | Local data-layer competitor; validates the informal-merchant corridor. |
| **Pezesha / Patascore** | AI scoring API + marketplace, CBK-licensed DCP | Kenya (500K+ MSMEs, $2M+/mo) | Proves alternative-data scoring at scale (<3% claimed default). |
| **KwaWingu** | Full loan-management infra for MFIs/SACCOs, ISO 27001 | Tanzania/Kenya/Uganda/Rwanda (847+ FIs) | Strong full-stack rival; compliance-first. |
| **CreditOS** | All-in-one loan management, API-first | Uganda/KE/NG (50+ lenders) | Full lifecycle competitor, multi-country. |
| **Credit Forest** | API-first LOS + LMS, "compliance as code" | Ghana first | The template for a regulator-constraint-first build. |
| **Lendsqr** | Loan management SaaS + Adjutor APIs | Nigeria/Kenya, 190+ countries | Pricing benchmark; cheaper than Mambu/Turnkey/Thought Machine. |
| **Kukopa** | Embedded lending with own capital + revenue share | Kenya | Distribution + capital play; benchmark for partner economics. |
| **Migo** | Embedded lending, custom ML, own underwriting | Nigeria/global | "Launch in 30 days" claim; capital-heavy model. |
| **Oystr** | Micro-credit APIs (Float/Credit/TH) | Pan-Africa | Bundled origination+KYC+scoring APIs. |
| **Xcobean, Kamoa, Zeeh** | KYC/CRB/score/statement-parsing APIs | Kenya/pan-Africa | Best-of-breed point APIs we'd integrate with or beat on bundling. |

**What users love/hate:** lenders love speed (approvals in minutes), thin-file coverage, and regulatory-ready audit trails. They hate long integration timelines, opaque black-box scores, and platform lock-in. Our differentiation angle: **Rwanda/EAC-first compliance-as-code, transparent decision traces, and a fast, developer-friendly Node/TS integration** — bundled underwriting + origination rather than scoring-only.

**The gap:** no one is the "Rwanda-native, API-first underwriting + origination layer" for the 80+ licensed local lenders and SaaS platforms — but PEMiG, CreditChek, and CreditOS are all moving east, so speed to a Rwanda beachhead matters.

## 6. Budget/timeline

- **Build-from-scratch baseline (Nigeria benchmark, Lendsqr):** ~$9,500–$31,700 and 6–18 months to build lending tech in-house; enterprise platforms (Mambu, Turnkey, Thought Machine) "eat a seed round."
- **As a side project with an existing dev:** MVP cost is realistically **development time + ~$200–800/mo** in infra/data (Postgres + Node/TS host, bureau + KYC API usage fees, mobile-money gateway fees). Leverage free tiers where possible.
- **Pricing model to target:** B2B SaaS subscription + per-assessment/per-loan fees (PEMiG pattern), or revenue-share on loan fee (Kukopa sample: partner earns ~KES 13,500/client/year at 15% of a 10% fee on 3 loans/yr of KES 300k).
- **Timeline:** MVP (origination + scoring + one bureau + one disbursement rail) ~3–4 months part-time; pilot with 1–2 lenders is the real milestone.

## 7. Handoff Context

<!-- Machine-readable summary for the next workflow step. Do not delete; the next prompt in the workflow reads this block. -->
- Stage: research
- App name: EmbeddedLend (working title — rename at PRD)
- User level: B (Developer)
- Target platform: web / API-first
- Budget: side-project scale (~$200–800/mo running)
- Timeline: open; MVP ~3–4 months part-time
- Stack: Node/TypeScript
- Target market: Rwanda → EAC
- Source files: research-embeddedlend.md, research-qianhe.md (autopsy), opportunities.md
---

### Claims ledger (evidence grading)

| Claim | Source | Grade |
|---|---|---|
| Rwanda formal MSME financing shortfall ≈ $1.2B/yr | Kayko funding coverage (TechBuild/AFR), allAfrica | 🟡 Secondary |
| Africa MSME financing gap ≈ $331B | TechCabal / African Exponent, CreditChek coverage | 🟡 Secondary |
| Rwanda financial inclusion 96% (2024), banked adults only 22% | BNR National Financial Inclusion Roadmap 2026-2030 | ✅ Observed |
| 60% of Rwandan MSMEs borrowed nothing in past 12 months | AFR Rwanda MSME FinMap 2024 | ✅ Observed |
| Collateral demands up to 5x loan amount block SME credit | RSSB/Enko $100M SME Fund announcement (FSD Africa) | ✅ Observed |
| 80+ licensed lending NDFSPs in Rwanda; several licenses revoked Oct 2025 | BNR Licensed NDFSPs list (Nov 2025) + revoked list | ✅ Observed |
| BNR regulatory sandbox open to local + foreign fintechs, ~3-month licensing | BNR sandbox page; Finhive Africa Fintech Regulation Guide (June 2026) | ✅ Observed |
| Rwandan fintechs: Kayko ($1.2M seed, 8,500 merchants), Numida entered Mar 2026 | TechBuild, New Times | ✅ Observed |
| PEMiG = causal-AI scoring API, 5 partner lenders, $250K loans, B2B SaaS + per-assessment | Disrupt Africa (May 2026), PEMiG Medium engineering posts | ✅ Observed |
| Lendsqr pricing: from ~$127/mo (Pro) to ~$3,810/yr (Business) + $1,900 setup | Lendsqr blog cost breakdowns | ✅ Observed |
| Building lending tech from scratch in Africa ≈ $9,500–31,700, 6–18 months | Lendsqr blog | 🟡 Secondary |
| "Lenders would pay for underwriting/origination APIs in Rwanda" | No interviews conducted yet | ❓ Assumption |
| eKash = national instant payment system (RNDPS), fully live 14 Jul 2026, connects 22 institutions (banks, MTN MoMo, Airtel Money, SACCOs, MFIs) | New Times (14 Jul 2026), African Business (27 Jul 2026), RISA launch note, World Bank FASTT profile | ✅ Observed |
| eKash: flat RWF20/transfer (down from up to RWF5,000), up to RWF10m/transaction, four transfer types, no new consumer app | New Times (14 Jul 2026), African Business (27 Jul 2026) | ✅ Observed |
| eKash is a payments rail only — no credit scoring, credit history, or loan decisioning on it | New Times / African Business launch coverage (no credit functionality mentioned) | ✅ Observed |
| eKash open APIs let fintechs connect to the national infrastructure at lower cost | RSwitch COO Jean Jacques Kajuga, Kigali Times (12 Mar 2026) | ✅ Observed |
| Bank of Kigali Open API (Mar 2026) enables payments, credit access, secure data exchange for fintechs | KT Press (11 Mar 2026) | ✅ Observed |
| Rwandan MoMo users deem financial history + mobile-money transactions fair for credit decisions; distrust phone/social/geolocation data; 2/3 want data correction | Center for Financial Inclusion study (2021) | ✅ Observed |
| Uganda: TMS Ruge "built the credit history" on the mobile-money network; "bridge between that data and a loan is a product decision" | Instagram @tmsruge post DacPnQwOc1l (Jul 2026) | 🟡 Secondary |
