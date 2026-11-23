# Finding the tools R1, R2 (account 1, 2026-11-23): writes the boards twice, for the canvas (/_blob urls from blobs.json)
# and for the repo (art/). Usage: python3 gen.py repo|canvas <out>
import json, sys, os
mode, out = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
BLOB = json.load(open(os.path.join(HERE, "blobs.json"))) if mode == "canvas" else {}
DIMS = json.load(open(os.path.join(HERE, "dims.json")))
def src(k): return BLOB[k] if mode == "canvas" else f"art/td-{k}.webp"
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
def head(t, p): return f'<div style="display:flex;flex-direction:column;gap:10px"><h2 style="margin:0;font:700 30px \'Chakra Petch\',sans-serif;color:#E6E8F0">{t}</h2><p style="margin:0;font-size:15px;line-height:1.6;color:#B1B6C7;max-width:1240px">{p}</p></div>'
def label(t): return f'<span style="font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.12em;text-transform:uppercase;color:#FF6FAE">{t}</span>'
def fig(k, w, cap, note):
    cw, ch = DIMS[k]; h = round(w * ch / cw); r = 28 if k.startswith("p-") else 12
    return f'''<figure style="margin:0;display:flex;flex-direction:column;gap:12px;width:{w}px;flex:none">
<img src="{src(k)}" alt="{cap}" style="width:{w}px;height:{h}px;display:block;border-radius:{r}px;border:1px solid #262A35">
<figcaption style="display:flex;flex-direction:column;gap:6px">
<p style="margin:0;font:600 15px 'IBM Plex Sans',sans-serif;color:#E6E8F0">{cap}</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#959AAD">{note}</p>
</figcaption>
</figure>'''
def ph(k, cap, note): return fig(k, 292, cap, note)
def dk(k, cap, note, w=660): return fig(k, w, cap, note)
def row(lbl, figs, gap=40): return f'<div style="display:flex;flex-direction:column;gap:14px">{label(lbl)}<div style="display:flex;gap:{gap}px;align-items:flex-start;flex-wrap:wrap">{"".join(figs)}</div></div>'
def call(n, t, body): return f'<div style="display:flex;flex-direction:column;gap:8px;padding:20px 24px;border:1px solid #262A35;border-radius:14px;background:#11131A"><p style="margin:0;font:600 17px \'IBM Plex Sans\',sans-serif;color:#E6E8F0"><span style="font-family:\'IBM Plex Mono\',monospace;color:#FF6FAE">{n}</span> · {t}</p><div style="font-size:14px;line-height:1.6;color:#B1B6C7">{body}</div></div>'
def ul(items): return '<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">' + "".join(f"<li>{i}</li>" for i in items) + '</ul>'
def m(t): return f'<span style="font-family:\'IBM Plex Mono\',monospace;color:#E6E8F0">{t}</span>'
def q(n, t, body, rec): return f'<div style="display:flex;flex-direction:column;gap:6px;padding:16px 20px;border:1px solid #FF6FAE;border-radius:12px"><p style="margin:0;font:600 15px \'IBM Plex Sans\',sans-serif;color:#E6E8F0"><span style="font-family:\'IBM Plex Mono\',monospace;color:#FF6FAE">{n}</span> · {t}</p><div style="font-size:14px;line-height:1.6;color:#B1B6C7">{body}</div><p style="margin:0;font-size:13px;color:#959AAD"><b style="color:#E6E8F0">Recommended:</b> {rec}</p></div>'
def note(lbl, items): return f'<div style="display:flex;flex-direction:column;gap:10px;padding:20px 24px;border:1px solid #262A35;border-radius:14px">{label(lbl)}<div style="font-size:14px;line-height:1.6;color:#B1B6C7">{ul(items)}</div></div>'

C1 = call("1", "Find a deck lives where your cards are: /collection", ul([
  f"A call-out under the filters, the deck page's to-do card row as a statement (the you-have-it pattern): eyebrow {m('Find a deck')}, the door's two diamonds, {m('212 of your cards are in no deck')} / {m('Narrow to them, then press a card’s two diamonds to see which of your decks it fits.')} A bare ✕ closes it for good.",
  f"Under it the shipped segmented switch: {m('All · 2,926')} / {m('In no deck · 212')}. It IS the Availability filter's Free option, one state: choosing it draws the {m('Free')} chip, clearing the chip goes back to All.",
  "While the list is narrowed to Free alone, every tile draws the Find a deck press (the door's glyph in the #3202 26px box, 44px hit). It opens the card window straight on Find a deck, the shipped view, with the card as its back press.",
  "Not on All: most of a collection is in no deck, and a glyph on every tile would be noise. The door in card details and its moment stay as shipped.",
  f"Every Try it for Find a deck already lands on {m('/collection?avail=free')}: the tour, About's Tools tab and the welcome sheet now arrive on these presses."]))
