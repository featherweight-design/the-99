# Store choice R1 (account 1, 2026-11-22): writes the boards twice, for the canvas (/_blob urls) and for the repo (art/).
import json, sys, os
from PIL import Image
BLOB = json.load(open(os.path.join(os.path.dirname(__file__), "blobs.json")))
ART = os.path.join(os.path.dirname(__file__), "..", "art-out")
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
MAIN_W, MAIN_H = 1700, 2400
boards["Main.dc.html"] = (MAIN_W, MAIN_H, "Main", page("Store choice R1: main", MAIN_W, MAIN_H,
 head("Let players choose their card store · R1",
  "Each player picks one store, and its prices and buy links replace Mana Pool’s everywhere a price appears. Stores: Mana Pool (the default), TCGplayer and Card Kingdom. Every frame is the shipped page rendered from main with this round’s parts patched in (Settings, a deck’s Shopping list, the all-decks cart, card details, the Wishlist tab, the Home feed and What each deck is worth). Store prices are placeholders: TCGplayer about 9% under Mana Pool, Card Kingdom about 18% over.")
 + '<div style="display:flex;gap:40px;align-items:flex-start">'
 + '<div style="display:flex;flex-direction:column;gap:16px;flex:1 1 0;min-width:0">'
 + call("1", "The setting: Settings, first section, one radio row per store", ul([
   f"Settings gains {m('Store')} at the top, above Notifications: it is the one setting that changes what every price in the app says. Settings stay in one place; the user menu gains nothing.",
   "One row per store, drawn as Your decks’ rows with the upload choice’s radio ring: the name, then one line on what its prices are and whether it takes a whole list. A fourth store is one more row (the list is one array), so nothing is redrawn. A segmented switch was ruled out: three names barely fit at 390 and a fourth would not.",
   f"Saved as it changes, like every Settings section (the page sub already says so). A failed save puts the old store back and says {m('We couldn’t save that. Try again.')} in the shared social toast."]))
 + call("2", "Two doors: a first-run row for new players, Change store where people buy", ul([
   f"<b>New players (your call, 2026-11-22):</b> the first-run checklist gains an unnumbered row, {m('Where do you buy cards?')}, after the locked steps and before Add your friends, with the three stores as the shipped segmented switch, Mana Pool already chosen. A press saves it. Not a step: the kicker stays Step 1 of 3 and nothing waits on it (Onboarding board).",
   f"<b>Everyone else:</b> the provenance line on the deck Shopping strip and the all-decks cart ends with {m('· Change store')}, a link to {m('/settings#settings-store')}, which washes the section for two seconds as the deck ⋯ menu’s links do.",
   "Kept (Q2): players who joined before this ship never see first run, and a new player who skipped the row meets the store again where it matters. The line already names the store on every visit, so the change is one press from where they buy. No banner, no dismiss, no stored flag."]))
 + call("3", "Price, buy link and the label naming the store", ul([
   f"Figures stay bare where they sit in rows and tiles (buy tags, Wishlist tiles, the feed’s drop): one store at a time, so no tag repeats its name.",
   f"The store is named once per surface, where the shipped copy already names Mana Pool: the strip and cart line ({m('single-copy prices on Card Kingdom')}), the buy links ({m('Buy these at Mana Pool')}, {m('Buy any printing at TCGplayer')}, {m('Buy FDC 4 at Card Kingdom')}, {m('Buy at TCGplayer')} on Home), and deck cost ({m('Card Kingdom prices, 2h ago')}).",
   "Every shipped string that says Mana Pool is listed with its store form in the copy file, as one function of the store."]))
 + call("4", "The TCGplayer accuracy note", ul([
   f"Short form, after the store on the strip and cart: {m('TCGplayer market prices · averages of recent sales, so a listing can differ')}. Deck cost: {m('TCGplayer market prices, 2h ago')}.",
   f"Card details: {m('market price')} after the tag (after {m('from $1.27')} when that shows). The tag’s spoken sentence says it too.",
   f"Long form, once, in Settings’ TCGplayer row: {m('Market prices, an average of recent sales, so a listing can cost more or less.')}",
   "Rows, tiles and the feed carry no note: the strip above them says it."]))
 + call("5", "Mana Pool is the default: one place", ul([
   f"The foot of Settings’ Store section: {m('Mana Pool is the default. Changing store changes every price, buy link and price-drop alert.')} Nowhere else."]))
 + call("6", "No whole-list cart link", ul([
   f"Where the store has none (TCGplayer, Card Kingdom), the strip and the all-decks cart keep the figure and the provenance, and in the link’s place: {m('TCGplayer has no link for a whole list. Copy it, then paste it into TCGplayer’s Mass Entry.')} Under it, in the link’s own 44px row, two presses: {m('Copy the list')} (swaps to ✓ Copied for 1.5s, announced) and {m('Open Mass Entry ↗')}. Card Kingdom’s is its Deck Builder (Q3, decided: two presses take the whole list to the store’s cart, which buying card by card never would).",
   "The copied text is the shown selection as 1 Name lines, the form both stores’ paste pages read. A store with no paste page keeps the plain line: Buy each card from its details.",
   "Driven by the store’s own flag, so a store that gains a cart link later just shows it."]))
 + call("7", "No price from the chosen store", ul([
   f"Rows: the bare {m('buy')} tag, as shipped for a card with no figure (silence is a state). The strip counts it out: {m('11 of 14 priced')}. None priced: {m('no prices from Card Kingdom for these')}, no figure.",
   f"Card details: the shipped dashed {m('no stock')} tag, and the link becomes {m('Look for it at Card Kingdom')} (a search, not a claim it sells it). Wishlist tile: no price line. Home: no drop is raised."]))
 + '</div>'
 + '<div style="display:flex;flex-direction:column;gap:28px;flex:none;width:600px">'
 + '<div style="display:flex;gap:16px">' + fig("s-tcg", 292, "Settings · Store", "S2, TCGplayer chosen.") + fig("o-tcg", 292, "First run · store row", "O2, TCGplayer picked on the checklist.") + '</div>'
 + fig("sh-tcg-copied", 600, "Shopping · TCGplayer, just copied", "P2b, the list is on the clipboard; Open Mass Entry is next.")
 + fig("cd-tcg-desk", 600, "Card details · TCGplayer", "C5, market price beside the tag; the link names the store.")
 + '</div></div>'
 + '<div style="display:flex;flex-direction:column;gap:12px">' + label("Every surface, by store") + table([
   ["Surface", "Mana Pool (default)", "TCGplayer", "Card Kingdom"],
   ["Shopping strip line", "single-copy prices on Mana Pool · last checked … · a cart with shipping … · Change store", "TCGplayer market prices · averages of recent sales, so a listing can differ · last checked … · Change store", "single-copy prices on Card Kingdom · last checked … · Change store"],
   ["Whole-list link", "Buy these at Mana Pool (parts as shipped)", "Copy the list · Open Mass Entry", "Copy the list · Open Deck Builder"],
   ["Buy tags, Wishlist tiles", "figure", "figure", "figure"],
   ["Card details", "tag · Buy any printing at Mana Pool", "tag · market price · Buy any printing at TCGplayer", "tag · Buy any printing at Card Kingdom"],
   ["Wishlist box (chosen printing)", "Buy FDC 4 at Mana Pool", "Buy FDC 4 at TCGplayer", "Buy FDC 4 at Card Kingdom"],
   ["Home price drop", "Buy at Mana Pool", "Buy at TCGplayer", "Buy at Card Kingdom"],
   ["Deck cost", "Mana Pool prices, 2h ago", "TCGplayer market prices, 2h ago", "Card Kingdom prices, 2h ago"],
   ["No price", "bare buy · no stock · Look for it at Mana Pool", "same, TCGplayer", "same, Card Kingdom"],
 ]) + '</div>'
 + '<div style="display:flex;flex-direction:column;gap:10px;padding:20px 24px;border:1px solid #FF6FAE;border-radius:14px">' + label("Your calls, settled 2026-11-22")
 + '<div style="font-size:14px;line-height:1.6;color:#B1B6C7">' + ul([
   "<b>Q1 · Where Store sits:</b> first on Settings, and also in onboarding as a first-run row (Onboarding board).",
   "<b>Q2 · The nudge:</b> keep Change store on the strip and cart. First run reaches new players only; this reaches everyone, where they buy.",
   "<b>Q3 · No whole-list link:</b> the line plus Copy the list and the store’s own paste page (Shopping P2, P2b, K2, K3). Still to check in the plan: each store’s paste page URL and whether TCGplayer’s Mass Entry takes a prefilled list.",
 ]) + '</div></div>'))

