// Deterministic engine for the demo. The operator can edit terms; this module
// tells them whether the offer is affordable against the borrower's cash flow.
// It never changes the score (that comes from data.ts).

import type { CashFlowRow, SuggestedTerms } from "./data"
import { summarize } from "./data"

export interface MonthlyPayment {
  installment: number
  totalInterest: number
  total: number
}

// Straight-line amortization: principal / months + monthly interest on the
// original principal. Matches how short-tenor Rwandan loans are quoted.
export function monthlyPayment(terms: SuggestedTerms): MonthlyPayment {
  const { amount, termMonths, rateMonthly } = terms
  if (termMonths <= 0) return { installment: 0, totalInterest: 0, total: 0 }
  const interest = (amount * rateMonthly) / 100
  const principal = amount / termMonths
  return {
    installment: Math.round(principal + interest),
    totalInterest: Math.round(interest * termMonths),
    total: amount + Math.round(interest * termMonths),
  }
}

export type Affordability = "ok" | "tight" | "over"

// Average net surplus per month across the observed ledger, and whether the
// monthly installment stays within the 30% policy cap.
export function affordability(terms: SuggestedTerms, cashFlow: CashFlowRow[]): {
  level: Affordability
  monthlySurplus: number
  utilization: number
} {
  const { net } = summarize(cashFlow)
  const monthlySurplus = Math.round(net / 4)
  const payment = monthlyPayment(terms).installment
  if (monthlySurplus <= 0) return { level: "over", monthlySurplus, utilization: 100 }
  const utilization = Math.round((payment / monthlySurplus) * 100)
  const level: Affordability = utilization > 40 ? "over" : utilization > 30 ? "tight" : "ok"
  return { level, monthlySurplus, utilization }
}

export interface CategorySplit {
  category: string
  amount: number
}

export interface LedgerAnalysis {
  inflowByCategory: CategorySplit[]
  outflowByCategory: CategorySplit[]
  monthlyNet: number
  liquidityRatio: number // inflow / outflow
}

// Slices the observed ledger into what the lender can actually argue with:
// where money comes from, where it goes, and whether the month nets positive.
export function analyzeLedger(cashFlow: CashFlowRow[]): LedgerAnalysis {
  const inflowMap = new Map<string, number>()
  const outflowMap = new Map<string, number>()
  for (const r of cashFlow) {
    const target = r.type === "in" ? inflowMap : outflowMap
    target.set(r.category, (target.get(r.category) ?? 0) + Math.abs(r.amount))
  }
  const sort = (m: Map<string, number>): CategorySplit[] =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount }))
  const { inflow, outflow } = summarize(cashFlow)
  return {
    inflowByCategory: sort(inflowMap),
    outflowByCategory: sort(outflowMap),
    monthlyNet: Math.round((inflow - outflow) / 4),
    liquidityRatio: outflow > 0 ? Math.round((inflow / outflow) * 100) : 0,
  }
}