C2 = call("2", "Tuning gets a tab; Consider moves into it", ul([
  f"Tabs: {m('Your deck · Analysis · Tuning · Games · Versions')}. Still five, so the phone row scrolls as it does today. Tuning is drawn for every deck, as the hub already is.",
  "The Tuning tab is the shipped hub, unchanged in behavior: tiles, a tool opens in place, the desktop underline row, the phone's ‹ Tuning. Its own Tuning heading goes (the tab names it).",
  f"Consider is the first tile, full width from md: {m('free')}, {m('Cards that fill what this deck is short of, the ones you own first.')}, {m('14 you own · 26 to buy')}. It opens the shipped Consider panel in place.",
  "Analysis keeps the reading: verdict, Overview, strategy, bracket, findings. The hub leaves its foot.",
  f"Every shortcut retargets the tab: the to-do card's Cuts, the land cell's {m('balance mana →')}, the role cells' {m('consider →')} (Tuning, Consider open), and Try it for the Tune tools."]))
C3 = call("3", "The welcome sheet points at the new homes", ul([
  "The Home strip is unchanged: one line, Where they work, ✕.",
  f"Every row now has Try it. Overview lands on a deck's Analysis tab; Which deck needs it most? lands on {m('/collection')}, In no deck, presses on.",
  f"Where lines: Suggested changes and Proposed cuts read {m('A deck’s Tuning tab')}; Which deck needs it most? reads {m('A card in no deck')}.",
  f"A free block before the teaser, in the sheet's shipped reason-line form: {m('Free, no credit needed')}, then Consider and Find a deck, each with a {m('free')} pill and Try it. A new player reading where credits go also learns the two free tools that answer \"where do my cards go\"."]))

Q1 = q("Q1", "Does Tuning open straight on Consider while a deck is short?", "On a deck under its size the work is adding cards, and Consider is one press deeper than it is today. Option A: the tab always lands on the tiles (drawn). Option B: under size, it lands on Consider open, the tiles one ‹ Tuning away.", "A. One rule for the tab, and Consider is the first, full-width tile, so the press is a short one.")
Q2 = q("Q2", "Keep the free block in Where credits work?", "The sheet is about credits; the block names two tools that cost none. Option A: keep it (drawn). Option B: the sheet stays spenders only and the Collection call-out carries Find a deck alone.", "A. The sheet is the one place a new player is told what the tools are, and it already says browsing is free.")
Q3 = q("Q3", "One word for the filter: In no deck, or Free?", "The switch says In no deck; the Availability filter's option and chip say Free (the same state). Option A: rename the shipped option and chip to In no deck, everywhere. Option B: the switch says Free too.", "A. \"Free\" reads as a price to a new player; \"In no deck\" says what it filters.")


C1R2 = call("1", "Find a deck, R2: the shipped Free filter is the one control", ul([
  f"No switch. Availability's {m('Free')} option and chip are the filter, as shipped; R1's All / In no deck switch is gone.",
  f"On All, the call-out is the door to it: eyebrow {m('Find a deck')}, {m('212 of your cards are in no deck')} / {m('See which of your decks each one could go in.')}, and {m('Show them')}, which applies Availability: Free. A bare ✕ closes it for good.",
  f"On Free alone, the same call-out without the button: {m('Press Find a deck under a card to see which of your decks it fits.')}",
  f"Each tile gets a labelled button under it, the tile's full width: the door's two diamonds and {m('Find a deck')} (36px on a phone, 34px from md). The name keeps its whole line, and a reader who has never seen the glyph reads what it does. It opens the card window straight on Find a deck, as R1.",
  "Drawn only while the list is narrowed to Free alone: on All most cards are in decks, and a button under every tile would be noise."]))
