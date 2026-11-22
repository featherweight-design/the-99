# Life tracker addendum: the player sheet on a tablet, and the coin toss (account 1, 2026-11-22).
# Writes the boards twice: for the canvas (/_blob urls from blobs.json) and for the repo (art/).
import json, sys, os
FACES_H = 4500
SPINE_H = 1680
mode, out = sys.argv[1], sys.argv[2]
BLOB = json.load(open(os.path.join(os.path.dirname(__file__), "blobs.json"))) if mode == "canvas" else {}
def src(k): return BLOB[k] if mode == "canvas" else f"art/ts-{k}.webp"
SUPPORT = "./support.js" if mode == "canvas" else "../support.js"
FONT = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&amp;family=IBM+Plex+Mono:wght@400;500&amp;family=Chakra+Petch:wght@600;700&amp;display=swap" rel="stylesheet">'
def page(title, w, h, body):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="{SUPPORT}"></script>
</head>
<body>
<x-dc>
<helmet>
{FONT}
<style>
body{{margin:0}}
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
A = "#E8A25C"
def head(t, p): return f'<div style="display:flex;flex-direction:column;gap:10px"><h2 style="margin:0;font:700 30px \'Chakra Petch\',sans-serif;color:#E6E8F0">{t}</h2><p style="margin:0;font-size:15px;line-height:1.6;color:#B1B6C7;max-width:1240px">{p}</p></div>'
def label(t): return f'<span style="font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.12em;text-transform:uppercase;color:{A}">{t}</span>'
def fig(k, w, h, cap, note, radius=14):
    return f'''<figure style="margin:0;display:flex;flex-direction:column;gap:12px;width:{w}px;flex:none">
<img src="{src(k)}" alt="{cap}" style="width:{w}px;height:{h}px;display:block;border-radius:{radius}px;border:1px solid #262A35">
<figcaption style="display:flex;flex-direction:column;gap:6px">
<p style="margin:0;font:600 15px 'IBM Plex Sans',sans-serif;color:#E6E8F0">{cap}</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#959AAD">{note}</p>
</figcaption>
</figure>'''
def row(lbl, figs, gap=36): return f'<div style="display:flex;flex-direction:column;gap:14px">{label(lbl)}<div style="display:flex;gap:{gap}px;align-items:flex-start;flex-wrap:wrap">{"".join(figs)}</div></div>'
def land(k, cap, note, w=700): return fig(k, w, round(w * 820 / 1180), cap, note)
def port(k, cap, note, w=420): return fig(k, w, round(w * 1180 / 820), cap, note)
def desk(k, cap, note, w=700): return fig(k, w, round(w * 900 / 1440), cap, note)
def phone(k, cap, note, w=300): return fig(k, w, round(w * 844 / 390), cap, note, 26)
def call(n, t, body): return f'<div style="display:flex;flex-direction:column;gap:8px;padding:20px 24px;border:1px solid #262A35;border-radius:14px;background:#11131A"><p style="margin:0;font:600 17px \'IBM Plex Sans\',sans-serif;color:#E6E8F0"><span style="font-family:\'IBM Plex Mono\',monospace;color:{A}">{n}</span> · {t}</p><div style="font-size:14px;line-height:1.6;color:#B1B6C7">{body}</div></div>'
def ul(items): return '<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">' + "".join(f"<li>{i}</li>" for i in items) + '</ul>'
def frame(k, t, note, w=150):
    return f'<figure style="margin:0;display:flex;flex-direction:column;gap:6px;width:{w}px;flex:none"><img src="{src(k)}" alt="{t}" style="width:{w}px;height:{w}px;display:block;border-radius:10px;border:1px solid #262A35"><figcaption style="font:500 12px \'IBM Plex Mono\',monospace;color:#E6E8F0">{t}</figcaption><p style="margin:0;font-size:12px;line-height:1.45;color:#959AAD">{note}</p></figure>'
def wide(k, t, note, w=236):
    return f'<figure style="margin:0;display:flex;flex-direction:column;gap:6px;width:{w}px;flex:none"><img src="{src(k)}" alt="{t}" style="width:{w}px;height:{round(w*820/1180)}px;display:block;border-radius:10px;border:1px solid #262A35"><figcaption style="font:500 12px \'IBM Plex Mono\',monospace;color:#E6E8F0">{t}</figcaption><p style="margin:0;font-size:12px;line-height:1.45;color:#959AAD">{note}</p></figure>'
