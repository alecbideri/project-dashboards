#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const USAGE = `Usage:
  node generate-dashboard.js --project <projectDir>
  node generate-dashboard.js --master <parentDir>
`;

// ---------- small markdown renderer (safe subset) ----------
function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(md) {
  return escapeHtml(md)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function renderMarkdown(md) {
  if (!md) return "<p><em>Empty</em></p>";
  const lines = md.split(/\r?\n/);
  const out = [];
  let inTable = false;
  let inList = false;
  let inCode = false;
  let codeBuf = [];

  const closeTable = () => { if (inTable) { out.push("</table>"); inTable = false; } };
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };
  const closeCode = () => { if (inCode) { out.push("<pre><code>" + codeBuf.join("\n") + "</code></pre>"); inCode = false; codeBuf = []; } };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith("```")) {
      closeTable(); closeList();
      if (inCode) closeCode();
      else inCode = true;
      continue;
    }
    if (inCode) { codeBuf.push(escapeHtml(line)); continue; }

    if (line.startsWith("|") && isSeparatorRow(line)) continue;

    if (line.startsWith("|") && inTable) {
      const cells = line.split("|").slice(1, -1).map((c) => inline(c.trim()));
      out.push("<tr>" + cells.map((c) => `<td>${c}</td>`).join("") + "</tr>");
      continue;
    }
    if (line.startsWith("|")) {
      closeList(); closeTable();
      const cells = line.split("|").slice(1, -1).map((c) => inline(c.trim()));
      out.push("<table><thead><tr>" + cells.map((c) => `<th>${c}</th>`).join("") + "</tr></thead><tbody>");
      inTable = true;
      continue;
    }

    if (inTable) {
      if (/^[-:\s|]+$/.test(line)) continue; // separator row
      closeTable();
    }

    if (/^\s*[-*]\s+/.test(line)) {
      closeTable();
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
      continue;
    }
    if (inList && line.trim() === "") { closeList(); continue; }
    if (/^\s*[-*]\s+/.test(line) === false && inList && !line.startsWith("  ")) closeList();

    if (line.startsWith("# ")) { closeTable(); closeList(); out.push(`<h2>${inline(line.slice(2))}</h2>`); continue; }
    if (line.startsWith("## ")) { closeTable(); closeList(); out.push(`<h3>${inline(line.slice(3))}</h3>`); continue; }
    if (line.startsWith("### ")) { closeTable(); closeList(); out.push(`<h4>${inline(line.slice(4))}</h4>`); continue; }

    if (line.trim() === "") { closeTable(); closeList(); continue; }

    closeTable();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeTable(); closeList(); closeCode();
  return out.join("\n");
}

// ---------- parsing helpers ----------
function splitSections(md) {
  const sections = [];
  let current = { title: null, body: [] };
  const lines = md.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^##\s+(.*)$/);
    if (m) {
      if (current.title !== null) sections.push(current);
      current = { title: m[1].trim(), body: [] };
    } else {
      current.body.push(line);
    }
  }
  if (current.title !== null) sections.push(current);
  return sections;
}

function gradeOf(str) {
  if (str.includes("✅")) return "observed";
  if (str.includes("🟡")) return "secondary";
  if (str.includes("⚠️") || str.includes("⚠")) return "unverified";
  if (str.includes("❓")) return "assumption";
  return null;
}

function extractClaims(md) {
  const claims = [];
  const lines = md.split(/\r?\n/);
  for (const line of lines) {
    if (!line.includes("|")) continue;
    const cells = line.split("|").map((c) => c.trim()).filter((c) => c && c !== "---");
    if (cells.length < 2) continue;
    const grade = gradeOf(line);
    if (!grade) continue;
    claims.push({ claim: cells[0] || "", source: cells[1] || "", grade });
  }
  return claims;
}

function extractKv(md) {
  const kv = {};
  const lines = md.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^[-*]\s+([A-Za-z][A-Za-z _()/]*?):\s+(.+)$/);
    if (m) kv[m[1].trim()] = m[2].trim();
  }
  return kv;
}

function gradeClass(g) {
  return { observed: "g-observed", secondary: "g-secondary", unverified: "g-unverified", assumption: "g-assumption" }[g] || "g-unknown";
}

