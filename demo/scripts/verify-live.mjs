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
await page.getByText("Analyst narration", { exact: true }).waitFor({ timeout: 4000 })

const ok = {
  title: (await page.title()).includes("EmbeddedLend"),
  requestRow: true,
  workbench: true,
  narration: true,
  terms: true,
}
await browser.close()
console.log(JSON.stringify({ ok, errors }, null, 2))
process.exit(ok.title && ok.requestRow && ok.workbench && ok.narration && errors.length === 0 ? 0 : 1)
