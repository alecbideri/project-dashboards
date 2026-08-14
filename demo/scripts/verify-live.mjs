import { chromium } from "playwright-core"

const url = "https://embeddedlend-demo.netlify.app/"
const browser = await chromium.launch({ channel: "chrome" })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const errors = []
page.on("pageerror", (e) => errors.push(e.message))
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })
await page.goto(url)
await page.waitForTimeout(2500)

// First request arrives within ~9s and auto-selects.
const row = page.locator("button", { hasText: "ago" }).first()
await row.waitFor({ timeout: 12000 })
await row.click()
await page.getByText("Offer terms", { exact: true }).waitFor({ timeout: 4000 })
await page.getByText("Cash-flow analysis", { exact: true }).waitFor({ timeout: 4000 })
await page.getByText("Analyst narration", { exact: true }).waitFor({ timeout: 4000 })

// checkpoint explanations
await page.getByText(/Average of inflow minus outflow/, { exact: false }).first().waitFor({ timeout: 4000 })

// lender note: suggestion + save
await page.getByText("Lender note", { exact: false }).first().waitFor({ timeout: 4000 })
const suggestion = page
  .locator("button", { hasText: /Red flag|weak point|binding constraint|Check whether requested amount/ })
  .first()
await suggestion.click()
await page.getByRole("button", { name: "Save note", exact: true }).click()
await page.getByRole("button", { name: "Saved", exact: true }).waitFor({ timeout: 4000 })

// decision trace below offer terms
await page.getByText("Decision trace", { exact: true }).waitFor({ timeout: 4000 })

const ok = {
  title: (await page.title()).includes("EmbeddedLend"),
  workbench: true,
  analysis: true,
  checkpoint: true,
  lenderNote: true,
  decisionTrace: true,
}
await browser.close()
console.log(JSON.stringify({ ok, errors }, null, 2))
process.exit(ok.title && ok.workbench && ok.checkpoint && ok.lenderNote && ok.decisionTrace && errors.length === 0 ? 0 : 1)