def table(rows, head_):
    th = "".join(f'<th style="text-align:left;padding:8px 12px;font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.08em;text-transform:uppercase;color:#959AAD;border-bottom:1px solid #262A35">{h}</th>' for h in head_)
    tr = "".join("<tr>" + "".join(f'<td style="padding:8px 12px;font-size:13.5px;line-height:1.5;color:#B1B6C7;border-bottom:1px solid #1B1E27;vertical-align:top">{c}</td>' for c in r) + "</tr>" for r in rows)
    return f'<table style="border-collapse:collapse;width:100%">{"<tr>" + th + "</tr>"}{tr}</table>'
M = "font-family:'IBM Plex Mono',monospace;color:#E6E8F0"
def m(t): return f'<span style="{M}">{t}</span>'

boards = {}
boards["Main.dc.html"] = (1600, 1490, "Main · the sheet on a tablet", page("Tablet sheet: main", 1600, 1490,
 head("The player sheet on a tablet · addendum",
  "The sheet a life tile opens (Commander damage, Counters, Tax, Mana, Table), drawn for iPad landscape 1180×820 and portrait 820×1180, plus a coin toss with the dice's energy. Every frame is the shipped tracker rendered in a browser, with this addendum's changes patched in. Four seats: you play Sai; Colin Ghalta, Peter Giada, Max Gisa. Colin's turn, round 2.")
 + row("Before and after · iPad landscape, your sheet on Commander damage", [
   land("B1-now-land", "Now", "The sheet covers the whole table. The art is a 56px strip; the content uses the top quarter; Table sits alone at the far right."),
   land("D1-land", "D1 · Drawn", "Half the table, from your edge, with the table dimmed behind it. Each opponent's art fills their card (255px tall). Table joins the tab row.")])
 + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">'
 + call("1", "Half the table, from the opener's edge", ul([
   "On a tablet the sheet is a panel that rises from the edge of the seat that opened it and takes <b>half the table</b> along that seat's axis: 410px of 820 in landscape. In portrait the seats sit on the long edges, so it is 410 of 820 there too, and the content is the same size either way.",
   "The height is fixed, not fitted to the tab, so switching tabs never moves the panel's edge. Every tab fits without scrolling (Counters, Tax, Mana, Table boards); only an opened History scrolls.",
   "The rest of the table stays in view under a 42% black veil: lives, the turn ring and the strip are still readable. A tap on the table closes the sheet, as the dice and Menu popovers do; the ✕ and Esc still close it.",
 ]))
 + call("2", "Commander damage: the art fills the card", ul([
   "On a tablet each opponent's card is their commander's art edge to edge, like their panel: the name at the top, the commander's name and the stepper over a dark foot. Steppers and counts are the shipped ones.",
   "One card per opponent, all in one row (3 at four seats, 5 at six). A partner pair splits the art, and each half carries its own name and stepper under its own art, the count stacked over − and + so it fits at five across (D3, D7).",
   "A seat with no deck gets the plain card surface (D3, Alex). The phone keeps its drawn F06 cards.",
 ]))
 + call("3", "Table joins the tab row", ul([
   f"The {m('ml-auto')} that pushed Table to the far right goes: the five tabs sit together in the drawn order. No copy changes.",
   "It applies on every device. The phone looks the same as before, because its five tabs already fill the row (Tabs board).",
 ]))
 + call("4", "The coin toss", ul([
   "A coin with an edge, tossed off the table: it rises toward you, turns end over end five times, falls back, rattles flat and a ring lands under it (Coin board). Same 1.15 s to the result as today, so nothing else in the roll changes.",
   "Reduced motion: no toss. The coin lies on its face and the result shows at once, as now.",
 ]))
 + '</div>'
 + '<div style="display:flex;flex-direction:column;gap:10px;padding:20px 24px;border:1px solid ' + A + ';border-radius:14px">' + label("Phone and desktop")
 + '<div style="font-size:14px;line-height:1.6;color:#B1B6C7">' + ul([
   "<b>Desktop changes with the tablet</b>, for consistency: the tracker already draws a desktop window as a tablet (short side 600px or more), so the half sheet and the art cards apply there too (D6). No separate desktop layout.",
   "<b>The phone keeps its full-cover sheet</b> and F06 cards. It gets the same coin toss (shared code, 72px coin, Coin board) and the tab-row fix, which draws no differently there.",
 ]) + '</div></div>'))

