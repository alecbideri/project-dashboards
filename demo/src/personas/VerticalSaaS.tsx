import { createContext, useContext, useReducer, useEffect, useState, type Dispatch } from "react"
import { Globe, Lightning, LockKey, ChartLine, HandCoins, Storefront, SwapIcon, CheckCircle, ShieldCheck } from "@phosphor-icons/react"
import type { Borrower, SuggestedTerms } from "../lib/data"
import { borrowers, scoreOf, summarize } from "../lib/data"
import { affordability, monthlyPayment } from "../lib/engine"
import { narrate } from "../lib/narration"
import type { Narration } from "../lib/narration"
import { fmt } from "../lib/utils"
import { saasReducer, emptySaasState, selectMerchant } from "../lib/store"
import type { SaasAction, SaasState } from "../lib/store"
import { DecisionBadge, StatCell } from "../components/primitives"
import { CashFlowAnalysis, BorrowerNotice } from "./NDFSPWorkbench"

type SaasContextValue = [SaasState, Dispatch<SaasAction>]
const SaasContext = createContext<SaasContextValue | null>(null)

function useSaas() {
  const ctx = useContext(SaasContext)
  if (!ctx) throw new Error("SaasContext missing")
  return ctx
}

function merchantOf(id: string): Borrower {
  return borrowers.find((b) => b.id === id)!
}

const statusLabel: Record<string, string> = {
  new: "requested",
  consent: "consent",
  scored: "offer ready",
  accepted: "disbursed",
  declined: "declined",
}

