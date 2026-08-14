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

// "?" popover explains monthly net; no inline explanation
const inlineCount = await page.getByText(/Average of inflow minus outflow/, { exact: false }).count()
await page.getByLabel("About Monthly net").click()
await page.getByText(/Average of inflow minus outflow/, { exact: false }).waitFor({ timeout: 4000 })
await page.keyboard.press("Escape")

// no suggestion chips before deciding
const chipsBefore = await page.locator("button", { hasText: /Decline reason|Refer for manual review|Anchor the approval/ }).count()

// decide refer, then refer-specific chips appear
await page.getByRole("button", { name: "Refer", exact: true }).click()
await page.getByText("Notice to borrower", { exact: true }).waitFor({ timeout: 4000 })
await page.getByText(/Refer for manual review/, { exact: false }).first().waitFor({ timeout: 4000 })

// MFI / SACCO committee workspace
await page.getByRole("button", { name: /MFI \/ SACCO/ }).click()
await page.getByText("Field-officer context", { exact: true }).waitFor({ timeout: 4000 })
await page.getByText("Committee verdict", { exact: true }).waitFor({ timeout: 4000 })
await page.getByText(/sacco member/i).first().waitFor({ timeout: 4000 })
await page.getByRole("button", { name: "Decline", exact: true }).click()
await page.getByText(/Decline reason:/, { exact: false }).first().waitFor({ timeout: 4000 })
await page.getByText("Notice to borrower", { exact: true }).waitFor({ timeout: 4000 })

const ok = {
  title: (await page.title()).includes("EmbeddedLend"),
  workbench: true,
  analysis: true,
  popover: true,
  noInline: inlineCount === 0,
  noChipsBefore: chipsBefore === 0,
  decisionChips: true,
  mfiWorkspace: true,
  mfiVerdict: true,
}
await browser.close()
console.log(JSON.stringify({ ok, errors }, null, 2))
process.exit(ok.title && ok.workbench && ok.popover && ok.noInline && ok.noChipsBefore && ok.decisionChips && ok.mfiWorkspace && ok.mfiVerdict && errors.length === 0 ? 0 : 1)
