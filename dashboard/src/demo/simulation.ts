// The deterministic underwriting simulation for the EmbeddedLend prototype.
// Numbers are computed by code; the LLM only narrates. All data is dummy.

export type BorrowerId = "trader" | "farmer" | "salon" | "edge"

export type SignalKey =
  | "incomeStability"
  | "concentration"
  | "seasonality"
  | "repaymentCapacity"
  | "savingsBehavior"

export type Decision = "Approve" | "Decline" | "Refer"

export interface CashFlowRow {
  id: string
  date: string
  type: "in" | "out"
  category: string
  amount: number
  note?: string
}

export interface Signal {
  key: SignalKey
  label: string
  value: number // 0..100, higher = better
  weight: number
  reason: string
}

export interface ScoreResult {
  total: number
  signals: Signal[]
}

export interface DecisionResult {
  decision: Decision
  trace: string[]
  limit: string
}

export interface Borrower {
  id: BorrowerId
  name: string
  business: string
  location: string
  avatarHue: string
  monthsActive: number
  requested: number
  cashFlow: CashFlowRow[]
  signals: Signal[]
  decision: DecisionResult
}

const fmt = (n: number) => n.toLocaleString("en-US")

function row(
  id: string,
  date: string,
  type: "in" | "out",
  category: string,
  amount: number,
  note?: string,
): CashFlowRow {
  return { id, date, type, category, amount, note }
}

// ---------------- Traders (healthy, steady) ----------------
const traderCash: CashFlowRow[] = [
  row("t1", "2026-06-03", "in", "Sales", 850000, "wholesale client"),
  row("t2", "2026-06-05", "out", "Stock", -520000, "supplier"),
  row("t3", "2026-06-09", "in", "Sales", 320000),
  row("t4", "2026-06-12", "out", "Rent", -150000),
  row("t5", "2026-06-15", "in", "Sales", 740000),
  row("t6", "2026-06-18", "out", "Stock", -430000),
  row("t7", "2026-06-21", "in", "Sales", 410000),
  row("t8", "2026-06-24", "out", "Transport", -90000),
  row("t9", "2026-06-27", "in", "Sales", 600000),
  row("t10", "2026-06-30", "out", "Savings", -120000),
]

// ---------------- Farmer (seasonal, high concentration) ----------------
const farmerCash: CashFlowRow[] = [
  row("f1", "2026-05-10", "in", "Harvest sale", 1200000, "seasonal peak"),
  row("f2", "2026-05-14", "out", "Seed + inputs", -380000),
  row("f3", "2026-05-20", "out", "Land lease", -200000),
  row("f4", "2026-05-26", "in", "Contract buyer", 500000),
  row("f5", "2026-06-01", "out", "Equipment", -150000),
  row("f6", "2026-06-10", "out", "Labour", -220000),
  row("f7", "2026-06-18", "in", "Small sale", 160000),
  row("f8", "2026-06-25", "out", "Inputs", -140000),
  row("f9", "2026-07-02", "out", "Transport", -60000),
  row("f10", "2026-07-08", "in", "Contract buyer", 420000),
]

// ---------------- Salon owner (steady but thin margins) ----------------
const salonCash: CashFlowRow[] = [
  row("s1", "2026-06-02", "in", "Clients", 260000),
  row("s2", "2026-06-04", "out", "Supplies", -80000),
  row("s3", "2026-06-08", "in", "Clients", 240000),
  row("s4", "2026-06-11", "out", "Rent", -100000),
  row("s5", "2026-06-15", "in", "Clients", 280000),
  row("s6", "2026-06-18", "out", "Utilities", -40000),
  row("s7", "2026-06-22", "in", "Clients", 220000),
  row("s8", "2026-06-25", "out", "Supplies", -70000),
  row("s9", "2026-06-28", "in", "Clients", 250000),
  row("s10", "2026-06-30", "out", "Equipment", -60000),
]

