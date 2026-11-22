# Wishlist printing R1 (account 1, 2026-11-22): writes the boards twice, for the canvas (/_blob urls) and for the repo (art/).
import json, sys, os
BLOB = {"C0-phone":"b88a3068dedb5cf0b1946522da7c91bb","C1-phone":"0de4f711b6db15aa31b645a7261bb2b4","C2-phone":"0ebaeef2612c8f847d73855c29f5acc1",
"C3-phone":"1a495edd4bbe85883ddb617dd806f24c","C4-phone":"af19eb3de05c550ac8f9e4578bb4e09d","C5-phone":"d1b9c5f4931a3d3db440d2349b910493",
"D1-desk":"3fa5fa90daee7f08b351088449b1b1a2","D2-desk":"19e44382c7329c62c732801a94001547","D3-desk":"1f95e21ef40b0eac09da88b68a6230cf",
"D4-desk":"1696f8c1da3d5f6e6d54dcf2c36d4ddc","T-desk":"b58dcc5a30b812f325cc1c82b5065e92","T-phone":"c84cb024bd0e1d68fd3bdb8565fccc44",
"W-desk":"1a258fbbfa8eb014ca647d11ed40c5ad","W-phone":"8970d5432924a2373f87ad27f89f0a07"}
mode, out = sys.argv[1], sys.argv[2]
def src(k): return f"/_blob/{BLOB[k]}" if mode == "canvas" else f"art/wp-{k}.webp"
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
<div style="width:{w}px;min-height:{h}px;box-sizing:border-box;padding:48px 56px 64px;background:#0A0B0F;font-family:'IBM Plex Sans',sans-serif;color:#E6E8F0;display:flex;flex-direction:column;gap:28px">
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
def head(t, p): return f'<div style="display:flex;flex-direction:column;gap:10px"><h2 style="margin:0;font:700 30px \'Chakra Petch\',sans-serif;color:#E6E8F0">{t}</h2><p style="margin:0;font-size:15px;line-height:1.6;color:#B1B6C7;max-width:1100px">{p}</p></div>'
def label(t): return f'<span style="font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.12em;text-transform:uppercase;color:#FF6FAE">{t}</span>'
def fig(k, w, h, cap, note, radius=28):
    return f'''<figure style="margin:0;display:flex;flex-direction:column;gap:12px;width:{w}px;flex:none">
<img src="{src(k)}" alt="{cap}" style="width:{w}px;height:{h}px;display:block;border-radius:{radius}px;border:1px solid #262A35">
<figcaption style="display:flex;flex-direction:column;gap:6px">
<p style="margin:0;font:600 15px 'IBM Plex Sans',sans-serif;color:#E6E8F0">{cap}</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#959AAD">{note}</p>
</figcaption>
</figure>'''
def row(lbl, figs, gap=40): return f'<div style="display:flex;flex-direction:column;gap:14px">{label(lbl)}<div style="display:flex;gap:{gap}px;align-items:flex-start">{"".join(figs)}</div></div>'
def ph(k, cap, note): return fig(k, 292, 632, cap, note)
def dk(k, cap, note, w=650): return fig(k, w, round(w*900/1300), cap, note, 12)

def call(n, t, body): return f'<div style="display:flex;flex-direction:column;gap:8px;padding:20px 24px;border:1px solid #262A35;border-radius:14px;background:#11131A"><p style="margin:0;font:600 17px \'IBM Plex Sans\',sans-serif;color:#E6E8F0"><span style="font-family:\'IBM Plex Mono\',monospace;color:#FF6FAE">{n}</span> · {t}</p><div style="font-size:14px;line-height:1.6;color:#B1B6C7">{body}</div></div>'
def ul(items): return '<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">' + "".join(f"<li>{i}</li>" for i in items) + '</ul>'
M = "font-family:'IBM Plex Mono',monospace;color:#E6E8F0"
def m(t): return f'<span style="{M}">{t}</span>'