boards["Sheet.dc.html"] = (1600, 2470, "Sheet · tablet landscape", page("Tablet sheet: landscape tabs", 1600, 2470,
 head("Tablet landscape · every tab at half height", "Your sheet, opened from your panel at the bottom left. All five tabs at 1180×820. The panel's height is the same on every tab.")
 + row("Commander damage, and a sheet opened from the far side", [
   land("D1-land", "D1 · Your sheet, Commander damage", "You took 6 from Ghalta and 3 from Giada. A count above 0 is in the accent, as the Counters tab does it."),
   land("D2-top", "D2 · Colin's sheet", "Opened from Colin's panel across the table: it hangs from his edge, facing him. Your side of the table stays readable.")])
 + row("Counters and Tax", [
   land("C1-land", "C1 · Counters", "The shipped grid (two toggles, then three across) fits the half sheet with room to spare. Poison 2 set."),
   land("X1-tax", "X1 · Tax", "Unchanged: the 150×100 art and the next-cast figure.")])
 + row("Mana and Table", [
   land("X2-mana", "X2 · Mana", "Unchanged: two rows of three."),
   land("X3-table", "X3 · Table", "Table sits beside Mana in the row. Its three rows fit; History opens and scrolls inside the panel.")])
 + row("For reference", [land("X4-closed", "The table with no sheet open", "The F18 layout the sheet rises over.", 460)])))

boards["Damage.dc.html"] = (1600, 2720, "Damage · counts and desktop", page("Tablet sheet: commander damage", 1600, 2720,
 head("Commander damage across seat counts", "One row of cards at every count, the art filling each. Partners split their card; a seat with no deck gets the plain surface.")
 + row("Six seats and two", [
   land("D3-six", "D3 · Six seats, a partner and a seat with no deck", "Max plays Bruse Tarl and Ishai: split art, and each half stacks its count over − and + (the Mana tab's stacked stepper), so both fit at five across (about 104px a half). 4 from Ishai. Alex has no deck: the plain card and the shipped Commander fallback."),
   land("D4-two", "D4 · Two seats (Face to face)", "One opponent: the card spans the sheet.")])
 + row("A partner at four seats", [
   land("D7-four-partner", "D7 · Four seats, Max on partners", "Three across: the partner halves stack the same way, so a partner card reads the same at every count.")])
 + row("A seat at the short end", [
   land("E1-end", "E1 · Five seats, One at the end: Max's sheet", "Max sits at the right end (rot −90). His sheet rises from that edge, 590 deep (half of 1180) and 820 long, so the four cards stack along it. The narrowest damage row of any layout.")])
 + row("Desktop (drawn as a tablet, as shipped)", [
   desk("D6-desk", "D6 · Desktop 1440×900", "The same half sheet at 450px. A desktop window under 760px tall keeps a 380px floor.", 820)])))

boards["Portrait.dc.html"] = (1600, 1000, "Portrait · iPad upright", page("Tablet sheet: portrait", 1600, 1000,
 head("Tablet portrait · 820×1180", "Held upright, the table turns a quarter (V boards) and the seats sit on the long edges, so your sheet rises from the left edge and takes half the width. Read with the tablet turned to your side, it is the landscape sheet.")
 + row("Before and after", [
   port("B2-now-port", "Now", "The full-cover sheet, turned: the art strip and three cards in the left quarter."),
   port("D5-port", "D5 · Commander damage", "The left half, from your edge. The right half (Colin and Peter) stays in view."),
   port("C2-port", "C2 · Counters", "The same grid as landscape.")])))

boards["Tabs.dc.html"] = (1600, 1620, "Tabs · Table joins the row", page("Tablet sheet: tab row", 1600, 1620,
 head("The tab row", "Table was pushed to the far right edge with ml-auto, away from the other four. It now follows Mana, in the drawn order. The tab labels and their counts are unchanged.")
 + row("Tablet landscape · Table tab open", [
   land("B3-now-table", "Now", "Table alone at the right edge, 1,100px from Mana."),
   land("X3-table", "X3 · Drawn", "Table follows Mana.")])
 + row("Phone · unchanged in the drawing", [
   phone("P0-phone-now", "Phone now", "The five tabs fill the phone's row, so Table already sat next to Mana."),
   phone("P1-phone-table", "Phone drawn", "The same. The change matters only where the row has room to spare.")])))