// ---------------- Edge case (irregular, high concentration, thin) ----------------
const edgeCash: CashFlowRow[] = [
  row("e1", "2026-05-02", "in", "Cash sale", 900000),
  row("e2", "2026-05-06", "out", "Stock", -650000),
  row("e3", "2026-05-15", "out", "Personal", -300000),
  row("e4", "2026-05-20", "in", "Cash sale", 200000),
  row("e5", "2026-05-28", "out", "Stock", -280000),
  row("e6", "2026-06-04", "in", "Cash sale", 450000),
  row("e7", "2026-06-10", "out", "Personal", -180000),
  row("e8", "2026-06-16", "out", "Rent", -140000),
  row("e9", "2026-06-22", "in", "Cash sale", 150000),
  row("e10", "2026-06-28", "out", "Stock", -120000),
]

const traders: Signal[] = [
  { key: "incomeStability", label: "Income stability", value: 84, weight: 0.3, reason: "Regular weekly sales; net inflow is steady across 4 weeks." },
  { key: "concentration", label: "Concentration", value: 72, weight: 0.2, reason: "3 of 4 inflows from repeat wholesale clients — moderate dependency." },
  { key: "seasonality", label: "Seasonality", value: 78, weight: 0.15, reason: "Low variance between weekly periods; no dead months visible." },
  { key: "repaymentCapacity", label: "Repayment capacity", value: 86, weight: 0.25, reason: "Net cash surplus after stock + fixed costs ≈ 34% of revenue." },
  { key: "savingsBehavior", label: "Savings behavior", value: 66, weight: 0.1, reason: "Regular voluntary transfers to savings each month." },
]

const farmers: Signal[] = [
  { key: "incomeStability", label: "Income stability", value: 58, weight: 0.3, reason: "Strong but lumpy inflows concentrated at harvest." },
  { key: "concentration", label: "Concentration", value: 41, weight: 0.2, reason: "Over 70% of income from a single contract buyer." },
  { key: "seasonality", label: "Seasonality", value: 38, weight: 0.15, reason: "Three months with near-zero inflows between harvests." },
  { key: "repaymentCapacity", label: "Repayment capacity", value: 74, weight: 0.25, reason: "Surplus exists at season peak but is uneven across the cycle." },
  { key: "savingsBehavior", label: "Savings behavior", value: 60, weight: 0.1, reason: "Some saving at harvest, withdrawals between seasons." },
]

const salons: Signal[] = [
  { key: "incomeStability", label: "Income stability", value: 76, weight: 0.3, reason: "Daily client revenue, steady across the month." },
  { key: "concentration", label: "Concentration", value: 68, weight: 0.2, reason: "Cash revenue from walk-ins; no single large client." },
  { key: "seasonality", label: "Seasonality", value: 72, weight: 0.15, reason: "Mild weekday/weekend variance only." },
  { key: "repaymentCapacity", label: "Repayment capacity", value: 63, weight: 0.25, reason: "Thin margins; surplus is ~20% of revenue after costs." },
  { key: "savingsBehavior", label: "Savings behavior", value: 55, weight: 0.1, reason: "Occasional small savings; no consistent habit." },
]

const edges: Signal[] = [
  { key: "incomeStability", label: "Income stability", value: 34, weight: 0.3, reason: "Erratic inflows; two personal withdrawals from business funds." },
  { key: "concentration", label: "Concentration", value: 28, weight: 0.2, reason: "Two cash-sale spikes dominate; no verifiable repeat buyers." },
  { key: "seasonality", label: "Seasonality", value: 44, weight: 0.15, reason: "Highly irregular pattern — no consistent business cycle." },
  { key: "repaymentCapacity", label: "Repayment capacity", value: 31, weight: 0.25, reason: "Outflows regularly exceed inflows; surplus negative in 2 of 4 weeks." },
  { key: "savingsBehavior", label: "Savings behavior", value: 25, weight: 0.1, reason: "No savings activity; funds moved to personal account." },
]

