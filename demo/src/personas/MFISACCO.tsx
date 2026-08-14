import { Users, HandCoins, TrendUp } from "@phosphor-icons/react"
import type { Borrower, Decision, SuggestedTerms } from "../lib/data"
import { scoreOf, summarize } from "../lib/data"
import { monthlyPayment } from "../lib/engine"
import { fmt } from "../lib/utils"
import { DecisionBadge, ScoreBar, TraceList } from "../components/primitives"

export function MFISACCO({
  borrower,
  terms,
  decision,
}: {
  borrower: Borrower
  terms: SuggestedTerms
  decision: Decision | null
}) {
  const score = scoreOf(borrower)
  const sum = summarize(borrower.cashFlow)
  const pay = monthlyPayment(terms)
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                {borrower.name}
              </h3>
              <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>
                {borrower.business}
              </p>
            </div>
            <DecisionBadge decision={decision ?? borrower.decision} />
          </div>
          <div className="mt-4 space-y-3">
            {borrower.signals.map((s) => (
              <div key={s.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span style={{ color: "var(--ink)" }}>{s.label}</span>
                </div>
                <ScoreBar value={s.value} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6 lg:col-span-7">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
              Score
            </div>
            <div className="mt-1 font-mono text-4xl font-semibold" style={{ color: "var(--ink)" }}>
              {score}
              <span className="text-base" style={{ color: "var(--muted)" }}>
                /100
              </span>
            </div>
          </div>
          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
              Net surplus
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold" style={{ color: "var(--ink)" }}>
              RWF {fmt(sum.net)}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
            <HandCoins className="size-4" weight="fill" style={{ color: "var(--signal)" }} />
            Verdict for the loan committee
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--body)" }}>
            {terms.amount > 0
              ? `RWF ${fmt(terms.amount)} at ${terms.rateMonthly}%/mo over ${terms.termMonths} months, installment RWF ${fmt(pay.installment)}.`
              : "No live offer; scoring only."}
          </p>
          <div className="mt-4">
            <TraceList items={borrower.trace} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4" /> MFI / SACCO underwriting
          </span>
          <span className="inline-flex items-center gap-1.5">
            <TrendUp className="size-4" /> cash-flow evidence over collateral
          </span>
        </div>
      </div>
    </div>
  )
}

export const mfiIntro = "A scoring surface for MFIs and SACCOs: approve, refer or decline from cash-flow evidence instead of collateral."
