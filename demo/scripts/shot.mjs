import { chromium } from "playwright-core"
import { fileURLToPath } from "node:url"
import { createServer } from "node:http"
import { readFileSync, existsSync } from "node:fs"
import { extname, join } from "node:path"

const root = fileURLToPath(new URL("../dist", import.meta.url))
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".png": "image/png",
}

const server = createServer((req, res) => {
  const path = req.url === "/" ? "/index.html" : req.url
  const file = join(root, decodeURIComponent(path))
  if (!existsSync(file)) {
    res.writeHead(404)
    res.end("nf")
    return
  }
  res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" })
  res.end(readFileSync(file))
})

await new Promise((r) => server.listen(0, r))
const port = server.address().port

const browser = await chromium.launch({ channel: "chrome" })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text())
})
page.on("pageerror", (e) => errors.push(e.message))

await page.goto(`http://127.0.0.1:${port}/`)
await page.waitForTimeout(1200)

const text = await page.locator("body").innerText()
const checks = {
  hasTitle: text.includes("EmbeddedLend"),
  hasScore: /\/100/.test(text),
  hasNarration: /Analyst narration/.test(text),
  hasDecision: /Approve|Decline|Refer/.test(text),
  hasPersonas: text.includes("MFI / SACCO") && text.includes("Vertical SaaS"),
  sandboxFallback: text.includes("sandbox"),
}

await page.screenshot({ path: "../shots/demo-ndfsp.png", fullPage: true })

// switch borrower to the Refer case and capture
await page.getByText("Aline Uwase", { exact: true }).click()
await page.waitForTimeout(700)
await page.screenshot({ path: "../shots/demo-refer.png", fullPage: true })

// switch to Vertical SaaS persona
await page.getByRole("button", { name: /Vertical SaaS/ }).click()
await page.waitForTimeout(700)
await page.screenshot({ path: "../shots/demo-saas.png", fullPage: true })

await browser.close()
server.close()

console.log(JSON.stringify({ checks, errors }, null, 2))
