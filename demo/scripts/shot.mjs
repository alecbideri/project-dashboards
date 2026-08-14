import { chromium } from "playwright-core"
import { fileURLToPath } from "node:url"
import { createServer } from "node:http"
import { readFileSync, existsSync } from "node:fs"
import { extname, join } from "node:path"

const root = fileURLToPath(new URL("../dist", import.meta.url))
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" }

const server = createServer((req, res) => {
  const path = req.url === "/" ? "/index.html" : req.url
  const file = join(root, decodeURIComponent(path))
  if (!existsSync(file)) { res.writeHead(404); res.end("nf"); return }
  res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" })
  res.end(readFileSync(file))
})
await new Promise((r) => server.listen(0, r))
const port = server.address().port

const browser = await chromium.launch({ channel: "chrome" })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const errors = []
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })
page.on("pageerror", (e) => errors.push(e.message))

const checks = {}
const step = async (name, fn) => {
  try {
    await fn()
    checks[name] = "ok"
  } catch (e) {
    checks[name] = `FAIL: ${e.message.split("\n")[0]}`
  }
}

await page.goto(`http://127.0.0.1:${port}/`)
await page.waitForTimeout(2000)

// queue rail rendered
await step("queue-populated", async () => {
  await page.getByText("Incoming loan requests will appear here.").waitFor({ timeout: 5000 })
})

// wait for first arrival and open it
await step("first-arrival", async () => {
  await page.locator("button", { hasText: "RWF 2,000,000" }).first().waitFor({ timeout: 15000 })
  await page.locator("button", { hasText: "RWF 2,000,000" }).first().click()
  await page.getByText("Offer terms", { exact: true }).waitFor({ timeout: 3000 })
})

// edit terms: bump amount
await step("edit-terms", async () => {
  const amount = page.locator('input[type="number"]').first()
  await amount.fill("2500000")
  await page.getByText("Monthly installment", { exact: true }).waitFor({ timeout: 2000 })
})

// decide approve
await step("decide-approve", async () => {
  await page.getByRole("button", { name: "Approve", exact: true }).click()
  await page.getByText("Disbursed", { exact: true }).waitFor({ timeout: 2000 }).catch(() => {})
  await page.getByRole("button", { name: /Disburse over eKash/ }).waitFor({ timeout: 3000 })
})

// disburse
await step("disburse", async () => {
  await page.getByRole("button", { name: /Disburse over eKash/ }).click()
  await page.getByText("Disbursed", { exact: true }).waitFor({ timeout: 3000 })
})

// narration present
await step("narration", async () => {
  await page.getByText("Analyst narration", { exact: true }).waitFor({ timeout: 3000 })
})

// borrower notice after approval
await step("approve-notice", async () => {
  await page.getByText("Notice to borrower", { exact: true }).waitFor({ timeout: 3000 })
})

await page.screenshot({ path: "../shots/workbench-disbursed.png", fullPage: true })

// switch to MFI read-only view
await step("mfi-view", async () => {
  await page.getByRole("button", { name: /MFI \/ SACCO/ }).click()
  await page.getByText("Verdict for the loan committee", { exact: true }).waitFor({ timeout: 3000 })
  await page.screenshot({ path: "../shots/workbench-mfi.png", fullPage: true })
})

// back to NDFSP, open a fresh request, verify cash-flow analysis and decline notice
await step("analysis-and-decline", async () => {
  await page.getByRole("button", { name: /^NDFSP$/ }).click()
  const fresh = page
    .locator("button", { hasText: "ago" })
    .filter({ hasNotText: "disbursed" })
    .filter({ hasNotText: "decided" })
    .first()
  await fresh.waitFor({ timeout: 16000 })
  await fresh.click()
  await page.getByText("Cash-flow analysis", { exact: true }).waitFor({ timeout: 3000 })
  await page.getByText("Inflow by source", { exact: true }).waitFor({ timeout: 3000 })
  await page.getByRole("button", { name: "Decline", exact: true }).click()
  await page.getByText("Notice to borrower", { exact: true }).waitFor({ timeout: 3000 })
  await page.getByText("was declined", { exact: false }).waitFor({ timeout: 3000 })
  await page.screenshot({ path: "../shots/workbench-declined.png", fullPage: true })
})

// checkpoint explanations on cash-flow metrics
await step("checkpoint-explanations", async () => {
  await page.getByText("Monthly net", { exact: true }).waitFor({ timeout: 3000 })
  await page.getByText(/Average of inflow minus outflow/, { exact: false }).first().waitFor({ timeout: 3000 })
  await page.getByText("Liquidity", { exact: true }).waitFor({ timeout: 3000 })
  await page.getByText(/Total inflow as a share of total outflow/, { exact: false }).first().waitFor({ timeout: 3000 })
})

// lender note: pick a suggestion and save it
await step("lender-note", async () => {
  await page.getByText("Lender note", { exact: false }).first().waitFor({ timeout: 3000 })
  const suggestion = page.locator("button", { hasText: /Red flag|weak point|binding constraint|Check whether requested amount/ }).first()
  await suggestion.click()
  await page.getByRole("button", { name: "Save note", exact: true }).click()
  await page.getByRole("button", { name: "Saved", exact: true }).waitFor({ timeout: 3000 })
})

await browser.close()
server.close()

const body = await Promise.resolve()
console.log(JSON.stringify({ checks, errors }, null, 2))