function MerchantRail({ selectedId, onOpen }: { selectedId: string | null; onOpen: (id: string) => void }) {
  const [state] = useSaas()
  return (
    <div className="rounded-2xl border" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
      <div className="flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold" style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}>
        <Storefront className="size-4" style={{ color: "var(--signal)" }} />
        Merchants
        <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
          on the platform
        </span>
      </div>
      <div className="max-h-[560px] overflow-y-auto">
        {state.merchants.map((m) => {
          const b = merchantOf(m.borrowerId)
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
                <span className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: m.status === "accepted" ? "#0f7a3d" : m.status === "declined" ? "#b42318" : "var(--muted)" }}>
                  {statusLabel[m.status]}
                </span>
              </div>
              <div className="mt-0.5 truncate text-xs" style={{ color: "var(--muted)" }}>
                {b.business}
              </div>
              <div className="mt-1 font-mono text-xs" style={{ color: "var(--body)" }}>
                RWF {fmt(b.requested)}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// The SaaS chrome frame: a merchant dashboard shell the widget lives inside.
function SaasShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
      <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: "var(--hairline)", background: "var(--paper)" }}>
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
          <span className="inline-flex size-6 items-center justify-center rounded-lg" style={{ background: "var(--ink)", color: "#f7f9fc" }}>
            <Storefront className="size-3.5" weight="fill" />
          </span>
          Kayko Retail
          <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
            merchant workspace
          </span>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ background: "var(--signal-soft)", color: "var(--signal)", border: "1px solid var(--signal-border)" }}
        >
          <Globe className="size-3.5" /> financing by EmbeddedLend
        </span>
      </div>
      <div className="flex items-center gap-1 border-b px-4 py-2" style={{ borderColor: "var(--hairline)" }}>
        {["Dashboard", "Orders", "Inventory", "Financing"].map((tab) => (
          <span
            key={tab}
            className="rounded-lg px-2.5 py-1 text-xs font-medium"
            style={{
              background: tab === "Financing" ? "var(--signal-soft)" : "transparent",
              color: tab === "Financing" ? "var(--signal)" : "var(--muted)",
            }}
          >
            {tab}
          </span>
        ))}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function WidgetFlow({ merchant, borrower }: { merchant: { borrowerId: string; status: string; decision?: "Approve" | "Decline" | "Refer"; terms: SuggestedTerms }; borrower: Borrower }) {
  const [, dispatch] = useSaas()
  const score = scoreOf(borrower)
  const sum = summarize(borrower.cashFlow)
  const pay = monthlyPayment(merchant.terms)
  const aff = affordability(merchant.terms, borrower.cashFlow)
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
                Working capital for {borrower.business}
              </h3>
              <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>
                {borrower.name} requested RWF {fmt(borrower.requested)} from inside the merchant dashboard.
              </p>
            </div>
            {merchant.decision ? <DecisionBadge decision={merchant.decision} /> : <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>{statusLabel[merchant.status]}</span>}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <StatCell label="Score" value={`${score}/100`} />
            <StatCell label="Inflow" value={`RWF ${fmt(sum.inflow)}`} />
            <StatCell label="Net surplus" value={`RWF ${fmt(sum.net)}`} />
          </div>

          {merchant.status === "scored" && (
            <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
              <LockKey className="size-4" style={{ color: "var(--signal)" }} /> The widget read only consented payment history. Nothing else.
            </div>
          )}
        </div>

        {merchant.status === "accepted" && (
          <div className="rounded-2xl p-5" style={{ background: "#e8f7ee", border: "1px solid #b7e6c9" }}>
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#0f7a3d" }}>
              <CheckCircle className="size-4" weight="fill" /> Disbursed over eKash
            </div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "#2f3a4d" }}>
              RWF {fmt(merchant.terms.amount)} sent to {borrower.name}'s mobile money. First installment RWF {fmt(pay.installment)}, {merchant.terms.termMonths} months. RWF20 flat, one integration.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-6 lg:col-span-5">
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
            <HandCoins className="size-4" weight="fill" style={{ color: "var(--signal)" }} />
            The offer
          </div>

          {merchant.status === "new" && (
            <div className="mt-4 space-y-3">
              <p className="text-sm leading-relaxed" style={{ color: "var(--body)" }}>
                {borrower.name} started a financing request from the merchant dashboard. The widget needs consent before it reads any data.
              </p>
              <button
                onClick={() => dispatch({ type: "SAAS_CONSENT", id: merchant.borrowerId })}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
                style={{ background: "var(--ink)", color: "#f7f9fc" }}
              >
                <LockKey className="size-4" weight="fill" /> Ask {borrower.name} to consent
              </button>
            </div>
          )}

          {merchant.status === "consent" && (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl p-4" style={{ background: "var(--signal-soft)", border: "1px solid var(--signal-border)" }}>
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--signal)" }}>
                  <ChartLine className="size-4" weight="fill" /> Reading the ledger
                </div>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--body)" }}>
                  Consent given. The widget is pulling 6 months of mobile-money history to score the request.
                </p>
              </div>
              <button
                onClick={() => dispatch({ type: "SAAS_SCORE", id: merchant.borrowerId })}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
                style={{ background: "var(--ink)", color: "#f7f9fc" }}
              >
                Run the score
              </button>
            </div>
          )}

          {merchant.status === "scored" && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--hairline)" }}>
                <span className="text-sm" style={{ color: "var(--muted)" }}>Offer</span>
                <span className="font-mono text-base font-semibold" style={{ color: "var(--ink)" }}>
                  RWF {fmt(merchant.terms.amount)} · {merchant.terms.termMonths} mo
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--muted)" }}>Rate</span>
                <span className="font-mono" style={{ color: "var(--ink)" }}>{merchant.terms.rateMonthly}%/mo</span>
              </div>
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
                  onClick={() => dispatch({ type: "SAAS_ACCEPT", id: merchant.borrowerId })}
                  className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
                  style={{ background: "#0f7a3d", color: "#f7f9fc" }}
                >
                  Accept
                </button>
                <button
                  onClick={() => dispatch({ type: "SAAS_DECLINE", id: merchant.borrowerId })}
                  className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
                  style={{ background: "#fdecea", color: "#b42318", border: "1px solid #f5c1bd" }}
                >
                  Decline offer
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                <ShieldCheck className="size-4" /> Consent verified · Law 058/2021
              </div>
            </div>
          )}

          {merchant.status === "accepted" && (
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              The merchant accepted. Funds leave over eKash in seconds; the borrower repays in installments inside the same app.
            </p>
          )}

          {merchant.status === "declined" && (
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              The offer was declined by the engine. {borrower.name} is notified with the reason and a data-correction path.
            </p>
          )}
        </div>

        {merchant.status === "scored" && (
          <div className="flex flex-col gap-2 text-xs" style={{ color: "var(--muted)" }}>
            <span className="inline-flex items-center gap-1.5">
              <Lightning className="size-4" style={{ color: "var(--signal)" }} /> Decision in seconds, not weeks
            </span>
            <span className="inline-flex items-center gap-1.5">
              <SwapIcon className="size-4" style={{ color: "var(--signal)" }} /> The merchant never leaves the app
            </span>
          </div>
        )}

        {(merchant.status === "accepted" || merchant.status === "declined") && (
          <BorrowerNotice borrower={borrower} decision={merchant.decision!} />
        )}
      </div>
    </div>
  )
}

function SaasNarration({ borrower }: { borrower: Borrower }) {
  const [narration, setNarration] = useState<Narration | null>(null)
  useEffect(() => {
    let alive = true
    narrate(borrower, { decision: borrower.decision, terms: borrower.suggested })
      .then((n) => {
        if (alive) setNarration(n)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [borrower])
  return (
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
  )
}

export function VerticalSaaS() {
  const [state, dispatch] = useReducer(saasReducer, emptySaasState)
  const selected = selectMerchant(state, state.selectedId)
  const merchant = selected?.merchant
  const borrower = selected?.borrower

  return (
    <SaasContext.Provider value={[state, dispatch]}>
      <div className="grid gap-6 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <MerchantRail selectedId={state.selectedId} onOpen={(id) => dispatch({ type: "SAAS_OPEN", id })} />
        </aside>

        <main className="space-y-6 lg:col-span-9">
          {borrower && merchant && (
            <>
              <SaasShell>
                <WidgetFlow merchant={merchant} borrower={borrower} />
              </SaasShell>

              <CashFlowAnalysis borrower={borrower} />

              <SaasNarration borrower={borrower} />
            </>
          )}
        </main>
      </div>
    </SaasContext.Provider>
  )
}

export const saasIntro = "An embedded widget a vertical SaaS drops into its own product. The merchant requests working capital, consents, gets scored and accepts, all inside the merchant app."