ON_W, ON_H = 2240, 2160
boards["Onboarding.dc.html"] = (ON_W, ON_H, "Onboarding", page("Store choice R1: onboarding", ON_W, ON_H,
 head("1 and 2 · The store in first run", "An unnumbered checklist row after the locked steps and before Add your friends, in the Friends row’s live box. The three stores are the shipped segmented switch (radio, compact, full width on the phone); Mana Pool is already chosen, so a player who ignores the row has the default. A press saves at once with the Settings write; a failed save puts the old store back and raises the same toast. Once cards are in, the checklist goes and Settings and Change store remain. A fourth store adds a segment; past what 390 holds, the switch scrolls (its shipped option).")
 + row("Phone 390", [ph("o-mp", "O1 · Mana Pool, untouched", "The row as a new player first meets it, scrolled under step 3."),
   ph("o-tcg", "O2 · TCGplayer picked", "The fill moves at once; every price from here on is TCGplayer’s."),
   fig("o-tcg-row", 390, "O3 · The row alone", "Title, line, switch. The line names Settings so the choice never feels final.")])
 + row("Desktop 1300", [dk("o-mp-desk", "O4 · Desktop", "The switch sits under the text at its content width.", 1100)])))

SET_W, SET_H = 1700, 1660
boards["Setting.dc.html"] = (SET_W, SET_H, "Setting", page("Store choice R1: setting", SET_W, SET_H,
 head("1 and 5 · The Store section in Settings", "First on the page, above Notifications. One radio row per store from the store list; the foot is the one place that says Mana Pool is the default. Saved as it changes, as the page sub says.")
 + row("Phone 390", [ph("s-mp", "S1 · Mana Pool, the default", "A new player sees this: Mana Pool chosen, the foot under the three rows."),
   ph("s-tcg", "S2 · TCGplayer", "The row’s line is the long form of the accuracy note."),
   ph("s-ck", "S3 · Card Kingdom", "Card Kingdom’s line says links open one card at a time."),
   ph("s-wash", "S4 · Arrived from Change store", "/settings#settings-store: the section takes the elevated wash and ring for two seconds, then fades (Your decks’ wash).")])
 + row("Desktop 1300", [dk("s-mp-desk", "S5 · Desktop", "The same section in the 720 column.", 760), dk("s-wash-desk", "S6 · Desktop, washed", "From the strip’s Change store link.", 760)])))

