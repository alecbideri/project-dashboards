// BNR supervisory oversight data. The regulator does not use the workbench; it
// watches the ecosystem's decisions against policy. Everything here is derived
// deterministically from the same borrower profiles and decision engine.

import type { Decision } from "./data"
import { borrowers, scoreOf } from "./data"

export const policy = {
  approveScore: 60,
  referScore: 40,
  debtCapPct: 25, // share of monthly surplus a repayment may consume
  consentLaw: "Law 058/2021",
  openFinancePhase: "Phase 2 (2026-28) mandatory",
}

export type InstitutionId = "ndfsp" | "mfi" | "saas"

export interface Institution {
  id: InstitutionId
  name: string
  kind: string
  license: string
}

export const institutions: Institution[] = [
  { id: "ndfsp", name: "Zamuka Digital", kind: "NDFSP", license: "Licensed non-deposit-taking lender" },
  { id: "mfi", name: "Ikibiri SACCO", kind: "MFI / SACCO", license: "Registered SACCO, Umurenge" },
  { id: "saas", name: "Kayko Retail", kind: "Vertical SaaS", license: "Embedded channel via licensed NDFSP" },
]

export interface SupervisedRequest {
  borrowerId: string
  name: string
  business: string
  institution: InstitutionId
  score: number
  decision: Decision
  expected: Decision // what the policy band implies
  inBand: boolean
  flag: string | null
}

const expectedFor = (score: number): Decision =>
  score >= policy.approveScore ? "Approve" : score >= policy.referScore ? "Refer" : "Decline"

// Which borrower goes to which supervised institution.
const roster: Record<InstitutionId, string[]> = {
  ndfsp: ["trader", "baker", "salon", "edge"],
  mfi: ["farmer", "shop", "farm-cosign", "vendor"],
  saas: ["transporter", "tailor", "overleveraged", "poultry"],
}

function buildRequests(): SupervisedRequest[] {
  const out: SupervisedRequest[] = []
  for (const inst of Object.keys(roster) as InstitutionId[]) {
    for (const id of roster[inst]) {
      const b = borrowers.find((x) => x.id === id)
      if (!b) continue
      const score = scoreOf(b)
      const expected = expectedFor(score)
      const inBand = expected === b.decision
      const flag = inBand
        ? null
        : b.decision === "Decline" && score >= policy.referScore
          ? "Declined outside the score band: existing debt service exceeds the 25% cap."
          : "Decision outside the expected policy band; flagged for review."
      out.push({
        borrowerId: id,
        name: b.name,
        business: b.business,
        institution: inst,
        score,
        decision: b.decision,
        expected,
        inBand,
        flag,
      })
    }
  }
  return out
}

export const supervisedRequests: SupervisedRequest[] = buildRequests()

export interface InstitutionStats {
  institution: Institution
  total: number
  approved: number
  referred: number
  declined: number
  inBand: number
  flags: number
}

export function institutionStats(id: InstitutionId): InstitutionStats {
  const rows = supervisedRequests.filter((r) => r.institution === id)
  return {
    institution: institutions.find((i) => i.id === id)!,
    total: rows.length,
    approved: rows.filter((r) => r.decision === "Approve").length,
    referred: rows.filter((r) => r.decision === "Refer").length,
    declined: rows.filter((r) => r.decision === "Decline").length,
    inBand: rows.filter((r) => r.inBand).length,
    flags: rows.filter((r) => r.flag).length,
  }
}

export const ecosystemStats = {
  total: supervisedRequests.length,
  approved: supervisedRequests.filter((r) => r.decision === "Approve").length,
  referred: supervisedRequests.filter((r) => r.decision === "Refer").length,
  declined: supervisedRequests.filter((r) => r.decision === "Decline").length,
  inBand: supervisedRequests.filter((r) => r.inBand).length,
  flags: supervisedRequests.filter((r) => r.flag).length,
}