frames = [("0000", "0 ms", "Thrown. Heads up, tilted 50° off its landing angle."), ("0120", "120", "Rising, turning fast."), ("0240", "240", "Climbing toward you."), ("0360", "360", "Near the top, edge showing."),
          ("0450", "450", "Apex: 1.8× and up 55%."), ("0560", "560", "Edge on: the rim shows its thickness."), ("0680", "680", "Falling, spin slowing."), ("0800", "800", "Almost down, near flat."),
          ("0900", "900", "Lands. The ring starts."), ("0980", "980", "Rattle: tips 9° the other way."), ("1060", "1060", "Settling."), ("1150", "1150", "Flat. The result card arrives.")]
shipped = [("0000", "0 ms"), ("0230", "230"), ("0460", "460"), ("0690", "690"), ("0920", "920"), ("1150", "1150")]
dice = [("0150", "150 ms"), ("0400", "400"), ("0650", "650"), ("0900", "900"), ("1150", "1150"), ("1650", "1650"), ("2600", "landed")]
boards["Coin.dc.html"] = (1700, 2890, "Coin · the toss beside the dice", page("Coin toss motion", 1700, 2890,
 head("The coin toss", "Drawn to match the dice: the dice library throws a d20 that tumbles across the table, bounces and settles, then the result card arrives with a ring that draws itself. Today's coin only spins flat in place. The new coin has a rim, rises and falls in an arc, turns end over end, rattles as it lands, and gets the same landing ring. Tablet 120px, phone 72px, at the shipped spot (38% down, centred). Tails is shown.")
 + row("Playing (animated, loops)", [
   frame("A-coin", "Drawn · tablet", "0 to 1.15 s, then holds the result.", 340),
   frame("A-coin-shipped", "Shipped", "A flat Y spin in place.", 340),
   frame("A-coin-phone", "Drawn · phone", "The same toss at 72px.", 340)])
 + row("Drawn · frames on the tablet (crop 340×340 around the coin)", [frame(f"K-{k}", t, n) for k, t, n in frames], gap=16)
 + row("Shipped · frames", [frame(f"K0-{k}", t, "") for k, t in shipped], gap=16)
 + row("The dice it matches · d20 (each frame a separate throw sampled at that time; the library's physics varies per throw)", [wide(f"R-{k}", t, "") for k, t in dice], gap=12)
 + '<div style="display:flex;flex-direction:column;gap:14px">' + label("Timing and easing") + table([
   ["Spin", "0 to 900 ms", "rotateX 0 → 1800° + 180° for tails; rotateZ from the landing tilt − 50° to the tilt", m("cubic-bezier(.12,.6,.3,1)"), "Fast off the hand, losing speed, like the dice's tumble"],
   ["Arc", "0 to 900 ms", "scale 1 → 1.8 → 1 and up 55% of its width at 46% (414 ms)", m("cubic-bezier(.2,.7,.35,1)") + " up, " + m("cubic-bezier(.6,0,.9,.45)") + " down", "Rise and fall"],
   ["Shadow", "0 to 900 ms", "on the table: scale 1 → .55 → 1, opacity .55 → .18 → .55, blur 3 → 10 → 3px", "the arc's", "Stays put while the coin is up"],
   ["Rattle", "900 to 1150 ms", "rotateX +18°, −9°, +4°, −1.5°, 0", m("ease-out"), "The coin settling flat, the dice's bounce"],
   ["Ring", "900 to 1400 ms", "accent ring 2px, 166% of the coin, scale .55 → 1.2, opacity .9 → 0", m("ease-out"), "The shipped dice-land ring, now at the landing"],
   ["Result", "1150 ms", "the shipped result card and its ring trace (COIN_MS unchanged)", "shipped", "Lands with the settle, as the dice's card does"],
   ["Rim", "static", "7 discs in the accent mixed 55% with black, 8px deep on tablet, 5px on phone; faces 20px / 14px Cinzel", "", "Gives the coin an edge in every frame"],
 ], ["Part", "When", "What", "Easing", "Why"]) + '</div>'
 + row("Reduced motion · and the landed state", [
   land("kR", "Reduced motion", "No toss, no rattle, no ring animation: the coin lies on its face and the result card shows at once. Same as shipped.", 560),
   land("kF", "Landed (motion on)", "1.7 s in: identical to the reduced frame, so both end the same way.", 560)])))

