import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ThinkingOrb } from "thinking-orbs"
import { ArrowLeft, Play, SkipForward, RotateCcw } from "lucide-react"
import {
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperDescription,
} from "@/components/reui/stepper"
import {
  borrowers,
  computeScore,
  summarizeCashFlow,
  type Borrower,
  type Decision,
} from "./simulation"
import { narrate, hasLiveKey } from "./ai-narration"
import { cn } from "@/lib/utils"

const STEP_LABELS = ["Consent", "Data pull", "Score", "Decision", "Disburse", "Repay", "AI narration"]
const STEP_SECONDS = 10

type StepKey = (typeof STEP_LABELS)[number]

// ---------------------------------------------------------------------------
// Design system tokens (light product-proof — scoped to the demo route)
// ---------------------------------------------------------------------------
const SIGNAL = "#2563eb" // single cool signal color, locked across the page
const INK = "#0b1220"
const MUTED = "#5b6572"
const PAPER = "#f8fafc"
const PANEL = "#ffffff"
const HAIRLINE = "#e4e8ee"

const EASE = [0.16, 1, 0.3, 1] as const

// ---------------------------------------------------------------------------
// Shared atoms
// ---------------------------------------------------------------------------
function SignalDot({ active }: { active?: boolean }) {
  return (
    <span className="relative flex size-2.5">
      {active && <span className="absolute inline-flex size-full animate-ping rounded-full opacity-50" style={{ background: SIGNAL }} />}
      <span className="relative inline-flex size-2.5 rounded-full" style={{ background: active ? SIGNAL : "#c3cad4" }} />
    </span>
  )
}

function StatusLine({ state, label }: { state: OrbState; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <ThinkingOrb size={20} state={state} theme="light" aria-label={label} />
      <span className="text-sm" style={{ color: MUTED }}>
        {label}
      </span>
    </div>
  )
}

type OrbState = "working" | "searching" | "solving" | "listening" | "composing" | "shaping"

const decisionTone: Record<Decision, { fg: string; bg: string; ring: string }> = {
  Approve: { fg: "#0f7a3d", bg: "#e8f7ee", ring: "#b7e6c9" },
  Decline: { fg: "#b42318", bg: "#fdecea", ring: "#f5c1bd" },
  Refer: { fg: "#9a6700", bg: "#fdf5e2", ring: "#efdcb0" },
}

function DecisionBadge({ decision }: { decision: Decision }) {
  const t = decisionTone[decision]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ color: t.fg, background: t.bg, border: `1px solid ${t.ring}` }}
    >
      <SignalDot active />
      {decision}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — Consent
// ---------------------------------------------------------------------------
function ConsentStep({ borrower, onDone }: { borrower: Borrower; onDone: () => void }) {
  const [granted, setGranted] = useState(false)
  useEffect(() => {
    if (!granted) return
    const t = setTimeout(onDone, 1400)
    return () => clearTimeout(t)
  }, [granted, onDone])
  return (
    <div className="space-y-5">
      <p className="max-w-[62ch] text-[15px] leading-relaxed" style={{ color: MUTED }}>
        {borrower.name} consents to sharing <span className="font-semibold" style={{ color: INK }}>6 months of mobile-money history</span> with the
        lender via Open Finance — the legal gate under Law 058/2021.
      </p>
      <button
        onClick={() => setGranted(true)}
        disabled={granted}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]",
          granted ? "opacity-60" : "hover:-translate-y-[1px]",
        )}
        style={granted ? { background: "#e8f7ee", color: "#0f7a3d" } : { background: INK, color: "#fff" }}
      >
        {granted ? "Consent granted" : "Grant consent"}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Data pull (designed cash-flow strip, not a raw table)
