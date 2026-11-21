#!/usr/bin/env python3
# Move a copy · several picks addendum boards (account 2, 2026-11-21).
import json, os, struct
ROOT = os.path.dirname(os.path.abspath(__file__)) + "/project"

def size(p):
    with open(f"{ROOT}/{p}", "rb") as f:
        f.read(16); w, h = struct.unpack(">II", f.read(8))
    return w, h

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;family=Cinzel:wght@600;700;800&amp;display=swap" rel="stylesheet">
<style>
body{{margin:0;background:#0D0B09}}
p{{margin:0}}
.lab{{font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#948B78}}
.lab b{{color:#CF8745;font-weight:600}}
.cap{{font-size:13px;line-height:1.55;color:#A59C89}}
.cap b{{color:#EDE6D8;font-weight:600}}
.q{{font-family:'IBM Plex Mono',monospace;font-size:12.5px;color:#EDE6D8}}
.it{{display:grid;grid-template-columns:34px minmax(0,1fr);gap:10px;font-size:14px;line-height:1.6;color:#C0B8A6}}
.it b{{color:#EDE6D8;font-weight:600}}
.n{{font:600 12px 'IBM Plex Mono',monospace;color:#CF8745;padding-top:2px}}
.box{{border:1px solid #3A3229;border-radius:14px;padding:22px 24px;display:flex;flex-direction:column;gap:12px;background:#15120F}}
.shot{{display:block;width:100%;border-radius:14px;border:1px solid #3A3229}}
table{{border-collapse:collapse;width:100%;font-size:13px;color:#C0B8A6}}
td{{border-top:1px solid #2A241E;padding:7px 10px 7px 0;vertical-align:top;line-height:1.5}}
td:first-child{{color:#EDE6D8;width:34%}}
</style>
</helmet>
<div style="width: {w}px; min-height: {h}px; box-sizing: border-box; padding: 48px 56px 64px; background: #0D0B09; font-family: 'IBM Plex Sans', sans-serif; color: #EDE6D8; display: flex; flex-direction: column; gap: 30px">
"""
TAIL = """</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
"""

def header(tag, h2, lede):
    return f"""<div style="display: flex; flex-direction: column; gap: 9px; max-width: 1240px">
<p class="lab"><b>{tag}</b></p>
<h2 style="margin: 0; font: 700 30px 'Cinzel', serif">{h2}</h2>
<p style="font-size: 14px; line-height: 1.6; color: #C0B8A6">{lede}</p>
</div>
"""

def shots(items, col_w):
    out = '<div style="display: flex; gap: 40px; align-items: flex-start; flex-wrap: wrap">\n'
    for fid, lab, alt, cap in items:
        out += f'<div style="display: flex; flex-direction: column; gap: 10px; width: {col_w}px; flex: none"><p class="lab"><b>{fid}</b> · {lab}</p><img class="shot" src="art/sp/{fid}-{"desk" if fid.startswith("D") else "phone"}.png" alt="{alt}"><p class="cap">{cap}</p></div>\n'
    return out + "</div>\n"

def board(name, title, w, body):
    # height = measured from content: header ~170 + rows
    return name, title, w, body

boards = []

def emit(name, title, w, h, body):
    with open(f"{ROOT}/{name}", "w") as f:
        f.write(HEAD.format(title=title, w=w, h=h) + body + TAIL.format(w=w, h=h))
    boards.append((name, title, w, h))

def col_h(fid, col_w):
    w, h = size(f"art/sp/{fid}-{'desk' if fid.startswith('D') else 'phone'}.png")
    return round(h * col_w / w)

# ── Main: calls
main = f"""<div style="display: flex; flex-direction: column; gap: 9px">
<p class="lab"><b>Addendum · several picks</b> · Account 2 · 2026-11-21</p>
<h1 style="margin: 0; font: 700 34px 'Cinzel', serif">Move a copy: several decks can be picked</h1>
<p style="font-size: 15px; line-height: 1.6; color: #C0B8A6; max-width: 1200px">Hugh’s case: 5 Fabled Passage, 6 decks want it. Today one pick per card exists, so moving the copy from HD - Gishath to HD Tune - Mutant Menace is impossible: picking Mutant Menace takes the copy from Multiverse Reforged, and picking Gishath lights it up and changes nothing. Ruling: picks up to the number of copies owned. Picked decks get a copy, the oldest unpicked decks fill the rest, the newest unpicked deck goes without. Every frame is the shipped component rendered from main (shipped CSS, Amonkhet) with this proposal applied; rows, marks and accent are the shipped chooser’s.</p>
</div>
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px">
<div class="box">
<p class="lab"><b>Calls</b></p>
<div class="it"><span class="n">1</span><p><b>A picked deck reads “your pick · gets it”</b>, accent square mark and accent border (shipped pick). A deck with its copy by commit order keeps the neutral mark and its date: “v5 · Oct 1 gets it”. The words carry who chose it, so the hue is never the only signal.</p></div>
<div class="it"><span class="n">2</span><p><b>Every select on an unpicked deck adds a pick</b> until the picks reach the copies. On a deck that buys it, it gets a copy and the deck marked “gives it up first” flips to “buys it”. On a deck that already gets it, the pick keeps its copy whatever is picked later. Order never changes.</p></div>
<div class="it"><span class="n">3</span><p><b>Select a picked deck again to untick it.</b> Its copy goes back to commit order: the oldest deck going without gets it back (P4). One control per action, so no Clear all link; the shipped “Back to first committed” stays retired.</p></div>
<div class="it"><span class="n">4</span><p><b>Every copy picked</b> (2+ copies): the heading reads “5 of 5 picked” and a line under the rows says “All 5 copies are picked. Untick one to give another deck a copy.” It shows as soon as the last pick lands, before anyone tries. A select on the unpicked deck writes nothing and announces that line (P5).</p></div>
<div class="it"><span class="n">5</span><p><b>Who goes without, before and after.</b> Before a select: the newest unpicked deck holding a copy reads “gets it · gives it up first”, so the player sees which deck a new pick will take from. After: that row flips to “buys it” on the same select, and the hint moves up to the next one (P1 → P2 → P3).</p></div>
<div class="it"><span class="n">6</span><p><b>The heading counts picks</b>: “2 of 5 picked” once any pick stands; with none it keeps the shipped “5 of 5 given”.</p></div>
<div class="it"><span class="n">7</span><p><b>One copy is unchanged.</b> Round mark, one pick, a select on another deck moves it (shipped single-select). An Other decks pick still counts toward the cap, as R1b ruled.</p></div>
</div>
<div class="box">
<p class="lab"><b>The same states on the other surfaces</b></p>
<div class="it"><span class="n">C</span><p><b>Card details, In your decks:</b> a picked deck reads “holds 1 · your pick” in accent (C2, C3), replacing “gets it”, since a pick always gets a copy. Commit order rows keep “holds 1 · gets it” / “holds 1 · buys it”. Change is unchanged.</p></div>
<div class="it"><span class="n">H</span><p><b>History’s “Went to” line:</b> the record never changes. “Now X has it.” is added only when the deck it went to holds no copy now, and X names only the decks a pick put a copy in (H2: “Went to HD - Gishath. Now HD Tune - Mutant Menace has it.”). Today X lists every holder, which on a 5-copy card would name five decks.</p></div>
<div class="it"><span class="n">L</span><p><b>A large entry’s Can move tab</b> (the History entry’s last tab): the same rule on each card row’s own line (L2). Change opens the same chooser.</p></div>
<div class="it"><span class="n">D</span><p><b>Desktop:</b> the chooser is the shipped 520 modal with one-line rows; the hint and “your pick” sit in the outcome slot (D1–D3). Card details receipt (D4), History (D5), Can move (D6).</p></div>
<p class="lab" style="margin-top: 6px"><b>Copy (final)</b></p>
<table>
<tr><td>Heading cap, picks standing</td><td class="q">2 of 5 picked</td></tr>
<tr><td>Picked row</td><td class="q">your pick · gets it</td></tr>
<tr><td>Next to give up its copy</td><td class="q">gets it · gives it up first</td></tr>
<tr><td>All copies picked</td><td class="q">All 5 copies are picked. Untick one to give another deck a copy.</td></tr>
<tr><td>Card details, picked deck</td><td class="q">holds 1 · your pick</td></tr>
<tr><td>History, deck that lost it</td><td class="q">Went to HD - Gishath. Now HD Tune - Mutant Menace has it.</td></tr>
<tr><td>Read aloud, picked row</td><td class="q">Multiverse Reforged, your pick, gets it. Select again to untick.</td></tr>
<tr><td>Announced on a pick</td><td class="q">HD Tune - Mutant Menace gets Fabled Passage. Multiverse Reforged buys it.</td></tr>
<tr><td>Announced on an untick</td><td class="q">HD Tune - Mutant Menace unticked. HD - Gishath gets it back.</td></tr>
</table>
</div>
</div>
"""
emit("SP-Main.dc.html", "Several picks calls", 1400, 1240, main)

# ── P: the chooser, phone
P = [
    ("P1", "before any pick", "Chooser, no picks", "Commit order gives the 5 copies. <b>Multiverse Reforged</b> is the newest deck holding one, so it reads <b>gives it up first</b>. Mutant Menace buys it."),
    ("P2", "select Mutant Menace", "Mutant Menace picked", "Mutant Menace is <b>your pick · gets it</b>. Multiverse Reforged flips to buys it on the same select; the hint moves up to Gishath. <b>1 of 5 picked</b>."),
    ("P3", "select Multiverse Reforged too", "Two picks", "Hugh’s case solved: both picked, <b>Gishath buys it</b>. Picking Multiverse first, then Mutant Menace, lands in the same place."),
    ("P4", "select Mutant Menace again", "Mutant Menace unticked", "Unticked: Mutant Menace goes back to buying it and <b>Gishath gets its copy back</b>, the oldest deck that was going without."),
    ("P5", "every copy picked", "Five picks", "<b>5 of 5 picked</b> and the line under the rows. Even the oldest deck (Zombies) buys it now: picks beat commit order. Selecting Zombies writes nothing and reads the line out."),
]
cw = 390
h = 48 + 170 + 30 + 24 + max(col_h(p[0], cw) for p in P) + 110 + 64
body = header("P · the chooser · phone · 390", "Picking several decks", "The shipped “Where these copies go” sheet over card details (scrolled to its receipt), opened from Change. Fabled Passage, 5 copies, 6 decks in commit order.") + shots(P, cw)
emit("SP-Chooser.dc.html", "Several picks chooser phone", 56 * 2 + 5 * cw + 4 * 40, h, body)

# ── C + H + L: other surfaces, phone
S = [
    ("C1", "card details, no picks", "Card details today", "Shipped: commit order rows, Mutant Menace <b>buys it</b>."),
    ("C2", "card details, two picks", "Two picked decks", "Picked decks read <b>holds 1 · your pick</b>; Gishath buys it."),
    ("C3", "card details, every copy picked", "Five picked decks", "Five picks; Zombies buys it."),
    ("H1", "History, no picks", "History before", "Gishath still holds a copy, so the record stands alone."),
    ("H2", "History, after P3", "History after", "Gishath holds none now: <b>Now HD Tune - Mutant Menace has it.</b> Only the deck a pick put a copy in is named."),
    ("L2", "Can move tab, after P3", "Can move tab", "The large entry’s last tab: the same line on Fabled Passage’s row, Change beside it."),
]
hs = [col_h(s[0], cw) for s in S]
h = 48 + 170 + 30 + 24 + max(hs[:3]) + 110 + 40 + 24 + max(hs[3:]) + 110 + 64
body = header("C · H · L · phone · 390", "Card details, History and Can move", "The same states where the chooser is opened from. Nothing else on these surfaces changes.") + shots(S[:3], cw) + shots(S[3:], cw)
emit("SP-Surfaces.dc.html", "Several picks surfaces phone", 56 * 2 + 3 * cw + 2 * 40, h, body)

# ── D: desktop
Dd = [
    ("D1", "chooser, no picks", "Desktop chooser before", "The shipped 520 modal over History. One-line rows: the hint sits in the outcome slot."),
    ("D2", "chooser, two picks", "Desktop chooser two picks", "Same as P3: two accent rows, Gishath buys it, Urza gives it up first."),
    ("D3", "chooser, every copy picked", "Desktop chooser full", "Same as P5, with the line under the rows."),
    ("D4", "card details receipt", "Desktop card details", "The receipt column of the card modal: holds 1 · your pick."),
    ("D5", "History", "Desktop History", "Went to HD - Gishath. Now HD Tune - Mutant Menace has it."),
    ("D6", "Can move tab", "Desktop Can move", "The large entry on its last tab."),
]
dw = 640
rows = [Dd[0:2], Dd[2:4], Dd[4:6]]
h = 48 + 170 + sum(max(col_h(x[0], dw) for x in r) + 110 + 40 for r in rows) + 64
body = header("D · desktop · 1280", "Desktop", "Every state above at 1280, from the same render.") + "".join(shots(r, dw) for r in rows)
emit("SP-Desktop.dc.html", "Several picks desktop", 56 * 2 + 2 * dw + 40, h, body)

# ── index
idx_path = f"{ROOT}/canvas.json"
idx = json.load(open(idx_path))
y0 = max(b["y"] + b["h"] for b in idx["boards"].values()) + 360
x = 0
titles = {"SP-Main.dc.html": "Several picks · calls and copy", "SP-Chooser.dc.html": "P · The chooser · phone",
          "SP-Surfaces.dc.html": "C · H · L · Card details, History, Can move · phone", "SP-Desktop.dc.html": "D · Desktop"}
layout = {"SP-Main.dc.html": (0, y0), "SP-Chooser.dc.html": (1480, y0)}
mb = [b for b in boards if b[0] == "SP-Main.dc.html"][0]
cb = [b for b in boards if b[0] == "SP-Chooser.dc.html"][0]
row2 = y0 + max(mb[3], cb[3]) + 120
layout["SP-Surfaces.dc.html"] = (0, row2)
sb = [b for b in boards if b[0] == "SP-Surfaces.dc.html"][0]
layout["SP-Desktop.dc.html"] = (sb[2] + 80, row2)
for name, title, w, h in boards:
    bx, by = layout[name]
    idx["boards"][name] = {"x": bx, "y": by, "w": w, "h": h, "title": titles[name]}
    if name not in idx["order"]:
        idx["order"].append(name)
idx["notes"]["several_picks"] = {"x": 0, "y": y0 - 260, "text": "Addendum · Several picks (2026-11-21)", "kind": "title1", "maxW": 3800}
json.dump(idx, open(idx_path, "w"), separators=(",", ":"))
for b in boards: print(b, layout[b[0]])
