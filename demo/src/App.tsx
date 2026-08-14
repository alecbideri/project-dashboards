import { useEffect, useReducer, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Clock, Database } from "@phosphor-icons/react"
import { borrowers, type Borrower, type Decision, type SuggestedTerms } from "./lib/data"
import { narrate, hasLiveKey } from "./lib/narration"
import type { Narration } from "./lib/narration"
import { reducer, emptyState, selectRequest } from "./lib/store"
import type { QueueRequest, RequestStatus } from "./lib/store"
import { NDFSPWorkbench, ndfspIntro } from "./personas/NDFSPWorkbench"
import { MFISACCO, mfiIntro } from "./personas/MFISACCO"
import { VerticalSaaS, saasIntro } from "./personas/VerticalSaaS"
import { BNR, bnrIntro } from "./personas/BNR"
import { StatusChip } from "./components/primitives"
import { fmt } from "./lib/utils"

type View = "workbench" | "mfi" | "saas" | "bnr"

const views: Array<{ id: View; label: string; intro: string }> = [
  { id: "workbench", label: "NDFSP", intro: ndfspIntro },
  { id: "mfi", label: "MFI / SACCO", intro: mfiIntro },
  { id: "saas", label: "Vertical SaaS", intro: saasIntro },
  { id: "bnr", label: "BNR / Regulator", intro: bnrIntro },
]

const statusOrder: Record<RequestStatus, number> = { new: 0, reviewing: 1, decided: 2, disbursed: 3 }

