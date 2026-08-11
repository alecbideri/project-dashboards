# The Missing Middle: Why Rwanda's Creditworthy Small Businesses Can't Borrow

*Stage: research → problem statement. Companion docs: research-embeddedlend.md (deep research), research-qianhe.md (autopsy). Next stage: PRD (architecture).*

## The Problem Statement

Rwanda's small businesses sit in a credit dead zone. Too informal for collateral-based bank lending and too business-like for consumer micro-loans, they are the most underserved segment of the country's credit market. The irony is that the data to lend to them safely already exists — their mobile-money cash-flow is the most complete financial record most of them own — but no one has built the layer that reads it and turns it into a defensible loan decision. The money is there. The rails are being built. The bridge between them is empty.

This is not a problem of scarce money, or of lazy lenders, or of untrustworthy borrowers. Every participant is behaving rationally. The problem is the technical layer that sits between them — an unbuilt underwriting framework that could treat mobile-money cash-flow as proof of creditworthiness the way a bank statement is treated today.

## Section 1 — The Credit Dead Zone

Rwanda's MSMEs — 87% of the business landscape is informal (NISR, 2024) — fall between two existing credit products:

- **Bank lending** requires collateral (demanded up to **5x the loan amount**) and formal income records. Informal traders, smallholder farmers, and micro-entrepreneurs cannot produce either. Result: insufficient collateral is the #1 barrier to finance — **11.4% of formal businesses, 19.6% of informal businesses** (NISR, 2024).
- **Consumer micro-loans** (MoKash, MoFlex, K'avance) are short-tenor personal credit — **7 to 30 days, 7–9% facility fees, rollover penalties** — sized for consumption emergencies, not for buying inventory, equipment, or a growing business.

The market consequence is stark: **60% of Rwandan MSMEs borrowed nothing in the 12 months before the AFR FinMap 2024 survey** — despite an estimated **~$1.2B/yr financing shortfall** for formal MSMEs. Businesses that could grow don't. Jobs that could exist don't. The middle of Rwanda's credit market is simply not served.

## Section 2 — The Overlooked Asset

The record that could change this already exists: **the mobile-money statement.**

- Rwanda has **96% financial inclusion, 86% mobile-money penetration, and 73% of payments conducted digitally** (BNR Open Finance Position Paper). For most small business owners, their mobile-money history *is* their financial history — income, expenses, suppliers, customers, savings.
- A Center for Financial Inclusion study of Rwandan mobile-money users found borrowers **accept cash-flow and transaction data as fair inputs** for credit decisions, while rejecting invasive signals (phone model, texts, geolocation) and demanding explainability and correction rights.
- This data is currently **ignored by the formal credit system** — the same pattern a Ugandan fintech pitch described: *"the most complete financial record most small business owners have is their mobile money statement. It is not accepted as proof of income for a bank loan."*

The asset is real, consented-usable, and sitting unused.

## Section 3 — The Missing Bridge

Between the data (mobile-money cash-flow) and the loan (safe, business-sized credit) there must be an underwriting layer. **None exists today:**

- MoKash, MoFlex, K'avance, and MoFaya all **price around** the underwriting problem — they limit loan size and tenure to contain risk rather than actually underwrite the borrower's business.
- Industry voices confirm the structural gap: the CEO of Jali Finance (April 2026) said **"credit reference systems remain a structural challenge"** — borrowers from non-deposit-taking lenders are assessed in the same risk category as larger institutions despite different profiles.
- The Dec 2025 academic literature ("Assessing the contribution of AI and alternative data in enhancing credit scoring accuracy and inclusivity in Rwanda") validates the *idea* — but as research, not deployment.
- **No player is publicly building the consent-based underwriting layer on top of Rwanda's opening data infrastructure.** The window is open.

## Section 4 — Why Now (The Two Rails Are Arriving)

Two national infrastructure pieces are being laid right now. Neither is the underwriting layer — that is the point:

1. **The money rail — eKash.** Rwanda's national instant payment system went fully live **14 July 2026**: 22 institutions (banks, MTN MoMo, Airtel Money, SACCOs, MFIs), flat **RWF20/transfer**, up to **RWF10m/transaction**, one integration for the whole ecosystem, open APIs for fintechs. eKash moves money — it does **not** score borrowers or build credit history. It is the disbursement and repayment plumbing.

2. **The data rail — BNR Open Finance.** The National Bank of Rwanda's position paper explicitly lists as objective #1: *"enabling consumer data sharing for alternative credit scoring and lending options to MSMEs."* The roadmap is phased:
   - **Phase 1 (2024–2026): voluntary sharing + standards being written — we are here now.**
   - **Phase 2 (2026–2028): mandatory sharing for Tier-1 banks and mobile-money operators**, with reciprocity.
   - **Phase 4 (2029/2030): a central data-sharing API platform — BNR states it is "open to partnering with a private tech firm" to build it.**

Bank of Kigali's Open API (March 2026) and MTN's consent-gated KYC API are the first bricks of this data rail.

**The timing argument is the crux:** the voluntary window is open *today*. Whoever builds the underwriting layer during Phase 1 defines the standard the mandatory regime inherits — and can bid to build the Phase 4 central platform. This is a first-mover window, not a forever window.

## Section 5 — Why It Matters (The Economy Pays)

The cost of the missing middle is not borne by lenders or borrowers alone — it is borne by the economy:

- Productive capacity sits idle: businesses that could grow, hire, and export don't (only **3.6% of formal and 0.06% of informal businesses export**, NISR 2024).
- The informal sector stays informal: without accepted records, businesses cannot graduate to formal credit, perpetuating the 87% informality.
- Inclusion stalls at the margin: 96% of Rwandans are financially *included* — but inclusion without usable credit is inclusion without opportunity.
- Policy intent is explicit: Rwanda's FSDS, the $100M SME Growth Fund, the BNR sandbox, and the Open Finance roadmap all target exactly this segment. The policy is ready; the technical layer is not.

## Section 6 — No One Is to Blame

- **Lenders** rationally refuse to lend without verifiable records — lending blind is how losses happen.
- **Borrowers** rationally hide from a system that rejects them — why share your financial life with someone who'll say no?
- **Banks are not "outdated."** They move the bulk of Rwanda's money and remain essential; mobile money complements, not replaces, them.
- The problem is the **framework and the unbuilt layer**: a credit system still reading one kind of record while the real financial behavior of the majority lives in another, and no technical bridge yet connecting them.

## Section 7 — The Proposed Solution (Brief)

A **consent-based SME underwriting service** that sits on top of the two national rails:

- **Data in:** consented transaction data via Open Finance / bank / MoMo APIs (cash-flow signals, not invasive data).
- **Decision:** a deterministic, explainable scoring engine (FinRobot-style separation: numbers computed by code, narrative by AI) producing a score, risk signals, and a defensible decision trace.
- **Money out:** loan disbursement and repayment over eKash — one integration, cheap, instant, interoperable.
- **Compliance:** consent-first pulls, audit trails, data residency — making the regulator comfortable with more lending, not less.

The full architecture is specified in the PRD (next document).

## Claims Ledger (evidence grading)

| Claim | Source | Grade |
|---|---|---|
| 87% informality of Rwanda's business landscape (2024) | NISR Integrated Business Enterprise Survey 2024 | ✅ Observed |
| Insufficient collateral is #1 finance barrier: 11.4% formal, 19.6% informal | NISR 2024 | ✅ Observed |
| 60% of MSMEs borrowed nothing in past 12 months | AFR MSME FinMap 2024 | ✅ Observed |
| Rwanda MSME financing shortfall ≈ $1.2B/yr | Kayko funding coverage, allAfrica | 🟡 Secondary |
| Collateral demanded up to 5x loan amount | RSSB/Enko $100M SME Fund (FSD Africa) | ✅ Observed |
| 96% financial inclusion; 86% mobile money penetration; 73% digital payments | BNR Open Finance Position Paper | ✅ Observed |
| MoKash/MoFlex: 7–30 day tenors, 7–9% facility fees, rollover fees | MTN Rwanda product pages | ✅ Observed |
| K'avance = overdraft to complete low-balance transactions (Dec 2025) | New Times | ✅ Observed |
| MoFaya (BPR+MTN, Aug 1 2026) digital loans up to RWF2m, "individuals and small businesses" | Taarifa, New Times | ✅ Observed |
| eKash live 14 Jul 2026: 22 institutions, RWF20 flat, RWF10m cap, open APIs | New Times, African Business, RISA | ✅ Observed |
| eKash is a payments rail only — no credit scoring/loan decisioning | Launch coverage (no credit functionality) | ✅ Observed |
| BNR Open Finance objective #1 = data sharing for alternative scoring of MSMEs | BNR Open Finance Position Paper | ✅ Observed |
| Open Finance Phase 1 (2024-26) voluntary; Phase 2 (2026-28) mandatory Tier-1 + MMOs; Phase 4 (2029/30) central API platform w/ private partner | BNR Open Finance Position Paper | ✅ Observed |
| BK Open API (Mar 2026) — payments/credit access/data exchange | KT Press | ✅ Observed |
| Rwandan MoMo users accept cash-flow data, reject phone/social data, want explainability | Center for Financial Inclusion study (2021) | ✅ Observed |
| "Credit reference systems remain a structural challenge" | Jali Finance CEO via allAfrica (Apr 2026) | ✅ Observed |
| BNR revoked 7 NDFSP licenses in 2026 amid sector growth 104→250 | allAfrica (Apr 2026) | ✅ Observed |
| No player publicly building Open Finance → MSME underwriting layer | Research sweep (press, sandbox lists, competitor coverage) | 🟡 Secondary |