boards = {}
boards["Main.dc.html"] = (1500, 1540, "Main", page("Wishlist printing R1: main", 1500, 1540,
 head("Wishlist remembers the printing you want · R1",
  "A wishlist line can name a printing. Any printing stays the default. The choice is made in the card window, where R2 and R3 already let you browse printings, and it sets the tile's art and price, the card window's Mana Pool link and the price-drop alert. Shopping stays deck-only (your ruling, Social R2 call 10 stands). Drawn from the shipped Wishlist tab and card window, with alternate printings R3 patched in. Prices and art are placeholders.")
 + '<div style="display:flex;gap:40px;align-items:flex-start">'
 + f'<div style="display:flex;flex-direction:column;gap:16px;flex:1 1 0;min-width:0">'
 + call("1", "The tile", ul([
   f"Under the caption, a third mono line: the price, then the wanted printing with the wishlist's bookmark, {m('$24.50 ▮ SLD 2125')}. The tile's art is that printing's.",
   f"<b>Any printing reads as the price alone</b> ({m('$3.99')}): the cheapest, as every buy tag does. No words for the default.",
   f"Sold out: {m('sold out ▮ SLD 2455')}, art kept. The choice stands until you change it.",
   "Phone: the set code only (SLD). The number joins from md, where the tile is wide enough. The card window always names both."]))
 + call("2", "Where you choose", ul([
   "In the card window only. The tile stays one press that opens it (minimal controls).",
   f"Desktop: the Wishlist box gains a {m('Printing')} line under the stepper. Select a printing in the strip (R2) and the line offers {m('Want SLD 2125')}; once wanted it shows the thumb, set and price, with {m('Any printing')} to go back.",
   f"Phone: the R3 printings panel, on a card in your wishlist, gets a foot: {m('Wanted: any printing')} and the same {m('Want SLD 2125')} press. The teaser stays 280. The full sheet's Wishlist box shows the same line.",
   "A card opened from a tile with a chosen printing opens on that printing (R2's preview starts there). Wanting a printing never changes your collection pick."]))
 + call("3", "Price, Mana Pool link, price-drop alert", ul([
   f"Price: the tile and the Printing line show the chosen printing's figure.",
   f"Link-out: {m('Buy SLD 2125 at Mana Pool')} in place of {m('Buy any printing at Mana Pool')}. Sold out falls back to the any-printing link.",
   f"Price-drop alert: watches the chosen printing. Choosing or changing one resets the baseline to its price then. The feed line reads {m('at SLD 2125.')} for {m('at the cheapest printing.')}. A sold-out printing never alerts, as today.",
   f"Sold out in the box: {m('Mana Pool has none now. Any printing is $1.49.')}"]))
 + call("4", "Phone and desktop", ul([
   "One design at both widths. Two differences: on the phone you choose in the panel's foot, since the Wishlist box sits in the full sheet; and the phone tile drops the collector number.",
   "Unchanged: Shopping, deck slots (owned only), R3's browsing, the teaser height."]))
 + '</div>'
 + f'<div style="display:flex;flex-direction:column;gap:28px;flex:none;width:576px">'
 + fig("T-desk", 576, 313, "Tiles: chosen, sold out, any printing", "Desktop tiles at 1300.", 12)
 + '<div style="display:flex;gap:20px">' + fig("C1-phone", 278, 602, "Phone: choose in the panel", "C1, the foot's press.") + fig("D1-desk", 278, 193, "Desktop: choose in the box", "D1, the Printing line's press.", 10) + '</div>'
 + '</div></div>'
 + '<div style="display:flex;flex-direction:column;gap:10px;padding:20px 24px;border:1px solid #FF6FAE;border-radius:14px">' + label("Calls · approved as drawn, Hugh, 2026-11-22")
 + '<div style="font-size:14px;line-height:1.6;color:#B1B6C7">' + ul([
   "<b>Q1 · Any printing on the tile</b> (Tile board, T1): the price alone (drawn), or the price plus the words any printing.",
   "<b>Q2 · Choosing on the phone</b> (Phone board, C1 and C2): the panel's foot (drawn), or only the full sheet's Wishlist box, which means previewing in the teaser and then pulling the sheet up.",
   "<b>Q3 · A sold-out choice</b> (Phone C5, Desktop D3): it stays until you change it (drawn), or it falls back to any printing by itself.",
 ]) + '</div></div>'))

