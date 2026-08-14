// Queue state for the operator workbench. A plain reducer, no external deps.
// Requests arrive over time, open in the review pane, get terms edited, then
// are decided and (if approved) disbursed over eKash.

import type { Decision, SuggestedTerms } from "./data"
import { borrowers } from "./data"

export type RequestStatus = "new" | "reviewing" | "decided" | "disbursed"

export interface QueueRequest {
  id: string
  borrowerId: string
  arrivedAt: number
  status: RequestStatus
  decision?: Decision
  terms?: SuggestedTerms
  comment?: string
}

export interface QueueState {
  requests: QueueRequest[]
  nextPoolIndex: number
  selectedId: string | null
  poolEmpty: boolean
}

export type QueueAction =
  | { type: "ARRIVE" }
  | { type: "OPEN"; id: string }
  | { type: "EDIT_TERMS"; id: string; terms: SuggestedTerms }
  | { type: "DECIDE"; id: string; decision: Decision }
  | { type: "DISBURSE"; id: string }
  | { type: "COMMENT"; id: string; comment: string }
  | { type: "RESET" }

export const emptyState: QueueState = {
  requests: [],
  nextPoolIndex: 0,
  selectedId: null,
  poolEmpty: false,
}

function borrowerOf(id: string) {
  return borrowers.find((b) => b.id === id)
}

export function reducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case "ARRIVE": {
      const profile = borrowers[state.nextPoolIndex]
      if (!profile) return { ...state, poolEmpty: true }
      const request: QueueRequest = {
        id: `req-${profile.id}-${state.nextPoolIndex}`,
        borrowerId: profile.id,
        arrivedAt: Date.now(),
        status: "new",
        terms: profile.suggested,
      }
      return {
        ...state,
        requests: [...state.requests, request],
        nextPoolIndex: state.nextPoolIndex + 1,
        poolEmpty: state.nextPoolIndex + 1 >= borrowers.length,
        selectedId: state.selectedId ?? request.id,
      }
    }
    case "OPEN":
      return {
        ...state,
        selectedId: action.id,
        requests: state.requests.map((r) =>
          r.id === action.id && r.status === "new" ? { ...r, status: "reviewing" as const } : r,
        ),
      }
    case "EDIT_TERMS":
      return {
        ...state,
        requests: state.requests.map((r) =>
          r.id === action.id ? { ...r, terms: action.terms, status: r.status === "new" ? "reviewing" as const : r.status } : r,
        ),
      }
    case "DECIDE":
      return {
        ...state,
        requests: state.requests.map((r) =>
          r.id === action.id
            ? { ...r, decision: action.decision, status: "decided" as const }
            : r,
        ),
      }
    case "DISBURSE":
      return {
        ...state,
        requests: state.requests.map((r) =>
          r.id === action.id ? { ...r, status: "disbursed" as const } : r,
        ),
      }
    case "COMMENT":
      return {
        ...state,
        requests: state.requests.map((r) =>
          r.id === action.id ? { ...r, comment: action.comment } : r,
        ),
      }
    case "RESET":
      return emptyState
    default:
      return state
  }
}

export function selectRequest(state: QueueState, id: string | null) {
  if (!id) return null
  const req = state.requests.find((r) => r.id === id)
  if (!req) return null
  const borrower = borrowerOf(req.borrowerId)
  return borrower ? { request: req, borrower } : null
}

// ---- MFI / SACCO committee workspace ----
// A fixed list of the SACCO's own members with submitted requests. The MFI
// already knows these people (distribution is theirs); it only needs the
// scoring brain. No arrivals, no eKash disbursement.

export type MfiStatus = "new" | "decided"

export interface MfiRequest {
  borrowerId: string
  status: MfiStatus
  decision?: Decision
  terms: SuggestedTerms
  comment?: string
}

export interface MfiState {
  members: MfiRequest[]
  selectedId: string | null
}

