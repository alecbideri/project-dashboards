import { createContext, useContext, useEffect, useReducer, useState, type Dispatch } from "react"
import { Users, HandCoins, PiggyBank, MapPin, NotePencil, Clock } from "@phosphor-icons/react"
import type { Borrower, Decision, SuggestedTerms } from "../lib/data"
import { borrowers, scoreOf, summarize } from "../lib/data"
import { affordability, monthlyPayment, suggestedNotes } from "../lib/engine"
import { narrate } from "../lib/narration"
import type { Narration } from "../lib/narration"
import { memberContext } from "../lib/mfi"
import { fmt } from "../lib/utils"
import { mfiReducer, emptyMfiState, selectMember } from "../lib/store"
import type { MfiAction, MfiState } from "../lib/store"
import { DecisionBadge, ScoreBar, StatCell } from "../components/primitives"
import { CashFlowAnalysis, BorrowerNotice } from "./NDFSPWorkbench"

const signalStyle = {
  label: "font-mono text-[10px] uppercase tracking-[0.14em]",
  input: "h-9 w-full rounded-lg border bg-panel px-2.5 font-mono text-sm outline-none focus:border-[var(--signal)]",
} as const

type MfiContextValue = [MfiState, Dispatch<MfiAction>]
const MfiContext = createContext<MfiContextValue | null>(null)

function useMfi() {
  const ctx = useContext(MfiContext)
  if (!ctx) throw new Error("MfiContext missing")
  return ctx
}

function memberOf(id: string): Borrower {
  return borrowers.find((b) => b.id === id)!
}

function MemberRail({ selectedId, onOpen }: { selectedId: string | null; onOpen: (id: string) => void }) {
  const [state] = useMfi()
  return (
    <div className="rounded-2xl border" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
      <div className="flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold" style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}>
        <Users className="size-4" style={{ color: "var(--signal)" }} />
        Members
        <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
          {state.members.length} requests
        </span>
      </div>
      <div className="max-h-[560px] overflow-y-auto">
        {state.members.map((m) => {
          const b = memberOf(m.borrowerId)
          const ctx = memberContext[m.borrowerId]
          const selected = m.borrowerId === selectedId
          return (
            <button
              key={m.borrowerId}
              onClick={() => onOpen(m.borrowerId)}
              className="block w-full border-b px-4 py-3 text-left transition-colors last:border-b-0"
              style={{
                borderColor: "var(--hairline)",
                background: selected ? "var(--signal-soft)" : "transparent",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold" style={{ color: "var(--ink)" }}>
                  {b.name}
                </span>
                {m.decision ? (
                  <DecisionBadge decision={m.decision} />
                ) : (
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--muted)" }}>
                    pending
                  </span>
                )}
              </div>
              <div className="mt-0.5 truncate text-xs" style={{ color: "var(--muted)" }}>
                {b.business}
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-mono text-xs" style={{ color: "var(--body)" }}>
                  RWF {fmt(b.requested)}
                </span>
                <span className="font-mono text-[10px]" style={{ color: "var(--muted)" }}>
                  member since {ctx.memberSince}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FieldOfficerContext({ borrower }: { borrower: Borrower }) {
  const ctx = memberContext[borrower.id]
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
        <MapPin className="size-4" weight="fill" style={{ color: "var(--signal)" }} />
        Field-officer context
      </div>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--body)" }}>
        {ctx.fieldOfficerNote}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatCell label="Member since" value={ctx.memberSince} />
        <StatCell label="Savings" value={`RWF ${fmt(ctx.savingsBalance)}`} />
        <StatCell label="Prior loans" value={`${ctx.priorLoans} · ${ctx.onTimeRate}% on time`} />
      </div>
    </div>
  )
}

function VerdictPanel({
  borrower,
  terms,
  decision,
  decided,
  onEditTerms,
  onDecide,
}: {
  borrower: Borrower
  terms: SuggestedTerms
  decision: Decision | null
  decided: boolean
  onEditTerms: (t: SuggestedTerms) => void
  onDecide: (d: Decision) => void
}) {
  const pay = monthlyPayment(terms)
  const aff = affordability(terms, borrower.cashFlow)
  const affTone =
    aff.level === "ok" ? { fg: "#0f7a3d", bg: "#e8f7ee", ring: "#b7e6c9", label: "affordable" } :
    aff.level === "tight" ? { fg: "#9a6700", bg: "#fdf5e2", ring: "#efdcb0", label: "tight fit" } :
    { fg: "#b42318", bg: "#fdecea", ring: "#f5c1bd", label: "over policy" }
  const setField = (patch: Partial<SuggestedTerms>) => onEditTerms({ ...terms, ...patch })

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
        <HandCoins className="size-4" weight="fill" style={{ color: "var(--signal)" }} />
        Committee verdict
      </div>

      {!decided ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={signalStyle.label} style={{ color: "var(--muted)" }}>Amount (RWF)</span>
              <input
                type="number"
                value={terms.amount}
                onChange={(e) => setField({ amount: Math.max(0, Number(e.target.value) || 0) })}
                className={`${signalStyle.input} mt-1`}
              />
            </label>
            <label className="block">
              <span className={signalStyle.label} style={{ color: "var(--muted)" }}>Term (months)</span>
              <input
                type="number"
                value={terms.termMonths}
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
          <div className="flex gap-2">
            <button
              onClick={() => onDecide("Approve")}
              className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
              style={{ background: "#0f7a3d", color: "#f7f9fc" }}
            >
              Approve
            </button>
            <button
              onClick={() => onDecide("Refer")}
              className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
              style={{ background: "#fdf5e2", color: "#9a6700", border: "1px solid #efdcb0" }}
            >
              Refer
            </button>
            <button
              onClick={() => onDecide("Decline")}
              className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
              style={{ background: "#fdecea", color: "#b42318", border: "1px solid #f5c1bd" }}
            >
              Decline
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          {decision === "Approve"
            ? `Approved at RWF ${fmt(terms.amount)} over ${terms.termMonths} months, installment RWF ${fmt(pay.installment)}. The SACCO disburses from its own pool.`
            : decision === "Refer"
              ? "Referred for a follow-up committee meeting."
              : "Declined; the borrower is notified with the reason and a data-correction path."}
        </p>
      )}
    </div>
  )
}

function CommitteeNote({
  comment,
  onComment,
  borrower,
  decision,
}: {
  comment: string
  onComment: (c: string) => void
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
        Committee note
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
          Suggestions appear after the committee decides.
        </p>
      )}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        placeholder="Write the committee note. It is kept with the member's request."
        className={`${signalStyle.input} mt-3 w-full resize-none py-2 leading-relaxed`}
        style={{ minHeight: "88px" }}
      />
      <div className="mt-2 flex justify-end">
        <button
          onClick={() => onComment(draft)}
          disabled={saved}
          className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-default"
          style={{ background: saved ? "var(--paper)" : "var(--ink)", color: saved ? "var(--muted)" : "#f7f9fc" }}
        >
          {saved ? "Saved" : "Save note"}
        </button>
      </div>
    </div>
  )
}