OPTS_R2 = [
 ("daynight", "A · Day and night", "Heads is the sun, tails the moon and two stars: Magic's own day and night (Innistrad), drawn with the tracker's shipped SunIcon and MoonIcon, which already mean day and night on the table strip. Reads at a glance at 72px; the most Magic-literal of the three without borrowing a card.",
  ["Matches the day/night control the tracker already ships, so the coin feels part of the same table.", "Two clear, opposite silhouettes: you can tell which side landed before reading the word."]),
 ("crowned", "B · The crowned 99", "Heads is the brand's crowned 99 (the three CrownDiamonds over a Cinzel 900 99), tails the XCIX seal. A minted The 99 coin: the most ownable and the least Magic, since it is our mark rather than the game's.",
  ["Feels like a souvenir token of the app.", "Heads and tails are both type, so at 72px they read as two badges rather than two pictures."]),
 ("mana", "C · Mana", "Heads is the five colours of mana set in the metal as enamel, using the official symbols the app already ships (public/mana); tails is a single colorless {C}. The most colourful, and the closest in feel to the dice.",
  ["The only option with colour on the coin; the brand keeps WUBRG to identity and tags, so this stretches that rule on a 120px object.", "Five pips are small at 72px on the phone (each about 11px)."]),
]
def optrow(k, t, p, notes):
    return ('<div style="display:flex;flex-direction:column;gap:18px;padding:28px 0 8px;border-top:1px solid #262A35">'
      + f'<div style="display:flex;flex-direction:column;gap:8px"><h3 style="margin:0;font:700 24px \'Chakra Petch\',sans-serif;color:#E6E8F0">{t}</h3><p style="margin:0;font-size:15px;line-height:1.6;color:#B1B6C7;max-width:1240px">{p}</p>{ul(notes).replace("color:", "color:")}</div>'
      + row("Faces · heads, tails, and tilted to show the rim", [fig(f"F-studio-{k}", 1180, 340, "Heads · Tails · tilted heads · tilted tails", "Drawn on the shipped coin: the same metal, the 8px rim of 7 discs, HEADS / TAILS in Cinzel 700 along the bottom arc, the emblem cut into the face.")])
      + row("On the tablet table, 120px", [
          fig(f"F-place-{k}-mid", 300, 300, "450 ms · at the top of the toss", "Up 55% at 1.8×, mid-turn."),
          fig(f"F-place-{k}-heads", 346, 300, "Landed heads", "1150 ms, the ring still spreading; the result card lands below."),
          fig(f"F-place-{k}-tails", 346, 300, "Landed tails", "Same toss with a half-turn more.")])
      + '</div>')

OPTS = [
 ("daynight", "A · Day and night", "Heads is Magic's day symbol, tails its night: the markers printed on the day/night card and on daybound and nightbound faces (Innistrad: Midnight Hunt). Replaces R2's generic sun and moon.",
  ["The most Magic-literal pair, and it says heads or tails by shape alone.", "Day's open centre keeps it light; night is a solid disc, so the two sides read differently even mid-flip."]),
 ("spark", "B · Spark and planeswalker", "Heads is the spark, tails the planeswalker symbol: the front and back markers of the Magic Origins planeswalkers who transform when their spark ignites. A second Magic-specific pair, offered beside day and night.",
  ["Every player knows the planeswalker symbol.", "The spark is the less familiar of the two marks."]),
 ("pips", "C · Mana, struck pips", "Your mana option without colour: each pip is a disc cut into the coin with its symbol left standing in the metal, set larger (about 23% of the coin across, against 15%) so the five fill the ring. Tails is one large {C}.",
  ["Reads as mana pips at a glance, in the theme's own metal.", "About 17px a pip on the phone's 72px coin."]),
 ("bare", "D · Mana, bare symbols", "The same five symbols engraved straight into the face with no discs, larger still (21% each). Tails is the {C} diamond alone.",
  ["The lightest of the four; the coin's metal shows most.", "The symbols' own shapes vary in weight (the sun is thinner than the skull), so the ring looks less even than C."]),
]
def optrow(k, t, p, notes):
    return ('<div style="display:flex;flex-direction:column;gap:18px;padding:28px 0 8px;border-top:1px solid #262A35">'
      + f'<div style="display:flex;flex-direction:column;gap:8px"><h3 style="margin:0;font:700 24px \'Chakra Petch\',sans-serif;color:#E6E8F0">{t}</h3><p style="margin:0;font-size:15px;line-height:1.6;color:#B1B6C7;max-width:1240px">{p}</p>{ul(notes)}</div>'
      + row("Faces · heads, tails, and tilted to show the rim", [fig(f"G-studio-{k}", 1180, 340, "Heads · Tails · tilted heads · tilted tails", "On the shipped coin: the same metal and 8px rim; the emblem centred in the inner ring; HEADS / TAILS on its own band between the ring and the edge.")])
      + row("On the tablet table, 120px", [
          fig(f"G-place-{k}-mid", 300, 300, "450 ms · at the top of the toss", "Up 55% at 1.8×, mid-turn."),
          fig(f"G-place-{k}-heads", 346, 300, "Landed heads", "1150 ms, the ring still spreading; the result card lands below."),
          fig(f"G-place-{k}-tails", 346, 300, "Landed tails", "Same toss with a half-turn more.")])
      + '</div>')