C4 = call("4", "Home says what you can do, in your words", ul([
  f"A section on Home under the welcome strip, above Pick up where you left off: {m('What you can do')}. Goals, not tool names, each with the player's own numbers, each one press from the tool that answers it.",
  f"{m('Find a home for your spare cards')} {m('free')}: {m('212 of your cards are in no deck. See which of your decks each one fits.')} → /collection?avail=free, the call-out above.",
  f"{m('Make Ashen Banner Parade better')} {m('free to start')}: {m('Cards you own that fill what it’s short of, then swaps and cuts.')} → the deck's Tuning tab (the most recently touched deck).",
  f"{m('Build another deck')} {m('free')}: {m('Commanders your cards can already lead, the closest first.')} → /commanders.",
  "Why it reaches the player who skipped the strip: it is page content, not a promo line, it uses their cards and their deck by name, and it does not mention credits at all. The strip keeps the credits story.",
  f"A row leaves once its tool has been opened from anywhere (the moments' spent store); the section leaves with its last row. A bare ✕ beside the heading closes it for good. Rows only draw when they have something to say: no spares row at 0 cards in no deck, no tune row with no deck. At zero decks Home already draws its ways in, so the section waits for the first deck.",
  "Phone: one column of rows. From 1180: three across, one row."]))
Q4 = q("Q4", "In the Free view, a labelled button under each tile, or no button at all?", "Option A: the Find a deck button under every tile (drawn). Option B: no button; in the Free view a tile's own press opens the card window straight on Find a deck, and the call-out says so. B adds nothing to the tile, but it changes what a tile does in one view only, and nothing on the tile says it.", "A. A new player can see the tool and its name on every card, and a tile always does the same thing.")
Q5 = q("Q5", "Should What you can do retire row by row, or only when hidden?", "Option A: a row leaves once its tool has been opened, and the section leaves with its last row (drawn). Option B: the rows stay until the ✕, as a standing shortcut list.", "A. Home is for what is new to the player; once they have found a tool it lives in its own place.")
boards = {}
boards["Main.dc.html"] = (1600, 2180, "Main", page("Finding the tools R2: main", 1600, 2180,
 head("Finding the tools · R2",
  "One complaint: <i>\"I have a bunch of cards I want to add to my other decks, but I don't know where to go.\"</i> R2 keeps R1's Tuning tab and welcome sheet as drawn, redoes Find a deck on Collection around the shipped Free filter, and adds a Home section that says what a player can do, for the player who never reads the welcome strip. Rendered from main 7563036 with shipped components. Figures and art are illustrative.")
 + note("Since R1", ["Find a deck: the All / In no deck switch is gone (the shipped Availability: Free filter does the job); the glyph press that cut names short becomes a labelled button under each tile.", "R1's Q3 (rename Free) is withdrawn with the switch: the shipped word stays.", "New: call 4, What you can do on Home (board Home).", "Tuning and Welcome as R1, approved: Tuning always lands on its tiles, and the free block stays in Where credits work (R1 Q1 and Q2, A)."])
 + '<div style="display:flex;gap:40px;align-items:flex-start">'
 + '<div style="display:flex;flex-direction:column;gap:16px;flex:1 1 0;min-width:0">' + C1R2 + C4 + call("2, 3", "As R1", ul(["Tuning gets its own tab after Analysis; Consider leaves the tab row and becomes Tuning's first tile. Analysis keeps the reading.", "Where credits work: every row lands, the Tuning rows name the tab, and a free block names Consider and Find a deck."])) + '</div>'
 + '<div style="display:flex;flex-direction:column;gap:28px;flex:none;width:620px">'
 + '<div style="display:flex;gap:20px">' + fig("p-h1", 300, "Home, What you can do", "Under the strip, above the decks.") + fig("p-f1", 300, "Collection, Free", "The call-out; a button under each tile.") + '</div>'
 + '</div></div>'
 + Q4 + Q5
 + note("Not changed", ["The card window's Find a deck door and its moment (M8).", "The Availability filter, its options and its chip.", "Home's strip, its states and its ✕.", "The first-run tour."])))