export function MFISACCO() {
  const [state, dispatch] = useReducer(mfiReducer, emptyMfiState)
  const [narration, setNarration] = useState<Narration | null>(null)
  const selected = selectMember(state, state.selectedId)
  const member = selected?.member
  const borrower = selected?.borrower
  const terms: SuggestedTerms = member?.terms ?? { amount: 0, termMonths: 0, rateMonthly: 0 }
  const decision = member?.decision ?? null
  const decided = member?.status === "decided"

  useEffect(() => {
    if (!borrower) return
    let alive = true
    narrate(borrower, { decision: decision ?? borrower.decision, terms })
      .then((n) => {
        if (alive) setNarration(n)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [borrower, decision, terms])

  return (
    <MfiContext.Provider value={[state, dispatch]}>
      <div className="grid gap-6 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <MemberRail selectedId={state.selectedId} onOpen={(id) => dispatch({ type: "MFI_OPEN", id })} />
        </aside>

        <main className="space-y-6 lg:col-span-9">
          {borrower && (
            <>
              <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
                        {borrower.name}
                      </h3>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]"
                        style={{ background: "var(--signal-soft)", color: "var(--signal)", border: "1px solid var(--signal-border)" }}
                      >
                        <PiggyBank className="size-3.5" /> SACCO member
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>
                      {borrower.business} · {borrower.location}
                    </p>
                  </div>
                  {decision ? <DecisionBadge decision={decision} /> : <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>pending committee</span>}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <StatCell label="Requested" value={`RWF ${fmt(borrower.requested)}`} />
                  <StatCell label="Score" value={`${scoreOf(borrower)}/100`} />
                  <StatCell label="Net surplus" value={`RWF ${fmt(summarize(borrower.cashFlow).net)}`} />
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <FieldOfficerContext borrower={borrower} />
                <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
                    <Clock className="size-4" weight="fill" style={{ color: "var(--signal)" }} />
                    Signals at a glance
                  </div>
                  <div className="space-y-3">
                    {borrower.signals.map((s) => (
                      <div key={s.label}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span style={{ color: "var(--ink)" }}>{s.label}</span>
                          <span className="font-mono text-xs" style={{ color: "var(--muted)" }}>{s.value}/100</span>
                        </div>
                        <ScoreBar value={s.value} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <CashFlowAnalysis borrower={borrower} />

              <VerdictPanel
                borrower={borrower}
                terms={terms}
                decision={decision}
                decided={decided}
                onEditTerms={(t) => dispatch({ type: "MFI_EDIT_TERMS", id: borrower.id, terms: t })}
                onDecide={(d) => dispatch({ type: "MFI_DECIDE", id: borrower.id, decision: d })}
              />

              <CommitteeNote
                comment={member?.comment ?? ""}
                onComment={(c) => dispatch({ type: "MFI_COMMENT", id: borrower.id, comment: c })}
                borrower={borrower}
                decision={decision}
              />

              {decided && decision && <BorrowerNotice borrower={borrower} decision={decision} />}

              <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
                  <span className="mt-0.5 inline-block size-2 rounded-full" style={{ background: "var(--signal)" }} />
                  Analyst narration
                </div>
                {narration && (
                  <div className="mt-3 space-y-3">
                    <p className="text-sm leading-relaxed" style={{ color: "var(--body)" }}>
                      {narration.summary}
                    </p>
                    <ul className="space-y-1.5">
                      {narration.points.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                          <span className="mt-1.5 size-1 shrink-0 rounded-full" style={{ background: "var(--signal)" }} />
                          {p}
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--ink)" }}>
                      {narration.recommendation}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </MfiContext.Provider>
  )
}

export const mfiIntro = "A committee scoring surface for MFIs and SACCOs: the SACCO already knows its members, EmbeddedLend adds the score."