boards["Tile.dc.html"] = (1700, 1640, "Tile", page("Wishlist printing R1: tiles", 1700, 1640,
 head("Tile · the Wishlist tab", "The shipped tile with one more line. Six wanted cards: Swords to Plowshares wants SLD 2125, The Wise Mothman wants SLD 2455 (sold out), the rest want any printing. The tile is still one press, and it opens the card window.")
 + row("Phone 390 and desktop 1300", [ph("W-phone", "T1 · Phone", "Three across. The line keeps the set code only: SLD. A row of tiles stays level because every tile now has a price line."),
   dk("W-desk", "T2 · Desktop", "Six across, set and number.", 1200)])
 + row("Close up", [fig("T-phone", 362, 208, "T3 · Phone tiles", "$24.50 ▮ SLD · sold out ▮ SLD · $3.99.", 10),
   fig("T-desk", 576, 313, "T4 · Desktop tiles", "$24.50 ▮ SLD 2125 · sold out ▮ SLD 2455 · $3.99. Any printing is the figure alone.", 12)])))

boards["Phone.dc.html"] = (1100, 1840, "Phone", page("Wishlist printing R1: phone card window", 1100, 1840,
 head("Phone · the card window from the Wishlist", "The R3 card window (printings button, panel over the shelf) opened from a tile. The panel's foot appears only on a card in your wishlist. The full sheet's Wishlist box carries the same Printing line.")
 + row("Teaser and panel", [
   ph("C0-phone", "C0 · Opens on the wanted printing", "From the Swords tile: the art, price and set line are SLD 2125's, as on the tile."),
   ph("C1-phone", "C1 · Choose", "Panel open, SLD 2125 selected (R3 preview). Foot: Wanted: any printing, and Want SLD 2125."),
   ph("C2-phone", "C2 · Chosen", "The thumb gains the bookmark; the foot now reads Wanted: SLD 2125, with Any printing to go back. The panel stays open, as R3's does.")])
 + row("Full sheet · Wishlist box", [
   ph("C3-phone", "C3 · Any printing", "Printing · Any printing · cheapest. No press until another printing is on screen."),
   ph("C4-phone", "C4 · A chosen printing", "Thumb, SLD 2125 · $24.50, and Any printing. The link-out names the printing."),
   ph("C5-phone", "C5 · Chosen, sold out", "SLD 2125 · sold out, and the note with the cheapest figure. The link-out falls back to any printing.")])))

boards["Desktop.dc.html"] = (1520, 1370, "Desktop", page("Wishlist printing R1: desktop card window", 1520, 1370,
 head("Desktop · the card window from the Wishlist", "The R2 strip with R3's Search tile, over the Wishlist tab. The Wishlist box's Printing line holds the press; R3's panel popover gets the same foot.")
 + row("Wishlist box", [dk("D1-desk", "D1 · Choose", "SLD 2125 selected in the strip. Printing: Any printing, and Want SLD 2125."),
   dk("D2-desk", "D2 · Chosen", "The strip's SLD thumb gains the bookmark. Buy SLD 2125 at Mana Pool.")])
 + row("Sold out, and the panel", [dk("D3-desk", "D3 · Chosen, sold out", "no stock on the tag (shipped), sold out on the line, the note, and the any-printing link."),
   dk("D4-desk", "D4 · Panel popover", "Searching secret: the wanted thumb has the bookmark, and the foot reads Wanted: SLD 2125.")])))

os.makedirs(out, exist_ok=True)
for name, (w, h, title, html) in boards.items():
    open(os.path.join(out, name), "w").write(html)
order = ["Main.dc.html", "Tile.dc.html", "Phone.dc.html", "Desktop.dc.html"]
x = 0; B = {}
for n in order:
    w, h, t, _ = boards[n]; B[n] = {"x": x, "y": 0, "w": w, "h": h, "title": t}; x += w + 120
json.dump({"v": 3, "createdOnFiles": {"v": 1, "at": "2026-11-22T16:50:00Z"}, "title": "Wishlist printing R1", "launch": {"view": "canvas"},
  "pages": [], "boards": B, "order": order, "notes": {}, "designSystems": []}, open(os.path.join(out, "canvas.json"), "w"), indent=1)
print("ok", mode)
