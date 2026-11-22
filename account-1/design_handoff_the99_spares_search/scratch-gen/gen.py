# Spares search + friends' spares on the Wishlist R1 (account 1, 2026-11-22): writes the boards twice,
# for the canvas (/_blob urls from blobs.json) and for the repo (art/).
import json, sys, os
mode, out = sys.argv[1], sys.argv[2]
BLOB = json.load(open(os.path.join(os.path.dirname(__file__), "blobs.json"))) if mode == "canvas" else {}
def src(k): return BLOB[k] if mode == "canvas" else f"art/ss-{k}.webp"
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
def head(t, p): return f'<div style="display:flex;flex-direction:column;gap:10px"><h2 style="margin:0;font:700 30px \'Chakra Petch\',sans-serif;color:#E6E8F0">{t}</h2><p style="margin:0;font-size:15px;line-height:1.6;color:#B1B6C7;max-width:1200px">{p}</p></div>'
def label(t): return f'<span style="font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.12em;text-transform:uppercase;color:#FF6FAE">{t}</span>'
def fig(k, w, h, cap, note, radius=28):
    return f'''<figure style="margin:0;display:flex;flex-direction:column;gap:12px;width:{w}px;flex:none">
<img src="{src(k)}" alt="{cap}" style="width:{w}px;height:{h}px;display:block;border-radius:{radius}px;border:1px solid #262A35;object-fit:cover;object-position:top">
<figcaption style="display:flex;flex-direction:column;gap:6px">
<p style="margin:0;font:600 15px 'IBM Plex Sans',sans-serif;color:#E6E8F0">{cap}</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#959AAD">{note}</p>
</figcaption>
</figure>'''
def row(lbl, figs, gap=40): return f'<div style="display:flex;flex-direction:column;gap:14px">{label(lbl)}<div style="display:flex;gap:{gap}px;align-items:flex-start;flex-wrap:wrap">{"".join(figs)}</div></div>'
def ph(k, cap, note): return fig(k, 292, 632, cap, note)
def dk(k, cap, note, w=650): return fig(k, w, round(w * 900 / 1300), cap, note, 12)
def call(n, t, body): return f'<div style="display:flex;flex-direction:column;gap:8px;padding:20px 24px;border:1px solid #262A35;border-radius:14px;background:#11131A"><p style="margin:0;font:600 17px \'IBM Plex Sans\',sans-serif;color:#E6E8F0"><span style="font-family:\'IBM Plex Mono\',monospace;color:#FF6FAE">{n}</span> · {t}</p><div style="font-size:14px;line-height:1.6;color:#B1B6C7">{body}</div></div>'
def ul(items): return '<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">' + "".join(f"<li>{i}</li>" for i in items) + '</ul>'
def m(t): return f'<span style="font-family:\'IBM Plex Mono\',monospace;color:#E6E8F0">{t}</span>'

