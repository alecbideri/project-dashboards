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

export interface SuggestedTerms {
  amount: number
  termMonths: number
  rateMonthly: number // percent, per month
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
  suggested: SuggestedTerms
  trace: string[]
}

const row = (id: string, date: string, type: "in" | "out", category: string, amount: number): CashFlowRow => ({ id, date, type, category, amount })

const terms = (amount: number, termMonths: number, rateMonthly: number): SuggestedTerms => ({ amount, termMonths, rateMonthly })

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
  suggested: terms(2_000_000, 9, 2.4),
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
  suggested: terms(1_000_000, 6, 2.4),
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
  suggested: terms(700_000, 6, 2.4),
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
  suggested: terms(0, 0, 0),
  trace: [
    "Consent verified for 6 months of mobile-money history.",
    "Cash-flow pull: four weeks of ledger, two personal withdrawals flagged.",
    "Score 32/100, below the 40 decline threshold.",
    "Repayment capacity 31, surplus negative in half of observed weeks.",
    "Declined; borrower notified with a data-correction path.",
  ],
}

export const bakers: Borrower = {
  id: "baker",
  name: "Evelyne Nkurunziza",
  business: "Bakery, Nyarugenge",
  location: "Kigali",
  requested: 1_200_000,
  cashFlow: [
    row("b1", "2026-06-02", "in", "Daily sales", 120000),
    row("b2", "2026-06-03", "in", "Daily sales", 135000),
    row("b3", "2026-06-04", "out", "Flour", -90000),
    row("b4", "2026-06-06", "in", "Bulk order", 260000),
    row("b5", "2026-06-09", "in", "Daily sales", 118000),
    row("b6", "2026-06-12", "out", "Fuel", -45000),
    row("b7", "2026-06-15", "in", "Daily sales", 130000),
    row("b8", "2026-06-18", "out", "Rent", -120000),
    row("b9", "2026-06-24", "in", "Bulk order", 240000),
    row("b10", "2026-06-28", "out", "Flour", -95000),
  ],
  signals: [
    { label: "Income stability", value: 82, weight: 0.3, reason: "Daily sales plus a standing bulk contract, no dead weeks." },
    { label: "Concentration", value: 74, weight: 0.2, reason: "Two standing bulk buyers anchor the revenue." },
    { label: "Seasonality", value: 80, weight: 0.15, reason: "Bread demand is flat across the year." },
    { label: "Repayment capacity", value: 79, weight: 0.25, reason: "Surplus is about 30% of revenue after inputs and rent." },
    { label: "Savings behavior", value: 61, weight: 0.1, reason: "Steady small savings at each week close." },
  ],
  decision: "Approve",
  suggested: terms(1_200_000, 8, 2.4),
  trace: [
    "Consent verified for 6 months of mobile-money history.",
    "Cash-flow pull: four weeks of daily ledger, one bulk contract verified.",
    "Score 80/100, above the 60 approve threshold.",
    "Standing bulk contract supports an 8-month term.",
  ],
}

export const transporters: Borrower = {
  id: "transporter",
  name: "Fidele Mugisha",
  business: "Motorcycle transport, Remera",
  location: "Kigali",
  requested: 3_000_000,
  cashFlow: [
    row("tr1", "2026-06-02", "in", "Rides", 90000),
    row("tr2", "2026-06-04", "in", "Rides", 85000),
    row("tr3", "2026-06-05", "out", "Fuel", -25000),
    row("tr4", "2026-06-08", "in", "Rides", 95000),
    row("tr5", "2026-06-11", "in", "Rides", 88000),
    row("tr6", "2026-06-12", "out", "Maintenance", -40000),
    row("tr7", "2026-06-15", "in", "Rides", 92000),
    row("tr8", "2026-06-18", "in", "Rides", 98000),
    row("tr9", "2026-06-22", "out", "Fuel", -30000),
    row("tr10", "2026-06-25", "in", "Rides", 90000),
  ],
  signals: [
    { label: "Income stability", value: 85, weight: 0.3, reason: "Daily ride revenue every single day of the month." },
    { label: "Concentration", value: 88, weight: 0.2, reason: "Revenue is spread across hundreds of small riders." },
    { label: "Seasonality", value: 82, weight: 0.15, reason: "Minimal weekly variance, no seasonal trough." },
    { label: "Repayment capacity", value: 71, weight: 0.25, reason: "High gross revenue but thin per-ride margins after fuel." },
    { label: "Savings behavior", value: 58, weight: 0.1, reason: "Occasional savings, usually matched to a bike goal." },
  ],
  decision: "Approve",
  suggested: terms(3_000_000, 12, 2.4),
  trace: [
    "Consent verified for 6 months of mobile-money history.",
    "Cash-flow pull: four weeks of daily ride revenue.",
    "Score 83/100, above the 60 approve threshold.",
    "Long stable history supports a 12-month term.",
  ],
}

