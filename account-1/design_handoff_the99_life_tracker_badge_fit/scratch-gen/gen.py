# Life tracker addendum: every badge fits (account 1, 2026-11-24).
# Writes the boards twice: for the canvas (/_blob urls from blobs.json) and for the repo (art/).
import json, sys, os
mode, out = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
BLOB = json.load(open(os.path.join(HERE, "blobs.json"))) if mode == "canvas" else {}
def src(k): return BLOB[k] if mode == "canvas" else f"art/fit-{k}.webp"
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
A = "#E8A25C"
M = "font-family:'IBM Plex Mono',monospace;color:#E6E8F0"
def m(t): return f'<span style="{M}">{t}</span>'
def head(t, p): return f'<div style="display:flex;flex-direction:column;gap:10px"><h2 style="margin:0;font:700 30px \'Chakra Petch\',sans-serif;color:#E6E8F0">{t}</h2><p style="margin:0;font-size:15px;line-height:1.6;color:#B1B6C7;max-width:1240px">{p}</p></div>'
def label(t): return f'<span style="font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.12em;text-transform:uppercase;color:{A}">{t}</span>'
def tag(t, good): return f'<span style="font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.08em;text-transform:uppercase;color:{"#7FC48A" if good else "#E07A65"}">{t}</span>'
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
def desk(k, cap, note, w=700): return fig(k, w, round(w * 900 / 1440), cap, note)
def phone(k, cap, note, w=320): return fig(k, w, round(w * 844 / 390), cap, note, 26)
ZOOM = {"PH4": (760, 136), "PH4a": (760, 136), "PH6": (760, 136), "PS6": (548, 136), "TA4": (1284, 136), "TE6": (634, 136), "TL4": (1126, 152), "TL6": (736, 152), "DK6": (810, 152)}
def pair(k, title, before, after):
    w, h = ZOOM[k]; w2, h2 = w // 2, h // 2
    img = lambda t: f'<img src="{src(t + "-" + k + "-zoom")}" alt="{title}" style="width:{w2}px;height:{h2}px;display:block;border-radius:10px;border:1px solid #262A35">'
    return f'''<div style="display:flex;flex-direction:column;gap:10px;padding:18px 20px;border:1px solid #262A35;border-radius:14px;background:#11131A;width:{max(w2, 300)}px;flex:none">
<p style="margin:0;font:600 15px 'IBM Plex Sans',sans-serif;color:#E6E8F0">{title}</p>
<div style="display:flex;flex-direction:column;gap:6px">{tag("Shipped · " + before, False)}{img("base")}</div>
<div style="display:flex;flex-direction:column;gap:6px">{tag("Proposed · " + after, True)}{img("prop")}</div>
</div>'''
def call(n, t, body): return f'<div style="display:flex;flex-direction:column;gap:8px;padding:20px 24px;border:1px solid #262A35;border-radius:14px;background:#11131A"><p style="margin:0;font:600 17px \'IBM Plex Sans\',sans-serif;color:#E6E8F0"><span style="font-family:\'IBM Plex Mono\',monospace;color:{A}">{n}</span> · {t}</p><div style="font-size:14px;line-height:1.6;color:#B1B6C7">{body}</div></div>'
def ul(items): return '<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">' + "".join(f"<li>{i}</li>" for i in items) + '</ul>'
def table(rows, head_):
    th = "".join(f'<th style="text-align:left;padding:8px 12px;font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.08em;text-transform:uppercase;color:#959AAD;border-bottom:1px solid #262A35">{h}</th>' for h in head_)
    tr = "".join("<tr>" + "".join(f'<td style="padding:8px 12px;font-size:13.5px;line-height:1.5;color:#B1B6C7;border-bottom:1px solid #1B1E27;vertical-align:top">{c}</td>' for c in r) + "</tr>" for r in rows)
    return f'<table style="border-collapse:collapse;width:100%">{"<tr>" + th + "</tr>"}{tr}</table>'
