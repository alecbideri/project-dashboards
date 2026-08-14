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
