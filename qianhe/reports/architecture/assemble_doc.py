import re, pathlib

base = pathlib.Path(r"C:\Users\BIDERI ALEC\Downloads\projects\new products\qianhe\reports\architecture")
out = base / "doc.html"

def svg_of(filename):
    html = (base / filename).read_text(encoding="utf-8")
    m = re.search(r"<svg\b.*?</svg>", html, re.DOTALL)
    svg = m.group(0)
    slug = filename.replace("embeddedlend-", "").replace(".html", "")

    ids = set(re.findall(r'id="([a-z0-9-]+)"', svg))
    for ident in ids:
        svg = svg.replace(f'id="{ident}"', f'id="{slug}-{ident}"')
        svg = svg.replace(f'url(#{ident})', f'url(#{slug}-{ident})')

    # Namespace every id token inside aria-labelledby (may hold multiple ids)
    def fix_labelledby(mo):
        tokens = mo.group(1).split()
        return 'aria-labelledby="' + " ".join(f"{slug}-{t}" if t in ids else t for t in tokens) + '"'
    svg = re.sub(r'aria-labelledby="([^"]+)"', fix_labelledby, svg)

    return svg

diagrams = [
    {
        "file": "embeddedlend-architecture.html",
        "img": "diagram.png",
        "num": "01",
        "title": "The underwriting bridge — system at a glance (hand-drawn)",
        "explain": (
            "The whole system in one picture. The lender requests a decision; the borrower consents. Consented data flows from "
            "Open Finance and mobile-money rails into a deterministic underwriting core, whose AI layer explains the call back to "
            "the lender. An approved loan is disbursed over eKash and repayment history loops back to sharpen future scores, all "
            "under compliance."
        ),
    },
    {
        "file": "embeddedlend-decision-detail.html",
        "num": "02",
        "title": "Inside the decision engine",
        "explain": (
            "The core, opened up: numbers computed by code, narrative by AI. Consented data becomes cash-flow signals, then a "
            "deterministic score, then a policy-gated decision. The gate approves into eKash, explains via AI narration, writes a "
            "tamper-proof decision trace, or declines back to re-pull data."
        ),
    },
    {
        "file": "embeddedlend-swimlane.html",
        "num": "03",
        "title": "Who does what — the swimlane",
        "explain": (
            "Five actors, one journey. Each horizontal band is an actor; each box is a step that actor performs; each arrow is a "
            "handoff of work. Solid arrows are handoffs, dashed arrows are money, return, or audit flows, and the coral arrow is the "
            "critical handoff: the AI explanation back to the lender. Read left to right: apply, request, consent, score, explain, "
            "review, disburse, repay, record repayment — which feeds future scores."
        ),
    },
    {
        "file": "embeddedlend-loop.html",
        "num": "04",
        "title": "The moat flywheel",
        "explain": (
            "The strategic anchor: a self-reinforcing loop. Lending writes repayment history into one shared credit record; richer "
            "history sharpens the scores; sharper scores let us approve more thin-file borrowers safely; more lending writes more "
            "history. Each station writes back to the central hub — a moat no single lender can build alone. The coral station is the "
            "scoring engine that improves on every pass."
        ),
    },
    {
        "file": "embeddedlend-sequence.html",
        "num": "05",
        "title": "The borrower journey, one API call at a time",
        "explain": (
            "Time flows top to bottom. The borrower applies, the lender requests a decision, the platform consents and pulls "
            "open-finance data, computes a deterministic score, and the AI explains the call back to the lender (the coral response). "
            "An approved loan is originated and disbursed over eKash, and repayment returns to sharpen the next score."
        ),
    },
    {
        "file": "embeddedlend-dp-integration.html",
        "num": "06",
        "title": "Data integration topology",
        "explain": (
            "What plugs in, what plugs out, and over what wire. Consented sources — BNR Open Finance, mobile money, banks, and a "
            "credit bureau — feed a consent gateway and the underwriting core, and the credit-history store (the moat) accumulates. "
            "NDFSPs, MFI/SACCOs, and vertical SaaS platforms consume. eKash runs layer-wide for money movement."
        ),
    },
    {
        "file": "embeddedlend-timeline.html",
        "num": "07",
        "title": "Why now — the window is open",
        "explain": (
            "The rails arrive on a schedule. eKash went fully live in July 2026. BNR's Open Finance roadmap runs voluntary now, "
            "mandatory in 2026–28, then a central platform in 2029/30 that BNR says it will partner to build. Whoever occupies the "
            "underwriting layer in the voluntary phase inherits the standard — the MVP window is open today."
        ),
    },
]

