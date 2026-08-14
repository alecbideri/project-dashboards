import { chromium } from "playwright-core"

const url = "https://embeddedlend-demo-943.netlify.app/"
const browser = await chromium.launch({ channel: "chrome" })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on("pageerror", (e) => errors.push(e.message))
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })
await page.goto(url)
await page.waitForTimeout(1500)
const text = await page.locator("body").innerText()
const ok = {
  title: text.includes("EmbeddedLend"),
  score: /\/100/.test(text),
  narration: text.includes("Analyst narration"),
  decision: /Approve|Decline|Refer/.test(text),
  personas: text.includes("MFI / SACCO") && text.includes("Vertical SaaS"),
}
await browser.close()
console.log(JSON.stringify({ ok, errors }, null, 2))
process.exit(ok.title && ok.score && ok.narration && errors.length === 0 ? 0 : 1)