SH_W, SH_H = 2240, 2100
boards["Shopping.dc.html"] = (SH_W, SH_H, "Shopping", page("Store choice R1: shopping", SH_W, SH_H,
 head("2, 3, 4 and 6 · A deck’s Shopping list and the all-decks cart", "Lanternlight Tinkers’ Shopping list with each store. Rows keep their bare figures; the strip names the store, carries the TCGplayer note and ends with Change store. The whole-list link shows only for Mana Pool.")
 + row("Phone 390", [ph("sh-mp", "P1 · Mana Pool", "As shipped, plus · Change store at the end of the line."),
   ph("sh-tcg", "P2 · TCGplayer", "The note, then the paste line with Copy the list and Open Mass Entry in the link’s row."),
   ph("sh-tcg-copied", "P2b · Just copied", "✓ Copied for 1.5s, announced; the next press is Open Mass Entry."),
   ph("sh-ck", "P3 · Card Kingdom", "single-copy prices on Card Kingdom. Copy the list · Open Deck Builder.")])
 + row("Desktop 1300", [dk("sh-mp-desk", "D1 · Mana Pool", ""), dk("sh-tcg-desk", "D2 · TCGplayer", ""), dk("sh-ck-desk", "D3 · Card Kingdom", "")])
 + row("All-decks cart · the checkout box at 390", [fig("k-manapool", 360, "K1 · Mana Pool", "Buy these at Mana Pool, and what it sends."),
   fig("k-tcgplayer", 360, "K2 · TCGplayer", "The note, the paste line, Copy the list and Open Mass Entry; no sends line."),
   fig("k-cardkingdom", 360, "K3 · Card Kingdom", "Open Deck Builder.")])))

