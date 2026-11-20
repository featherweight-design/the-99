# Writes the Design canvas boards for Alternate printings R1 (#3002) from the rendered frames in out/shots.
import json, os, html
from PIL import Image
OUT = "/home/user/canvas/project"; SH = "/home/user/sx/out/shots"
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
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&amp;family=IBM+Plex+Mono:wght@400;500&amp;family=Chakra+Petch:wght@600;700&amp;display=swap" rel="stylesheet">
<style>
body{{margin:0}}
a{{color:#FF6FAE}}a:hover{{color:#FF9AC6}}
</style>
</helmet>
"""
TAIL = """</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
"""
ROOT = "box-sizing:border-box;padding:48px 56px 64px;background:#0A0B0F;font-family:'IBM Plex Sans',sans-serif;color:#E6E8F0;display:flex;flex-direction:column;gap:28px"
H2 = "margin:0;font:700 30px 'Chakra Petch',sans-serif;color:#E6E8F0"
LEDE = "margin:0;font-size:15px;line-height:1.6;color:#B1B6C7;max-width:1100px"
CAPH = "margin:0;font:600 15px 'IBM Plex Sans',sans-serif;color:#E6E8F0"
CAP = "margin:0;font-size:13px;line-height:1.55;color:#959AAD"
TAG = "font:500 11px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#FF6FAE"

def frame(fid, label, cap, scale):
    im = Image.open(f"{SH}/{fid}.png"); w, h = im.size; w //= 2; h //= 2
    dw, dh = int(w * scale), int(h * scale)
    im.save(f"{OUT}/art/{fid}.webp", quality=90, method=6)
    radius = "28px" if fid.endswith("phone") else "12px"
    return dw, dh, f"""<figure style="margin:0;display:flex;flex-direction:column;gap:12px;width:{dw}px;flex:none">
<img src="art/{fid}.webp" alt="{html.escape(label)}" style="width:{dw}px;height:{dh}px;display:block;border-radius:{radius};border:1px solid #262A35">
<figcaption style="display:flex;flex-direction:column;gap:6px">
<p style="{CAPH}">{label}</p>
<p style="{CAP}">{cap}</p>
</figcaption>
</figure>
"""

def board(name, title, lede, rows):
    body, W, H = [], 0, 48 + 64
    body.append(f'<div style="display:flex;flex-direction:column;gap:10px"><h2 style="{H2}">{title}</h2><p style="{LEDE}">{lede}</p></div>')
    H += 40 + 26 * (1 + len(lede) // 140) + 28
    for tag, frames in rows:
        items, rw, rh = [], 0, 0
        for fid, label, cap, scale in frames:
            dw, dh, f = frame(fid, label, cap, scale); items.append(f); rw += dw + 40; rh = max(rh, dh + 30 + 22 * (1 + len(cap) * 7 // max(dw, 1) // 1))
        body.append(f'<div style="display:flex;flex-direction:column;gap:14px"><span style="{TAG}">{tag}</span><div style="display:flex;gap:40px;align-items:flex-start">{"".join(items)}</div></div>')
        W = max(W, rw - 40); H += rh + 14 + 20 + 28
    W += 112; H = int(H) + 80
    src = HEAD.format(title=title) + f'<div style="width:{W}px;min-height:{H}px;{ROOT}">\n' + "\n".join(body) + "\n</div>\n" + TAIL.format(w=W, h=H)
    open(f"{OUT}/{name}", "w").write(src)
    return W, H

def text_board(name, title, sections, W=1500):
    parts = [f'<h2 style="{H2};font-size:34px">{title}</h2>']
    H = 48 + 64 + 50
    for head, paras in sections:
        ps = "".join(f'<p style="margin:0;font-size:15px;line-height:1.65;color:#B1B6C7">{p}</p>' for p in paras)
        parts.append(f'<section style="display:flex;flex-direction:column;gap:10px;border:1px solid #262A35;border-radius:12px;background:#111319;padding:20px 24px"><h3 style="margin:0;font:700 19px \'Chakra Petch\',sans-serif;color:#E6E8F0">{head}</h3>{ps}</section>')
        H += 28 + 40 + 48 + sum(27 * (1 + len(p) // 165) + 10 for p in paras)
    H += 160
    src = HEAD.format(title=title) + f'<div style="width:{W}px;min-height:{H}px;{ROOT}">\n' + "\n".join(parts) + "\n</div>\n" + TAIL.format(w=W, h=H)
    open(f"{OUT}/{name}", "w").write(src)
    return W, H

P = 0.75  # phone frames at 75% of 390
D = 0.62  # desktop frames
boards = {}
boards["Main.dc.html"] = text_board("Main.dc.html", "Alternate printings from search · R1 (#3002)", [
  ("The answer in one line", [
    "Card details opened from search lists every printing of the card in the Set field's existing printing region, owned or not. Selecting a printing you own makes it your pick, as today. Selecting one you don't own shows it here (art, Set field and price) and stores nothing."]),
  ("1 · Where the option sits", [
    "<b>Card details: the Set field</b>, the shipped disclosure, now drawn whenever the catalog has 2+ printings. The third line reads <code>22 printings ▾</code> (unowned), <code>22 printings · you own 2 ▾</code> (owned) or <code>◆ YOUR PICK · 22 printings ▾</code>. On the phone it's the promoted full-width Set row (62px, 40×56 thumb), on desktop the boxed Set field in the meta row. Nothing new is added to the screen.",
    "<b>The search result row: R-A, unchanged (recommended).</b> One press opens card details, where the printings are one more press away, and the + adds as shipped. Printings at 40×56 can't be compared, and a third control crowds the phone row. <b>R-B, the alternative:</b> a printings press (stacked-cards glyph, 44px phone / 34px desktop) before the +, which opens card details with the region already open. It's drawn only at 2+ printings, and the slot is held so rows stay aligned. Your call: A or B."]),
  ("2 · A card you don't own: preview", [
    "Selecting a printing <b>previews</b> it. The art, the Set field and the price tag under the art all move to that printing (the tag already prices the printing on screen). The tile takes the shipped <code>◇ Shown now</code> badge. Nothing is stored, and closing or paging the card forgets it.",
    "<b>Adding takes the preview with it.</b> The shipped <i>Add to collection</i> opens Edit copies with the previewed printing already chosen as the new printing, and you can change it there. There's no new button, and the choice stays yours.",
    "<b>Not the wishlist:</b> a wishlist line is per card by ruling (Q7, 2026-10-12), so there's no printing to set. <b>Not a deck:</b> a deck's printing is owned-only (Deck printings R2). <b>The buy link</b> stays <i>Buy any printing at Mana Pool</i>, since Mana Pool's link is a name search. The figure on the tag is the previewed printing's own."]),
  ("3 · A card you own: one region, yours first", [
    "<code>IN YOUR COLLECTION · 2</code> is today's picker exactly: selecting one sets <code>✓ Your pick</code> (stored), and <i>Use the default again</i> clears it. <code>OTHER PRINTINGS · 20</code> follows. Those preview only, as for an unowned card, and they're marked <code>not owned</code>. A pick and a preview read apart through the shipped badges: <code>✓ Your pick</code> is what's stored, and <code>◇ Shown now</code> is what's on screen. With the region open, picking an owned tile ends any preview.",
    "Past 12 printings the shipped search and set headers apply (newest set first). The finish chips step aside whenever other printings are listed, because a catalog printing's finishes aren't held counts (the choose role's rule)."]),
  ("One printing", [
    "The plain shipped Set field, with <code>The only printing</code> under it in faint mono, so the missing list is explained rather than absent. There's no disclosure and nothing to press."]),
  ("Phone", [
    "The sheet stays where the player left it. The tile is the preview at card shape, and the Set row's thumbnail and caption follow it. Dragging the sheet down (the shipped gesture) shows the art full size. Tiles keep the shipped ≥100px floor (two across at 390), with full-width 44px search."]),
  ("Scope and gaps", [
    "Only card details opened from search (the brief's lock). Collection and deck details are unchanged. Offering it everywhere is a follow-up and your call.",
    "<b>G1</b> card details from search needs the catalog's printings for an owned card (an unowned card already gets them: <code>catalogCard</code> fills <code>printings</code> at quantity 0). <b>G2</b> preview state in <code>CardModal</code>, fed through the <code>openAtPrinting</code> path (injected at quantity 0, with its art). <b>G3</b> Edit copies opens with the new printing preset (by scryfall id). <b>G4</b> (R-B only) a printings count on <code>CardSearchRow</code>. <b>G5</b> switch <code>SEARCH_PRINTINGS_ENABLED</code>, because the region change touches the shipped picker. <b>G6</b> new strings go to /copy-review.",
    "Every frame is the shipped component rendered with shipped CSS (Kamigawa) over the shipped Collection capture, with the proposal applied as a patch. The art is cut from a Scryfall capture: 22 of the 31 unique arts, plus Muddle (SOC 5) for one printing."]),
])
boards["Search.dc.html"] = board("Search.dc.html", "1 · Search results", "The rows answering “sw”. R-A is the shipped row, unchanged (recommended). R-B adds a printings press before the + on cards with 2+ printings.", [
  ("R-A · recommended", [("S1-phone", "Phone sheet, unchanged", "One press opens card details; the + adds.", 1.0), ("S1-desk", "Desktop dropdown, unchanged", "The rail search's dropdown as shipped.", D)]),
  ("R-B · alternative", [("S2-phone", "Phone: a printings press", "Swords and Swan Song show it. Aang has one printing, so its slot stays empty.", 1.0), ("S2-desk", "Desktop", "34px, beside the +.", D)]),
])
boards["Unowned.dc.html"] = board("Unowned.dc.html", "2 · A card you don't own", "Swords to Plowshares, 22 printings, none owned. Selecting a printing previews it and stores nothing.", [
  ("Phone", [("U1-phone", "U1 · Set row, closed", "22 printings ▾. The price above follows the printing on screen.", P), ("U2-phone", "U2 · Open", "Every printing at card shape; past 12 there's search and set headers. ◇ Shown now is the catalog's main printing.", P), ("U3-phone", "U3 · Previewing SLD 2125", "◇ Shown now moves, and the Set row's thumb and caption follow it. Add to collection opens at this printing.", P)]),
  ("Desktop", [("U1-desk", "U1 · Closed", "The boxed Set field in the meta row.", D), ("U3-desk", "U3 · Previewing SLD 2125", "The art, Set field and price ($24.50) all move. Closing or paging forgets it.", D)]),
])
boards["Owned.dc.html"] = board("Owned.dc.html", "3 · A card you own", "You own Bloomburrow Commander 109 and Mystical Archive 10. Yours lead the region and pick as today. The other 20 preview only.", [
  ("Phone", [("O1-phone", "O1 · Closed", "22 printings · you own 2 ▾", P), ("O2-phone", "O2 · Open, no pick", "IN YOUR COLLECTION · 2, then OTHER PRINTINGS · 20 grouped by set.", P), ("O3-phone", "O3 · Pick STA 10, previewing SLD 2804", "✓ Your pick (stored) and ◇ Shown now (on screen) read apart.", P)]),
  ("Desktop", [("O2-desk", "O2 · Open", "The shipped picker's region, with other printings after yours.", D), ("O3-desk", "O3 · Pick plus preview", "Use the default again clears the pick. Selecting an owned tile ends the preview.", D)]),
])
boards["Single.dc.html"] = board("Single.dc.html", "One printing", "Muddle, the Ever-Changing (SOC 5): the plain Set field, with “The only printing” under it. No disclosure.", [
  ("Phone and desktop", [("X1-phone", "Phone", "The Set cell stays in the 2×2 grid.", P), ("X1-desk", "Desktop", "The meta row's plain Set field.", D)]),
])
x, y, idx = 0, 0, {}
order = ["Main.dc.html", "Search.dc.html", "Unowned.dc.html", "Owned.dc.html", "Single.dc.html"]
for n in order:
    w, h = boards[n]
    idx[n] = {"x": x, "y": 0, "w": w, "h": h, "title": n[:-8]}
    x += w + 120
import datetime
json.dump({"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "Alternate printings R1",
  "launch": {"view": "canvas"}, "pages": [], "boards": idx, "order": order, "notes": {}, "designSystems": []}, open(f"{OUT}/canvas.json", "w"), indent=1)
print({n: boards[n] for n in order})