// true for markdown table separator rows like |---|---| or |:--:|:--:|
function isSeparatorRow(line) {
  const core = line.replace(/\|/g, "").trim();
  if (!core) return true;
  return /^[\s:<-]+$/.test(core);
}

// web-safe path (forward slashes, encoded segments) — never \ like path.join on Windows
function urlPath(...parts) {
  return parts.map((p) => encodeURIComponent(p.replace(/\\/g, "/"))).join("/");
}

// ---------- project dashboard ----------
function buildProjectDashboard(projectDir) {
  const docsDir = path.join(projectDir, "docs");
  const files = fs.existsSync(docsDir) ? fs.readdirSync(docsDir).filter((f) => f.endsWith(".md")) : [];
  const projectName = path.basename(projectDir);

  const docPanels = [];
  const claims = [];
  let handoff = null;
  let status = null;
  let verdict = null;

  for (const file of files.sort()) {
    const md = fs.readFileSync(path.join(docsDir, file), "utf8");
    const sections = splitSections(md);
    const fileClaims = extractClaims(md);
    const kv = extractKv(md);

    claims.push(...fileClaims);

    if (!handoff) {
      const hs = sections.find((s) => /handoff/i.test(s.title || ""));
      if (hs) {
        const body = hs.body.join("\n");
        handoff = body.replace(/<!--[\s\S]*?-->/g, "").trim();
        if (!handoff && kv) handoff = Object.entries(kv).map(([k, v]) => `${k}: ${v}`).join("\n");
      }
    }
    if (!status && (kv["Status"] || kv["status"])) status = kv["Status"] || kv["status"];
    if (!verdict) {
      const vs = sections.find((s) => /verdict/i.test(s.title || ""));
      if (vs) verdict = vs.body.join("\n").trim();
    }

    const bodyHtml = sections.length ? sections.map((s) => renderMarkdown(s.body.join("\n"))).join("\n") : renderMarkdown(md);
    docPanels.push({
      name: file,
      title: file.replace(/\.md$/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      bodyHtml,
      meta: Object.entries(kv).slice(0, 6).map(([k, v]) => ({ k, v })),
    });
  }

  const statusHtml = status
    ? `<span class="chip">Status: ${escapeHtml(status)}</span>`
    : "";
  const verdictHtml = verdict ? `<div class="verdict">${renderMarkdown(verdict)}</div>` : "";

  const gradeCounts = { observed: 0, secondary: 0, unverified: 0, assumption: 0, unknown: 0 };
  claims.forEach((c) => { gradeCounts[c.grade] = (gradeCounts[c.grade] || 0) + 1; });
  const donut = makeDonut(gradeCounts);

  const claimsHtml = claims.length
    ? claims.map((c) => `
      <tr>
        <td>${escapeHtml(c.claim)}</td>
        <td class="muted">${escapeHtml(c.source)}</td>
        <td><span class="grade ${gradeClass(c.grade)}">${c.grade}</span></td>
      </tr>`).join("")
    : "<tr><td colspan=3 class='muted'>No graded claims found yet. Add a table with ✅ / 🟡 / ⚠️ / ❓ grades.</td></tr>";

  const panelsHtml = docPanels.map((p, i) => `
    <details class="panel" open id="sec-doc-${i}">
      <summary>
        <span class="panel-title">${escapeHtml(p.title)}</span>
        <span class="panel-file">${escapeHtml(p.name)}</span>
      </summary>
      <div class="panel-body">
        ${p.meta.length ? `<div class="meta">${p.meta.map((m) => `<span class="meta-item"><b>${escapeHtml(m.k)}</b>: ${escapeHtml(m.v)}</span>`).join("")}</div>` : ""}
        ${p.bodyHtml}
      </div>
    </details>`).join("");

  const handoffHtml = handoff
    ? `<div class="handoff">${renderMarkdown(handoff)}</div>`
    : "";

  const artifactLinks = fs.existsSync(docsDir)
    ? fs.readdirSync(docsDir)
        .filter((f) => !f.endsWith(".md") && f !== "dashboard.html")
        .map((f) => `<li><a href="${urlPath("docs", f)}" target="_blank" rel="noopener">${escapeHtml(f)}</a></li>`)
        .join("")
    : "";
  const prototypeScan = scanPrototype(projectDir);
  const prototypeHtml = prototypeScan
    ? `<div class="proto">${prototypeScan.map((x) => `<p>${escapeHtml(x)}</p>`).join("")}</div>`
    : "";

  const nav = [
    { id: "sec-ledger", label: "Evidence Ledger" },
    ...(verdict ? [{ id: "sec-verdict", label: "Verdict" }] : []),
    ...docPanels.map((p) => ({ id: "sec-doc-" + docPanels.indexOf(p), label: p.title })),
    ...(artifactLinks ? [{ id: "sec-artifacts", label: "Artifacts" }] : []),
  ];

  const sections = `
    ${handoffHtml ? `<details class="panel" open id="sec-handoff"><summary><span class="panel-title">Handoff Context</span></summary><div class="panel-body">${handoffHtml}</div></details>` : ""}
    ${prototypeHtml ? `<details class="panel" open id="sec-proto"><summary><span class="panel-title">Prototype</span></summary><div class="panel-body">${prototypeHtml}</div></details>` : ""}
    <details class="panel" open id="sec-ledger">
      <summary><span class="panel-title">Evidence Ledger</span></summary>
      <div class="panel-body">
        ${donut}
        <table><thead><tr><th>Claim</th><th>Source</th><th>Grade</th></tr></thead><tbody>${claimsHtml}</tbody></table>
      </div>
    </details>
    ${verdictHtml ? `<details class="panel" open id="sec-verdict"><summary><span class="panel-title">Verdict</span></summary><div class="panel-body">${verdictHtml}</div></details>` : ""}
    ${panelsHtml}
    ${artifactLinks ? `<details class="panel" open id="sec-artifacts"><summary><span class="panel-title">Artifacts</span></summary><div class="panel-body"><ul>${artifactLinks}</ul></div></details>` : ""}
  `;

  return { projectName, html: pageTemplate({
    title: `${projectName} — Project Dashboard`,
    subtitle: projectDir,
    header: `<div class="search"><input id="q" type="search" placeholder="Filter sections\u2026"></div><div class="search-count" id="qcount"></div>${statusHtml}`,
    nav,
    summary: `
      <div class="grid">
        <div class="card accent"><h3>Project</h3><p class="big">${escapeHtml(projectName)}</p><p class="card-sub">${docPanels.length} report doc${docPanels.length === 1 ? "" : "s"}</p></div>
        <div class="card"><h3>Claims</h3><p class="big">${claims.length}</p><p class="card-sub">graded ledger entries</p>${sparkline([gradeCounts.observed, gradeCounts.secondary, gradeCounts.unverified, gradeCounts.assumption, gradeCounts.unknown], "observed")}</div>
        <div class="card"><h3>Confirmed</h3><p class="big">${gradeCounts.observed}</p><p class="card-sub">primary-source facts</p></div>
        <div class="card"><h3>Unverified</h3><p class="big">${gradeCounts.unverified}</p><p class="card-sub">untested / loot-drop claims</p></div>
        <div class="card"><h3>Prototype</h3><p class="big">${prototypeScan ? "Found" : "None"}</p><p class="card-sub">scanned for artifacts</p></div>
      </div>
    `,
    sections,
    footer: "",
  }) };
}

// -------- tiny SVG charts --------
function sparkline(values, color) {
  const max = Math.max(1, ...values);
  const w = 120, h = 34, n = values.length;
  const pts = values.map((v, i) => [Math.round((i / Math.max(1, n - 1)) * w), h - Math.round((v / max) * (h - 4)) - 2]);
  const line = pts.map((p) => p.join(",")).join(" ");
  const area = pts.map((p) => `${p[0]},${h}`).join(" ") + " " + line;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <polygon points="${area}" fill="rgba(122,162,255,.12)"/>
    <polyline points="${line}" fill="none" stroke="${color === "observed" ? "#6fd98a" : "#7aa2ff"}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

function makeDonut(counts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return "";
  const colors = { observed: "#6fd98a", secondary: "#e0c06a", unverified: "#e07a7a", assumption: "#b18ae8", unknown: "#8a93a6" };
  const labels = { observed: "Observed", secondary: "Secondary", unverified: "Unverified", assumption: "Assumption", unknown: "Unknown" };
  const R = 34, C = 2 * Math.PI * R;
  let offset = 0;
  const segs = Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => {
    const frac = v / total;
    const seg = `<circle r="${R}" cx="40" cy="40" fill="none" stroke="${colors[k]}" stroke-width="11"
      stroke-dasharray="${(frac * C).toFixed(2)} ${(C - frac * C).toFixed(2)}" stroke-dashoffset="${(-offset * C).toFixed(2)}"
      transform="rotate(-90 40 40)"/>`;
    offset += frac;
    return { seg, k, v };
  });
  const legend = Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) =>
    `<span><span class="dot" style="background:${colors[k]}"></span>${labels[k]} — ${v}</span>`).join("");
  return `<div class="donut-wrap">
    <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
      <circle r="${R}" cx="40" cy="40" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="11"/>
      ${segs.map((s) => s.seg).join("")}
      <text x="40" y="45" text-anchor="middle" fill="#e8eaf0" font-size="17" font-weight="700">${total}</text>
    </svg>
    <div class="donut-legend">${legend}</div>
  </div>`;
}