export const borrowers: Borrower[] = [
  {
    id: "trader",
    name: "Jean Bosco",
    business: "Wholesale trader · Kimironko Market",
    location: "Kigali",
    avatarHue: "#3f8f5b",
    monthsActive: 26,
    requested: 2_000_000,
    cashFlow: traderCash,
    signals: traders,
    decision: {
      decision: "Approve",
      trace: [
        "Consent verified for 6 months of mobile-money history (Law 058/2021).",
        "Cash-flow pull: 4 weeks of MoMo ledger + 1 supplier reference.",
        "Score 78/100 — above the 60 approve threshold.",
        "Repayment capacity 86 → term of 9 months at 2.4% flat monthly.",
        "Concentration 72 → hard cap of 30% of monthly surplus on repayments.",
        "Loan of RWF 2,000,000 approved with 9-month term.",
      ],
      limit: "RWF 2,000,000 · 9 months · 2.4%/mo",
    },
  },
  {
    id: "farmer",
    name: "Aline Uwase",
    business: "Maize farmer · Gatsibo District",
    location: "Eastern Province",
    avatarHue: "#5b7fd4",
    monthsActive: 19,
    requested: 1_500_000,
    cashFlow: farmerCash,
    signals: farmers,
    decision: {
      decision: "Refer",
      trace: [
        "Consent verified for 6 months of mobile-money history.",
        "Cash-flow pull: harvest-cycle ledger (2 seasons observed).",
        "Score 54/100 — below the 60 approve threshold but above 40 decline.",
        "Concentration 41 → single buyer dependency triggers a Refer.",
        "Seasonality 38 → repayment plan tied to next harvest window.",
        "Recommended: refer to a credit officer with the season-adjusted plan.",
      ],
      limit: "Refer for manual review · season-adjusted term offered",
    },
  },
  {
    id: "salon",
    name: "Grace Mukamana",
    business: "Salon · Nyamirambo",
    location: "Kigali",
    avatarHue: "#f4b64e",
    monthsActive: 31,
    requested: 700_000,
    cashFlow: salonCash,
    signals: salons,
    decision: {
      decision: "Approve",
      trace: [
        "Consent verified for 6 months of mobile-money history.",
        "Cash-flow pull: 4 weeks of daily client revenue.",
        "Score 68/100 — above the 60 approve threshold.",
        "Repayment capacity 63 → modest term of 6 months at 2.4% flat monthly.",
        "Loan of RWF 700,000 approved with 6-month term.",
      ],
      limit: "RWF 700,000 · 6 months · 2.4%/mo",
    },
  },
  {
    id: "edge",
    name: "Samuel Niyonzima",
    business: "General retailer · Nyabugogo",
    location: "Kigali",
    avatarHue: "#d35b5b",
    monthsActive: 8,
    requested: 1_000_000,
    cashFlow: edgeCash,
    signals: edges,
    decision: {
      decision: "Decline",
      trace: [
        "Consent verified for 6 months of mobile-money history.",
        "Cash-flow pull: 4 weeks of ledger; 2 personal withdrawals flagged.",
        "Score 32/100 — below the 40 decline threshold.",
        "Repayment capacity 31 → surplus negative in half of observed weeks.",
        "Concentration 28 → no verifiable repeat revenue.",
        "Loan declined; borrower notified with a data-correction path.",
      ],
      limit: "Declined · data correction available via Open Finance consent",
    },
  },
]

function weightedScore(signals: Signal[]): number {
  const total = signals.reduce((s, x) => s + x.value * x.weight, 0)
  return Math.round(total)
}

export function computeScore(b: Borrower): ScoreResult {
  return { total: weightedScore(b.signals), signals: b.signals }
}

export function summarizeCashFlow(rows: CashFlowRow[]) {
  const inSum = rows.filter((r) => r.type === "in").reduce((s, r) => s + r.amount, 0)
  const outSum = rows.filter((r) => r.type === "out").reduce((s, r) => s + Math.abs(r.amount), 0)
  const net = inSum - outSum
  return {
    inflow: inSum,
    outflow: outSum,
    net,
    inflowFmt: `RWF ${fmt(inSum)}`,
    outflowFmt: `RWF ${fmt(outSum)}`,
    netFmt: `RWF ${fmt(net)}`,
    count: rows.length,
  }
}

export { fmt }
