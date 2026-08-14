import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Play, SkipForward, Check, ShieldCheck, RotateCcw } from "lucide-react"
import {
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperDescription,
  StepperPanel,
  StepperContent,
  StepperNav,
  useStepper,
  useStepItem,
} from "@/components/reui/stepper"
import {
  borrowers,
  computeScore,
  summarizeCashFlow,
  type Borrower,
  type CashFlowRow,
  type Decision,
} from "./simulation"
import { narrate, hasLiveKey } from "./ai-narration"
import { cn } from "@/lib/utils"

const STEP_SECONDS = 10
const STEP_LABELS = ["Consent", "Data pull", "Score", "Decision", "Disburse", "Repay", "AI narration"]

type StepKey = (typeof STEP_LABELS)[number]

function ThinkingOrbs({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative flex size-4">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex size-4 rounded-full bg-primary" />
      </span>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  )
}

function DecisionBadge({ decision }: { decision: Decision }) {
  const styles: Record<Decision, string> = {
    Approve: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    Decline: "bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30",
    Refer: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
  }
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", styles[decision])}>
      {decision}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Step 1: Consent
// ---------------------------------------------------------------------------
function ConsentStep({ borrower, onDone }: { borrower: Borrower; onDone: () => void }) {
  const [granted, setGranted] = useState(false)
  useEffect(() => {
    if (!granted) return
    const t = setTimeout(onDone, 1400)
    return () => clearTimeout(t)
  }, [granted, onDone])
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {borrower.name} consents to sharing <strong className="text-foreground">6 months of mobile-money history</strong> with the lender via
        Open Finance. Consent is the legal gate — Law 058/2021 and GDPR-style rights.
      </p>
      <button
        onClick={() => setGranted(true)}
        disabled={granted}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
      >
        <ShieldCheck className="size-4 text-primary" /> {granted ? "Consent granted" : "Grant consent"}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2: Data pull — streams ledger rows in
// ---------------------------------------------------------------------------
function DataPullStep({ borrower, onDone }: { borrower: Borrower; onDone: () => void }) {
  const rows = borrower.cashFlow
  const [visible, setVisible] = useState(0)
  useEffect(() => {
    if (visible >= rows.length) {
      const t = setTimeout(onDone, 800)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setVisible((v) => v + 1), 420)
    return () => clearTimeout(t)
  }, [visible, rows.length, onDone])
  const sum = summarizeCashFlow(rows)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-md border border-border bg-card px-2 py-1">Inflow: {sum.inflowFmt}</span>
        <span className="rounded-md border border-border bg-card px-2 py-1">Outflow: {sum.outflowFmt}</span>
        <span className="rounded-md border border-border bg-card px-2 py-1">Net: {sum.netFmt}</span>
      </div>
      <div className="max-h-56 overflow-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, visible).map((r) => (
              <tr key={r.id} className="border-t border-border/60">
                <td className="px-3 py-1.5 text-xs">{r.date}</td>
                <td className={cn("px-3 py-1.5 text-xs font-medium", r.type === "in" ? "text-emerald-600 dark:text-emerald-300" : "text-red-500 dark:text-red-300")}>
                  {r.type === "in" ? "IN" : "OUT"}
                </td>
                <td className="px-3 py-1.5 text-xs">{r.category}</td>
                <td className="px-3 py-1.5 text-right text-xs">{r.amount.toLocaleString("en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visible < rows.length && <ThinkingOrbs label="Pulling consented data…" />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3: Score — factors tick in
// ---------------------------------------------------------------------------
function ScoreStep({ borrower, onDone }: { borrower: Borrower; onDone: () => void }) {
  const signals = borrower.signals
  const [shown, setShown] = useState(0)
  const total = useMemo(() => computeScore(borrower).total, [borrower])
  useEffect(() => {
    if (shown >= signals.length) {
      const t = setTimeout(onDone, 1000)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setShown((v) => v + 1), 620)
    return () => clearTimeout(t)
  }, [shown, signals.length, onDone])
  const running = signals.slice(0, shown).reduce((s, x) => s + x.value * x.weight, 0)
  return (
    <div className="space-y-3">
      {signals.slice(0, shown).map((s) => (
        <div key={s.key} className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">{s.label}</span>
            <span className="font-mono text-xs text-muted-foreground">{s.value}/100 · weight {(s.weight * 100).toFixed(0)}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${s.value}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{s.reason}</p>
        </div>
      ))}
      {shown < signals.length && <ThinkingOrbs label="Scoring cash-flow signals…" />}
      {shown >= signals.length && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-center">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Deterministic score</div>
          <div className="text-4xl font-semibold text-foreground">{total}/100</div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4: Decision — trace lines write out
// ---------------------------------------------------------------------------
function DecisionStep({ borrower, onDone }: { borrower: Borrower; onDone: () => void }) {
  const trace = borrower.decision.trace
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (shown >= trace.length) {
      const t = setTimeout(onDone, 1000)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setShown((v) => v + 1), 620)
    return () => clearTimeout(t)
  }, [shown, trace.length, onDone])
  return (
    <div className="space-y-3">
      {trace.slice(0, shown).map((line, i) => (
        <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
          <Check className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>{line}</span>
        </div>
      ))}
      {shown < trace.length && <ThinkingOrbs label="Applying policy rules…" />}
      {shown >= trace.length && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Decision</div>
            <div className="text-lg font-semibold text-foreground">{borrower.decision.limit}</div>
          </div>
          <DecisionBadge decision={borrower.decision.decision} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 5: Disburse — eKash rail pulses
// ---------------------------------------------------------------------------
function DisburseStep({ borrower, onDone }: { borrower: Borrower; onDone: () => void }) {
  const [state, setState] = useState<"idle" | "moving" | "done">("idle")
  useEffect(() => {
    if (state === "idle") {
      const t = setTimeout(() => setState("moving"), 500)
      return () => clearTimeout(t)
    }
    if (state === "moving") {
      const t = setTimeout(() => setState("done"), 2200)
      return () => clearTimeout(t)
    }
    if (state === "done") {
      const t = setTimeout(onDone, 900)
      return () => clearTimeout(t)
    }
  }, [state, onDone])
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-sm">
        <span className="font-medium text-foreground">eKash rail</span>
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full bg-primary", state !== "idle" && "animate-pulse")} style={{ width: state === "done" ? "100%" : "35%" }} />
        </div>
        <span className="font-mono text-xs text-muted-foreground">RWF20 flat</span>
      </div>
      {state !== "done" ? (
        <ThinkingOrbs label="Disbursing via eKash…" />
      ) : (
        <p className="text-sm text-muted-foreground">
          {borrower.requested.toLocaleString("en-US")} RWF sent to {borrower.name}'s wallet in seconds — one integration, whole ecosystem.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 6: Repay — repayment timeline feeds the moat
// ---------------------------------------------------------------------------
function RepayStep({ borrower, onDone }: { borrower: Borrower; onDone: () => void }) {
  const [months, setMonths] = useState(0)
  const monthly = Math.round(borrower.requested / 6)
  useEffect(() => {
    if (months >= 6) {
      const t = setTimeout(onDone, 900)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setMonths((m) => m + 1), 800)
    return () => clearTimeout(t)
  }, [months, onDone])
  return (
    <div className="space-y-3">
      {months < 6 && <ThinkingOrbs label="Collecting repayments over eKash…" />}
      {months >= 1 && (
        <p className="text-sm text-muted-foreground">
          Repayment history feeds back into future scores — this is the moat: {months}/6 instalments recorded on {borrower.name}'s shared credit record.
        </p>
      )}
      <div className="flex gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn("h-8 flex-1 rounded-md border", i < months ? "border-primary bg-primary/20" : "border-border bg-muted/30")} />
        ))}
      </div>
      {months >= 6 && (
        <p className="text-xs text-muted-foreground">
          {monthly.toLocaleString("en-US")} RWF/month · history now counts toward the borrower's next, cheaper, faster decision.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 7: AI narration
// ---------------------------------------------------------------------------
function NarrationStep({ borrower, onDone }: { borrower: Borrower; onDone: () => void }) {
  const [narration, setNarration] = useState<{ summary: string; points: string[]; recommendation: string } | null>(null)
  const score = useMemo(() => computeScore(borrower), [borrower])
  useEffect(() => {
    let alive = true
    narrate(borrower, score).then((n) => alive && setNarration(n))
    return () => {
      alive = false
    }
  }, [borrower, score])
  useEffect(() => {
    if (narration) {
      const t = setTimeout(onDone, 2000)
      return () => clearTimeout(t)
    }
  }, [narration, onDone])
  if (!narration) return <ThinkingOrbs label={hasLiveKey() ? "AI analyst is explaining the decision…" : "Building the lender explanation…"} />
  return (
    <div className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">AI narration · numbers computed by code</span>
        <span className="text-xs text-muted-foreground">{hasLiveKey() ? "live model" : "simulated"}</span>
      </div>
      <p className="text-sm text-foreground">{narration.summary}</p>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {narration.points.map((p, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
            {p}
          </li>
        ))}
      </ul>
      <p className="text-sm font-medium text-foreground">{narration.recommendation}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// The simulation shell — stepper + 10s auto + skip
// ---------------------------------------------------------------------------
function SimulationShell({ borrower }: { borrower: Borrower }) {
  const [step, setStep] = useState(0)
  const [running, setRunning] = useState(false)
  const doneRef = useRef<Set<StepKey>>(new Set())

  const advance = useCallback(() => {
    setStep((s) => (s >= STEP_LABELS.length - 1 ? s : s + 1))
  }, [])

  const markDone = useCallback(
    (key: StepKey) => {
      doneRef.current.add(key)
      if (doneRef.current.size >= STEP_LABELS.length) {
        setRunning(false)
        return
      }
      advance()
    },
    [advance],
  )

  const start = useCallback(() => {
    doneRef.current = new Set()
    setStep(0)
    setRunning(true)
  }, [])

  // Auto-advance per step: each step's internal work calls markDone when finished,
  // and the 10s timer forces a skip if the step hasn't finished.
  const stepKey = STEP_LABELS[step]
  useEffect(() => {
    if (!running) return
    const t = setTimeout(() => markDone(stepKey), STEP_SECONDS * 1000)
    return () => clearTimeout(t)
  }, [running, step, stepKey, markDone])

  return (
    <div className="space-y-6">
      <Stepper defaultValue={0} value={step} onValueChange={(v) => typeof v === "number" && setStep(v)} orientation="horizontal">
        {STEP_LABELS.map((label, i) => (
          <StepperItem key={label} step={i}>
            <StepperTrigger>
              <StepperIndicator />
              <div className="hidden text-left md:block">
                <StepperTitle>{label}</StepperTitle>
                <StepperDescription>{i === STEP_LABELS.length - 1 ? "explains the why" : `step ${i + 1} of ${STEP_LABELS.length}`}</StepperDescription>
              </div>
            </StepperTrigger>
            {i < STEP_LABELS.length - 1 && <StepperSeparator />}
          </StepperItem>
        ))}
      </Stepper>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              {String(step + 1).padStart(2, "0")} — {stepKey}
            </div>
            <h3 className="text-lg font-semibold text-foreground">{stepKey}</h3>
          </div>
          {running && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>auto-advances in ~{STEP_SECONDS}s</span>
              <button
                onClick={() => markDone(stepKey)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 font-medium transition-colors hover:bg-muted"
              >
                <SkipForward className="size-3.5" /> Skip
              </button>
            </div>
          )}
        </div>

        {step === 0 && <ConsentStep borrower={borrower} onDone={() => markDone("Consent")} />}
        {step === 1 && <DataPullStep borrower={borrower} onDone={() => markDone("Data pull")} />}
        {step === 2 && <ScoreStep borrower={borrower} onDone={() => markDone("Score")} />}
        {step === 3 && <DecisionStep borrower={borrower} onDone={() => markDone("Decision")} />}
        {step === 4 && <DisburseStep borrower={borrower} onDone={() => markDone("Disburse")} />}
        {step === 5 && <RepayStep borrower={borrower} onDone={() => markDone("Repay")} />}
        {step === 6 && <NarrationStep borrower={borrower} onDone={() => markDone("AI narration")} />}

        {!running && step === 0 && (
          <button
            onClick={start}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Play className="size-4" /> Run the simulation
          </button>
        )}
        {!running && step >= STEP_LABELS.length - 1 && (
          <button
            onClick={start}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <RotateCcw className="size-4" /> Run again
          </button>
        )}
      </div>
    </div>
  )
}

export default function DemoApp() {
  const [selectedId, setSelectedId] = useState<string>("trader")

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-3">
          <button onClick={() => (window.location.hash = "")} className="flex items-center gap-2 text-foreground">
            <ArrowLeft className="size-4" />
            <span className="text-sm font-semibold">Project Dashboards</span>
          </button>
          <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Underwriting simulation · EmbeddedLend</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Watch a loan decision happen</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A deterministic underwriting engine on dummy mobile-money data. Every decision is shown, explained, and traceable — the AI narrates, it never decides.
          </p>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {borrowers.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedId(b.id)}
              className={cn(
                "rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/50",
                selectedId === b.id && "border-primary bg-primary/5",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: b.avatarHue }}>
                  {b.name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{b.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{b.business}</div>
                </div>
              </div>
              <div className="mt-3">
                <DecisionBadge decision={b.decision.decision} />
              </div>
            </button>
          ))}
        </div>

        <SimulationShell borrower={borrowers.find((b) => b.id === selectedId)!} />
      </main>
    </div>
  )
}
