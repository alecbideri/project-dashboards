#!/usr/bin/env node
// Generates src/data/projects.json from ../*/docs/*.md before the Vite build.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..", "..")
const outDir = path.resolve(__dirname, "..", "public", "data")
const outFile = path.join(outDir, "projects.json")

function gradeOf(str) {
  if (str.includes("✅")) return "observed"
  if (str.includes("🟡")) return "secondary"
  if (str.includes("⚠️") || str.includes("⚠")) return "unverified"
  if (str.includes("❓")) return "assumption"
  return null
}

function extractClaims(md) {
  const claims = []
  for (const line of md.split(/\r?\n/)) {
    if (!line.includes("|")) continue
    const cells = line.split("|").map((c) => c.trim()).filter((c) => c && c !== "---")
    if (cells.length < 2) continue
    const grade = gradeOf(line)
    if (!grade) continue
    claims.push({ claim: cells[0], source: cells[1], grade })
  }
  return claims
}

function splitSections(md) {
  const sections = []
  let current = { title: null, body: [] }
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(/^##\s+(.*)$/)
    if (m) {
      if (current.title !== null) sections.push(current)
      current = { title: m[1].trim(), body: [] }
    } else current.body.push(line)
  }
  if (current.title !== null) sections.push(current)
  return sections
}

function parseTables(body) {
  const tables = []
  const lines = body.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (!/^\s*\|.*\|\s*$/.test(l)) continue
    const next = lines[i + 1] || ""
    if (!/^\s*\|[\s:\-|]+\|\s*$/.test(next)) continue
    const cells = (s) =>
      s.replace(/^\||\|$/g, "").split("|").map((c) => c.trim())
    const header = cells(l)
    const rows = []
    i += 2
    while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
      rows.push(cells(lines[i]))
      i++
    }
    i--
    tables.push({ header, rows })
  }
  return tables
}

function isClaimsLedger(header) {
  return /claim|evidence/i.test(header.join(" ")) && /grade/i.test(header.join(" "))
}

function removeClaimsLedger(body) {
  const lines = body.split(/\r?\n/)
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    const next = lines[i + 1] || ""
    if (
      /^\s*\|.*\|\s*$/.test(l) &&
      /^\s*\|[\s:\-|]+\|\s*$/.test(next)
    ) {
      const cells = (s) => s.replace(/^\||\|$/g, "").split("|").map((c) => c.trim())
      if (isClaimsLedger(cells(l))) {
        i += 2
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) i++
        i--
        continue
      }
    }
    out.push(l)
  }
  return out.join("\n")
}

function extractKv(md) {
  const kv = {}
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(/^[-*]\s+([A-Za-z][A-Za-z _()/]*?):\s+(.+)$/)
    if (m) kv[m[1].trim()] = m[2].trim()
  }
  return kv
}

const projects = []

for (const entry of fs.readdirSync(repoRoot)) {
  const projDir = path.join(repoRoot, entry)
  const docsDir = path.join(projDir, "docs")
  if (!fs.statSync(projDir).isDirectory()) continue
  if (!fs.existsSync(docsDir)) continue

  const docs = []
  let status = "New"

  for (const f of fs.readdirSync(docsDir).filter((x) => x.endsWith(".md")).sort()) {
    const md = fs.readFileSync(path.join(docsDir, f), "utf8")
    const claims = extractClaims(md)
    const sections = splitSections(md)
    const kv = extractKv(md)
    const title = f.replace(/\.md$/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

    let handoff = null
    const hs = sections.find((s) => /handoff/i.test(s.title || ""))
    if (hs) handoff = hs.body.join("\n").replace(/<!--[\s\S]*?-->/g, "").trim()

    let verdict = null
    const vs = sections.find((s) => /verdict/i.test(s.title || ""))
    if (vs) verdict = vs.body.join("\n").trim()

    if (kv["Status"]) status = kv["Status"]

    docs.push({
      file: f,
      title,
      claims,
      handoff,
      verdict,
      sections: sections.map((s) => {
        const body = s.body.join("\n")
        const cleaned = removeClaimsLedger(body)
        return {
          title: s.title,
          body: cleaned,
          tables: parseTables(cleaned),
        }
      }),
      kv: Object.entries(kv).slice(0, 6).map(([k, v]) => ({ k, v })),
    })
  }

  projects.push({
    name: entry,
    status,
    docs,
    totalClaims: docs.reduce((a, d) => a + d.claims.length, 0),
  })
}

projects.sort((a, b) => b.totalClaims - a.totalClaims)

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outFile, JSON.stringify(projects, null, 2))
console.log(`Wrote ${projects.length} projects to ${outFile}`)
