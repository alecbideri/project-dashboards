import { chromium } from "playwright-core"
import { createServer } from "node:http"
import { readFileSync, existsSync } from "node:fs"
import { extname, join } from "node:path"

const root = "C:/Users/BIDERI ALEC/Downloads/Projects/new products/demo/dist"
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml" }
const server = createServer((req, res) => {
  const file = join(root, decodeURIComponent(req.url === "/" ? "/index.html" : req.url))
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

await page.goto(`http://127.0.0.1:${port}/ppt/index.html`)
await page.waitForTimeout(2200)

const checks = {}
checks.slideCount = await page.locator(".slide").count()
checks.title = (await page.title()).includes("Missing Middle")
checks.cover = (await page.locator(".slide").first().innerText()).includes("Missing")
// walk slides
for (let i = 0; i < checks.slideCount; i++) {
  const t = await page.locator(".slide").nth(i).innerText()
  checks[`s${i + 1}`] = t.trim().length > 30
}
// accent + motion loaded (motion-ready class means module imported)
checks.motionReady = await page.evaluate(() => document.body.classList.contains("motion-ready"))
checks.accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim())

await browser.close(); server.close()
console.log(JSON.stringify({ checks, errors }, null, 2))
