import { useEffect, useRef, useState, type ReactNode } from "react"
import { Check, ArrowRight, Question } from "@phosphor-icons/react"
import type { Decision } from "../lib/data"
import type { RequestStatus } from "../lib/store"

const decisionTone: Record<Decision, { fg: string; bg: string; ring: string }> = {
  Approve: { fg: "#0f7a3d", bg: "#e8f7ee", ring: "#b7e6c9" },
  Decline: { fg: "#b42318", bg: "#fdecea", ring: "#f5c1bd" },
  Refer: { fg: "#9a6700", bg: "#fdf5e2", ring: "#efdcb0" },
}

const statusTone: Record<RequestStatus, { fg: string; bg: string; ring: string }> = {
  new: { fg: "var(--body)", bg: "var(--paper)", ring: "var(--hairline)" },
  reviewing: { fg: "var(--signal)", bg: "var(--signal-soft)", ring: "var(--signal-border)" },
  decided: { fg: "#9a6700", bg: "#fdf5e2", ring: "#efdcb0" },
  disbursed: { fg: "#0f7a3d", bg: "#e8f7ee", ring: "#b7e6c9" },
}

export function StatusChip({ status }: { status: RequestStatus }) {
  const t = statusTone[status]
  const label = status === "reviewing" ? "in review" : status
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]"
      style={{ color: t.fg, background: t.bg, border: `1px solid ${t.ring}` }}
    >
      {label}
    </span>
  )
}

export function DecisionBadge({ decision }: { decision: Decision }) {
  const t = decisionTone[decision]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ color: t.fg, background: t.bg, border: `1px solid ${t.ring}` }}
    >
      <Check className="size-3.5" weight="bold" />
      {decision}
    </span>
  )
}

export function ScoreBar({ value }: { value: number }) {
  // No background track (skill 9.F): a bare signal line only.
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-full rounded-full" style={{ background: "transparent" }}>
        <div className="h-1 rounded-full" style={{ width: `${value}%`, background: "var(--signal)" }} />
      </div>
      <span className="w-9 text-right font-mono text-xs" style={{ color: "var(--muted)" }}>
        {value}
      </span>
    </div>
  )
}

function HelpPopover({ label, explain }: { label: string; explain: string }) {
  const [open, setOpen] = useState(false)
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`About ${label}`}
        aria-expanded={open}
        className="inline-flex size-4 items-center justify-center rounded-full border transition-colors"
        style={{ borderColor: "var(--signal-border)", color: "var(--signal)", background: "transparent" }}
      >
        <Question className="size-2.5" weight="bold" />
      </button>
      {open && (
        <div
          ref={popRef}
          role="tooltip"
          className="absolute right-0 top-5 z-30 w-60 rounded-xl border p-3 text-xs leading-relaxed shadow-lg"
          style={{
            borderColor: "var(--hairline)",
            background: "var(--panel)",
            color: "var(--body)",
            boxShadow: "0 8px 24px rgba(11,18,32,0.10)",
          }}
        >
          {explain}
        </div>
      )}
    </span>
  )
}

export function StatCell({ label, value, sub, explain }: { label: string; value: string; sub?: string; explain?: string }) {
  return (
    <div className="relative rounded-xl border p-3.5" style={{ borderColor: "var(--hairline)", background: "var(--paper)" }}>
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
          {label}
        </span>
        {explain && <HelpPopover label={label} explain={explain} />}
      </div>
      <div className="mt-1 font-mono text-lg font-semibold" style={{ color: "var(--ink)" }}>
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
          {sub}
        </div>
      )}
    </div>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
      {children}
    </h3>
  )
}

export function InlineArrow({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "var(--signal)" }}>
      {label} <ArrowRight className="size-3.5" weight="bold" />
    </span>
  )
}

export function MonoTag({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px]"
      style={{ background: "var(--paper)", border: "1px solid var(--hairline)", color: "var(--muted)" }}
    >
      {children}
    </span>
  )
}

export function TraceList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          <span
            className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-semibold"
            style={{ background: "var(--signal-soft)", color: "var(--signal)", border: "1px solid var(--signal-border)" }}
          >
            {i + 1}
          </span>
          {item}
        </li>
      ))}
    </ol>
  )
}