boards = {}
boards["Main.dc.html"] = (1560, 1680, "Main", page("Spares search R1: main", 1560, 1680,
 head("Find a friend's spares · R1",
  "Two gaps, one goal: finding a card a friend can spare. A friend's Spares tab gains the Collection's own filter frame (search by name or type, Wanted, Color identity, Type, Sort), and a Wishlist tile gains the deck row's spare press, which opens the same Friends with a spare modal and its Ask. Wishlist stays separate from Shopping. Drawn over the shipped friend page and Wishlist tab, rendered from main; new parts are built from shipped components. Friends are Colin and Max; card art is from other handoffs, counts and prices are placeholders.")
 + '<div style="display:flex;gap:40px;align-items:flex-start">'
 + '<div style="display:flex;flex-direction:column;gap:16px;flex:1 1 0;min-width:0">'
 + call("1", "Spares tab: search and filters", ul([
   f"The Collection's frame, as shipped: the wide chassis from 1000px, the compact head below it (search, then {m('Filters')} · Sort · count) with its Filters sheet and chip shelf.",
   f"<b>Search reads name or type</b>, the same matcher Collection is gaining: every word must start a word of the name or the type line, so {m('wizard')} finds Gisa, Tam and Zimone, and {m('saga')} or {m('zombie')} work the same way.",
   f"Filters that matter on a friend's spares: <b>Wanted</b> ({m('On your wishlist')}, {m('A deck needs it')}), <b>Color identity</b> (the pips, Any or Exactly), <b>Type</b> (counts respect the other filters). Left out: Set, Availability, price. They describe your own copies, not a friend's.",
   f"Sort: {m('Wanted first')} (the shipped order, now with deck needs after wishlist cards), {m('Name')}, {m('Most spares')}.",
   f"The tile's caption gains {m('a deck needs it')} / {m('2 decks need it')} under the shipped {m('on your wishlist')}, so the Wanted filter has something you can see.",
   f"No results: the shared ZeroState, {m('No spares match “saga”.')} with Keep only search and Clear all filters. Empty and not sharing: the shipped tab, no frame."]))
 + call("2", "Wishlist: the friend-spare press", ul([
   "The deck row's press, on the tile: the outlined 26px box with the spare glyph in fact ink, 44px hit on touch, sitting over the caption's lower right. It is the tile's sibling, never inside its press.",
   f"<b>One friend:</b> the glyph. <b>Two or more:</b> the glyph and how many friends ({m('2')}). <b>None:</b> nothing at all, no slot.",
   "Requested and accepted marks are the deck row's (accent dot, green tick). The meta row carries the shipped key words, only once a press is drawn.",
   f"Pressing it opens the shipped spares-only modal: {m('Friends with a spare')}, kicker {m('on your wishlist')}, a row per friend with <b>Ask</b>. The ask names no deck and asks for what the line still wants.",
   "<b>Loading:</b> the page draws with no presses. One read for every tile lands after it; the presses fade in (160ms, none under reduced motion). A failed read draws nothing, never an error."]))
 + call("3", "A Wishlist filter or sort?", ul([
   f"<b>No filter.</b> A wishlist is short and the press already says which cards a friend has; hiding the rest would hide what you still need to buy.",
   f"<b>One sort order:</b> the shipped desktop Sort gains {m('Friends’ spares')}: cards with a press first, most friends first, then newest. Before the read lands it sorts as Newest, and it re-sorts once when the read lands, only if chosen. The phone has no Sort today and gets none."]))
 + '</div>'
 + '<div style="display:flex;flex-direction:column;gap:28px;flex:none;width:620px">'
 + '<div style="display:flex;gap:20px">' + fig("p-s2", 290, 627, "Spares: a type word", "P2, “wizard”.") + fig("p-wtiles", 300, 346, "Wishlist: the press", "Two friends, none, one friend with a request.", 12) + '</div>'
 + dk("d-s3", "Desktop: Wanted ▾", "D3, A deck needs it.", 620)
 + '</div></div>'
 + '<div style="display:flex;flex-direction:column;gap:10px;padding:20px 24px;border:1px solid #FF6FAE;border-radius:14px">' + label("Settled · Hugh, 2026-11-22")
 + '<div style="font-size:14px;line-height:1.6;color:#B1B6C7">' + ul([
   "<b>Q1 · When the Spares tab shows its filters:</b> always, on any list with a spare, for a consistent experience (Hugh). Empty and not sharing still draw no frame: there is nothing to filter.",
   "<b>Q2 · Several friends on a Wishlist tile:</b> the glyph plus the count, as drawn. A tile has room a deck row lacks, and the count tells you how many people you can ask before you open anything.",
   "<b>Q3 · The Wishlist sort:</b> kept, as drawn. It gathers the cards you can get from a friend without hiding the rest, and it only moves tiles when you choose it.",
 ]) + '</div></div>'))