export const shops: Borrower = {
  id: "shop",
  name: "Chantal Ingabire",
  business: "General shop, Musanze",
  location: "Northern Province",
  requested: 800_000,
  cashFlow: [
    row("sh1", "2026-05-12", "in", "Retail", 220000),
    row("sh2", "2026-05-15", "out", "Stock", -140000),
    row("sh3", "2026-05-20", "in", "Retail", 180000),
    row("sh4", "2026-05-26", "out", "Rent", -90000),
    row("sh5", "2026-06-01", "in", "Retail", 240000),
    row("sh6", "2026-06-06", "out", "Stock", -150000),
    row("sh7", "2026-06-12", "in", "Retail", 160000),
    row("sh8", "2026-06-18", "out", "Transport", -40000),
    row("sh9", "2026-06-22", "in", "Tourist peak", 320000),
    row("sh10", "2026-06-28", "out", "Stock", -170000),
  ],
  signals: [
    { label: "Income stability", value: 61, weight: 0.3, reason: "Steady retail but a clear tourist-season spike in the mix." },
    { label: "Concentration", value: 55, weight: 0.2, reason: "Walk-in retail, no single anchor buyer." },
    { label: "Seasonality", value: 48, weight: 0.15, reason: "Revenue dips sharply outside the tourist season." },
    { label: "Repayment capacity", value: 64, weight: 0.25, reason: "Surplus is around 22% of revenue." },
    { label: "Savings behavior", value: 52, weight: 0.1, reason: "Small irregular savings." },
  ],
  decision: "Refer",
  suggested: terms(600_000, 5, 2.4),
  trace: [
    "Consent verified for 6 months of mobile-money history.",
    "Cash-flow pull: two months of retail ledger, tourist peak observed.",
    "Score 57/100, between the approve and decline thresholds.",
    "Seasonality 48 flags a short term tied to the peak window.",
  ],
}

export const tailors: Borrower = {
  id: "tailor",
  name: "Patrick Habimana",
  business: "Tailor, Huye",
  location: "Southern Province",
  requested: 500_000,
  cashFlow: [
    row("ta1", "2026-06-01", "in", "Uniform orders", 300000),
    row("ta2", "2026-06-03", "out", "Fabric", -110000),
    row("ta3", "2026-06-08", "in", "Custom jobs", 90000),
    row("ta4", "2026-06-11", "out", "Thread and trim", -25000),
    row("ta5", "2026-06-15", "in", "School uniforms", 180000),
    row("ta6", "2026-06-18", "out", "Machine service", -30000),
    row("ta7", "2026-06-21", "in", "Custom jobs", 95000),
    row("ta8", "2026-06-24", "out", "Fabric", -85000),
    row("ta9", "2026-06-27", "in", "Uniform orders", 210000),
    row("ta10", "2026-06-30", "out", "Rent", -60000),
  ],
  signals: [
    { label: "Income stability", value: 73, weight: 0.3, reason: "Recurring uniform contracts with two schools." },
    { label: "Concentration", value: 62, weight: 0.2, reason: "Two school contracts plus walk-in custom work." },
    { label: "Seasonality", value: 69, weight: 0.15, reason: "Peaks at term start, steady between." },
    { label: "Repayment capacity", value: 70, weight: 0.25, reason: "Surplus around 26% of revenue." },
    { label: "Savings behavior", value: 57, weight: 0.1, reason: "Modest regular savings." },
  ],
  decision: "Approve",
  suggested: terms(500_000, 6, 2.4),
  trace: [
    "Consent verified for 6 months of mobile-money history.",
    "Cash-flow pull: four weeks of order ledger, school contracts verified.",
    "Score 68/100, above the 60 approve threshold.",
    "Contract-backed revenue supports a 6-month term.",
  ],
}

