import math

N = 6
cx, cy = 520, 340
R = 240
sw, sh = 160, 64
hw, hh = 200, 104

stations = [
    ("Lend", "more loans, safely", False, "OUTCOMES"),
    ("Record", "repayment history", False, None),
    ("Sharpen", "better scores", True, "SIGNALS"),
    ("Approve", "more thin-file yes", False, None),
    ("Fund", "more disbursements", False, None),
    ("Repeat", "the flywheel spins", False, None),
]

def theta(k):
    return math.radians(-90 + k * 360.0 / N)

def P(k):
    t = theta(k)
    return (cx + R * math.cos(t), cy + R * math.sin(t))

centers = [P(k) for k in range(N)]

def station_rect(k):
    x, y = centers[k]
    return (round(x - sw / 2), round(y - sh / 2))

# Ring arcs: station k -> k+1. Approximate endpoints as points on the circle
# just outside each box edge (per reference, marker lands on dest stroke).
# We compute exit/entry angles by intersecting the circle with the box edges.
def box_intersections(k):
    # find two circle/rect intersection points for station k
    x0, y0 = centers[k]
    left, top = station_rect(k)
    right, bottom = left + sw, top + sh
    pts = []
    for x in (left, right):
        d = R * R - (x - cx) ** 2
        if d < 0: continue
        for y in (cy - math.sqrt(d), cy + math.sqrt(d)):
            if top - 0.5 <= y <= bottom + 0.5:
                pts.append((x, y))
    for y in (top, bottom):
        d = R * R - (y - cy) ** 2
        if d < 0: continue
        for x in (cx - math.sqrt(d), cx + math.sqrt(d)):
            if left - 0.5 <= x <= right + 0.5:
                pts.append((x, y))
    return pts

def polar(p):
    return math.atan2(p[1] - cy, p[0] - cx)

def norm_angle(a):
    # bring angle into [0, 2pi)
    return a % (2 * math.pi)

def ring_arc(k):
    # exit of station k (clockwise after its center angle), entry of station k+1
    t_k = norm_angle(theta(k))
    t_next = norm_angle(theta((k + 1) % N))
    pts = box_intersections(k)
    # exit: candidate just after t_k clockwise
    cands = []
    for p in pts:
        a = norm_angle(polar(p))
        diff = (a - t_k) % (2 * math.pi)
        cands.append((diff, p))
    cands.sort()
    exit_p = cands[-1][1] if cands else None  # largest clockwise diff = just after

    pts2 = box_intersections((k + 1) % N)
    t_target = norm_angle(theta((k + 1) % N))
    cands2 = []
    for p in pts2:
        a = norm_angle(polar(p))
        diff = (t_target - a) % (2 * math.pi)  # distance from entry going backward
        cands2.append((diff, p))
    cands2.sort()
    entry_p = cands2[0][1] if cands2 else None

    if exit_p is None or entry_p is None:
        return None
    # end just before entry (marker overhang ~1.2px)
    a_end = norm_angle(polar(entry_p)) - 1.2 / R
    end_p = (cx + R * math.cos(a_end), cy + R * math.sin(a_end))
    return f'M{exit_p[0]:.2f} {exit_p[1]:.2f} A{R} {R} 0 0 1 {end_p[0]:.2f} {end_p[1]:.2f}'

# Spokes: station inner edge -> 6px before hub edge
def spoke(k):
    t = theta(k)
    ux, uy = math.cos(t), math.sin(t)
    def box_dist(vx, vy, hw_, hh_):
        cands = []
        if vx != 0: cands.append(abs(hw_ / vx))
        if vy != 0: cands.append(abs(hh_ / vy))
        return min(cands)
    d_st = box_dist(ux, uy, sw / 2, sh / 2)
    d_hub = box_dist(ux, uy, hw / 2, hh / 2)
    px, py = centers[k]
    sx = px - d_st * ux
    sy = py - d_st * uy
    ex = cx + (d_hub + 6) * ux
    ey = cy + (d_hub + 6) * uy
    return f'M{sx:.2f} {sy:.2f} L{ex:.2f} {ey:.2f}'

