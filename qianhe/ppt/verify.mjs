import { chromium } from "playwright-core"
import { fileURLToPath } from "node:url"
import { createServer } from "node:http"
import { readFileSync, existsSync } from "node:fs"
import { extname, join } from "node:path"

const root = fileURLToPath(new URL(".", import.meta.url))
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml" }

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
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
const errors = []
page.on("pageerror", (e) => errors.push(e.message))
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })

await page.goto(`http://127.0.0.1:${port}/`)
await page.waitForTimeout(1800)

const checks = {}
const slides = await page.locator(".slide").count()
checks.slideCount = slides

// verify title text of the deck
checks.title = (await page.title()).includes("Missing Middle")

// walk through all slides, checking none is blank (has some text)
for (let i = 0; i < slides; i++) {
  const text = await page.locator(".slide").nth(i).innerText()
  checks[`slide${i + 1}-hasText`] = text.trim().length > 30
}

// accent applied
const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim())
checks.accent = accent

// screenshots of key slides
const shots = [0, 2, 4, 7, 10, 12]
for (const idx of shots) {
  await page.evaluate((n) => window.__goSlide?.(n) || (window.location.hash = ""), idx)
  // use keyboard arrow to move if custom go not exposed; fallback: press Home then arrows
  await page.keyboard.press("Home")
  for (let k = 0; k < idx; k++) await page.keyboard.press("ArrowRight")
  await page.waitForTimeout(1400)
  await page.screenshot({ path: `shots/ppt-${String(idx + 1).padStart(2, "0")}.png` })
}

await browser.close()
server.close()
console.log(JSON.stringify({ checks, errors }, null, 2))
