// LLM narration for the demo. The deterministic engine computes the score and
// decision (data.ts); this module explains that decision to a lender. When
// LLM_API_KEY is set it calls the configured chat-completions endpoint; the
// sandbox fallback only engages when no key is present or the call fails.

import type { Borrower } from "./data"
import { scoreOf } from "./data"

export interface Narration {
  summary: string
  points: string[]
  recommendation: string
}

const key = (import.meta.env.LLM_API_KEY as string | undefined) || ""

export const hasLiveKey = key.length > 0

const SYSTEM_PROMPT = `You are a senior credit analyst at EmbeddedLend, an API-first SME underwriting service in Rwanda.
The deterministic engine has already computed the score and decision. Your job is only to narrate and explain that decision to a lender. Never change the numbers, invent risk, or override the outcome.
Write plainly. Cite the exact risk signals provided. Keep it under 140 words. Structure:
1) one sentence summary of the decision and score
2) two to three bullet points naming the decisive signals
3) one recommendation the lender can act on.`

async function liveNarration(b: Borrower): Promise<Narration> {
  const base = (import.meta.env.LLM_BASE_URL as string | undefined) || "https://api.openai.com/v1"
  const model = (import.meta.env.LLM_MODEL as string | undefined) || "gpt-4o-mini"
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Borrower: ${b.name} (${b.business}, ${b.location}).\nScore: ${scoreOf(b)}/100.\nDecision: ${b.decision}. Terms: ${b.limit}.\nRisk signals:\n${b.signals.map((s) => `- ${s.label}: ${s.value}/100. ${s.reason}`).join("\n")}\nTrace:\n${b.trace.map((t) => `- ${t}`).join("\n")}`,
        },
      ],
    }),
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

function sandboxNarration(b: Borrower): Narration {
  const total = scoreOf(b)
  const strongest = [...b.signals].sort((x, y) => y.value - x.value)[0]
  const weakest = [...b.signals].sort((x, y) => x.value - y.value)[0]
  const rec =
    b.decision === "Approve"
      ? `Approve: ${b.limit}. The strongest factor is ${strongest.label} (${strongest.value}/100); the binding constraint is ${weakest.label} (${weakest.value}/100).`
      : b.decision === "Decline"
        ? `Decline with a data-correction path: ${strongest.label} (${strongest.value}/100) and ${weakest.label} (${weakest.value}/100) both sit below safe thresholds.`
        : `Refer for review: score ${total}/100 sits between thresholds and ${weakest.label} (${weakest.value}/100) needs a human eye.`
  return {
    summary: `${b.name} of ${b.business} scores ${total}/100. The decision is ${b.decision}.`,
    points: b.trace.slice(0, 3).map((t) => t),
    recommendation: rec,
  }
}

export async function narrate(b: Borrower): Promise<Narration> {
  if (hasLiveKey) {
    try {
      return await liveNarration(b)
    } catch {
      return sandboxNarration(b)
    }
  }
  return sandboxNarration(b)
}