function timeAgo(t: number, now: number) {
  const s = Math.max(0, Math.floor((now - t) / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h`
}

function borrowerOf(id: string): Borrower {
  return borrowers.find((b) => b.id === id)!
}

function QueueRail({
  requests,
  selectedId,
  now,
  onOpen,
}: {
  requests: QueueRequest[]
  selectedId: string | null
  now: number
  onOpen: (id: string) => void
}) {
  const sorted = [...requests].sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.arrivedAt - b.arrivedAt)
  const active = requests.filter((r) => r.status === "new" || r.status === "reviewing").length
  return (
    <div className="rounded-2xl border" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--hairline)" }}>
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
          <Clock className="size-4" style={{ color: "var(--signal)" }} />
          Requests
          <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
            {active} active
          </span>
        </div>
      </div>
      <div className="max-h-[560px] overflow-y-auto">
        {requests.length === 0 && (
          <p className="px-4 py-8 text-center text-sm" style={{ color: "var(--muted)" }}>
            Incoming loan requests will appear here.
          </p>
        )}
        <AnimatePresence initial={false}>
          {sorted.map((r) => {
            const b = borrowerOf(r.borrowerId)
            const selected = r.id === selectedId
            return (
              <motion.button
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                onClick={() => onOpen(r.id)}
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
                  <StatusChip status={r.status} />
                </div>
                <div className="mt-0.5 truncate text-xs" style={{ color: "var(--muted)" }}>
                  {b.business}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono text-xs" style={{ color: "var(--body)" }}>
                    RWF {fmt(b.requested)}
                  </span>
                  <span className="font-mono text-[10px]" style={{ color: "var(--muted)" }}>
                    {timeAgo(r.arrivedAt, now)} ago
                  </span>
                </div>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, emptyState)
  const [view, setView] = useState<View>("workbench")
  const [narration, setNarration] = useState<Narration | null>(null)
  const [thinking, setThinking] = useState(false)
  const [now, setNow] = useState(Date.now())

  // live arrival timer
  useEffect(() => {
    const t = setInterval(() => dispatch({ type: "ARRIVE" }), 9000)
    return () => clearInterval(t)
  }, [])

  // clock tick for "time ago"
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const selected = selectRequest(state, state.selectedId)
  const selectedReq = selected?.request
  const selectedBorrower = selected?.borrower
  const terms: SuggestedTerms = selectedReq?.terms ?? { amount: 0, termMonths: 0, rateMonthly: 0 }
  const decision = selectedReq?.decision ?? null
  const decided = selectedReq?.status === "decided" || selectedReq?.status === "disbursed"
  const disbursed = selectedReq?.status === "disbursed"

  const activeView = views.find((v) => v.id === view)!

  useEffect(() => {
    if (!selectedBorrower) {
      setNarration(null)
      return
    }
    let alive = true
    setThinking(true)
    setNarration(null)
    narrate(selectedBorrower, { decision: decision ?? selectedBorrower.decision, terms })
      .then((n) => {
        if (alive) setNarration(n)
      })
      .finally(() => {
        if (alive) setThinking(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBorrower, decision, terms])

  const handleDecide = (d: Decision) => {
    if (selectedReq) dispatch({ type: "DECIDE", id: selectedReq.id, decision: d })
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6">
      <header className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
            <span
              className="inline-flex size-7 items-center justify-center rounded-lg"
              style={{ background: "var(--signal)", color: "#f7f9fc" }}
            >
              <Database className="size-4" weight="fill" />
            </span>
            EmbeddedLend
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
              {view === "workbench" ? "NDFSP workbench" : view === "mfi" ? "MFI / SACCO committee" : view === "saas" ? "vertical SaaS" : "BNR supervisory"}
            </span>
          </div>
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]"
              style={{ background: "var(--signal-soft)", color: "var(--signal)", border: "1px solid var(--signal-border)" }}
            >
              narration {hasLiveKey ? "LLM" : "sandbox"}
            </span>
        </div>
        <h1 className="mt-4 max-w-2xl text-2xl font-semibold leading-snug sm:text-3xl" style={{ color: "var(--ink)" }}>
          SME credit, decided by cash flow, delivered inside the tools lenders already use.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          {activeView.intro}{" "}
          {view === "mfi"
            ? "Members are the SACCO's own; EmbeddedLend only adds the score."
            : view === "saas"
              ? "The widget runs inside the merchant app; the borrower never leaves it."
              : view === "bnr"
                ? "The ledger is read-only; the regulator only watches and flags."
                : "Requests arrive live. Open one, review the cash-flow evidence, adjust the offer, and decide."}
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>
          View
        </span>
        {views.map((v) => {
          const on = v.id === view
          return (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: on ? "var(--ink)" : "var(--panel)",
                color: on ? "#f7f9fc" : "var(--body)",
                border: `1px solid ${on ? "transparent" : "var(--hairline)"}`,
              }}
            >
              {v.label}
            </button>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {view !== "mfi" && view !== "saas" && view !== "bnr" && (
          <aside className="lg:col-span-3">
            <QueueRail requests={state.requests} selectedId={state.selectedId} now={now} onOpen={(id) => dispatch({ type: "OPEN", id })} />
          </aside>
        )}

        <main className={view === "mfi" || view === "saas" || view === "bnr" ? "lg:col-span-12" : "lg:col-span-9"}>
          {view === "mfi" ? (
            <MFISACCO />
          ) : view === "saas" ? (
            <VerticalSaaS />
          ) : view === "bnr" ? (
            <BNR />
          ) : !selectedBorrower ? (
            <div className="rounded-2xl border p-10 text-center" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Waiting for the first request to arrive.
              </p>
            </div>
          ) : (
            <>
              {view === "workbench" && (
                <NDFSPWorkbench
                  borrower={selectedBorrower}
                  terms={terms}
                  decision={decision}
                  decided={decided}
                  disbursed={disbursed}
                  comment={selectedReq?.comment ?? ""}
                  handlers={{
                    onEditTerms: (t) => selectedReq && dispatch({ type: "EDIT_TERMS", id: selectedReq.id, terms: t }),
                    onDecide: handleDecide,
                    onDisburse: () => selectedReq && dispatch({ type: "DISBURSE", id: selectedReq.id }),
                    onComment: (c) => selectedReq && dispatch({ type: "COMMENT", id: selectedReq.id, comment: c }),
                  }}
                />
              )}
              <div className="mt-6 rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
                  <span className="mt-0.5 inline-block size-2 rounded-full" style={{ background: "var(--signal)" }} />
                  Analyst narration
                  {thinking && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
                      reading
                    </span>
                  )}
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={narration ? `${selectedReq?.id}-done` : "thinking"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {narration ? (
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
                    ) : (
                      <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
                        Reading the ledger...
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          )}
        </main>
      </div>

      <footer className="mt-10 border-t pt-4" style={{ borderColor: "var(--hairline)" }}>
        <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
          Sample data. The score is deterministic; the narration is generated. When LLM_API_KEY is set the narration
          comes from a configured model, otherwise the sandbox explains the same decision. BNR oversight view is planned
          after the lender journey lands.
        </p>
      </footer>
    </div>
  )
}