boards["Find.dc.html"] = (1700, 3440, "Find", page("Finding the tools R2: Find a deck", 1700, 3440,
 head("Q1 · How a player finds the deck a card fits (R2)", "/collection's Cards tab. F0 the call-out on All, its Show them applying the shipped Availability: Free. F1 narrowed to Free, a Find a deck button under each tile. F2 the button opens Find a deck straight (shipped view, Killian, one deck fits). Desktop first, then the phone.")
 + row("Desktop · 1300", [dk("d-f0", "F0 · All", "The call-out with Show them; no buttons on All.", 780), dk("d-f1", "F1 · Free", "The Free chip as shipped; a labelled button under each tile.", 780)])
 + row("Desktop · 1300", [dk("d-f2", "F2 · The button opens Find a deck", "The card window straight on the view; ← the card goes to its details.", 780)])
 + row("Phone · 390", [ph("p-f0", "F0 · All", "Show them under the line, 44px."), ph("p-f1", "F1 · Free", "Names keep their whole line; the button sits under the tile."), ph("p-f2", "F2 · Find a deck", "The phone card window, on the view.")])))

boards["Home.dc.html"] = (1700, 1540, "Home", page("Finding the tools R2: Home", 1700, 1540,
 head("Q4 · What you can do, on Home", "H1: a player with one deck, 212 cards in no deck and the welcome strip still up. Three goals in plain words with their own numbers; each row lands on the tool. The strip above is unchanged.")
 + row("Desktop · 1300", [dk("d-h1", "H1 · Home", "Three across from 1180; the bare ✕ closes it for good.", 1000)])
 + row("Phone · 390", [ph("p-h1", "H1 · Home, phone", "One column; the cost pill follows the title.")])))

boards["Tuning.dc.html"] = (1700, 3920, "Tuning", page("Finding the tools: Tuning", 1700, 3920,
 head("Q2 · Tuning gets a tab", "T0 today's tab row (Tuning is the last section of Analysis, under the whole reading). T1 the Tuning tab's landing. T2 Consider opened inside it, the shipped panel.")
 + row("Today", [dk("d-t0", "T0 · Today", "Your deck · Analysis · Consider · Games · Versions.", 780), ph("p-t0", "T0 · Today, phone", "Same row.")])
 + row("Desktop · 1300", [dk("d-t1", "T1 · Tuning", "Consider full width first; Suggested changes, Mana Balance, Proposed cuts, History as shipped.", 780), dk("d-t2", "T2 · Consider open", "The hub's underline row; the shipped panel under it.", 780)])
 + row("Phone · 390", [ph("p-t1", "T1 · Tuning", "Stacked tiles, Consider first."), ph("p-t2", "T2 · Consider open", "‹ Tuning and 1 of 5 tools; Consider's own toolbar.")])))

boards["Welcome.dc.html"] = (1700, 3700, "Welcome", page("Finding the tools: welcome", 1700, 3700,
 head("Q3 · The welcome credits point at the tools", "H0 Home's strip, unchanged. S0 Where credits work today. S1 proposed: every row lands, the Tuning rows name the tab, Which deck needs it most? lands on the cards in no deck, and a free block names Consider and Find a deck.")
 + row("Desktop · 1300", [dk("d-h0", "H0 · Home's strip", "Unchanged.", 780), dk("d-s0", "S0 · Today", "Overview and Which deck needs it most? have no Try it.", 780)])
 + row("Desktop · 1300", [dk("d-s1", "S1 · Proposed", "Try it on every row; the free block before the teaser.", 780)])
 + row("Phone · 390", [ph("p-h0", "H0 · Home, phone", "Unchanged."), ph("p-s0", "S0 · Today", "The sheet as shipped."), ph("p-s1", "S1 · Proposed", "The free block at the foot.")])))

os.makedirs(out, exist_ok=True)
for n, (w, h, t, html) in boards.items(): open(os.path.join(out, n), "w").write(html)
order = ["Main.dc.html", "Find.dc.html", "Home.dc.html", "Tuning.dc.html", "Welcome.dc.html"]
x = 0; B = {}
for n in order:
    w, h, t, _ = boards[n]; B[n] = {"x": x, "y": 0, "w": w, "h": h, "title": t}; x += w + 120
json.dump({"v": 3, "createdOnFiles": {"v": 1, "at": "2026-11-23T17:00:00Z"}, "title": "Finding the tools R2", "launch": {"view": "canvas"}, "pages": [],
  "boards": B, "order": order, "notes": {}, "designSystems": []}, open(os.path.join(out, "canvas.json"), "w"), indent=1)
print("wrote", order)