arcs = [ring_arc(k) for k in range(N)]
spokes_paths = [spoke(k) for k in range(N)]

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>The moat flywheel</title>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&amp;family=Geist:wght@400;500;600&amp;family=Geist+Mono:wght@400;500;600&amp;display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    :root {{
      --paper: #f5f5f5; --ink: #2d3142; --muted: #4f5d75; --soft: #7a8399;
      --accent: #eb6c36; --accent-tint: rgba(235,108,54,0.08); --link: #2e5aa8;
      --sans: 'Geist', system-ui, sans-serif; --serif: 'Instrument Serif', serif;
      --mono: 'Geist Mono', ui-monospace, monospace;
    }}
    body {{ min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 3rem 2rem; background: #f5f5f5; color: #2d3142; font-family: var(--sans); }}
    .frame {{ width: 100%; max-width: 1200px; }}
    .eyebrow {{ margin-bottom: 0.5rem; color: #4f5d75; font: 500 0.66rem var(--mono); letter-spacing: 0.18em; text-transform: uppercase; }}
    h1 {{ margin-bottom: 0.4rem; color: #2d3142; font: 400 clamp(1.5rem, 2.4vw + 0.75rem, 2rem)/1.15 var(--serif); letter-spacing: -0.02em; }}
    .sub {{ margin-bottom: 1.5rem; color: #4f5d75; font-size: 0.9rem; max-width: 64ch; }}
    svg {{ display: block; width: 100%; min-width: 900px; }}
    .ring {{ fill: none; stroke: #4f5d75; stroke-width: 1.2; }}
    .spoke {{ fill: none; stroke: #7a8399; stroke-width: 1; stroke-dasharray: 5 4; }}
    .station {{ fill: #f5f5f5; stroke: #2d3142; stroke-width: 1; }}
    .station.focal {{ fill: #f9e4d5; stroke: #eb6c36; stroke-width: 1.2; }}
    .hub {{ fill: #2d3142; }}
    .node-name {{ fill: #2d3142; font: 600 12px var(--sans); text-anchor: middle; }}
    .focal-name {{ fill: #eb6c36; }}
    .sublabel {{ fill: #7a8399; font: 400 8px var(--mono); text-anchor: middle; }}
    .hub-name {{ fill: #f5f5f5; font: 600 16px var(--sans); text-anchor: middle; }}
    .hub-sub {{ fill: #f5f5f5; opacity: 0.72; font: 400 8px var(--mono); text-anchor: middle; }}
    .arrow-label {{ fill: #7a8399; font: 400 8px var(--mono); letter-spacing: 0.06em; text-anchor: middle; }}
  </style>
</head>
<body>
  <main class="frame">
    <p class="eyebrow">Loop · EmbeddedLend</p>
    <h1>The moat flywheel</h1>
    <p class="sub">Each pass through the ring writes durable repayment history into one shared record. The more we lend, the richer the history, the sharper the scores, the more thin-file borrowers we can safely approve — a self-reinforcing moat no single lender can build alone.</p>

    <svg viewBox="0 0 1040 680" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="loop-title loop-desc">
      <title id="loop-title">The moat flywheel</title>
      <desc id="loop-desc">Six stations flow clockwise from Lend through Record, Sharpen, Approve, Fund and Repeat back to Lend. Each station writes state into one central credit-history hub, with Sharpen highlighted as the scoring engine that improves each loop.</desc>
      <defs>
        <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.9" fill="rgba(45,49,66,0.10)"/></pattern>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#4f5d75"/></marker>
        <marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#eb6c36"/></marker>
        <marker id="arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#2e5aa8"/></marker>
        <marker id="arrow-soft" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#7a8399"/></marker>
      </defs>
      <rect width="1040" height="680" fill="#f5f5f5"/>
      <rect width="1040" height="680" fill="url(#dots)" opacity="0.55"/>

      <!-- Solid clockwise ring -->
      {chr(10).join(f'      <path d="{a}" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#arrow)"/>' for a in arcs)}

      <!-- Dashed write-backs to the hub -->
      {chr(10).join(f'      <path d="{s}" fill="none" stroke="#7a8399" stroke-width="1" stroke-dasharray="5,4" marker-end="url(#arrow-soft)"/>' for s in spokes_paths)}

      <!-- Curated spoke labels -->
      <rect x="532" y="472" width="56" height="16" rx="4" fill="#f5f5f5"/>
      <text x="560" y="484" fill="#7a8399" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle" letter-spacing="0.06em">SIGNALS</text>
      <rect x="420" y="470" width="60" height="16" rx="4" fill="#f5f5f5"/>
      <text x="450" y="482" fill="#7a8399" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle" letter-spacing="0.06em">OUTCOMES</text>
"""

# stations
for k, (name, sub, focal, _) in enumerate(stations):
    x, y = station_rect(k)
    cx_t, cy_t = x + sw / 2, y + sh / 2
    if focal:
        html += f"""
      <rect x="{x}" y="{y}" width="{sw}" height="{sh}" rx="6" fill="#f9e4d5" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="{cx_t}" y="{cy_t + 4}" fill="#eb6c36" font-size="12" font-weight="600" font-family="'Geist', sans-serif" text-anchor="middle">{name}</text>
      <text x="{cx_t}" y="{cy_t + 24}" fill="#7a8399" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">{sub}</text>"""
    else:
        html += f"""
      <rect x="{x}" y="{y}" width="{sw}" height="{sh}" rx="6" fill="#f5f5f5" stroke="#2d3142" stroke-width="1"/>
      <text x="{cx_t}" y="{cy_t + 4}" fill="#2d3142" font-size="12" font-weight="600" font-family="'Geist', sans-serif" text-anchor="middle">{name}</text>
      <text x="{cx_t}" y="{cy_t + 24}" fill="#7a8399" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">{sub}</text>"""

html += f"""
      <!-- The one shared-state hub: the credit-history moat. -->
      <rect x="{cx - hw//2}" y="{cy - hh//2}" width="{hw}" height="{hh}" rx="8" fill="#2d3142"/>
      <text x="{cx}" y="{cy - 6}" fill="#f5f5f5" font-size="16" font-weight="600" font-family="'Geist', sans-serif" text-anchor="middle">Credit History</text>
      <text x="{cx}" y="{cy + 18}" fill="#f5f5f5" opacity="0.72" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">one shared record</text>
    </svg>
  </main>
</body>
</html>
"""

out = r"C:\Users\BIDERI ALEC\Downloads\projects\new products\qianhe\reports\architecture\embeddedlend-loop.html"
open(out, "w", encoding="utf-8").write(html)
print("wrote", out)
