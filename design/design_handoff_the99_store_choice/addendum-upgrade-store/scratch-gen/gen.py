# Store choice R1 (account 1, 2026-11-22): writes the boards twice, for the canvas (/_blob urls) and for the repo (art/).
import json, sys, os
from PIL import Image
BLOB = json.load(open(os.path.join(os.path.dirname(__file__), "blobs.json")))
ART = os.path.join(os.path.dirname(__file__), "..", "art")
mode, out = sys.argv[1], sys.argv[2]
def src(k): return BLOB[k] if mode == "canvas" else f"art/sc-{k}.webp"
def size(k): return Image.open(os.path.join(ART, f"sc-{k}.webp")).size
FONT = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&amp;family=IBM+Plex+Mono:wght@400;500&amp;family=Chakra+Petch:wght@600;700&amp;display=swap" rel="stylesheet">'
def page(title, w, h, body):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{FONT}
<style>
body{{margin:0}}
a{{color:#FF6FAE}}a:hover{{color:#FF9AC6}}
</style>
</helmet>
<div style="width:{w}px;min-height:{h}px;box-sizing:border-box;padding:48px 56px 64px;background:#0A0B0F;font-family:'IBM Plex Sans',sans-serif;color:#E6E8F0;display:flex;flex-direction:column;gap:32px">
{body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''
def head(t, p): return f'<div style="display:flex;flex-direction:column;gap:10px"><h2 style="margin:0;font:700 30px \'Chakra Petch\',sans-serif;color:#E6E8F0">{t}</h2><p style="margin:0;font-size:15px;line-height:1.6;color:#B1B6C7;max-width:1180px">{p}</p></div>'
def label(t): return f'<span style="font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.12em;text-transform:uppercase;color:#FF6FAE">{t}</span>'
def fig(k, w, cap, note, radius=None):
    iw, ih = size(k); h = round(w * ih / iw)
    r = radius if radius is not None else (24 if iw <= 800 else 10)
    return f'''<figure style="margin:0;display:flex;flex-direction:column;gap:12px;width:{w}px;flex:none">
<img src="{src(k)}" alt="{cap}" style="width:{w}px;height:{h}px;display:block;border-radius:{r}px;border:1px solid #262A35">
<figcaption style="display:flex;flex-direction:column;gap:6px">
<p style="margin:0;font:600 15px 'IBM Plex Sans',sans-serif;color:#E6E8F0">{cap}</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#959AAD">{note}</p>
</figcaption>
</figure>'''
def row(lbl, figs, gap=40): return f'<div style="display:flex;flex-direction:column;gap:14px">{label(lbl)}<div style="display:flex;gap:{gap}px;align-items:flex-start;flex-wrap:wrap">{"".join(figs)}</div></div>'
def ph(k, cap, note): return fig(k, 292, cap, note)
def dk(k, cap, note, w=650): return fig(k, w, cap, note)
def call(n, t, body): return f'<div style="display:flex;flex-direction:column;gap:8px;padding:20px 24px;border:1px solid #262A35;border-radius:14px;background:#11131A"><p style="margin:0;font:600 17px \'IBM Plex Sans\',sans-serif;color:#E6E8F0"><span style="font-family:\'IBM Plex Mono\',monospace;color:#FF6FAE">{n}</span> · {t}</p><div style="font-size:14px;line-height:1.6;color:#B1B6C7">{body}</div></div>'
def ul(items): return '<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">' + "".join(f"<li>{i}</li>" for i in items) + '</ul>'
def m(t): return f'<span style="font-family:\'IBM Plex Mono\',monospace;color:#E6E8F0">{t}</span>'
def table(rows):
    th = "".join(f'<th style="text-align:left;padding:8px 12px;font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.1em;text-transform:uppercase;color:#FF6FAE;border-bottom:1px solid #262A35">{c}</th>' for c in rows[0])
    tr = "".join("<tr>" + "".join(f'<td style="padding:8px 12px;font-size:13px;line-height:1.5;color:#B1B6C7;border-bottom:1px solid #1C1F29;vertical-align:top">{c}</td>' for c in r) + "</tr>" for r in rows[1:])
    return f'<table style="border-collapse:collapse;width:100%"><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>'

boards = {}
T = "Precon upgrade store label"
MAIN_W, MAIN_H = 1700, 2000
boards["Main.dc.html"] = (MAIN_W, MAIN_H, "Main", page(T + ": main", MAIN_W, MAIN_H,
 head("Precon upgrade result: which store the prices come from",
  "Addendum to the store choice handoff. Upgrade this precon now prices each add at the reader’s own store (PR #3231). The result’s To buy figure and its buy tags said nothing about where they came from. Every frame is the shipped result rendered from that branch on the landing demo’s Prismari Artistry run, with six adds the reader doesn’t own. Store figures are placeholders: TCGplayer about 9% under Mana Pool, Card Kingdom about 18% over.")
 + '<div style="display:flex;gap:40px;align-items:flex-start">'
 + '<div style="display:flex;flex-direction:column;gap:16px;flex:1 1 0;min-width:0">'
 + call("1", "One line under the facts names the store", ul([
   f"Under the four facts (Led by, Bracket, To buy, Already yours), the deck Shopping strip’s own provenance line, word for word and in its mono 9.5 {m('--fg-locked')}: {m('single-copy prices on Card Kingdom · last checked Monday')}.",
   "It covers the To buy figure and every add’s buy tag, so the tags stay bare figures, as on Shopping rows (store choice call 3). The store is named once on the result.",
   f"The date is the repriced read’s newest price ({m('run.pricesAsOf')}), so it says how fresh the figures on screen are, not the run’s day (the header keeps that). Past ten days it gains {m('these are behind')}, as shipped."]))
 + call("2", "The TCGplayer note", ul([
   f"Beside the store, only when a figure shows: {m('TCGplayer market prices · averages of recent sales, so a listing can differ · last checked Monday')}. The same short form as the Shopping strip and the cart. Rows carry no note."]))
 + call("3", "An add with no price at the reader’s store", ul([
   f"The row keeps a bare {m('buy')} tag: the shipped silence state, so the card still reads as one to buy. Never {m('$0.00')}.",
   f"To buy counts it (6) and its figure leaves it out. The line counts it out: {m('single-copy prices on Card Kingdom · 5 of 6 priced · last checked Monday')}.",
   f"None priced: To buy shows the count and no figure, and the line reads {m('no prices from Card Kingdom for these · last checked Monday')}."]))
 + call("4", "The store switch off, and a failed price read", ul([
   "Switch off: no line. To buy and the tags draw the run’s stored figures, exactly as today.",
   "The price read fails: the panel falls back to the stored figures, which came from the store the run was pressed at. The line goes too, so it never names the reader’s store over another store’s figures. The line follows the reprice, not the preference."]))
 + call("5", "The cart stays Mana Pool’s", ul([
   "The result has no cart link of its own. The line always names the reader’s store and never the cart’s, so a TCGplayer reader never sees Mana Pool on the result.",
   "A deck started from the run opens on its Shopping list, which already handles this (store choice call 6): Buy these at Mana Pool for a Mana Pool reader, Copy the list and the store’s paste page for everyone else."]))
 + call("6", "Nothing to buy", ul(["Every add already owned: To buy reads 0 and no line draws, since no figure needs a source."]))
 + '</div>'
 + '<div style="display:flex;flex-direction:column;gap:28px;flex:none;width:600px">'
 + '<div style="display:flex;gap:16px">' + ph("u-tcg", "R2 · TCGplayer", "The line under the facts, with the market note.") + ph("u-ck-gap", "E1 · One add unpriced", "6 to buy, 5 of 6 priced.") + '</div>'
 + dk("u-tcg-desk", "R5 · Desktop, TCGplayer", "The line runs the width of the facts.", 600)
 + '</div></div>'
 + '<div style="display:flex;flex-direction:column;gap:12px">' + label("The price area, by state") + table([
   ["State", "To buy", "The line", "An add’s tag"],
   ["Mana Pool", "6 $16.94", "single-copy prices on Mana Pool · last checked Monday", "buy $x"],
   ["TCGplayer", "6 $15.43", "TCGplayer market prices · averages of recent sales, so a listing can differ · last checked Monday", "buy $x"],
   ["Card Kingdom", "6 $20.01", "single-copy prices on Card Kingdom · last checked Monday", "buy $x"],
   ["One add unpriced", "6 $18.96", "… · 5 of 6 priced · last checked Monday", "bare buy on that add"],
   ["None priced", "6", "no prices from Card Kingdom for these · last checked Monday", "bare buy"],
   ["Switch off, or the read failed", "as stored", "none", "as stored"],
   ["Nothing to buy", "0", "none", "none"],
 ]) + '</div>'
 + '<div style="display:flex;flex-direction:column;gap:10px;padding:20px 24px;border:1px solid #FF6FAE;border-radius:14px">' + label("Calls for you, Hugh")
 + '<div style="font-size:14px;line-height:1.6;color:#B1B6C7">' + ul([
   "<b>Q1 · An unpriced add’s tag</b> (Adds board, E2): a bare buy (drawn, and what the code draws today), or no tag at all as the brief says. I drew the bare buy because it is the shipped silence state on every Shopping row, and it keeps the card reading as one to buy.",
   "<b>Q2 · The $12 cap after a store switch:</b> a run picks adds under $12 at the store it was pressed at, so at Card Kingdom a $10.50 add can read $12.40. Drawn: the figure as it is, no mark. Or mark it.",
 ]) + '</div></div>'))

ST_W, ST_H = 2240, 1540
boards["Stores.dc.html"] = (ST_W, ST_H, "Stores", page(T + ": stores", ST_W, ST_H,
 head("1 and 2 · The result’s price area per store", "The top of Your upgrade, where To buy sits. The line under the facts names the store once for the whole result.")
 + row("Phone 390", [ph("u-mp", "R1 · Mana Pool", "single-copy prices on Mana Pool · last checked Monday."),
   ph("u-tcg", "R2 · TCGplayer", "TCGplayer market prices, then the note."),
   ph("u-ck", "R3 · Card Kingdom", "single-copy prices on Card Kingdom.")])
 + row("Desktop 1300", [dk("u-mp-desk", "R4 · Mana Pool", ""), dk("u-tcg-desk", "R5 · TCGplayer", ""), dk("u-ck-desk", "R6 · Card Kingdom", "")])))

AD_W, AD_H = 1700, 880
boards["Adds.dc.html"] = (AD_W, AD_H, "Adds", page(T + ": adds", AD_W, AD_H,
 head("1 and 3 · The adds’ buy tags", "Bare figures at the reader’s store, as on Shopping rows; the line above names the store. Pinnacle Monk, Fury and Gifts Ungiven are three of the six to buy.")
 + row("Phone 390, part of the Additions list", [fig("u-mp-adds", 300, "A1 · Mana Pool", ""), fig("u-tcg-adds", 300, "A2 · TCGplayer", ""), fig("u-ck-adds", 300, "A3 · Card Kingdom", ""), fig("u-ck-gap-adds", 300, "E2 · Fury unpriced at Card Kingdom", "A bare buy (Q1): still a card to buy, no figure.")], gap=56)))

EM_W, EM_H = 2240, 1540
boards["Empty.dc.html"] = (EM_W, EM_H, "Empty", page(T + ": empty and off", EM_W, EM_H,
 head("3 and 4 · No price, and the switch off", "Card Kingdom with one add it doesn’t price, then none. Then the store switch off, which draws the result exactly as today.")
 + row("Phone 390", [ph("u-ck-gap", "E1 · One add unpriced", "6 $18.96 · 5 of 6 priced."),
   ph("u-ck-none", "E3 · None priced", "6 to buy and no figure; no prices from Card Kingdom for these."),
   ph("u-ck-none-adds", "E4 · None priced, the adds", "Every add to buy has a bare buy."),
   ph("u-off", "O1 · Switch off", "No line. To buy and tags are the run’s stored figures.")])
 + row("Desktop 1300", [dk("u-ck-gap-desk", "E5 · One add unpriced", ""), dk("u-ck-none-desk", "E6 · None priced", ""), dk("u-off-desk", "O2 · Switch off", "")])))

os.makedirs(out, exist_ok=True)
pre = "project/" if mode == "canvas" else ""
if pre: os.makedirs(os.path.join(out, "project"), exist_ok=True)
for name, (w, h, title, html) in boards.items():
    open(os.path.join(out, pre + name), "w").write(html)
order = ["Main.dc.html", "Stores.dc.html", "Adds.dc.html", "Empty.dc.html"]
x = 0; B = {}
for n in order:
    w, h, t, _ = boards[n]; B[n] = {"x": x, "y": 0, "w": w, "h": h, "title": t}; x += w + 120
json.dump({"v": 3, "createdOnFiles": {"v": 1, "at": "2026-11-23T21:10:00Z"}, "title": T, "launch": {"view": "canvas"},
  "pages": [], "boards": B, "order": order, "notes": {}, "designSystems": []}, open(os.path.join(out, pre + "canvas.json"), "w"), indent=1)
print("ok", mode)
