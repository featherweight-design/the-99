import json, sys, os, re
SC = os.environ.get("SC", ".")
B = {"f-deeper-390":"8d352ca152d08a4091e8d2045aa28eef","f-suggested-1300":"eb305300f2f45c92438a9abb8319a0ac","f-suggested-320":"3c93c027f9dc9f7f050ed69e702f6037","f-suggested-390":"8e8a55627ac27b78dabefff2d5be8633","f-suggested-768":"5c03de89cacaf7a55e85f32e7f053336","f-which-390":"81ead55df4b4d3c62ed26357660e1274","s-deeper-390":"5ef7e8c5a6330e1332aebb20581ccbd5","s-suggested-320":"0effec6f3ec085ec01940c2af147166c","s-suggested-390":"745a61e84e17ca054f97c3d06dff746b","s-which-390":"4cfc1c48c6fc5b58f6b260b8de295142","th-amonkhet":"5d6a7b4e83e1e5f4db6d3f881a61cf0f","th-eldraine":"fbb24c1677b8be586e7fbad5149cde65","th-ixalan":"64b54b54bbc98ad6f5585a52daedaf9a","th-kaldheim":"168a01d63bb48787c264981e4f4928dc","th-kamigawa":"f3dc550fbb580005929d5c9080b4181f","th-phyrexia":"2b564fd20e59927ac5df5a157bde1c3a","v1":"6cc9e88542d9d804d08fe93320ed2c5a","v2":"1e19fd20cd4021df69df3d78b36990c7","v3":"c922e00599c8437a4421fbf06b631b77","v4":"50ef5f0ab1b02ebf171dc0f3959bfcaa","v5":"1c8358008b4cdad96ab43e7eac764feb","v6":"e9e2f01e9e0240d911951fb50bcf646f"}
SZ = json.load(open(SC + "/up/sizes.json"))
H = {k: v[1] for k, v in SZ.items()}
LOCAL = len(sys.argv) > 1
def src(k): return f"art/a4-{k}.jpg" if LOCAL else f"/_blob/{B[k]}"
CSS = """body{margin:0}
.board{box-sizing:border-box;padding:48px 56px 64px;background:#0D0B09;font-family:'IBM Plex Sans',sans-serif;color:#EDE6D8;display:flex;flex-direction:column;gap:30px}
.bh{display:flex;flex-direction:column;gap:9px;max-width:1500px}
.kick{display:flex;align-items:center;gap:10px;font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#8F8676}
.kick .tag{background:#CF8745;color:#14110E;border-radius:5px;padding:4px 8px;font-weight:600}
.bh h2{margin:0;font:700 30px 'Cinzel',serif}
.bh p,.note{font-size:14px;line-height:1.6;color:#C0B8A6;margin:0;text-wrap:pretty}
.bh p b,.note b{color:#EDE6D8}
.frames{display:flex;gap:44px;align-items:flex-start}
.fr{display:flex;flex-direction:column;gap:12px;flex:none}
.lab{font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#8F8676}
.lab b{color:#CF8745;font-weight:600}
.cap{font-size:13px;line-height:1.55;color:#A59C89;text-wrap:pretty}
.cap b{color:#EDE6D8;font-weight:600}
.shot{display:block;border:1px solid #3A3229;border-radius:6px}
.rec{outline:2px solid #CF8745;outline-offset:6px;border-radius:6px}
.notes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.note{border:1px solid #3A3229;border-radius:12px;background:#15120F;padding:16px 18px}
.note h4{margin:0 0 6px;font:600 13px 'IBM Plex Sans',sans-serif;color:#EDE6D8}
.note ul{margin:6px 0 0;padding-left:18px}.note li{margin:4px 0}
code{font:12px 'IBM Plex Mono',monospace;color:#EDE6D8;background:#211D18;border-radius:4px;padding:1px 4px}
.tbl{border-collapse:collapse;font-size:13px;color:#C0B8A6;width:100%}
.tbl th{text-align:left;font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#8F8676;padding:8px 10px;border-bottom:1px solid #3A3229}
.tbl td{padding:9px 10px;border-bottom:1px solid #2B241B;vertical-align:top;line-height:1.5}
.tbl td b{color:#EDE6D8}"""
FONTS = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;family=Cinzel:wght@600;700;800&amp;display=swap"
def doc(title, w, h, inner):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="{FONTS}">
<style>
{CSS}
</style>
</helmet>
<div class="board" style="width: {w}px; min-height: {h}px">
{inner}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
"""
def head(kick, title, body):
    return f'<div class="bh"><div class="kick"><span class="tag">A4</span>{kick}</div><h2>{title}</h2><p>{body}</p></div>'
def frame(k, w, lab, cap, rec=False, scale=1):
    dw = int(w*scale); dh = int(H[k]*scale)
    return (f'<div class="fr" style="width: {dw}px"><div class="lab">{lab}</div>'
            f'<img class="shot{" rec" if rec else ""}" src="{src(k)}" alt="{re.sub("<[^>]+>","",lab)}" width="{dw}" height="{dh}" style="width: {dw}px; height: {dh}px">'
            f'<div class="cap">{cap}</div></div>')
def notes(*ns): return '<div class="notes">' + "".join(f'<div class="note"><h4>{t}</h4>{b}</div>' for t, b in ns) + '</div>'



REND = "Every frame is the shipped <code>Credits</code> section and the <code>Close</code> band under it (src/components/landing) rendered with the shipped CSS and fonts in Low Sun; only <code>credit-tips.tsx</code>’s classes change in the recommended frames."
out = {}
G = 44
def row(*fs): return '<div class="frames">' + "".join(fs) + '</div>'
# ---------- Phone
inner = head("Phone · 390 and 320", "On a phone the tip opens in the list and pushes the rows below it down",
  "Today the tip floats over the next rows (and, on the last row, over the column’s edge and the band below), so a reader closes it before reading on. <b>Recommended: in the flow below 768.</b> The tip is the same card with the same words and preview; it takes its row’s full width under the row, and every row under it moves down by its height. " + REND)
inner += '<div class="lab" style="margin-top:6px">Today <b>· shipped</b></div>'
inner += row(frame("s-deeper-390", 390, "Mid-list · Proposed cuts", "The tip covers <b>“Anything else?”</b> and <b>Which deck needs it most?</b>, and runs past the column."),
  frame("s-suggested-390", 390, "Long tip · Suggested changes", "The longest tip (ask plus three rows) covers three rows."),
  frame("s-which-390", 390, "Last row · Which deck", "It hangs over the column’s edge and the closing band’s title."),
  frame("s-suggested-320", 320, "320 · Suggested changes", "At 320 the long tip is 303px tall and covers every row under it."))
inner += '<div class="lab" style="margin-top:10px">A4 · In the flow <b>· recommended</b></div>'
inner += row(frame("f-deeper-390", 390, "Mid-list · Proposed cuts", "The tip sits 2px under its row; <b>“Anything else?”</b> and <b>Which deck</b> move down and stay readable.", rec=True),
  frame("f-suggested-390", 390, "Long tip · Suggested changes", "The column grows by the tip’s height; nothing is covered.", rec=True),
  frame("f-which-390", 390, "Last row · Which deck", "The column grows to hold it; the closing band moves down with the page.", rec=True),
  frame("f-suggested-320", 320, "320 · Suggested changes", "The narrowest phone: the card wraps inside the row’s 242px.", rec=True))
inner += notes(("The card", "<ul><li>The shipped tip card unchanged inside: icon, name, sentence, <b>What you get</b> and <b>Example</b>, the same border, radius and <code>--elevated</code> fill.</li><li>As wide as the row’s text (the column’s padding to its padding), not 4px past it as today.</li><li><b>No drop shadow</b> on the phone: it no longer sits over anything.</li><li>2px under the row, 3px above the next row’s rule.</li></ul>"),
  ("What stays", "<ul><li>The rows, the ⓘ (still a 44px target, in accent ink while open), the costs and every word.</li><li>One tip open at a time.</li><li>Tablet and desktop (768 and up) keep the floating tip exactly as shipped (board <b>A4 · Tablet and desktop</b>).</li></ul>"),
  ("Why not a sheet", "A bottom sheet would cover the list just as the float does, and it adds a step for a two-line read. In the flow matches the shipped export guides list on the same page, which opens each app’s steps under its row."))
out["A4-Phone.dc.html"] = ("A4 Phone tips", 56*2 + 390*3 + 320 + G*3, inner, 0)
# ---------- Behaviour
inner = head("Phone · opening, switching, the last row", "The pressed row stays put, and an open tip is always in view",
  "Phone viewport frames, 390 × 844. Moving rows under a finger is the one risk of an in-flow tip, so two rules come with it.")
inner += '<div class="lab" style="margin-top:6px">Switching tips <b>· the row you pressed stays where it was</b></div>'
inner += row(frame("v1", 390, "1 · Overview of a deck open", "The reader presses the ⓘ on <b>Proposed cuts</b>, 467px down the screen."),
  frame("v2", 390, "2 · Recommended: anchored", "The Overview tip closes and the Proposed cuts tip opens. The page scrolls by the height that closed above, so <b>Proposed cuts stays at 467px</b> and its tip opens under the reader’s finger.", rec=True),
  frame("v3", 390, "Without the anchor", "Closing the tip above lifts every row by its 223px: Proposed cuts jumps to 227px and the reader loses their place. Not this."))
inner += '<div class="lab" style="margin-top:10px">The last row <b>· the tip scrolls into view</b></div>'
inner += row(frame("v4", 390, "1 · Near the bottom", "<b>Which deck needs it most?</b> sits 700px down, close to the screen’s edge."),
  frame("v5", 390, "Without the scroll", "Its tip opens below the fold: only its first lines show. Not this."),
  frame("v6", 390, "2 · Recommended: in view", "When the open tip runs past the bottom, the page scrolls just enough to show all of it with <b>16px</b> to spare. A tip already in view never moves the page.", rec=True))
inner += notes(("Opening and closing", "<ul><li><b>Open:</b> press the ⓘ. The card arrives with the shipped <code>.anim-menu-in</code> (no beat, eased, as popovers do); the rows below move at once, with no height animation sliding text under the reader.</li><li><b>Close:</b> press the same ⓘ again, open another one, or Escape.</li><li>A press elsewhere <b>no longer closes</b> a phone tip: it covers nothing, and a scroll that starts outside the list would otherwise collapse it mid-swipe and jump the page.</li></ul>"),
  ("Scrolling", "<ul><li><b>Switching:</b> when a tip above the pressed row closes, keep the pressed ⓘ’s screen position (read it before, scroll by the difference after).</li><li><b>Into view:</b> after opening, if the tip’s bottom is past the screen, scroll so it ends 16px above the bottom; if the tip is taller than the screen, put its top 16px under the top instead. Smooth, or instant under reduced motion.</li></ul>"),
  ("Reduced motion", "The card simply appears (<code>.anim-menu-in</code> sits in the shipped reduced-motion block) and the into-view scroll jumps. Nothing else moves."))
out["A4-Behaviour.dc.html"] = ("A4 Phone behaviour", 56*2 + 390*3 + G*2 + 240, inner, 0)
# ---------- Desktop
inner = head("Tablet and desktop", "From 768 up, the floating tip stays exactly as shipped",
  "Reference only: the recommended classes render these widths pixel for pixel as today (the 330px tip at 10px under the row, hover, focus and press, the shadow). " + REND)
inner += row(frame("f-suggested-1300", 1300, "1300 <b>· unchanged</b>", "Suggested changes pinned open in the two-column layout."),
  frame("f-suggested-768", 768, "768 <b>· unchanged</b>", "The two columns begin here, so the float has room beside the free column."))
inner += notes(("Where the switch sits", "At <b>768</b> (<code>md</code>), the width where the tip already changes from full row width to its 330px float and the two columns begin. Below it there is one column and no room to float beside anything."),
  ("Hover stays desktop only", "Hover opens a tip only for a mouse, as shipped; on the phone the ⓘ is press-only, so the in-flow tip never opens or closes from a passing touch."),
  ("Nothing else changes", "Copy, the free column, the value block and the cost sheet are untouched."))
out["A4-Desktop.dc.html"] = ("A4 Tablet and desktop", 56*2 + 1300 + 768 + G, inner, 0)
# ---------- Themes
T = [("amonkhet","Low Sun"),("kamigawa","Neon Rain"),("ixalan","Canopy"),("phyrexia","Oil Haze"),("eldraine","Witching Hour"),("kaldheim","First Frost")]
inner = head("Six themes", "The in-flow tip in all six themes", "Proposed cuts open at 390. Only tokens change; the card’s <code>--elevated</code> fill and <code>--border-strong</code> edge read against the column in every theme without the shadow.")
inner += row(*[frame(f"th-{t}", 390, n, "") for t, n in T])
out["A4-Themes.dc.html"] = ("A4 Themes", 56*2 + 390*6 + G*5, inner, 0)
# ---------- Calls
inner = head("The call", "Phone tips open in the list; desktop keeps the float",
  "On a phone, opening a tip in <b>With credits</b> drew it over the rows below. A4 takes engineering’s recommendation: below 768 the tip opens in the flow under its row and pushes the rows down, while 768 and up keep the shipped floating tip. Everything else in the landing handoff stays locked.")
tbl = ('<table class="tbl"><tr><th>Width</th><th>Tip</th><th>Opens</th><th>Closes</th><th>Page</th></tr>'
 '<tr><td><b>below 768</b></td><td>In the flow under its row, row-wide, no shadow</td><td>Press the ⓘ</td><td>The same ⓘ, another ⓘ, Escape</td><td>Rows below move down; the pressed row is held in place when a tip above closes; an open tip scrolls into view</td></tr>'
 '<tr><td><b>768 and up</b></td><td>Floating 330px card, as shipped</td><td>Hover, keyboard focus or press, as shipped</td><td>As shipped: second press, Escape, press outside</td><td>Nothing moves</td></tr></table>')
inner += f'<div style="max-width: 1500px">{tbl}</div>'
inner += row(frame("s-deeper-390", 390, "Today", "The tip covers the rows under it.", scale=1), frame("f-deeper-390", 390, "A4 <b>· recommended</b>", "The rows under it move down.", rec=True))
inner += notes(("Settled", "<ul><li>No new copy, string, token or component: the shipped tip card moves into the list on phones.</li><li>One tip open at a time, as today.</li><li>Phone tips no longer close on a press elsewhere (they cover nothing, and a scroll would collapse them).</li><li>Mid-list, long and last-row tips on board <b>A4 · Phone</b>; switching and scrolling on <b>A4 · Behaviour</b>.</li></ul>"),
  ("For engineering", "<ul><li><code>credit-tips.tsx</code> only. Row: <code>max-md:flex-wrap</code>. Tip: <code>anim-menu-in max-md:basis-full max-md:mt-[2px] max-md:mb-[3px]</code>, and the float’s classes behind <code>md:</code> (<code>md:absolute md:left-[-8px] md:top-[calc(100%-2px)] md:z-30 md:w-[330px] md:shadow-[…]</code>, plus today’s hover-only <code>pointer-events-none</code>).</li><li>Below 768 the ⓘ is a disclosure: <code>aria-expanded</code> plus <code>aria-controls</code> on the tip’s id, and the tip drops <code>role=tooltip</code>. The outside-press listener runs only from 768.</li><li>Anchor and into-view scroll as on <b>A4 · Behaviour</b> (a layout effect after the open id changes).</li></ul>"),
  ("Readiness", "<b>Green.</b> One small PR with tests in <code>credit-tips.test.tsx</code>; no data, flag or copy change. See <code>READINESS.md</code> in <code>addendum-phone-tips/</code>."))
out["A4-Calls.dc.html"] = ("A4 Calls", 56*2 + 1500, inner, 0)
MH = {"A4-Behaviour.dc.html": 2523, "A4-Calls.dc.html": 1621, "A4-Desktop.dc.html": 1077, "A4-Phone.dc.html": 2345, "A4-Themes.dc.html": 1081}
dst = sys.argv[1] if LOCAL else f"{SC}/canvas/project"
os.makedirs(dst, exist_ok=True)
for n, (t, w, inner, h) in out.items():
    open(f"{dst}/{n}", "w").write(doc(t, w, MH.get(n, h or 400), inner))
print(json.dumps({n: v[1] for n, v in out.items()}))
