import { chromium } from "playwright-core"

const url = "https://embeddedlend-demo.netlify.app/"
const browser = await chromium.launch({ channel: "chrome" })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const errors = []
page.on("pageerror", (e) => errors.push(e.message))
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })
await page.goto(url)
await page.waitForTimeout(2500)
const text = await page.locator("body").innerText()

// first request arrives within ~9s; wait for a queue row
let hasRow = false
try {
  await page.locator("button", { hasText: "ago" }).first().waitFor({ timeout: 12000 })
  hasRow = true
} catch {}

const ok = {
  title: text.includes("EmbeddedLend"),
  queueRail: text.includes("Requests") && text.includes("active"),
  requestRow: hasRow,
  workbench: text.includes("Offer terms") || text.includes("Waiting for the first request"),
  narration: text.includes("Analyst narration"),
  footer: text.includes("BNR oversight view is planned"),
}
await browser.close()
console.log(JSON.stringify({ ok, errors }, null, 2))
process.exit(ok.title && ok.queueRail && ok.requestRow && ok.workbench && errors.length === 0 ? 0 : 1)