def q(n, t, a, b, rec):
    opt = lambda l, body, r: f'<div style="flex:1;display:flex;flex-direction:column;gap:6px;padding:14px 16px;border-radius:10px;border:1px solid {A if r else "#262A35"};background:{"#1A1610" if r else "#0E1016"}"><p style="margin:0;font:600 14px \'IBM Plex Sans\',sans-serif;color:#E6E8F0">{l}{" · recommended" if r else ""}</p><p style="margin:0;font-size:13px;line-height:1.55;color:#B1B6C7">{body}</p></div>'
    return f'<div style="display:flex;flex-direction:column;gap:10px;padding:20px 24px;border:1px solid #262A35;border-radius:14px;background:#11131A"><p style="margin:0;font:600 17px \'IBM Plex Sans\',sans-serif;color:#E6E8F0"><span style="font-family:\'IBM Plex Mono\',monospace;color:{A}">{n}</span> · {t}</p><div style="display:flex;gap:14px">{opt("A", a, rec == "A")}{opt("B", b, rec == "B")}</div></div>'

FIX = "Fixture: Chris (you, Sai) has taken commander damage from every other seat (8, 6, 5, 3, 2), carries poison 3, energy 4, experience 2, rad 1 and tax +4, and is the monarch: 9 badges at a 4-seat table, 11 at 6."
boards = {}

boards["Main"] = (1600, 2820, page("Every badge fits", 1600, 2820, "\n".join([
  head("Life tracker · every badge fits", "With commander damage from several opponents plus a few counters, a panel's badge row ran out of room and cut the rest off: at a 6-seat table only 1 of 11 badges showed, and on a phone even the player's name was squeezed to a letter. The fix keeps the shipped badge row and makes every badge count: compact chips, the ones that can end the game first, and a +N chip for whatever still does not fit, which opens the sheet. Drawn over the shipped PlaySurface, phone, iPad and desktop. " + FIX),
  row("Before and after · the loaded player's badge row", [
    pair("PH4", "Phone · one on each side", "1 of 9, name cut to C", "4 chips + 5 more"),
    pair("PH6", "Phone · six, ends", "1 of 11", "4 chips + 7 more"),
    pair("PH4a", "Phone · your turn, End turn shown", "0 of 9", "2 chips + 7 more"),
    pair("PS6", "Phone · sideways seat (turned to read)", "0 of 11", "2 chips + 9 more"),
    pair("TL4", "iPad · two and two (foot)", "2 of 9", "all 9"),
    pair("TA4", "iPad · one on each side", "2 of 9", "all 9"),
    pair("TL6", "iPad · three and three (foot)", "1 of 11", "4 chips + 7 more"),
    pair("TE6", "iPad · six, ends", "1 of 11", "3 chips + 8 more"),
    pair("DK6", "Desktop · three and three", "1 of 11", "5 chips + 6 more"),
  ], 24),
  label("The calls"),
  call("1", "Compact chips", ul([
    "Commander damage: the attacker's commander art (18 px, 20 px in the iPad foot) and the figure, " + m("8") + ". Counters: the counter's icon and the figure, " + m("3") + ". Tax: the arrow and " + m("+4") + ". Monarch and initiative: their icon alone in the accent ring.",
    "The words move off the face, not out of the app: each chip's aria-label stays " + m("Ghalta, Primal Hunger 8. Open it in the sheet") + ", desktop shows it as a hover title, and What's what already names the row (\"What's on you\").",
    "Same pill as shipped (82% ground, strong border, mono figure); only the label goes. A chip is about 44 px wide instead of up to 210.",
  ])),
  call("2", "What ends the game leads", ul([
    "Damage and poison come first, ordered by how close each is to lethal: damage over 21 from that commander, poison over 10. Poison 3 (30%) sits ahead of damage 6 (29%).",
    "Then tax, then the other counters in their shipped order, then monarch and initiative.",
  ])),
  call("3", "Whole chips and a +N", ul([
    "A chip is never cut. The row measures every chip once, unseen, and shows the longest run that fits with a " + m("+N") + " chip after it; with room for all, there is no +N.",
    "+N is the same pill on " + m("--elevated") + " with a semibold figure, so it reads as a count, not a badge. Its aria-label: " + m("7 more. Open them in the sheet") + ".",
    "Tapping +N opens the shipped sheet on the tab of the first chip left out (Commander damage, Counters or Tax), focused on that counter where it is one.",
    "It re-fits on rotate, resize, a new badge or End turn appearing, and when the fonts land.",
  ])),
  call("4", "Who gives way", ul([
    "The player's name never gives way (it keeps its shipped 110 px and 150 px caps). The deck name gives way first, down to nothing, then chips go behind +N.",
    "End turn and the sheet button keep their shipped sizes.",
  ])),
  call("5", "Hit areas", ul([
    "Chips and +N keep the shipped hit area: 10 px past the pill top and bottom, so 44 px tall in a name row and 48 px in the iPad foot; at 44 to 51 px wide each is a full-size target.",
  ])),
  label("Open questions"),
  q("Q1", "Where does +N go?", "Opens the shipped sheet on the first left-out chip's tab. No new surface; the sheet already lists every damage and counter with its stepper.", "Opens a small popover over the panel listing every chip with its words, each opening its own tab.", "A"),
  q("Q2", "On your turn, End turn takes room from the chips", "End turn keeps its label. A phone's bottom seat shows 2 chips + 7 more for that one turn (Phone board).", "While chips overflow, End turn drops to its 44 px arrow circle, as the short sideways rows already do; 2 more chips fit.", "A"),
])))