boards["Faces.dc.html"] = (1700, FACES_H, "Coin faces · C picked (R3)", page("Coin faces", 1700, FACES_H,
 head("Coin faces · four options (R3) · Hugh picked C", "Hugh picked C, struck pips (2026-11-22), so day and night are not confused with the spine. Hugh on R2: centre the emblems, give HEADS / TAILS room from the ring above it, make day and night Magic's own, and take the colour off the mana pips and let them fill the face. Every emblem now sits in the centre of the inner ring (r 35 of 50); the word has its own band between that ring and the edge (baseline r 43, caps clear of the ring by about 3%). Toss, timing and size are unchanged from the Coin board. The symbols are Magic's own as drawn in the mana-font set (the same family as the app's public/mana); a build would add the two or seven glyphs it uses to the app's icons.")
 + "".join(optrow(*o) for o in OPTS)))

boards["Spine.dc.html"] = (1700, SPINE_H, "Spine · Magic's day and night markers (R3)", page("Spine day and night", 1700, SPINE_H,
 head("The spine's day/night button, with Magic's markers", "Hugh picked coin C (struck pips), so day and night stay off the coin. This board asks whether the spine's day/night button should take Magic's own day and night markers (the ones on the Midnight Hunt day/night card and on daybound and nightbound faces) in place of the shipped SunIcon and MoonIcon. Same button, same states, same colours: faint with the cycle off, accent and ringed by day or night. Only the glyph changes; it is drawn at 19px inside the 22px box so its filled weight sits level with the outlined icons beside it. Copy, motion (the shipped 320 ms swap) and reduced motion are unchanged.")
 + row("Tablet · cycle off, day, night (top to bottom)", [
   fig("H-tablet-now", 700, 351, "Shipped · SunIcon and MoonIcon", "Outlined like the rest of the strip. A generic sun and moon can read as a light/dark theme switch."),
   fig("H-tablet-magic", 700, 351, "Proposed · Magic's day and night", "The marker players see on their daybound and nightbound cards. Filled, so a touch heavier than its neighbours; night is the heaviest.")])
 + row("Phone · cycle off, day, night (left to right)", [
   fig("H-phone-now", 300, 600, "Shipped", "", 18),
   fig("H-phone-magic", 300, 600, "Proposed", "Holds up at phone size; the day ring's points stay distinct at 19px.", 18)], gap=48)
 + call("Build", "If approved", ul(["Add the two glyphs to <code>icons.tsx</code> as <code>DayMarkIcon</code> / <code>NightMarkIcon</code> (filled, viewBox 32, from mana-font's <code>dfc-day</code> / <code>dfc-night</code>); <code>DayIcon</code> in <code>spine.tsx</code> switches to them.", "Keep <code>SunIcon</code>/<code>MoonIcon</code> only if something else uses them (today only the spine does).", "Tests that look up the icon by test id are unaffected; no copy changes."]))))

os.makedirs(out, exist_ok=True)
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": "2026-11-22T19:00:00Z"}, "title": "Life tracker · tablet sheet and coin", "launch": {"view": "canvas"}, "pages": [], "boards": {}, "order": [], "notes": {}, "designSystems": []}
x = 0
for name, (w, h, title, html) in boards.items():
    open(os.path.join(out, name), "w").write(html)
    canvas["boards"][name] = {"x": x, "y": 0, "w": w, "h": h, "title": title}; canvas["order"].append(name); x += w + 120
json.dump(canvas, open(os.path.join(out, "canvas.json"), "w"), indent=1)
print("ok", list(boards))