export const farmCosign: Borrower = {
  id: "farm-cosign",
  name: "Solange Umuhoza",
  business: "Cassava farm, Kayonza",
  location: "Eastern Province",
  requested: 1_800_000,
  cashFlow: [
    row("fc1", "2026-04-20", "in", "Cassava sale", 1600000),
    row("fc2", "2026-04-24", "out", "Inputs", -420000),
    row("fc3", "2026-05-02", "out", "Labour", -300000),
    row("fc4", "2026-05-15", "in", "Trader advance", 600000),
    row("fc5", "2026-05-20", "out", "Land lease", -250000),
    row("fc6", "2026-06-01", "out", "Inputs", -180000),
    row("fc7", "2026-06-10", "in", "Trader advance", 400000),
    row("fc8", "2026-06-15", "out", "Transport", -90000),
    row("fc9", "2026-06-25", "out", "Labour", -240000),
    row("fc10", "2026-07-01", "in", "Small sale", 300000),
  ],
  signals: [
    { label: "Income stability", value: 49, weight: 0.3, reason: "Strong harvest inflows but long empty stretches." },
    { label: "Concentration", value: 39, weight: 0.2, reason: "Most income from two trader advances." },
    { label: "Seasonality", value: 42, weight: 0.15, reason: "One harvest a season, months of near-zero flow." },
    { label: "Repayment capacity", value: 68, weight: 0.25, reason: "Surplus is strong at harvest, absent between." },
    { label: "Savings behavior", value: 55, weight: 0.1, reason: "Keeps a buffer at harvest, draws it down later." },
  ],
  decision: "Refer",
  suggested: terms(1_200_000, 4, 2.4),
  trace: [
    "Consent verified for 6 months of mobile-money history.",
    "Cash-flow pull: one full season, trader advances verified.",
    "Score 51/100, between thresholds.",
    "Seasonality 42 caps any term to the harvest window; co-signer available.",
  ],
}

export const vendors: Borrower = {
  id: "vendor",
  name: "Didier Nshimiyimana",
  business: "Seasonal vegetable vendor, Nyabugogo",
  location: "Kigali",
  requested: 400_000,
  cashFlow: [
    row("v1", "2026-05-06", "in", "Market sales", 150000),
    row("v2", "2026-05-09", "out", "Stock", -130000),
    row("v3", "2026-05-14", "in", "Market sales", 120000),
    row("v4", "2026-05-18", "out", "Stock", -140000),
    row("v5", "2026-05-22", "in", "Market sales", 90000),
    row("v6", "2026-05-26", "out", "Personal", -110000),
    row("v7", "2026-05-29", "in", "Market sales", 80000),
    row("v8", "2026-06-02", "out", "Stock", -125000),
    row("v9", "2026-06-05", "in", "Market sales", 70000),
    row("v10", "2026-06-08", "out", "Stock", -95000),
  ],
  signals: [
    { label: "Income stability", value: 41, weight: 0.3, reason: "Falling weekly sales, margins thinning across the season." },
    { label: "Concentration", value: 46, weight: 0.2, reason: "Cash-only walk-in sales, nothing verifiable beyond the ledger." },
    { label: "Seasonality", value: 33, weight: 0.15, reason: "Late-season decline visible in the trend." },
    { label: "Repayment capacity", value: 29, weight: 0.25, reason: "Stock purchases swallow most inflows." },
    { label: "Savings behavior", value: 22, weight: 0.1, reason: "No savings, personal withdrawals from business funds." },
  ],
  decision: "Decline",
  suggested: terms(0, 0, 0),
  trace: [
    "Consent verified for 6 months of mobile-money history.",
    "Cash-flow pull: four weeks of market ledger.",
    "Score 34/100, below the 40 decline threshold.",
    "Repayment capacity 29, surplus near zero for two weeks.",
    "Declined; data-correction and re-application path offered.",
  ],
}

