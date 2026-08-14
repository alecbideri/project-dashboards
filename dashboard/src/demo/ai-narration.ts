// FinRobot-style AI narration layer for the underwriting simulation.
// The score/decision is always computed by code (simulation.ts). This module
// narrates it to the lender. If an LLM API key is configured it calls a
// chat-completions endpoint; otherwise it falls back to deterministic,
// signal-driven narrative. Numbers come from the engine — the LLM never
// decides, only explains.

import type { Borrower, ScoreResult } from "./simulation"

const KEY_NAME = "LLM_API_KEY"

export function hasLiveKey(): boolean {
  return typeof import.meta.env !== "undefined" && Boolean(import.meta.env[KEY_NAME])
}

interface Narration {
  summary: string
  points: string[]
  recommendation: string
}

// ---------------------------------------------------------------------------
// Simulated (deterministic) fallback
// ---------------------------------------------------------------------------
function fallbackNarration(b: Borrower, score: ScoreResult): Narration {
  const strongest = [...b.signals].sort((x, y) => x.value - y.value)[0]
  const weakest = [...b.signals].sort((x, y) => y.value - x.value)[0]
  const points = b.decision.trace.slice(0, 4).map((t) => t)
  const rec =
    b.decision.decision === "Approve"
      ? `Approve: ${b.decision.limit}. The strongest factor is ${weakest.label} (${weakest.value}/100); the binding constraint is ${strongest.label} (${strongest.value}/100).`
      : b.decision.decision === "Decline"
        ? `Decline with a data-correction path: ${strongest.label} (${strongest.value}/100) and ${weakest.label} (${weakest.value}/100) both sit below safe thresholds.`
        : `Refer for manual review: score ${score.total}/100 sits between thresholds and ${strongest.label} (${strongest.value}/100) requires a human eye.`
  return {
    summary: `${b.name}'s ${b.business} scores ${score.total}/100. The decision is ${b.decision.decision}.`,
    points,
    recommendation: rec,
  }
}

// ---------------------------------------------------------------------------
// Live LLM call (chat-completions compatible)
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a senior credit analyst for EmbeddedLend, an API-first SME underwriting service in Rwanda.
The deterministic engine has already computed the score and decision. Your job is ONLY to narrate and explain that decision to a lender — never to change numbers, invent risk, or override the outcome.
Write plainly. Cite the exact risk signals given. Keep it under 160 words. Structure:
1) one-sentence summary of the decision and score
2) 2-3 bullet points naming the decisive signals
3) one recommendation sentence the lender can act on.`

async function liveNarration(b: Borrower, score: ScoreResult): Promise<Narration> {
  const payload = {
    model: import.meta.env.LLM_MODEL || "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Borrower: ${b.name} (${b.business}, ${b.monthsActive} months active).\nScore: ${score.total}/100.\nDecision: ${b.decision.decision}. Terms: ${b.decision.limit}.\nRisk signals:\n${b.signals.map((s) => `- ${s.label}: ${s.value}/100 — ${s.reason}`).join("\n")}\nDecision trace:\n${b.decision.trace.map((t) => `- ${t}`).join("\n")}`,
      },
    ],
  }
  const base = import.meta.env.LLM_BASE_URL || "https://api.openai.com/v1"
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env[KEY_NAME]}`,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`)
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const text = json.choices?.[0]?.message?.content?.trim() ?? ""
  if (!text) throw new Error("empty LLM response")
  const parts = text.split(/\n{2,}/)
  return {
    summary: parts[0] ?? text,
    points: (parts[1] ?? "").split("\n").map((s) => s.replace(/^[-•]\s*/, "")).filter(Boolean),
    recommendation: parts[parts.length - 1] ?? "",
  }
}

export async function narrate(b: Borrower, score: ScoreResult): Promise<Narration> {
  if (hasLiveKey()) {
    try {
      return await liveNarration(b, score)
    } catch {
      return fallbackNarration(b, score)
    }
  }
  return fallbackNarration(b, score)
}
