// EmbeddedLend demo data. Deterministic sample profiles; the LLM narrates,
// it never decides. All figures are labeled sample data.

export type Decision = "Approve" | "Decline" | "Refer"

export interface CashFlowRow {
  id: string
  date: string
  type: "in" | "out"
  category: string
  amount: number
}

export interface Signal {
  label: string
  value: number // 0..100, higher is better
  weight: number
  reason: string
}

export interface Borrower {
  id: string
  name: string
  business: string
  location: string
  requested: number
  cashFlow: CashFlowRow[]
  signals: Signal[]
  decision: Decision
  limit: string
  trace: string[]
}

const row = (id: string, date: string, type: "in" | "out", category: string, amount: number): CashFlowRow => ({ id, date, type, category, amount })

export const traders: Borrower = {
  id: "trader",
  name: "Jean Bosco",
  business: "Wholesale trader, Kimironko Market",
  location: "Kigali",
  requested: 2_000_000,
  cashFlow: [
    row("t1", "2026-06-03", "in", "Sales", 850000),
    row("t2", "2026-06-05", "out", "Stock", -520000),
    row("t3", "2026-06-09", "in", "Sales", 320000),
    row("t4", "2026-06-12", "out", "Rent", -150000),
    row("t5", "2026-06-15", "in", "Sales", 740000),
    row("t6", "2026-06-18", "out", "Stock", -430000),
    row("t7", "2026-06-21", "in", "Sales", 410000),
    row("t8", "2026-06-24", "out", "Transport", -90000),
    row("t9", "2026-06-27", "in", "Sales", 600000),
    row("t10", "2026-06-30", "out", "Savings", -120000),
  ],
  signals: [
    { label: "Income stability", value: 84, weight: 0.3, reason: "Regular weekly sales, steady net inflow across four weeks." },
    { label: "Concentration", value: 72, weight: 0.2, reason: "Three of four inflows from repeat wholesale clients." },
    { label: "Seasonality", value: 78, weight: 0.15, reason: "Low variance between weekly periods, no dead months." },
    { label: "Repayment capacity", value: 86, weight: 0.25, reason: "Net surplus after stock and fixed costs is about 34% of revenue." },
    { label: "Savings behavior", value: 66, weight: 0.1, reason: "Voluntary monthly transfers to savings." },
  ],
  decision: "Approve",
  limit: "RWF 2,000,000 · 9 months · 2.4%/mo",
  trace: [
    "Consent verified for 6 months of mobile-money history.",
    "Cash-flow pull: 4 weeks of ledger plus one supplier reference.",
    "Score 78/100, above the 60 approve threshold.",
    "Repayment capacity 86 supports a 9-month term.",
    "Concentration 72 sets a hard cap of 30% of monthly surplus on repayments.",
  ],
}

export const farmers: Borrower = {
  id: "farmer",
  name: "Aline Uwase",
  business: "Maize farmer, Gatsibo District",
  location: "Eastern Province",
  requested: 1_500_000,
  cashFlow: [
    row("f1", "2026-05-10", "in", "Harvest sale", 1200000),
    row("f2", "2026-05-14", "out", "Seed and inputs", -380000),
    row("f3", "2026-05-20", "out", "Land lease", -200000),
    row("f4", "2026-05-26", "in", "Contract buyer", 500000),
    row("f5", "2026-06-01", "out", "Equipment", -150000),
    row("f6", "2026-06-10", "out", "Labour", -220000),
    row("f7", "2026-06-18", "in", "Small sale", 160000),
    row("f8", "2026-06-25", "out", "Inputs", -140000),
    row("f9", "2026-07-02", "out", "Transport", -60000),
    row("f10", "2026-07-08", "in", "Contract buyer", 420000),
  ],
  signals: [
    { label: "Income stability", value: 58, weight: 0.3, reason: "Strong but lumpy inflows concentrated at harvest." },
    { label: "Concentration", value: 41, weight: 0.2, reason: "Over 70% of income from a single contract buyer." },
    { label: "Seasonality", value: 38, weight: 0.15, reason: "Near-zero inflows for months between harvests." },
    { label: "Repayment capacity", value: 74, weight: 0.25, reason: "Surplus exists at the season peak but is uneven." },
    { label: "Savings behavior", value: 60, weight: 0.1, reason: "Some saving at harvest, withdrawals between seasons." },
  ],
  decision: "Refer",
  limit: "Refer for review · season-adjusted term",
  trace: [
    "Consent verified for 6 months of mobile-money history.",
    "Cash-flow pull: harvest-cycle ledger, two seasons observed.",
    "Score 54/100, between the approve and decline thresholds.",
    "Concentration 41 with a single buyer triggers manual review.",
    "Seasonality 38 ties any term to the next harvest window.",
  ],
}