// ---------------------------------------------------------------------------
function DataPullStep({ borrower, onDone }: { borrower: Borrower; onDone: () => void }) {
  const rows = borrower.cashFlow
  const [visible, setVisible] = useState(0)
  const reduce = useReducedMotion()
  useEffect(() => {
    if (visible >= rows.length) {
      const t = setTimeout(onDone, 700)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setVisible((v) => v + 1), reduce ? 60 : 380)
    return () => clearTimeout(t)
  }, [visible, rows.length, onDone, reduce])
  const sum = summarizeCashFlow(rows)
  const netPct = Math.max(8, Math.min(96, Math.round((sum.net / Math.max(1, sum.inflow)) * 100)))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Inflow", value: sum.inflowFmt, tone: "#0f7a3d" },
          { label: "Outflow", value: sum.outflowFmt, tone: "#b42318" },
          { label: "Net", value: sum.netFmt, tone: INK },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border p-3.5" style={{ borderColor: HAIRLINE, background: PAPER }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>
              {m.label}
            </div>
            <div className="mt-1 font-mono text-lg font-semibold" style={{ color: m.tone }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border" style={{ borderColor: HAIRLINE }}>
        {rows.slice(0, visible).map((r) => (
          <motion.div
            key={r.id}
            initial={reduce ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="flex items-center justify-between border-b px-4 py-2 last:border-0"
            style={{ borderColor: HAIRLINE }}
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs" style={{ color: MUTED }}>
                {r.date}
              </span>
              <span
                className="inline-flex w-9 justify-center rounded px-1 py-0.5 font-mono text-[10px] font-semibold"
                style={
                  r.type === "in"
                    ? { background: "#e8f7ee", color: "#0f7a3d" }
                    : { background: "#fdecea", color: "#b42318" }
                }
              >
                {r.type === "in" ? "IN" : "OUT"}
              </span>
              <span className="text-sm" style={{ color: INK }}>
                {r.category}
              </span>
            </div>
            <span className={cn("font-mono text-sm font-medium", r.type === "in" ? "text-[#0f7a3d]" : "text-[#b42318]")}>
              {r.amount.toLocaleString("en-US")}
            </span>
          </motion.div>
        ))}
      </div>

      {visible < rows.length && <StatusLine state="searching" label="Pulling consented data…" />}
      {visible >= rows.length && (
        <motion.div initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
          <div className="flex items-center justify-between text-xs" style={{ color: MUTED }}>
            <span className="font-mono uppercase tracking-[0.12em]">Net surplus ratio</span>
            <span className="font-mono" style={{ color: SIGNAL }}>
              {Math.round((sum.net / Math.max(1, sum.inflow)) * 100)}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: "#edf0f4" }}>
            <motion.div
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${netPct}%` }}
              transition={{ duration: 0.6, ease: EASE }}
              className="h-full rounded-full"
              style={{ background: SIGNAL }}
            />
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — Score (tiles + display total)
// ---------------------------------------------------------------------------
function ScoreStep({ borrower, onDone }: { borrower: Borrower; onDone: () => void }) {
  const signals = borrower.signals
  const [shown, setShown] = useState(0)
  const reduce = useReducedMotion()
  const total = useMemo(() => computeScore(borrower).total, [borrower])
  useEffect(() => {
    if (shown >= signals.length) {
      const t = setTimeout(onDone, 1000)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setShown((v) => v + 1), reduce ? 120 : 560)
    return () => clearTimeout(t)
  }, [shown, signals.length, onDone, reduce])

  return (
    <div className="space-y-5">
      {signals.slice(0, shown).map((s, i) => (
        <motion.div
          key={s.key}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: reduce ? 0 : i * 0.04, ease: EASE }}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium" style={{ color: INK }}>
              {s.label}
            </span>
            <span className="font-mono text-xs" style={{ color: MUTED }}>
              {s.value}/100 · weight {(s.weight * 100).toFixed(0)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "#edf0f4" }}>
            <motion.div
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${s.value}%` }}
              transition={{ duration: 0.55, ease: EASE }}
              className="h-full rounded-full"
              style={{ background: SIGNAL }}
            />
          </div>
          <p className="mt-1.5 text-xs leading-relaxed" style={{ color: MUTED }}>
            {s.reason}
          </p>
        </motion.div>
      ))}

      {shown < signals.length && <StatusLine state="solving" label="Scoring cash-flow signals…" />}

      <AnimatePresence>
        {shown >= signals.length && (
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="rounded-xl p-5 text-center"
            style={{ background: "#eef4ff", border: `1px solid #c9dcff` }}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>
              Deterministic score
            </div>
            <div className="mt-1 font-mono text-5xl font-semibold" style={{ color: INK }}>
              {total}
              <span className="text-xl" style={{ color: MUTED }}>
                /100
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4 — Decision (trace timeline + verdict)
// ---------------------------------------------------------------------------
function DecisionStep({ borrower, onDone }: { borrower: Borrower; onDone: () => void }) {
  const trace = borrower.decision.trace
  const [shown, setShown] = useState(0)
  const reduce = useReducedMotion()
  useEffect(() => {
    if (shown >= trace.length) {
      const t = setTimeout(onDone, 1000)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setShown((v) => v + 1), reduce ? 120 : 560)
    return () => clearTimeout(t)
  }, [shown, trace.length, onDone, reduce])

  return (
    <div className="space-y-5">
      <ol className="relative space-y-3 pl-6">
        {trace.slice(0, shown).map((line, i) => (
          <motion.li
            key={i}
            initial={reduce ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="relative text-sm leading-relaxed"
            style={{ color: MUTED }}
          >
            <span
              className="absolute -left-6 top-1.5 flex size-4 items-center justify-center rounded-full font-mono text-[9px] font-semibold"
              style={{ background: "#eef4ff", color: SIGNAL, border: `1px solid #c9dcff` }}
            >
              {i + 1}
            </span>
            {line}
          </motion.li>
        ))}
      </ol>

      {shown < trace.length && <StatusLine state="working" label="Applying policy rules…" />}

      <AnimatePresence>
        {shown >= trace.length && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="flex items-center justify-between gap-4 rounded-xl border p-4"
            style={{ borderColor: HAIRLINE, background: PAPER }}
          >
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>
                Terms
              </div>
              <div className="mt-0.5 text-sm font-semibold" style={{ color: INK }}>
                {borrower.decision.limit}
              </div>
            </div>
            <DecisionBadge decision={borrower.decision.decision} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 5 — Disburse (rail visualization)
// ---------------------------------------------------------------------------
function DisburseStep({ borrower, onDone }: { borrower: Borrower; onDone: () => void }) {
  const [state, setState] = useState<"idle" | "moving" | "done">("idle")
  const reduce = useReducedMotion()
  useEffect(() => {
    if (state === "idle") {
      const t = setTimeout(() => setState("moving"), 400)
      return () => clearTimeout(t)
    }
    if (state === "moving") {
      const t = setTimeout(() => setState("done"), reduce ? 400 : 2000)
      return () => clearTimeout(t)
    }
    if (state === "done") {
      const t = setTimeout(onDone, 800)
      return () => clearTimeout(t)
    }
  }, [state, onDone, reduce])
  return (
    <div className="space-y-5">
      <div className="rounded-xl border p-4" style={{ borderColor: HAIRLINE, background: PAPER }}>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium" style={{ color: INK }}>
            eKash rail
          </span>
          <span className="font-mono text-xs" style={{ color: MUTED }}>
            RWF20 flat
          </span>
        </div>
        <div className="relative mt-4 h-1.5 overflow-hidden rounded-full" style={{ background: "#edf0f4" }}>
          <motion.div
            initial={reduce ? { width: "100%", left: 0 } : { left: 0 }}
            animate={
              reduce
                ? undefined
                : { left: ["0%", "100%"] }
            }
            transition={{ duration: 1.6, ease: "easeInOut", repeat: state === "moving" ? Infinity : 0 }}
            className="absolute top-0 h-full w-8 rounded-full"
            style={{ background: SIGNAL }}
          />
          {state === "done" && <motion.div className="h-full rounded-full" style={{ background: SIGNAL }} initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.5, ease: EASE }} />}
        </div>
      </div>
      {state !== "done" ? (
        <StatusLine state="working" label="Disbursing via eKash…" />
      ) : (
        <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
          {borrower.requested.toLocaleString("en-US")} RWF sent to {borrower.name}'s wallet — one integration, whole ecosystem.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 6 — Repay (instalment record → the moat)
// ---------------------------------------------------------------------------
function RepayStep({ borrower, onDone }: { borrower: Borrower; onDone: () => void }) {
  const [months, setMonths] = useState(0)
  const reduce = useReducedMotion()
  const monthly = Math.round(borrower.requested / 6)
  useEffect(() => {
    if (months >= 6) {
      const t = setTimeout(onDone, 800)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setMonths((m) => m + 1), reduce ? 100 : 800)
    return () => clearTimeout(t)
  }, [months, onDone, reduce])
  return (
    <div className="space-y-5">
      {months < 6 && <StatusLine state="working" label="Collecting repayments over eKash…" />}
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.05, ease: EASE }}
            className="flex h-16 items-end justify-center rounded-lg border pb-2"
            style={
              i < months
                ? { borderColor: SIGNAL, background: "#eef4ff" }
                : { borderColor: HAIRLINE, background: PAPER }
            }
          >
            <span className="font-mono text-[10px]" style={{ color: i < months ? SIGNAL : MUTED }}>
              {i < months ? `M${i + 1}` : "—"}
            </span>
          </motion.div>
        ))}
      </div>
      {months >= 6 && (
        <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
          {monthly.toLocaleString("en-US")} RWF/month recorded on {borrower.name}'s shared credit record — history now counts toward a faster, cheaper
          next decision.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 7 — AI narration
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
      const t = setTimeout(onDone, 2400)
      return () => clearTimeout(t)
    }
  }, [narration, onDone])
  if (!narration)
    return <StatusLine state={hasLiveKey() ? "composing" : "working"} label={hasLiveKey() ? "AI analyst is explaining the decision…" : "Building the lender explanation…"} />
  return (
    <motion.div
      initial={useReducedMotion() ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="space-y-4 rounded-xl border p-5"
      style={{ borderColor: "#c9dcff", background: "#eef4ff" }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>
          AI narration
        </span>
        <span className="rounded-full px-2 py-0.5 font-mono text-[10px]" style={{ background: PAPER, border: `1px solid ${HAIRLINE}`, color: MUTED }}>
          {hasLiveKey() ? "live model" : "simulated"}
        </span>
      </div>
      <p className="text-[15px] font-medium leading-relaxed" style={{ color: INK }}>
        {narration.summary}
      </p>
      <ul className="space-y-2">
        {narration.points.map((p, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: MUTED }}>
            <SignalDot active />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <p className="text-sm font-semibold" style={{ color: INK }}>
        {narration.recommendation}
      </p>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Simulation shell — stepper + auto-advance + skip
// ---------------------------------------------------------------------------
function SimulationShell({ borrower, onRunAgain }: { borrower: Borrower; onRunAgain: () => void }) {
  const [step, setStep] = useState(0)
  const [running, setRunning] = useState(false)
  const doneRef = useRef<Set<StepKey>>(new Set())
  const reduce = useReducedMotion()

  const advance = useCallback(() => setStep((s) => (s >= STEP_LABELS.length - 1 ? s : s + 1)), [])
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

      <motion.div
        key={step}
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="relative rounded-2xl border p-6"
        style={{ borderColor: HAIRLINE, background: PANEL }}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>
              <span style={{ color: SIGNAL }}>{String(step + 1).padStart(2, "0")}</span> / {STEP_LABELS.length} · {stepKey}
            </div>
            <h3 className="mt-1 text-lg font-semibold tracking-tight" style={{ color: INK }}>
              {stepKey}
            </h3>
          </div>
          {running && (
            <button
              onClick={() => markDone(stepKey)}
              className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all active:scale-[0.98] hover:bg-muted/20"
              style={{ borderColor: HAIRLINE, color: MUTED }}
            >
              <SkipForward className="size-3.5" /> Skip
            </button>
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
            className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all hover:-translate-y-[1px] active:scale-[0.98]"
            style={{ background: INK, color: "#fff" }}
          >
            <Play className="size-4" /> Run simulation
          </button>
        )}
        {!running && step >= STEP_LABELS.length - 1 && (
          <button
            onClick={onRunAgain}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:-translate-y-[1px] active:scale-[0.98]"
            style={{ borderColor: HAIRLINE, color: INK }}
          >
            <RotateCcw className="size-4" /> Run again
          </button>
        )}
      </motion.div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Demo page
// ---------------------------------------------------------------------------
export default function DemoApp() {
  const [selectedId, setSelectedId] = useState<string>("trader")
  const [runId, setRunId] = useState(0)
  const reduce = useReducedMotion()

  return (
    <div className="min-h-screen" data-demo-root style={{ background: PAPER }}>
      <style>{`
        [data-demo-root] {
          --primary: ${INK};
          --primary-foreground: #ffffff;
          --accent: ${PAPER};
          --accent-foreground: ${INK};
          --muted: #eef1f5;
          --muted-foreground: ${MUTED};
          --border: ${HAIRLINE};
          --ring: ${SIGNAL};
          --background: ${PAPER};
          --foreground: ${INK};
          --card: ${PANEL};
          --card-foreground: ${INK};
        }
        [data-demo-root] .dark,
        [data-demo-root] * { color-scheme: light; }
      `}</style>
      <header className="sticky top-0 z-50 border-b backdrop-blur-md" style={{ borderColor: HAIRLINE, background: "rgba(248,250,252,0.85)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-3.5">
          <button onClick={() => (window.location.hash = "")} className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70" style={{ color: INK }}>
            <ArrowLeft className="size-4" /> Project Dashboards
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>
            Underwriting simulation
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl" style={{ color: INK }}>
            Watch a loan decision happen
          </h1>
          <p className="mt-2 max-w-[58ch] text-[15px] leading-relaxed" style={{ color: MUTED }}>
            A deterministic underwriting engine on sample mobile-money data. Every decision is shown, explained, and traceable — the AI narrates, it never decides.
          </p>
        </div>

        <div className="mb-8">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>
            Select a borrower
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {borrowers.map((b) => {
              const active = selectedId === b.id
              return (
                <motion.button
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: reduce ? 0 : 0.05, ease: EASE }}
                  className="rounded-2xl border p-4 text-left transition-all active:scale-[0.98]"
                  style={{
                    borderColor: active ? SIGNAL : HAIRLINE,
                    background: active ? "#eef4ff" : PANEL,
                    boxShadow: active ? `0 0 0 1px ${SIGNAL} inset` : "none",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-9 items-center justify-center rounded-lg text-sm font-bold text-white"
                      style={{ background: b.avatarHue }}
                    >
                      {b.name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold" style={{ color: INK }}>
                        {b.name}
                      </div>
                      <div className="truncate text-xs" style={{ color: MUTED }}>
                        {b.business}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <DecisionBadge decision={b.decision.decision} />
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>

        <SimulationShell key={runId} borrower={borrowers.find((b) => b.id === selectedId)!} onRunAgain={() => setRunId((r) => r + 1)} />
      </main>
    </div>
  )
}