export type MfiAction =
  | { type: "MFI_OPEN"; id: string }
  | { type: "MFI_EDIT_TERMS"; id: string; terms: SuggestedTerms }
  | { type: "MFI_DECIDE"; id: string; decision: Decision }
  | { type: "MFI_COMMENT"; id: string; comment: string }

export const emptyMfiState: MfiState = {
  members: borrowers.map((b) => ({
    borrowerId: b.id,
    status: "new",
    terms: b.suggested,
  })),
  selectedId: borrowers[0]?.id ?? null,
}

export function mfiReducer(state: MfiState, action: MfiAction): MfiState {
  switch (action.type) {
    case "MFI_OPEN":
      return { ...state, selectedId: action.id }
    case "MFI_EDIT_TERMS":
      return {
        ...state,
        members: state.members.map((m) =>
          m.borrowerId === action.id ? { ...m, terms: action.terms } : m,
        ),
      }
    case "MFI_DECIDE":
      return {
        ...state,
        members: state.members.map((m) =>
          m.borrowerId === action.id ? { ...m, decision: action.decision, status: "decided" as const } : m,
        ),
      }
    case "MFI_COMMENT":
      return {
        ...state,
        members: state.members.map((m) =>
          m.borrowerId === action.id ? { ...m, comment: action.comment } : m,
        ),
      }
    default:
      return state
  }
}

export function selectMember(state: MfiState, id: string | null) {
  if (!id) return null
  const member = state.members.find((m) => m.borrowerId === id)
  if (!member) return null
  const borrower = borrowerOf(member.borrowerId)
  return borrower ? { member, borrower } : null
}

// ---- Vertical SaaS embedded widget ----
// The merchant never leaves the SaaS product. The widget walks a merchant
// through: request -> consent -> score -> accept (disburse over eKash) or
// decline. This is the borrower-facing surface; the lender's brain is behind it.

export type SaasStatus = "new" | "consent" | "scored" | "accepted" | "declined"

export interface SaasMerchant {
  borrowerId: string
  status: SaasStatus
  decision?: Decision
  terms: SuggestedTerms
}

export interface SaasState {
  merchants: SaasMerchant[]
  selectedId: string | null
}

export type SaasAction =
  | { type: "SAAS_OPEN"; id: string }
  | { type: "SAAS_CONSENT"; id: string }
  | { type: "SAAS_SCORE"; id: string }
  | { type: "SAAS_ACCEPT"; id: string }
  | { type: "SAAS_DECLINE"; id: string }

export const emptySaasState: SaasState = {
  merchants: borrowers.map((b) => ({
    borrowerId: b.id,
    status: "new",
    terms: b.suggested,
  })),
  selectedId: borrowers[0]?.id ?? null,
}

export function saasReducer(state: SaasState, action: SaasAction): SaasState {
  switch (action.type) {
    case "SAAS_OPEN":
      return { ...state, selectedId: action.id }
    case "SAAS_CONSENT":
      return {
        ...state,
        merchants: state.merchants.map((m) =>
          m.borrowerId === action.id ? { ...m, status: "consent" as const } : m,
        ),
      }
    case "SAAS_SCORE":
      return {
        ...state,
        merchants: state.merchants.map((m) =>
          m.borrowerId === action.id ? { ...m, status: "scored" as const } : m,
        ),
      }
    case "SAAS_ACCEPT":
      return {
        ...state,
        merchants: state.merchants.map((m) =>
          m.borrowerId === action.id
            ? { ...m, status: "accepted" as const, decision: "Approve" as const }
            : m,
        ),
      }
    case "SAAS_DECLINE":
      return {
        ...state,
        merchants: state.merchants.map((m) =>
          m.borrowerId === action.id
            ? { ...m, status: "declined" as const, decision: "Decline" as const }
            : m,
        ),
      }
    default:
      return state
  }
}

export function selectMerchant(state: SaasState, id: string | null) {
  if (!id) return null
  const merchant = state.merchants.find((m) => m.borrowerId === id)
  if (!merchant) return null
  const borrower = borrowerOf(merchant.borrowerId)
  return borrower ? { merchant, borrower } : null
}