function scanPrototype(projectDir) {
  const hits = [];
  const dirs = ["apps", "src", "public", "prototype", "prototypes", "app"];
  for (const d of dirs) {
    const full = path.join(projectDir, d);
    if (fs.existsSync(full)) hits.push(`Detected prototype directory: ${d}/`);
  }
  for (const f of ["package.json", "index.html", "app.py", "README.md", "docker-compose.yml"]) {
    if (fs.existsSync(path.join(projectDir, f))) hits.push(`Detected project file: ${f}`);
  }
  return hits;
}

// ---------- master overview ----------
function buildMaster(parentDir) {
  const projects = [];
  if (fs.existsSync(parentDir)) {
    for (const entry of fs.readdirSync(parentDir)) {
      const full = path.join(parentDir, entry);
      if (fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "docs"))) {
        let status = "New";
        let reports = 0;
        let claims = 0;
        for (const f of fs.readdirSync(path.join(full, "docs"))) {
          if (!f.endsWith(".md")) continue;
          reports++;
          const md = fs.readFileSync(path.join(full, "docs", f), "utf8");
          claims += extractClaims(md).length;
          const m = md.match(/Status:\s*([^\r\n]+)/);
          if (m && /pursu/i.test(m[1])) status = "Pursuing";
          if (m && /built|dead|verdict/i.test(m[1])) status = "Closed";
          if (m && /shortlist/i.test(m[1]) && status !== "Pursuing") status = "Shortlisted";
        }
        const dashPath = path.join(full, "dashboard.html");
        projects.push({ name: entry, reports, claims, status, hasDash: fs.existsSync(dashPath), dir: full });
      }
    }
  }
  projects.sort((a, b) => b.claims - a.claims);

  const statusClass = (s) => ({ Pursuing: "green", Shortlisted: "amber", Closed: "red" }[s] || "");

  const rows = projects.map((p) => `
    <tr>
      <td><a href="${urlPath(p.name, "dashboard.html")}">${escapeHtml(p.name)}</a></td>
      <td><span class="chip ${statusClass(p.status)}">${escapeHtml(p.status)}</span></td>
      <td>${p.reports}</td>
      <td>${p.claims}</td>
      <td><a href="${urlPath(p.name, "dashboard.html")}">open dashboard</a></td>
    </tr>`).join("");

  const body = projects.length
    ? `<table><thead><tr><th>Project</th><th>Status</th><th>Reports</th><th>Claims</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
    : `<div class="empty">No project folders with a docs/ directory found under:<br>${escapeHtml(parentDir)}</div>`;

  return { projectName: "All Projects", html: pageTemplate({
    title: "Projects — Master Overview",
    subtitle: parentDir,
    header: `<div class="search"><input id="q" type="search" placeholder="Filter projects\u2026"></div><div class="search-count" id="qcount"></div><span class="chip">${projects.length} projects</span>`,
    summary: `
      <div class="grid">
        <div class="card accent"><h3>Projects</h3><p class="big">${projects.length}</p><p class="card-sub">folders with docs/</p></div>
        <div class="card"><h3>Reports</h3><p class="big">${projects.reduce((a, p) => a + p.reports, 0)}</p><p class="card-sub">markdown reports total</p></div>
        <div class="card"><h3>Claims</h3><p class="big">${projects.reduce((a, p) => a + p.claims, 0)}</p><p class="card-sub">graded ledger entries</p></div>
        <div class="card"><h3>Pursuing</h3><p class="big">${projects.filter((p) => p.status === "Pursuing").length}</p><p class="card-sub">active builds</p></div>
      </div>
    `,
    sections: body,
  }) };
}

// ---------- page template ----------
function pageTemplate({ title, subtitle, header, nav, summary, sections, footer }) {
  const navHtml = nav && nav.length
    ? `<nav class="side-nav">${nav.map((n) => `<a href="#${n.id}" data-nav="${n.id}">${escapeHtml(n.label)}</a>`).join("")}</nav>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  :root {
    --bg: #08090d; --bg2: #0d0f15;
    --panel: rgba(255,255,255,.035); --panel-hover: rgba(255,255,255,.055);
    --border: rgba(255,255,255,.09); --border-hi: rgba(255,255,255,.16);
    --text: #e8eaf0; --muted: #8a93a6;
    --accent: #7aa2ff; --accent2: #b18ae8; --green: #6fd98a; --amber: #e0c06a; --red: #e07a7a;
    --radius: 14px; --shadow: 0 10px 40px rgba(0,0,0,.45);
    --font: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --mono: ui-monospace, SFMono-Regular, "Cascadia Code", Consolas, monospace;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0; background:
      radial-gradient(1200px 600px at 85% -10%, rgba(122,162,255,.10), transparent 60%),
      radial-gradient(900px 500px at -10% 20%, rgba(177,138,232,.08), transparent 55%),
      linear-gradient(180deg, var(--bg2), var(--bg));
    background-attachment: fixed;
    color: var(--text); font: 15px/1.65 var(--font); min-height: 100vh;
  }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }

  .layout { display: flex; max-width: 1240px; margin: 0 auto; gap: 28px; padding: 0 28px 80px; }

  header.hero {
    padding: 30px 28px 22px; max-width: 1240px; margin: 0 auto;
  }
  header.hero .crumbs { font-size: 12px; color: var(--muted); letter-spacing: .06em; text-transform: uppercase; margin-bottom: 10px; }
  header.hero h1 { margin: 0; font-size: 30px; letter-spacing: -.02em; font-weight: 700; }
  header.hero .sub { color: var(--muted); margin-top: 6px; font-size: 14px; word-break: break-all; }
  header.hero .hdr-line { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

  .side-nav {
    width: 220px; flex: 0 0 220px; position: sticky; top: 20px; align-self: flex-start;
    max-height: calc(100vh - 40px); overflow: auto;
    display: flex; flex-direction: column; gap: 2px;
  }
  .side-nav a {
    padding: 7px 12px; border-radius: 8px; color: var(--muted); font-size: 13.5px;
    border-left: 2px solid transparent;
  }
  .side-nav a:hover { background: var(--panel-hover); color: var(--text); text-decoration: none; }
  .side-nav a.active { color: var(--text); background: var(--panel); border-left-color: var(--accent); }

  main.content { flex: 1 1 auto; min-width: 0; }

  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 22px; }
  .card {
    background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 16px 18px; box-shadow: var(--shadow); backdrop-filter: blur(8px);
    transition: transform .15s ease, border-color .15s ease;
  }
  .card:hover { transform: translateY(-2px); border-color: var(--border-hi); }
  .card h3 { margin: 0 0 2px; font-size: 11.5px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
  .card .big { font-size: 30px; font-weight: 750; letter-spacing: -.02em; margin: 4px 0 0; }
  .card .card-sub { color: var(--muted); font-size: 12.5px; margin-top: 2px; }
  .card .spark { margin-top: 10px; height: 34px; }
  .card.accent { background: linear-gradient(135deg, rgba(122,162,255,.16), rgba(177,138,232,.12)); }

  .panel {
    background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius);
    margin-bottom: 14px; overflow: hidden; box-shadow: var(--shadow);
    transition: border-color .15s ease;
  }
  .panel summary {
    padding: 15px 18px; cursor: pointer; font-weight: 600; font-size: 15px;
    display: flex; justify-content: space-between; align-items: center; gap: 12px;
    list-style: none; user-select: none;
  }
  .panel summary:hover { background: var(--panel-hover); }
  .panel summary::-webkit-details-marker { display: none; }
  .panel summary::after { content: "+"; color: var(--accent); font-size: 20px; font-weight: 500; transition: transform .15s ease; }
  .panel[open] summary::after { content: "-"; }
  .panel[open] summary { border-bottom: 1px solid var(--border); }
  .panel-title { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .panel-file { font-size: 11.5px; font-weight: 400; color: var(--muted); font-family: var(--mono); }
  .panel-body { padding: 16px 18px; }
  .panel-body h3 { font-size: 15px; margin: 18px 0 8px; }
  .panel-body h4 { font-size: 13.5px; margin: 14px 0 6px; }
  .panel-body p, .panel-body ul, .panel-body ol { margin: 8px 0; }
  .panel-body blockquote { margin: 10px 0; padding: 2px 14px; border-left: 3px solid var(--border-hi); color: var(--muted); }
  .panel-body pre { background: #05060a; border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; overflow-x: auto; font-family: var(--mono); font-size: 13px; }
  code { background: rgba(255,255,255,.08); border-radius: 5px; padding: 1px 6px; font-family: var(--mono); font-size: 12.5px; }
  pre code { background: none; padding: 0; }

  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13.5px; }
  th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
  th { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .06em; white-space: nowrap; }
  tr:hover td { background: rgba(255,255,255,.025); }

  .chip { display: inline-block; background: rgba(255,255,255,.07); border: 1px solid var(--border); border-radius: 999px; padding: 3px 11px; font-size: 12px; }
  .chip.green { color: var(--green); border-color: rgba(111,217,138,.3); background: rgba(111,217,138,.08); }
  .chip.amber { color: var(--amber); border-color: rgba(224,192,106,.3); background: rgba(224,192,106,.08); }
  .chip.red { color: var(--red); border-color: rgba(224,122,122,.3); background: rgba(224,122,122,.08); }
  .chip.purple { color: var(--accent2); border-color: rgba(177,138,232,.3); background: rgba(177,138,232,.08); }

  .grade { border-radius: 7px; padding: 2px 9px; font-size: 11.5px; white-space: nowrap; font-weight: 500; }
  .g-observed { background: rgba(111,217,138,.13); color: var(--green); }
  .g-secondary { background: rgba(224,192,106,.13); color: var(--amber); }
  .g-unverified { background: rgba(224,122,122,.13); color: var(--red); }
  .g-assumption { background: rgba(177,138,232,.13); color: var(--accent2); }
  .g-unknown { background: rgba(255,255,255,.08); color: var(--muted); }

  .meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .meta-item { background: rgba(255,255,255,.06); border: 1px solid var(--border); border-radius: 8px; padding: 3px 9px; font-size: 12px; }
  .handoff { white-space: pre-wrap; font-family: var(--mono); font-size: 12.5px; background: rgba(122,162,255,.05); border: 1px dashed rgba(122,162,255,.25); border-radius: 10px; padding: 12px 14px; }
  .verdict { border-left: 3px solid var(--accent); padding-left: 14px; margin: 10px 0; }
  .proto p { margin: 4px 0; }

  .search { position: relative; }
  .search input {
    width: 100%; background: rgba(255,255,255,.06); border: 1px solid var(--border);
    border-radius: 10px; color: var(--text); padding: 9px 14px 9px 36px; font: 13.5px var(--font);
    outline: none; transition: border-color .15s ease;
  }
  .search input:focus { border-color: var(--accent); }
  .search::before {
    content: ""; position: absolute; left: 12px; top: 50%; width: 13px; height: 13px;
    transform: translateY(-60%); border: 1.6px solid var(--muted); border-radius: 50%;
  }
  .search::after {
    content: ""; position: absolute; left: 22.5px; top: calc(50% + 6px); width: 7px; height: 1.8px;
    background: var(--muted); transform: rotate(45deg); border-radius: 2px;
  }
  .search-count { font-size: 12px; color: var(--muted); margin-top: 6px; }

  .empty { padding: 40px; text-align: center; color: var(--muted); border: 1px dashed var(--border); border-radius: var(--radius); }
  .donut-wrap { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; margin: 6px 0 4px; }
  .donut-legend { display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; }
  .donut-legend .dot { display: inline-block; width: 9px; height: 9px; border-radius: 3px; margin-right: 7px; }

  footer { padding: 30px; text-align: center; color: var(--muted); font-size: 12.5px; }

  @media (max-width: 900px) {
    .layout { flex-direction: column; padding: 0 16px 60px; }
    .side-nav { position: static; width: 100%; flex-direction: row; flex-wrap: wrap; gap: 6px; }
    .side-nav a { border-left: none; border-bottom: 2px solid transparent; }
    .side-nav a.active { border-bottom-color: var(--accent); }
    header.hero { padding: 22px 16px 16px; }
    header.hero h1 { font-size: 24px; }
  }
  @media print { body { background: #fff; color: #000; } .side-nav, .search { display: none; } .panel { border-color: #ccc; } }
</style>
</head>
<body>
<header class="hero">
  <div class="crumbs">Projects &#9656; Dashboard</div>
  <h1>${escapeHtml(title)}</h1>
  <div class="sub">${escapeHtml(subtitle)}</div>
  <div class="hdr-line">${header || ""}</div>
</header>
<div class="layout">
  ${navHtml}
  <main class="content">
    ${summary}
    ${sections}
    ${footer || ""}
  </main>
</div>
<script>
  var nav = document.querySelectorAll("[data-nav]");
  var targets = Array.from(nav).map(function (a) { return document.getElementById(a.dataset.nav); }).filter(Boolean);
  var onScroll = function () {
    var pos = window.scrollY + 120; var cur = null;
    targets.forEach(function (t) { if (t.offsetTop <= pos) cur = t.id; });
    nav.forEach(function (a) { a.classList.toggle("active", a.dataset.nav === cur); });
  };
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  var q = document.querySelectorAll(".search input");
  if (q.length) {
    q = Array.prototype.slice.call(q);
    var applySearch = function (value) {
      var term = value.toLowerCase();
      var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));
      var count = 0;
      panels.forEach(function (p) {
        var hit = !term || p.textContent.toLowerCase().indexOf(term) !== -1;
        p.style.display = hit ? "" : "none";
        if (hit) count++;
      });
      var out = document.getElementById("qcount");
      if (out) out.textContent = term ? count + " section" + (count === 1 ? "" : "s") + " match \u201C" + value + "\u201D" : "";
    };
    q.forEach(function (input) {
      input.addEventListener("input", function () {
        q.forEach(function (other) { if (other !== input) other.value = input.value; });
        applySearch(input.value);
      });
    });
  }
</script>
</body>
</html>`;
}

// ---------- main ----------
function main() {
  const args = process.argv.slice(2);
  const mode = args.includes("--project") ? "project" : args.includes("--master") ? "master" : null;
  const targetIdx = args.indexOf("--project") >= 0 ? args.indexOf("--project") : args.indexOf("--master");
  const target = args[targetIdx + 1];

  if (!mode || !target) {
    process.stderr.write(USAGE);
    process.exit(1);
  }

  const resolved = path.resolve(target);
  if (!fs.existsSync(resolved)) {
    process.stderr.write(`Error: path does not exist: ${resolved}\n`);
    process.exit(1);
  }

  if (mode === "project") {
    if (!fs.existsSync(path.join(resolved, "docs"))) {
      process.stderr.write(`Error: no docs/ folder found in ${resolved}. Is this a project root?\n`);
      process.exit(1);
    }
    const { html } = buildProjectDashboard(resolved);
    const outPath = path.join(resolved, "dashboard.html");
    fs.writeFileSync(outPath, html, "utf8");
    process.stdout.write(`Dashboard written: ${outPath}\n`);
  } else {
    const { html } = buildMaster(resolved);
    const outPath = path.join(resolved, "index.html");
    fs.writeFileSync(outPath, html, "utf8");
    process.stdout.write(`Master overview written: ${outPath}\n`);
  }
}

main();
