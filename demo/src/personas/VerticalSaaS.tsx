import { Globe, Lightning, LockKey } from "@phosphor-icons/react"
import type { Borrower } from "../lib/data"
import { scoreOf, summarize } from "../lib/data"
import { fmt } from "../lib/utils"
import { DecisionBadge, ScoreBar } from "../components/primitives"

export function VerticalSaaS({ borrower }: { borrower: Borrower }) {
  const score = scoreOf(borrower)
  const sum = summarize(borrower.cashFlow)
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]"
              style={{ background: "var(--signal-soft)", color: "var(--signal)", border: "1px solid var(--signal-border)" }}
            >
              <Globe className="size-3.5" /> Embedded in your app
            </span>
          </div>
          <h3 className="mt-4 text-lg font-semibold" style={{ color: "var(--ink)" }}>
            Working capital for {borrower.business}
          </h3>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            {borrower.name} started a financing request from the merchant dashboard. The widget reads consented cash-flow, returns a decision, and offers terms inline.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
              Score
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold" style={{ color: "var(--ink)" }}>
              {score}
            </div>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
              Inflow
            </div>
            <div className="mt-1 font-mono text-lg font-semibold" style={{ color: "var(--ink)" }}>
              RWF {fmt(sum.inflow)}
            </div>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
              Term
            </div>
            <div className="mt-1 font-mono text-lg font-semibold" style={{ color: "var(--ink)" }}>
              {borrower.decision === "Decline" ? "n/a" : "6-9 mo"}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-5">
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              Decision
            </h4>
            <DecisionBadge decision={borrower.decision} />
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
          <div className="mt-5 flex flex-col gap-2 text-xs" style={{ color: "var(--muted)" }}>
            <span className="inline-flex items-center gap-1.5">
              <Lightning className="size-4" style={{ color: "var(--signal)" }} /> Decision in seconds, not weeks
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LockKey className="size-4" style={{ color: "var(--signal)" }} /> Borrower consents before any data is read
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export const saasIntro = "An embedded widget a vertical SaaS drops into its own product. The borrower never leaves the merchant app."
