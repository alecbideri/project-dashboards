import { useState } from "react"
import { Bank, ChartLine, Coins, ShieldCheck, PaperPlaneTilt, SealWarning, Clock, NotePencil } from "@phosphor-icons/react"
import type { Borrower, Decision, SuggestedTerms } from "../lib/data"
import { scoreOf, summarize } from "../lib/data"
import { affordability, monthlyPayment, analyzeLedger, suggestedNotes } from "../lib/engine"
import { fmt } from "../lib/utils"
import { DecisionBadge, ScoreBar, StatCell, TraceList } from "../components/primitives"

const signalStyle = {
  label: "font-mono text-[10px] uppercase tracking-[0.14em]",
  input: "h-9 w-full rounded-lg border bg-panel px-2.5 font-mono text-sm outline-none focus:border-[var(--signal)]",
  unit: "font-mono text-xs",
} as const

export interface ReviewHandlers {
  onEditTerms: (terms: SuggestedTerms) => void
  onDecide: (decision: Decision) => void
  onDisburse: () => void
  onComment: (comment: string) => void
}

function BorrowerNotice({ borrower, decision }: { borrower: Borrower; decision: Decision }) {
  const weakest = [...borrower.signals].sort((a, b) => a.value - b.value)[0]
  const strongest = [...borrower.signals].sort((a, b) => b.value - a.value)[0]

  if (decision === "Decline") {
    return (
      <div className="rounded-2xl p-5" style={{ background: "#fdecea", border: "1px solid #f5c1bd" }}>
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#b42318" }}>
          <SealWarning className="size-4" weight="fill" /> Notice to borrower
        </div>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "#2f3a4d" }}>
          {borrower.name}, your application for RWF {fmt(borrower.requested)} was declined.
        </p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "#5b6572" }}>
          Reason: {weakest.reason} The observed ledger does not meet the repayment bar ({weakest.label.toLowerCase()} {weakest.value}/100).
        </p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "#5b6572" }}>
          You can correct your data or reapply after building more repayment history. A full explanation is sent to your registered mobile number.
        </p>
      </div>
    )
  }

  if (decision === "Refer") {
    return (
      <div className="rounded-2xl p-5" style={{ background: "#fdf5e2", border: "1px solid #efdcb0" }}>
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#9a6700" }}>
          <Clock className="size-4" weight="fill" /> Notice to borrower
        </div>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "#2f3a4d" }}>
          {borrower.name}, your application is queued for manual review.
        </p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "#5b6572" }}>
          Why: the strongest signal is {strongest.label} ({strongest.value}/100), but {weakest.label.toLowerCase()} ({weakest.value}/100) needs a human check before a decision. Expected answer within 3 working days.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: "#e8f7ee", border: "1px solid #b7e6c9" }}>
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#0f7a3d" }}>
        <PaperPlaneTilt className="size-4" weight="fill" /> Notice to borrower
      </div>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: "#2f3a4d" }}>
        {borrower.name}, your application was approved. {strongest.label} ({strongest.value}/100) carried the decision.
      </p>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: "#5b6572" }}>
        The offer has been sent to your registered mobile number for confirmation. Funds disburse over eKash once you accept.
      </p>
    </div>
  )
}