boards["Spares.dc.html"] = (1780, 2700, "Spares", page("Spares search R1: the Spares tab", 1780, 2700,
 head("Spares tab · search and filters", "Colin shares 25 spares with the Thursday pod. Wanted first puts the three on your wishlist ahead, then the four a deck of yours needs. Every frame is the shipped friend page with the Collection's frame added.")
 + row("Phone 390", [
   ph("p-s1", "P1 · At rest", "Compact head: search, then Filters · Sort: Wanted first · 25 spares. The line keeps the pods and Press one to ask for it."),
   ph("p-s2", "P2 · Search by type", "“wizard” is in no name; the type line holds it. 3 of 25 spares."),
   ph("p-s3", "P3 · Filters sheet", "Wanted leads, then Color identity and Type. A deck needs it is on: 4 of 25 match."),
   ph("p-s4", "P4 · No results", "“saga” with On your wishlist. The chip shelf shows what is on; Keep only search leads."),
   ph("p-s5", "P5 · Empty", "Shipped: Colin has no spares to show. No frame, nothing to filter.")])
 + row("Desktop 1300", [
   dk("d-s1", "D1 · At rest", "The wide chassis: search, pips, Type ▾, Wanted ▾, then Sort past the hairline. No filters on."),
   dk("d-s2", "D2 · Search by type", "3 of 25 spares. Gisa, Tam and Zimone are wizards by type line.")])
 + row("Desktop panels", [
   dk("d-s3", "D3 · Wanted ▾", "The Availability panel's shape: bookmark and the deck page's hollow dot lead the two rows, with counts."),
   dk("d-s6", "D4 · Type ▾", "Counts follow the other filters: with “wizard”, Creature reads 3; the empty types dim.")])
 + row("Desktop states", [
   dk("d-s4", "D5 · No results", "The shared ZeroState in this tab's words."),
   dk("d-s5", "D6 · Empty", "Shipped, unchanged.")])))

boards["Wishlist.dc.html"] = (1700, 2140, "Wishlist", page("Spares search R1: the Wishlist", 1700, 2140,
 head("Wishlist · friends' spares on the tile", "Nine wanted cards. Lathliss: Colin and Max have spares. Giada: three friends. Zimone: Colin, and you asked him (requested). Jace and Tam: one friend each. The rest: none. The press opens the shipped Friends with a spare modal with Ask.")
 + row("Phone 390", [
   ph("p-w0", "W0 · Loading", "The page as shipped: no presses, no key. Nothing reserves room."),
   ph("p-w1", "W1 · Loaded", "Presses on five tiles; the meta row gains the key: friend has a spare, requested."),
   ph("p-w2", "W2 · Opened", "Lathliss's press: Friends with a spare, on your wishlist, Colin and Max with Ask."),
   fig("p-wtiles", 300, 346, "W3 · Close up", "2 friends · none · 1 friend, requested. The caption lines make room only on a tile with a press.", 12)])
 + row("Desktop 1300", [
   dk("d-w0", "D1 · Loading", "Shipped tiles, Sort: Newest."),
   dk("d-w1", "D2 · Loaded", "The same press at md, 8px in from the caption's corner.")])
 + row("Desktop, opened and sorted", [
   dk("d-w2", "D3 · Opened", "The shipped 640 modal over the tab; the tile's press is ringed while it is open."),
   dk("d-w3", "D4 · Sort: Friends' spares", "Giada (3), Lathliss (2), then one friend each, then the rest, newest first inside each.")])))

os.makedirs(out, exist_ok=True)
for name, (w, h, title, html) in boards.items():
    open(os.path.join(out, name), "w").write(html)
order = ["Main.dc.html", "Spares.dc.html", "Wishlist.dc.html"]
x = 0; B = {}
for n in order:
    w, h, t, _ = boards[n]; B[n] = {"x": x, "y": 0, "w": w, "h": h, "title": t}; x += w + 120
json.dump({"v": 3, "createdOnFiles": {"v": 1, "at": "2026-11-22T21:00:00Z"}, "title": "Spares search R1", "launch": {"view": "canvas"},
  "pages": [], "boards": B, "order": order, "notes": {}, "designSystems": []}, open(os.path.join(out, "canvas.json"), "w"), indent=1)
print("ok", mode)
