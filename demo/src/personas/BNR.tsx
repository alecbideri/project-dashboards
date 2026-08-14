import { useState } from "react"
import { ShieldCheck, Scales, FileText, SealCheck, WarningCircle, ArrowRight } from "@phosphor-icons/react"
import { policy, institutions, institutionStats, ecosystemStats, supervisedRequests } from "../lib/bnr"
import type { InstitutionId } from "../lib/bnr"
import { DecisionBadge } from "../components/primitives"

const tone: Record<"Approve" | "Refer" | "Decline", string> = {
  Approve: "#0f7a3d",
  Refer: "#9a6700",
  Decline: "#b42318",
}

function PolicyPanel() {
  const rows = [
    { label: "Approve threshold", value: `≥ ${policy.approveScore}/100`, note: "Score at or above this band approves." },
    { label: "Refer band", value: `${policy.referScore}-${policy.approveScore - 1}`, note: "Between thresholds, manual review required." },
    { label: "Debt-service cap", value: `≤ ${policy.debtCapPct}%`, note: "Monthly repayment may not exceed this share of surplus." },
    { label: "Consent", value: policy.consentLaw, note: "Every data pull must carry verified borrower consent." },
    { label: "Open Finance", value: policy.openFinancePhase, note: "Mandatory data sharing for Tier-1 banks and MMOs." },
  ]
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
        <Scales className="size-4" weight="fill" style={{ color: "var(--signal)" }} />        Policy in force
      </div>
      <dl className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start justify-between gap-3 border-b pb-2 last:border-b-0 last:pb-0" style={{ borderColor: "var(--hairline)" }}>
            <div>
              <dt className="text-xs font-medium" style={{ color: "var(--body)" }}>{r.label}</dt>
              <dd className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{r.note}</dd>
            </div>
            <dd className="shrink-0 font-mono text-xs font-semibold" style={{ color: "var(--ink)" }}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function InstitutionCard({ id }: { id: InstitutionId }) {
  const s = institutionStats(id)
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{s.institution.name}</div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
            {s.institution.kind} · {s.institution.license}
          </div>
        </div>
        {s.flags > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]" style={{ background: "#fdecea", color: "#b42318", border: "1px solid #f5c1bd" }}>
            <WarningCircle className="size-3.5" weight="fill" /> {s.flags} flag{s.flags > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]" style={{ background: "#e8f7ee", color: "#0f7a3d", border: "1px solid #b7e6c9" }}>
            <SealCheck className="size-3.5" weight="fill" /> in band
          </span>
        )}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>Total</div>
          <div className="mt-0.5 font-mono text-lg font-semibold" style={{ color: "var(--ink)" }}>{s.total}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>Approve</div>
          <div className="mt-0.5 font-mono text-lg font-semibold" style={{ color: tone.Approve }}>{s.approved}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>Refer</div>
          <div className="mt-0.5 font-mono text-lg font-semibold" style={{ color: tone.Refer }}>{s.referred}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>Decline</div>
          <div className="mt-0.5 font-mono text-lg font-semibold" style={{ color: tone.Decline }}>{s.declined}</div>
        </div>
      </div>
    </div>
  )
}

function LedgerRow({ r }: { r: (typeof supervisedRequests)[number] }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2.5 last:border-b-0" style={{ borderColor: "var(--hairline)" }}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>{r.name}</span>
          {r.flag ? (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em]" style={{ background: "#fdecea", color: "#b42318", border: "1px solid #f5c1bd" }}>
              <WarningCircle className="size-3" weight="fill" /> flagged
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em]" style={{ background: "#e8f7ee", color: "#0f7a3d", border: "1px solid #b7e6c9" }}>
              <SealCheck className="size-3" weight="fill" /> in band
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-xs" style={{ color: "var(--muted)" }}>
          {r.business}
          {r.flag && <span className="mt-1 block leading-relaxed" style={{ color: "#b42318" }}>{r.flag}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          <div className="font-mono text-sm font-semibold" style={{ color: "var(--ink)" }}>{r.score}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--muted)" }}>score</div>
        </div>
        <div className="flex items-center gap-1.5">
          <DecisionBadge decision={r.decision} />
          <ArrowRight className="size-3.5" style={{ color: "var(--muted)" }} />
          <span className="font-mono text-xs" style={{ color: "var(--muted)" }}>{r.expected}</span>
        </div>
      </div>
    </div>
  )
}

export function BNR() {
  const [filter, setFilter] = useState<"all" | InstitutionId>("all")
  const rows = filter === "all" ? supervisedRequests : supervisedRequests.filter((r) => r.institution === filter)
  const flags = rows.filter((r) => r.flag).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>Institution</span>
        {([["all", "All supervised"], ["ndfsp", "Zamuka (NDFSP)"], ["mfi", "Ikibiri (MFI / SACCO)"], ["saas", "Kayko (SaaS)"]] as const).map(([val, label]) => {
          const on = filter === val
          return (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: on ? "var(--ink)" : "var(--panel)",
                color: on ? "#f7f9fc" : "var(--body)",
                border: `1px solid ${on ? "transparent" : "var(--hairline)"}`,
              }}
            >
              {label}
            </button>
          )
        })}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
          {rows.length} reviewed · {flags} flagged
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-4">
          <div className="rounded-2xl p-6" style={{ background: "var(--signal-soft)", border: "1px solid var(--signal-border)" }}>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
              <ShieldCheck className="size-4" weight="fill" style={{ color: "var(--signal)" }} />
              Ecosystem
            </div>
            <div className="mt-3 font-mono text-5xl font-semibold" style={{ color: "var(--ink)" }}>
              {ecosystemStats.total}
              <span className="text-xl" style={{ color: "var(--muted)" }}> requests</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>Approve</div>
                <div className="font-mono text-lg font-semibold" style={{ color: tone.Approve }}>{ecosystemStats.approved}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>Refer</div>
                <div className="font-mono text-lg font-semibold" style={{ color: tone.Refer }}>{ecosystemStats.referred}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>Decline</div>
                <div className="font-mono text-lg font-semibold" style={{ color: tone.Decline }}>{ecosystemStats.declined}</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--body)" }}>
              {ecosystemStats.inBand} of {ecosystemStats.total} decisions sit inside the policy band. {ecosystemStats.flags} deviate and are flagged for review.
            </p>
          </div>

          <PolicyPanel />

          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
              <FileText className="size-4" weight="fill" style={{ color: "var(--signal)" }} />
              Reporting basis
            </div>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              Figures reflect consented cash-flow pulls logged with a full decision trace, per Law 058/2021 and the Open Finance roadmap.
            </p>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-8">
          <div className="grid gap-4 md:grid-cols-3">
            {institutions.map((i) => (
              <InstitutionCard key={i.id} id={i.id} />
            ))}
          </div>

          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel)" }}>
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
              <SealCheck className="size-4" weight="fill" style={{ color: "var(--signal)" }} />
              Decision ledger
            </div>
            <div className="mt-3">
              {rows.map((r) => (
                <LedgerRow key={r.borrowerId} r={r} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const bnrIntro = "The supervisor. BNR watches every decision in the ecosystem against the policy in force, flags what deviates, and keeps the audit trail."
