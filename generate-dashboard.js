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

  const claimsHtml = claims.length
    ? claims.map((c) => `
      <tr>
        <td>${escapeHtml(c.claim)}</td>
        <td class="muted">${escapeHtml(c.source)}</td>
        <td><span class="grade ${gradeClass(c.grade)}">${c.grade}</span></td>
      </tr>`).join("")
    : "<tr><td colspan=3 class='muted'>No graded claims found yet. Add a table with ✅ / 🟡 / ⚠️ / ❓ grades.</td></tr>";

  const panelsHtml = docPanels.map((p) => `
    <details class="panel" open>
      <summary>
        <span class="panel-title">${escapeHtml(p.title)}</span>
        <span class="panel-file muted">${escapeHtml(p.name)}</span>
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
        .map((f) => `<li><a href="${encodeURIComponent("docs/" + f)}" target="_blank" rel="noopener">${escapeHtml(f)}</a></li>`)
        .join("")
    : "";
  const prototypeScan = scanPrototype(projectDir);
  const prototypeHtml = prototypeScan
    ? `<div class="proto">${prototypeScan.map((x) => `<p>${escapeHtml(x)}</p>`).join("")}</div>`
    : "";

  return { projectName, html: pageTemplate({
    title: `${projectName} — Project Dashboard`,
    subtitle: projectDir,
    header: `${statusHtml}`,
    summary: `
      <div class="grid">
        <div class="card"><h3>Reports</h3><p class="big">${docPanels.length}</p><p class="muted">docs loaded</p></div>
        <div class="card"><h3>Claims</h3><p class="big">${claims.length}</p><p class="muted">graded ledger entries</p></div>
        <div class="card"><h3>Prototype</h3><p class="big">${prototypeScan ? "Found" : "None"}</p><p class="muted">scanned for artifacts</p></div>
      </div>
      ${handoffHtml ? `<details class="panel"><summary>Handoff Context</summary><div class="panel-body">${handoffHtml}</div></details>` : ""}
      ${prototypeHtml}
    `,
    sections: `
      <details class="panel" open>
        <summary><span class="panel-title">Evidence Ledger</span></summary>
        <div class="panel-body"><table><thead><tr><th>Claim</th><th>Source</th><th>Grade</th></tr></thead><tbody>${claimsHtml}</tbody></table></div>
      </details>
      ${verdictHtml ? `<details class="panel"><summary><span class="panel-title">Verdict</span></summary><div class="panel-body">${verdictHtml}</div></details>` : ""}
      ${panelsHtml}
      ${artifactLinks ? `<details class="panel"><summary><span class="panel-title">Artifacts</span></summary><div class="panel-body"><ul>${artifactLinks}</ul></div></details>` : ""}
    `,
  }) };
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

  const rows = projects.map((p) => `
    <tr>
      <td><a href="${encodeURIComponent(path.join(p.name, "dashboard.html"))}">${escapeHtml(p.name)}</a></td>
      <td><span class="chip">${escapeHtml(p.status)}</span></td>
      <td>${p.reports}</td>
      <td>${p.claims}</td>
      <td>${p.hasDash ? "yes" : '<a href="' + encodeURIComponent(p.name) + '">no dash (open project)</a>'}</td>
    </tr>`).join("");

  const body = projects.length
    ? `<table><thead><tr><th>Project</th><th>Status</th><th>Reports</th><th>Claims</th><th>Dashboard</th></tr></thead><tbody>${rows}</tbody></table>`
    : `<p class="muted">No project folders with a docs/ directory found under: ${escapeHtml(parentDir)}</p>`;

  return { projectName: "All Projects", html: pageTemplate({
    title: "Projects — Master Overview",
    subtitle: parentDir,
    header: `<span class="chip">${projects.length} projects</span>`,
    summary: body,
    sections: "",
  }) };
}

// ---------- page template ----------
function pageTemplate({ title, subtitle, header, summary, sections }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  :root {
    --bg: #0f1115; --panel: #171a21; --panel2: #1d212b; --border: #2a2f3a;
    --text: #e6e9ef; --muted: #8b93a3; --accent: #6ea8ff; --chip: #232834;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.6 -apple-system, "Segoe UI", Roboto, sans-serif; }
  header { padding: 24px 32px; border-bottom: 1px solid var(--border); background: linear-gradient(180deg, #14161c, #0f1115); }
  header h1 { margin: 0 0 4px; font-size: 22px; }
  .muted { color: var(--muted); }
  main { padding: 24px 32px; max-width: 1100px; margin: 0 auto; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
  .card h3 { margin: 0 0 2px; font-size: 13px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
  .card .big { font-size: 26px; font-weight: 700; margin: 2px 0; }
  .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; margin-bottom: 12px; overflow: hidden; }
  .panel summary { padding: 12px 16px; cursor: pointer; font-weight: 600; display: flex; justify-content: space-between; align-items: center; gap: 12px; background: var(--panel2); list-style: none; }
  .panel summary::-webkit-details-marker { display: none; }
  .panel summary::after { content: "+"; color: var(--accent); font-weight: 700; font-size: 18px; }
  .panel[open] summary::after { content: "-"; }
  .panel-title { font-size: 15px; }
  .panel-file { font-size: 12px; font-weight: 400; }
  .panel-body { padding: 14px 16px; }
  .panel-body h3, .panel-body h4 { margin-top: 16px; }
  .panel-body p, .panel-body ul, .panel-body ol { margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
  th { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
  code { background: var(--chip); border-radius: 4px; padding: 1px 5px; font-size: 13px; }
  pre { background: #0a0c10; border: 1px solid var(--border); border-radius: 8px; padding: 12px; overflow-x: auto; }
  a { color: var(--accent); }
  .chip { display: inline-block; background: var(--chip); border: 1px solid var(--border); border-radius: 999px; padding: 2px 10px; font-size: 12px; margin-right: 6px; }
  .grade { border-radius: 6px; padding: 1px 8px; font-size: 12px; white-space: nowrap; }
  .g-observed { background: #16301f; color: #6fd98a; }
  .g-secondary { background: #2f2a14; color: #e0c06a; }
  .g-unverified { background: #331a1a; color: #e07a7a; }
  .g-assumption { background: #231633; color: #b18ae8; }
  .g-unknown { background: var(--chip); color: var(--muted); }
  .meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .meta-item { background: var(--chip); border-radius: 6px; padding: 3px 8px; font-size: 12px; }
  .handoff { white-space: pre-wrap; }
  .verdict { border-left: 3px solid var(--accent); padding-left: 12px; }
  @media print { body { background: #fff; color: #000; } .panel { border-color: #ccc; } }
</style>
</head>
<body>
<header>
  <h1>${escapeHtml(title)}</h1>
  <div class="muted">${escapeHtml(subtitle)}</div>
  ${header}
</header>
<main>
  ${summary}
  ${sections}
</main>
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