parts = []
parts.append("""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EmbeddedLend — Architecture Story</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --color-paper:   #f5f5f5;
    --color-ink:     #2d3142;
    --color-muted:   #4f5d75;
    --color-accent:  #eb6c36;
    --font-sans:     'Geist', system-ui, sans-serif;
    --font-serif:    'Instrument Serif', serif;
    --font-mono:     'Geist Mono', ui-monospace, monospace;
  }
  body { font-family: var(--font-sans); background: var(--color-paper); color: var(--color-ink); line-height: 1.6; padding: 3rem 2rem 5rem; }
  .frame { max-width: 1280px; margin: 0 auto; }
  header { margin-bottom: 2.5rem; border-bottom: 1px solid rgba(45,49,66,0.15); padding-bottom: 1.5rem; }
  .eyebrow { font-family: var(--font-mono); font-size: 0.66rem; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: var(--color-muted); margin-bottom: 0.5rem; }
  h1 { font-family: var(--font-serif); font-size: clamp(1.6rem, 2.6vw + 0.75rem, 2.2rem); font-weight: 400; letter-spacing: -0.02em; line-height: 1.15; margin-bottom: 0.6rem; }
  .lede { color: var(--color-muted); font-size: 1.02rem; max-width: 60ch; }
  .diagram { margin: 3rem 0; }
  .diagram .meta { display: flex; align-items: baseline; gap: 0.9rem; margin-bottom: 0.5rem; }
  .diagram .num { font-family: var(--font-mono); font-size: 0.8rem; letter-spacing: 0.16em; color: var(--color-accent); }
  .diagram h2 { font-family: var(--font-serif); font-size: 1.35rem; font-weight: 400; letter-spacing: -0.01em; }
  .diagram .explain { color: var(--color-muted); font-size: 0.95rem; max-width: 72ch; margin-bottom: 1.2rem; }
  .diagram svg, .diagram img { width: 100%; height: auto; display: block; background: var(--color-paper); border: 1px solid rgba(45,49,66,0.10); border-radius: 8px; }
  footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid rgba(45,49,66,0.15); font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.12em; color: var(--color-muted); }
</style>
</head>
<body>
  <div class="frame">
    <header>
      <p class="eyebrow">EmbeddedLend · Architecture Story</p>
      <h1>The underwriting bridge, explained</h1>
      <p class="lede">Consent-based SME underwriting on top of BNR Open Finance and eKash. One scrollable story: the system, the decision engine, who does what, the moat flywheel, the API journey, the data topology, and why now.</p>
    </header>
""")

for d in diagrams:
    if d.get("img"):
        body = f'<img src="{d["img"]}" alt="{d["title"]}">'
    else:
        body = svg_of(d["file"])
    parts.append(f"""
    <section class="diagram">
      <div class="meta"><span class="num">{d['num']}</span><h2>{d['title']}</h2></div>
      <p class="explain">{d['explain']}</p>
      {body}
    </section>
""")

parts.append("""    <footer>EmbeddedLend · 01–07 · individual files remain independently linkable</footer>
  </div>
</body>
</html>
""")

out.write_text("".join(parts), encoding="utf-8")
print(f"Wrote {out} ({len(''.join(parts))} bytes)")
