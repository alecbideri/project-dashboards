import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Database, Sparkle, SwapIcon } from "@phosphor-icons/react"
import { borrowers } from "./lib/data"
import type { Borrower } from "./lib/data"
import { narrate, hasLiveKey } from "./lib/narration"
import type { Narration } from "./lib/narration"
import { NDFSPWorkbench, ndfspIntro } from "./personas/NDFSPWorkbench"
import { MFISACCO, mfiIntro } from "./personas/MFISACCO"
import { VerticalSaaS, saasIntro } from "./personas/VerticalSaaS"

type Persona = "ndfsp" | "mfi" | "saas"

const personas: Array<{ id: Persona; label: string; byline: string; intro: string }> = [
  { id: "ndfsp", label: "NDFSP", byline: "Digital lender", intro: ndfspIntro },
  { id: "mfi", label: "MFI / SACCO", byline: "Scoring surface", intro: mfiIntro },
  { id: "saas", label: "Vertical SaaS", byline: "Embedded widget", intro: saasIntro },
]

function PersonaScreen({ persona, borrower }: { persona: Persona; borrower: Borrower }) {
  if (persona === "ndfsp") return <NDFSPWorkbench borrower={borrower} />
  if (persona === "mfi") return <MFISACCO borrower={borrower} />
  return <VerticalSaaS borrower={borrower} />
}

export default function App() {
  const [persona, setPersona] = useState<Persona>("ndfsp")
  const [borrowerId, setBorrowerId] = useState(borrowers[0].id)
  const [narration, setNarration] = useState<Narration | null>(null)
  const [thinking, setThinking] = useState(false)

  const borrower = useMemo(() => borrowers.find((b) => b.id === borrowerId) ?? borrowers[0], [borrowerId])
  const active = personas.find((p) => p.id === persona)!

  useEffect(() => {
    let alive = true
    setThinking(true)
    setNarration(null)
    narrate(borrower)
      .then((n) => {
        if (alive) setNarration(n)
      })
      .finally(() => {
        if (alive) setThinking(false)
      })
    return () => {
      alive = false
    }
  }, [borrower])

  return (
    <div className="mx-auto min-h-dvh w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
          <span
            className="inline-flex size-7 items-center justify-center rounded-lg"
            style={{ background: "var(--signal)", color: "#f7f9fc" }}
          >
            <Database className="size-4" weight="fill" />
          </span>
          EmbeddedLend
          <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
            product demo
          </span>
        </div>
        <h1 className="mt-4 max-w-2xl text-2xl font-semibold leading-snug sm:text-3xl" style={{ color: "var(--ink)" }}>
          SME credit, decided by cash flow, delivered inside the tools lenders already use.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          {active.intro} Three surfaces on the same decision engine. Pick a persona, switch the borrower, read the
          narration.
        </p>
        <span
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ background: "var(--signal-soft)", color: "var(--signal)", border: "1px solid var(--signal-border)" }}
        >
          <Sparkle className="size-3.5" weight="fill" /> narration {hasLiveKey ? "LLM" : "sandbox"}
        </span>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>
          Persona
        </span>
        {personas.map((p) => {
          const activePersona = p.id === persona
          return (
            <button
              key={p.id}
              onClick={() => setPersona(p.id)}
              className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: activePersona ? "var(--ink)" : "var(--panel)",
                  color: activePersona ? "#f7f9fc" : "var(--body)",
                  border: `1px solid ${activePersona ? "transparent" : "var(--hairline)"}`,
                }}
            >
              {p.label}
              <span className="ml-1.5 hidden font-mono text-[10px] opacity-70 sm:inline">{p.byline}</span>
            </button>
          )
        })}
        <span className="mx-2 inline-flex size-4 items-center justify-center" style={{ color: "var(--muted)" }}>
          <SwapIcon className="size-4" />
        </span>
        <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>
          Borrower
        </span>
        <div className="flex flex-wrap gap-2">
          {borrowers.map((b) => {
            const activeB = b.id === borrowerId
            return (
              <button
                key={b.id}
                onClick={() => setBorrowerId(b.id)}
                className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  background: activeB ? "var(--signal-soft)" : "transparent",
                  color: activeB ? "var(--signal)" : "var(--body)",
                  border: `1px solid ${activeB ? "var(--signal-border)" : "var(--hairline)"}`,
                }}
              >
                {b.name}
              </button>
            )
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${persona}-${borrower.id}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <PersonaScreen persona={persona} borrower={borrower} />
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
          <Sparkle className="size-4" weight="fill" style={{ color: "var(--signal)" }} />
          Analyst narration
          {thinking && <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>reading</span>}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={narration ? borrower.id + "done" : "thinking"}
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

      <footer className="mt-10 border-t pt-4" style={{ borderColor: "var(--hairline)" }}>
        <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
          Sample data. The score is deterministic; the narration is generated. When LLM_API_KEY is set the narration
          comes from a configured model, otherwise the sandbox explains the same decision.
        </p>
      </footer>
    </div>
  )
}