CD_W, CD_H = 2240, 1560
boards["Card.dc.html"] = (CD_W, CD_H, "Card", page("Store choice R1: card details", CD_W, CD_H,
 head("3 and 4 · Card details", "The tag under the card is the store’s figure for the printing on screen. The link names the store. TCGplayer adds market price after the figure. On the phone the link sits at the foot of the full sheet, as shipped.")
 + row("Phone 390, the teaser", [ph("cd-mp", "C1 · Mana Pool", "As shipped."), ph("cd-tcg", "C2 · TCGplayer", "$ figure · market price."), ph("cd-ck", "C3 · Card Kingdom", "Card Kingdom’s figure.")])
 + row("Desktop 1300", [dk("cd-mp-desk", "C4 · Mana Pool", "Buy any printing at Mana Pool."), dk("cd-tcg-desk", "C5 · TCGplayer", "from $1.27 · market price. Buy any printing at TCGplayer."), dk("cd-ck-desk", "C6 · Card Kingdom", "Buy any printing at Card Kingdom.")])))

EL_W, EL_H = 2240, 1860
boards["Elsewhere.dc.html"] = (EL_W, EL_H, "Elsewhere", page("Store choice R1: elsewhere", EL_W, EL_H,
 head("3 · The Wishlist, the Home feed and deck cost", "The Wishlist’s figures and price-drop alerts follow the store. Changing store moves every wishlist line’s baseline to the new store’s figure at that moment, so a switch never reads as a drop.")
 + row("Wishlist tab with TCGplayer", [ph("wl-tcg", "W1 · Phone", "TCGplayer figures. The Wise Mothman has no TCGplayer price, so no line (item 7)."), dk("wl-tcg-desk", "W2 · Desktop", "The chosen printing’s line keeps its bookmark; the card window’s link reads Buy FDC 4 at TCGplayer.", 900)])
 + row("Home · price drop", [fig("f-manapool", 560, "H1 · Mana Pool", "As shipped."), fig("f-tcgplayer", 560, "H2 · TCGplayer", "Buy at TCGplayer."), fig("f-cardkingdom", 560, "H3 · Card Kingdom", "Buy at Card Kingdom.")])
 + row("Decks · Stats · What each deck is worth", [fig("w-manapool", 560, "V1 · Mana Pool", "Mana Pool prices, 2h ago."), fig("w-tcgplayer", 560, "V2 · TCGplayer", "TCGplayer market prices, 2h ago."), fig("w-cardkingdom", 560, "V3 · Card Kingdom", "Card Kingdom prices, 2h ago.")])))

EM_W, EM_H = 2240, 1920
boards["Empty.dc.html"] = (EM_W, EM_H, "Empty", page("Store choice R1: empty states", EM_W, EM_H,
 head("6 and 7 · No whole-list link, and no price from the store", "Card Kingdom here. Three of the fourteen cards have no Card Kingdom price, then none do. The shipped silence rules hold: a bare buy, no figure, no zero.")
 + row("Shopping", [ph("sh-ck-gap", "E1 · Some unpriced, no whole-list link", "$244.18 · 11 of 14 priced. The three sort last with a bare buy."),
   ph("sh-ck-none", "E2 · None priced", "no prices from Card Kingdom for these; no figure. Copy the list stays: the paste page prices it."),
   dk("sh-ck-gap-desk", "E3 · Desktop", "", 760)])
 + row("Card details", [ph("cd-ck-none", "E4 · No price, phone", "The shipped dashed no stock tag."),
   dk("cd-ck-none-desk", "E5 · No price, desktop", "no stock; the link reads Look for it at Card Kingdom.", 760)])))

os.makedirs(out, exist_ok=True)
pre = "project/" if mode == "canvas" else ""
if pre: os.makedirs(os.path.join(out, "project"), exist_ok=True)
for name, (w, h, title, html) in boards.items():
    open(os.path.join(out, pre + name), "w").write(html)
order = ["Main.dc.html", "Onboarding.dc.html", "Setting.dc.html", "Shopping.dc.html", "Card.dc.html", "Elsewhere.dc.html", "Empty.dc.html"]
x = 0; B = {}
for n in order:
    w, h, t, _ = boards[n]; B[n] = {"x": x, "y": 0, "w": w, "h": h, "title": t}; x += w + 120
json.dump({"v": 3, "createdOnFiles": {"v": 1, "at": "2026-11-22T22:30:00Z"}, "title": "Store choice R1", "launch": {"view": "canvas"},
  "pages": [], "boards": B, "order": order, "notes": {}, "designSystems": []}, open(os.path.join(out, pre + "canvas.json"), "w"), indent=1)
print("ok", mode)