export const salons: Borrower = {
  id: "salon",
  name: "Grace Mukamana",
  business: "Salon, Nyamirambo",
  location: "Kigali",
  requested: 700_000,
  cashFlow: [
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
  ],
  signals: [
    { label: "Income stability", value: 76, weight: 0.3, reason: "Daily client revenue, steady across the month." },
    { label: "Concentration", value: 68, weight: 0.2, reason: "Cash revenue from walk-ins, no single large client." },
    { label: "Seasonality", value: 72, weight: 0.15, reason: "Mild weekday and weekend variance only." },
    { label: "Repayment capacity", value: 63, weight: 0.25, reason: "Thin margins, surplus is about 20% of revenue." },
    { label: "Savings behavior", value: 55, weight: 0.1, reason: "Occasional small savings, no consistent habit." },
  ],
  decision: "Approve",
  limit: "RWF 700,000 · 6 months · 2.4%/mo",
  trace: [
    "Consent verified for 6 months of mobile-money history.",
    "Cash-flow pull: four weeks of daily client revenue.",
    "Score 68/100, above the 60 approve threshold.",
    "Repayment capacity 63 supports a 6-month term.",
  ],
}

export const edges: Borrower = {
  id: "edge",
  name: "Samuel Niyonzima",
  business: "General retailer, Nyabugogo",
  location: "Kigali",
  requested: 1_000_000,
  cashFlow: [
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
  ],
  signals: [
    { label: "Income stability", value: 34, weight: 0.3, reason: "Erratic inflows, two personal withdrawals from business funds." },
    { label: "Concentration", value: 28, weight: 0.2, reason: "Two cash-sale spikes dominate, no verifiable repeat buyers." },
    { label: "Seasonality", value: 44, weight: 0.15, reason: "Highly irregular pattern, no consistent business cycle." },
    { label: "Repayment capacity", value: 31, weight: 0.25, reason: "Outflows regularly exceed inflows in half of observed weeks." },
    { label: "Savings behavior", value: 25, weight: 0.1, reason: "No savings activity, funds moved to a personal account." },
  ],
  decision: "Decline",
  limit: "Declined · data correction available",
  trace: [
    "Consent verified for 6 months of mobile-money history.",
    "Cash-flow pull: four weeks of ledger, two personal withdrawals flagged.",
    "Score 32/100, below the 40 decline threshold.",
    "Repayment capacity 31, surplus negative in half of observed weeks.",
    "Declined; borrower notified with a data-correction path.",
  ],
}

export const borrowers: Borrower[] = [traders, farmers, salons, edges]

export function scoreOf(b: Borrower): number {
  return Math.round(b.signals.reduce((s, x) => s + x.value * x.weight, 0))
}

export function summarize(rows: CashFlowRow[]) {
  const inflow = rows.filter((r) => r.type === "in").reduce((s, r) => s + r.amount, 0)
  const outflow = rows.filter((r) => r.type === "out").reduce((s, r) => s + Math.abs(r.amount), 0)
  return { inflow, outflow, net: inflow - outflow }
}
