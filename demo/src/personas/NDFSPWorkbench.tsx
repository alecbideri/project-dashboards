import { Bank, ChartLine, Coins, ShieldCheck } from "@phosphor-icons/react"
import type { Borrower } from "../lib/data"
import { scoreOf, summarize } from "../lib/data"
import { fmt } from "../lib/utils"
import { DecisionBadge, ScoreBar, StatCell, TraceList } from "../components/primitives"

export function NDFSPWorkbench({ borrower }: { borrower: Borrower }) {
  const score = scoreOf(borrower)
  const sum = summarize(borrower.cashFlow)
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-7">
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
                {borrower.name}
              </h3>
              <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>
                {borrower.business} · {borrower.location}
              </p>
            </div>
            <DecisionBadge decision={borrower.decision} />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <StatCell label="Requested" value={`RWF ${fmt(borrower.requested)}`} />
            <StatCell label="Inflow" value={`RWF ${fmt(sum.inflow)}`} />
            <StatCell label="Net surplus" value={`RWF ${fmt(sum.net)}`} />
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                Cash-flow signals
              </h4>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
                weight-adjusted
              </span>
            </div>
            <div className="space-y-3">
              {borrower.signals.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: "var(--ink)" }}>{s.label}</span>
                    <span className="font-mono text-xs" style={{ color: "var(--muted)" }}>
                      {(s.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1">
                    <ScoreBar value={s.value} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
          <h4 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            Decision trace
          </h4>
          <div className="mt-4">
            <TraceList items={borrower.trace} />
          </div>
        </div>
      </div>

      <div className="space-y-6 lg:col-span-5">
        <div className="rounded-2xl p-6" style={{ background: "var(--signal-soft)", border: "1px solid var(--signal-border)" }}>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
            <ChartLine className="size-4" weight="fill" style={{ color: "var(--signal)" }} />
            Deterministic score
          </div>
          <div className="mt-2 font-mono text-5xl font-semibold" style={{ color: "var(--ink)" }}>
            {score}
            <span className="text-xl" style={{ color: "var(--muted)" }}>
              /100
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--body)" }}>
            {borrower.signals.reduce((acc, s) => acc + s.value * s.weight, 0) >= 60 ? "Above the approve threshold." : "Between or below thresholds; policy decides."}
          </p>
        </div>

        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
            <Bank className="size-4" weight="fill" style={{ color: "var(--signal)" }} />
            Offered terms
          </div>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--body)" }}>
            {borrower.limit}
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
            <ShieldCheck className="size-4" />
            Consent verified · Law 058/2021
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
          <Coins className="size-4" />
          Disbursed over eKash, one integration, RWF20 flat
        </div>
      </div>
    </div>
  )
}

export const ndfspIntro = "A full underwriting workbench for licensed digital lenders: application, cash-flow, score, decision and trace in one place."