export const overleveraged: Borrower = {
  id: "overleveraged",
  name: "Anita Umutoni",
  business: "Salon and cosmetics, Kicukiro",
  location: "Kigali",
  requested: 2_500_000,
  cashFlow: [
    row("o1", "2026-06-02", "in", "Clients", 300000),
    row("o2", "2026-06-04", "out", "MoKash repayment", -180000),
    row("o3", "2026-06-08", "in", "Clients", 280000),
    row("o4", "2026-06-10", "out", "MoFlex repayment", -220000),
    row("o5", "2026-06-14", "in", "Cosmetics sale", 150000),
    row("o6", "2026-06-16", "out", "Supplies", -90000),
    row("o7", "2026-06-20", "in", "Clients", 260000),
    row("o8", "2026-06-22", "out", "Rent", -110000),
    row("o9", "2026-06-26", "in", "Clients", 240000),
    row("o10", "2026-06-28", "out", "MoKash repayment", -180000),
  ],
  signals: [
    { label: "Income stability", value: 68, weight: 0.3, reason: "Steady client revenue, but two repayment lines run every month." },
    { label: "Concentration", value: 64, weight: 0.2, reason: "Walk-in clients, no single anchor." },
    { label: "Seasonality", value: 70, weight: 0.15, reason: "Steady year-round salon traffic." },
    { label: "Repayment capacity", value: 36, weight: 0.25, reason: "Existing MoKash and MoFlex payments already take 35% of revenue." },
    { label: "Savings behavior", value: 50, weight: 0.1, reason: "Saves, then draws down to cover loan installments." },
  ],
  decision: "Decline",
  suggested: terms(0, 0, 0),
  trace: [
    "Consent verified for 6 months of mobile-money history.",
    "Cash-flow pull: four weeks of ledger, two active loan lines detected.",
    "Score 56/100, above the decline threshold on cash flow alone.",
    "Existing debt service at 35% of revenue exceeds the 25% policy cap.",
    "Declined for over-leverage; refinancing offer flagged.",
  ],
}

export const poultry: Borrower = {
  id: "poultry",
  name: "Eric Gasana",
  business: "Poultry farm, Bugesera",
  location: "Eastern Province",
  requested: 1_000_000,
  cashFlow: [
    row("p1", "2026-06-02", "in", "Egg sales", 180000),
    row("p2", "2026-06-04", "out", "Feed", -90000),
    row("p3", "2026-06-08", "in", "Egg sales", 170000),
    row("p4", "2026-06-11", "out", "Feed", -85000),
    row("p5", "2026-06-15", "in", "Layer sales", 400000),
    row("p6", "2026-06-18", "out", "Vet", -40000),
    row("p7", "2026-06-22", "in", "Egg sales", 165000),
    row("p8", "2026-06-25", "out", "Feed", -90000),
    row("p9", "2026-06-28", "in", "Egg sales", 175000),
    row("p10", "2026-06-30", "out", "Labour", -60000),
  ],
  signals: [
    { label: "Income stability", value: 78, weight: 0.3, reason: "Daily egg sales plus a quarterly layer sale." },
    { label: "Concentration", value: 71, weight: 0.2, reason: "Spread across local buyers, no single dependency." },
    { label: "Seasonality", value: 76, weight: 0.15, reason: "Egg demand is steady through the year." },
    { label: "Repayment capacity", value: 74, weight: 0.25, reason: "Surplus about 28% of revenue after feed and labour." },
    { label: "Savings behavior", value: 60, weight: 0.1, reason: "Regular small savings." },
  ],
  decision: "Approve",
  suggested: terms(1_000_000, 8, 2.4),
  trace: [
    "Consent verified for 6 months of mobile-money history.",
    "Cash-flow pull: four weeks of egg ledger, layer cycle observed.",
    "Score 73/100, above the 60 approve threshold.",
    "Steady daily revenue supports an 8-month term.",
  ],
}

export const borrowers: Borrower[] = [
  traders,
  bakers,
  salons,
  poultry,
  transporters,
  tailors,
  shops,
  farmers,
  farmCosign,
  overleveraged,
  vendors,
  edges,
]

export function scoreOf(b: Borrower): number {
  return Math.round(b.signals.reduce((s, x) => s + x.value * x.weight, 0))
}

export function summarize(rows: CashFlowRow[]) {
  const inflow = rows.filter((r) => r.type === "in").reduce((s, r) => s + r.amount, 0)
  const outflow = rows.filter((r) => r.type === "out").reduce((s, r) => s + Math.abs(r.amount), 0)
  return { inflow, outflow, net: inflow - outflow }
}