function CashFlowAnalysis({ borrower }: { borrower: Borrower }) {
  const ledger = analyzeLedger(borrower.cashFlow)
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
        <ChartLine className="size-4" weight="fill" style={{ color: "var(--signal)" }} />
        Cash-flow analysis
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatCell
          label="Monthly net"
          value={`RWF ${fmt(ledger.monthlyNet)}`}
          explain="Average of inflow minus outflow across the observed months. A positive value means the business earns more than it spends each month, which is the money available to service a loan."
        />
        <StatCell
          label="Liquidity"
          value={`${ledger.liquidityRatio}%`}
          sub="inflow vs outflow"
          explain="Total inflow as a share of total outflow. Above 100 means the business takes in more than it pays out over the window; far above 100 signals a healthier buffer."
        />
        <StatCell
          label="Sources"
          value={`${ledger.inflowByCategory.length}`}
          sub="income streams"
          explain="Distinct categories money arrives from. Fewer sources means the business depends on one stream, which raises concentration risk when that source slows."
        />
      </div>

      <div className="mt-5 space-y-4">
        {borrower.signals.map((s) => (
          <div key={s.label}>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: "var(--ink)" }}>{s.label}</span>
              <span className="font-mono text-xs" style={{ color: "var(--muted)" }}>
                {(s.weight * 100).toFixed(0)}% · {s.value}/100
              </span>
            </div>
            <div className="mt-1">
              <ScoreBar value={s.value} />
            </div>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
              {s.reason}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-4" style={{ borderColor: "var(--hairline)" }}>
        <div>
          <div className={signalStyle.label} style={{ color: "var(--muted)" }}>Inflow by source</div>
          <ul className="mt-2 space-y-1">
            {ledger.inflowByCategory.map((c) => (
              <li key={c.category} className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--body)" }}>{c.category}</span>
                <span className="font-mono" style={{ color: "var(--ink)" }}>RWF {fmt(c.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className={signalStyle.label} style={{ color: "var(--muted)" }}>Outflow by use</div>
          <ul className="mt-2 space-y-1">
            {ledger.outflowByCategory.map((c) => (
              <li key={c.category} className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--body)" }}>{c.category}</span>
                <span className="font-mono" style={{ color: "var(--ink)" }}>RWF {fmt(c.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function LenderNotes({
  comment,
  onComment,
  borrower,
  decision,
}: {
  comment: string
  onComment: (comment: string) => void
  borrower: Borrower
  decision: Decision | null
}) {
  const suggestions = decision ? suggestedNotes(borrower, decision) : []
  const [draft, setDraft] = useState(comment)
  const saved = draft === comment
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
        <NotePencil className="size-4" weight="fill" style={{ color: "var(--signal)" }} />
        Lender note
        <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
          {saved ? "saved" : "unsaved"}
        </span>
      </div>

      {decision ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setDraft(s)}
              className="rounded-full border px-2.5 py-1 text-left text-xs leading-relaxed transition-colors"
              style={{ borderColor: "var(--signal-border)", background: "var(--signal-soft)", color: "var(--signal)" }}
            >
              {s}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
          Suggestions appear after you decide. You can still write a note now.
        </p>
      )}

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        placeholder="Write a note for the file. It is kept with the request and visible to the reviewer."
        className={`${signalStyle.input} mt-3 w-full resize-none py-2 leading-relaxed`}
        style={{ minHeight: "88px" }}
      />

      <div className="mt-2 flex justify-end">
        <button
          onClick={() => onComment(draft)}
          disabled={saved}
          className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-default"
          style={{
            background: saved ? "var(--paper)" : "var(--ink)",
            color: saved ? "var(--muted)" : "#f7f9fc",
          }}
        >
          {saved ? "Saved" : "Save note"}
        </button>
      </div>
    </div>
  )
}

export function NDFSPWorkbench({
  borrower,
  terms,
  decision,
  decided,
  disbursed,
  comment,
  handlers,
}: {
  borrower: Borrower
  terms: SuggestedTerms
  decision: Decision | null
  decided: boolean
  disbursed: boolean
  comment: string
  handlers: ReviewHandlers
}) {
  const score = scoreOf(borrower)
  const sum = summarize(borrower.cashFlow)
  const pay = monthlyPayment(terms)
  const aff = affordability(terms, borrower.cashFlow)

  const setField = (patch: Partial<SuggestedTerms>) =>
    handlers.onEditTerms({ ...terms, ...patch })

  const affTone =
    aff.level === "ok" ? { fg: "#0f7a3d", bg: "#e8f7ee", ring: "#b7e6c9", label: "affordable" } :
    aff.level === "tight" ? { fg: "#9a6700", bg: "#fdf5e2", ring: "#efdcb0", label: "tight fit" } :
    { fg: "#b42318", bg: "#fdecea", ring: "#f5c1bd", label: "over policy" }

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
            {decision ? <DecisionBadge decision={decision} /> : <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>pending decision</span>}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <StatCell label="Requested" value={`RWF ${fmt(borrower.requested)}`} />
            <StatCell label="Inflow" value={`RWF ${fmt(sum.inflow)}`} />
            <StatCell label="Net surplus" value={`RWF ${fmt(sum.net)}`} />
          </div>
        </div>

        <CashFlowAnalysis borrower={borrower} />
      </div>

      <div className="space-y-6 lg:col-span-5">
        <div className="rounded-2xl p-6" style={{ background: "var(--signal-soft)", border: "1px solid var(--signal-border)" }}>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
            <ChartLine className="size-4" weight="fill" style={{ color: "var(--signal)" }} />
            Deterministic score
          </div>
          <div className="mt-2 font-mono text-5xl font-semibold" style={{ color: "var(--ink)" }}>
            {score}
            <span className="text-xl" style={{ color: "var(--muted)" }}>/100</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--body)" }}>
            {score >= 60 ? "Above the approve threshold." : score >= 40 ? "Between thresholds; policy decides." : "Below the decline threshold."}
          </p>
        </div>

        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
            <Bank className="size-4" weight="fill" style={{ color: "var(--signal)" }} />
            Offer terms
          </div>

          {disbursed ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl p-4" style={{ background: "#e8f7ee", border: "1px solid #b7e6c9" }}>
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#0f7a3d" }}>
                  <PaperPlaneTilt className="size-4" weight="fill" /> Disbursed
                </div>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "#2f3a4d" }}>
                  RWF {fmt(pay.total)} repaid over {terms.termMonths} months via eKash. First installment RWF {fmt(pay.installment)}.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={signalStyle.label} style={{ color: "var(--muted)" }}>Amount (RWF)</span>
                  <input
                    type="number"
                    value={terms.amount}
                    disabled={decided}
                    onChange={(e) => setField({ amount: Math.max(0, Number(e.target.value) || 0) })}
                    className={`${signalStyle.input} mt-1`}
                  />
                </label>
                <label className="block">
                  <span className={signalStyle.label} style={{ color: "var(--muted)" }}>Term (months)</span>
                  <input
                    type="number"
                    value={terms.termMonths}
                    disabled={decided}
                    onChange={(e) => setField({ termMonths: Math.max(1, Number(e.target.value) || 1) })}
                    className={`${signalStyle.input} mt-1`}
                  />
                </label>
              </div>
              <label className="block">
                <span className={signalStyle.label} style={{ color: "var(--muted)" }}>Rate (% / month)</span>
                <input
                  type="number"
                  step="0.1"
                  value={terms.rateMonthly}
                  disabled={decided}
                  onChange={(e) => setField({ rateMonthly: Math.max(0, Number(e.target.value) || 0) })}
                  className={`${signalStyle.input} mt-1`}
                />
              </label>

              <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--hairline)" }}>
                <span className="text-sm" style={{ color: "var(--muted)" }}>Monthly installment</span>
                <span className="font-mono text-base font-semibold" style={{ color: "var(--ink)" }}>
                  RWF {fmt(pay.installment)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--muted)" }}>vs monthly surplus RWF {fmt(aff.monthlySurplus)}</span>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]"
                  style={{ color: affTone.fg, background: affTone.bg, border: `1px solid ${affTone.ring}` }}
                >
                  {affTone.label}
                </span>
              </div>
            </div>
          )}

          {!disbursed && !decided && (
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => handlers.onDecide("Approve")}
                className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
                style={{ background: "#0f7a3d", color: "#f7f9fc" }}
              >
                Approve
              </button>
              <button
                onClick={() => handlers.onDecide("Refer")}
                className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
                style={{ background: "#fdf5e2", color: "#9a6700", border: "1px solid #efdcb0" }}
              >
                Refer
              </button>
              <button
                onClick={() => handlers.onDecide("Decline")}
                className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
                style={{ background: "#fdecea", color: "#b42318", border: "1px solid #f5c1bd" }}
              >
                Decline
              </button>
            </div>
          )}

          {decided && !disbursed && decision === "Approve" && (
            <button
              onClick={handlers.onDisburse}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
              style={{ background: "var(--ink)", color: "#f7f9fc" }}
            >
              <Coins className="size-4" weight="fill" /> Disburse over eKash · RWF20 flat
            </button>
          )}

          {decided && decision !== "Approve" && (
            <p className="mt-5 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              {decision === "Refer" ? "Referred for manual review. The borrower stays in the queue with a referral note." : "Declined. The borrower is notified and offered a data-correction path."}
            </p>
          )}

          <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
            <ShieldCheck className="size-4" />
            Consent verified · Law 058/2021
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

        <LenderNotes comment={comment} onComment={handlers.onComment} borrower={borrower} decision={decision} />

        {decided && decision && <BorrowerNotice borrower={borrower} decision={decision} />}
      </div>
    </div>
  )
}

export const ndfspIntro = "A full underwriting workbench for licensed digital lenders: a live queue of requests, cash-flow analysis, editable terms, and the decision."