boards["Phone"] = (1600, 3540, page("Phone", 1600, 3540, "\n".join([
  head("Phone · full boards", "Every phone layout that seats the loaded player on a long row or a sideways seat. Left of each pair is shipped, right is proposed. " + FIX),
  row("One on each side", [phone("base-PH4", "Shipped", "The badges crowd the name to \"C\" and the deck to \"S...\"; one badge shows, cut."), phone("prop-PH4", "Proposed", "Name and four chips whole, the nearest to lethal first; +5 opens the sheet.")]),
  row("Your turn · End turn in the row", [phone("base-PH4a", "Shipped", "End turn takes the row: no badge shows whole."), phone("prop-PH4a", "Proposed (Q2 A)", "Damage 8 and poison 3 stay, +7 for the rest.")]),
  row("Six, ends · and the sheet +N opens", [phone("base-PH6", "Shipped", "1 of 11."), phone("prop-PH6", "Proposed", "Four chips and +7."), phone("prop-PHm", "Tap +7", "The shipped sheet, on Commander damage: the first chip left out is damage 3 from Dina.")]),
  row("Three and three · a sideways seat", [phone("base-PS6", "Shipped", "The sideways row reads top to bottom; nothing fits whole."), phone("prop-PS6", "Proposed", "Two chips and +9 down the long edge (Chris, bottom left).")]),
])))

boards["Tablet"] = (1600, 3820, page("iPad and desktop", 1600, 3820, "\n".join([
  head("iPad and desktop · full boards", "The iPad grids put the badges in the 52 px foot beside End turn; the iPad ends put them in the name row. Desktop is classed as a tablet and draws the same. " + FIX),
  row("Two and two · foot", [land("base-TL4", "Shipped", "Two of nine show; the third is cut at the sheet button."), land("prop-TL4", "Proposed", "All nine fit as chips, no +N.")]),
  row("One on each side · name row", [land("base-TA4", "Shipped", "Two of nine."), land("prop-TA4", "Proposed", "All nine, beside name and deck.")]),
  row("Three and three · foot", [land("base-TL6", "Shipped", "One of eleven: Ghalta 8, then half of Zimone."), land("prop-TL6", "Proposed", "Four chips and +7.")]),
  row("Six, ends · name row", [land("base-TE6", "Shipped", "One of eleven."), land("prop-TE6", "Proposed", "Three chips and +8; the deck name gives way first.")]),
  row("Desktop 1440 × 900 · and the sheet +N opens", [desk("base-DK6", "Shipped", "One of eleven."), desk("prop-DK6", "Proposed", "Five chips and +6. Hovering a chip shows its words.")]),
  row("Tap +7 on the iPad", [land("prop-TLm", "The sheet from the seat's edge", "The shipped half-height sheet, on Commander damage.")]),
])))

os.makedirs(out, exist_ok=True)
for name, (w, h, html) in boards.items():
    open(os.path.join(out, name + ".dc.html"), "w").write(html)
print(json.dumps({k: [v[0], v[1]] for k, v in boards.items()}))
