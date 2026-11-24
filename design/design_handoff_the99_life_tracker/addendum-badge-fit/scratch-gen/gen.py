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
ZOOM = {"PH4": (772, 396), "PH4a": (772, 396), "PH6": (772, 396), "PS6": (560, 326), "TA4": (1296, 732), "TE6": (646, 732), "TL4": (1166, 732), "TL6": (776, 732), "DK6": (850, 800)}
def pair(k, title, before, after, dw=None):
    w, h = ZOOM[k]; dw = dw or w // 2; dh = round(h * dw / w)
    img = lambda t, cap, good: f'<div style="display:flex;flex-direction:column;gap:6px">{tag(cap, good)}<img src="{src(t + "-" + k + "-zoom")}" alt="{title}" style="width:{dw}px;height:{dh}px;display:block;border-radius:12px;border:1px solid #262A35"></div>'
    return f'''<div style="display:flex;flex-direction:column;gap:12px;padding:18px 20px;border:1px solid #262A35;border-radius:14px;background:#11131A;flex:none">
<p style="margin:0;font:600 15px 'IBM Plex Sans',sans-serif;color:#E6E8F0">{title}</p>
<div style="display:flex;gap:16px;align-items:flex-start">{img("base", "Shipped · " + before, False)}{img("prop", "R2 · " + after, True)}</div>
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

boards["Main"] = (1600, 4540, page("Every badge fits", 1600, 4540, "\n".join([
  head("Life tracker · every badge fits · R2", "Round 2 on your notes. Compact chips stay. Every panel now has one anatomy: the name and deck on the seat's outer edge, one controls row toward the strip. +N is a quick look, not the sheet. Whole seat panels below, shipped then R2, over the real PlaySurface. " + FIX),
  label("Why the name moved, and the one rule now"),
  call("Today", "Two anatomies, set by the board", ul([
    "The iPad's grid boards (two and two, three and three, three and two, face to face, along one side) draw a 52 px foot toward the strip with End turn, badges and the sheet button, and put the name on the outer edge (F12, F18, F19).",
    "Every other board (all phone boards and the iPad's ends boards) draws one 44 px name row toward the strip, holding name, deck, badges, End turn and the sheet button together (F04). Same table, two layouts: which one you get depends on the seat count you picked.",
    "Nothing in the play needs the split. The grid boards came later with the 52 px foot, and the phone row was never moved to match.",
  ])),
  call("R2", "One anatomy on every board", ul([
    "Name and deck on the seat's outer edge, a quiet strip (16 px name, 12 px mono deck; 18 and 12.5 in the iPad foot sizes).",
    "Toward the strip, one controls row: End turn, the badges, the sheet button at the end. 44 px on phone and the iPad ends, the shipped 52 px foot on the iPad grids.",
    "The top row stops carrying the name and deck, so it holds more: phone one-on-each-side goes from 4 chips + 5 more to 6 chips + 3 more, phone six ends from 4 + 7 to 6 + 5.",
    "The out face follows: name on the outer edge, the sheet button in the controls row.",
  ])),
  row("Before and after · the loaded player's whole panel", [
    pair("PH4", "Phone · one on each side", "1 of 9, name cut to C", "6 chips + 3"),
    pair("PH6", "Phone · six, ends", "1 of 11", "6 chips + 5"),
    pair("PH4a", "Phone · your turn", "0 of 9", "3 chips + 6"),
    pair("PS6", "Phone · sideways seat (turned to read)", "0 of 11", "3 chips + 8", 280),
    pair("TA4", "iPad · one on each side", "2 of 9", "all 9", 440),
    pair("TL6", "iPad · three and three", "1 of 11", "4 chips + 7", 330),
    pair("TE6", "iPad · six, ends", "1 of 11", "4 chips + 7", 300),
    pair("DK6", "Desktop · three and three", "1 of 11", "5 chips + 6", 330),
  ], 24),
  label("The quick look"),
  row("+N opens a card of every badge; ✕ or a tap anywhere else closes it", [
    phone("prop-P4m", "Phone · one on each side", "The card opens from the seat's inner edge toward the middle of the table, the panel's width, turned to face the seat. Every badge with its words; damage and poison show how far to lethal (8/21, 3/10)."),
    phone("prop-PSm", "Phone · sideways seat", "Same card, turned with Chris's seat: it opens across the strip toward the table's middle."),
    land("prop-TLm", "iPad · three and three", "Opens over the strip. Two columns; it never scrolls at 11 badges.", 560),
  ]),
  call("Peek", "A quick reference, not a second sheet", ul([
    "Read only: no steppers and no rows to tap. The sheet button stays the one way to change a count, so the two controls never do the same job.",
    "+N becomes a ✕ in place while the card is open (aria-expanded; aria-label " + m("Close") + "). A tap anywhere off the card, or Escape, closes it too; it closes by itself if the seat goes out or the badges clear.",
    "It lists every badge, not only the ones left out, in the same order as the row, so one look answers \"how much is on me\".",
    "Words: the commander's short name (up to its comma), the counter's name, Tax, Monarch, Initiative. Damage and poison read " + m("8/21") + ", " + m("3/10") + "; the rest show the figure alone.",
    "Surface " + m("--surface") + " with the strong border and a drop shadow, 14 px radius; the seat is lifted over its neighbours while it is open. Fades in over 150 ms; under reduced motion it simply appears.",
  ])),
  label("Kept from R1"),
  call("1", "Compact chips and the order", ul([
    "Damage: the attacker's art and the figure. Counters: the icon and the figure. Tax: the arrow and +4. Monarch and initiative: the icon alone in the accent ring. Full words in each chip's aria-label and a desktop hover title.",
    "Damage and poison lead, nearest to lethal first; then tax, the other counters, the marks. Chips are never cut; the row keeps the longest run that fits beside +N.",
  ])),
  label("Open question"),
  q("Q2", "On your turn, End turn takes room from the chips", "End turn keeps its label. The phone's bottom seat shows 3 chips + 6 for that turn.", "While chips overflow, End turn drops to its 44 px arrow circle, as the short sideways rows already do; 2 more chips fit.", "A"),
])))

boards["Phone"] = (1600, 3540, page("Phone", 1600, 3540, "\n".join([
  head("Phone · full boards · R2", "Shipped on the left of each pair, R2 on the right: one anatomy, compact chips, +N as a quick look. " + FIX),
  row("One on each side · and its quick look", [phone("base-PH4", "Shipped", "The badges crowd the name to \"C\"; one badge shows, cut."), phone("prop-PH4", "R2", "Name and deck on the outer edge; the row holds 6 chips and +3."), phone("prop-P4m", "Tap +3", "Every badge, with how far to lethal.")]),
  row("Your turn · End turn in the row", [phone("base-PH4a", "Shipped", "End turn takes the row: no badge shows whole."), phone("prop-PH4a", "R2 (Q2 A)", "End turn, 3 chips and +6.")]),
  row("Six, ends · and its quick look", [phone("base-PH6", "Shipped", "1 of 11."), phone("prop-PH6", "R2", "Six chips and +5."), phone("prop-PHm", "Tap +5", "Eleven badges in two columns, over the strip and the seats beside.")]),
  row("Three and three · a sideways seat", [phone("base-PS6", "Shipped", "Nothing fits whole."), phone("prop-PS6", "R2", "Name on the outer edge; 3 chips and +8 along the inner edge (Chris, bottom left)."), phone("prop-PSm", "Tap +8", "The card turns with the seat.")]),
])))

boards["Tablet"] = (1600, 4380, page("iPad and desktop", 1600, 4380, "\n".join([
  head("iPad and desktop · full boards · R2", "The grid boards keep their 52 px foot; the ends boards now match it at 44 px. Desktop is classed as a tablet and draws the same. " + FIX),
  row("Two and two", [land("base-TL4", "Shipped", "Two of nine show."), land("prop-TL4", "R2", "All nine fit, no +N.")]),
  row("One on each side · now the same anatomy as the grids", [land("base-TA4", "Shipped", "Name row at the inner edge, two of nine."), land("prop-TA4", "R2", "Name on the outer edge, all nine in the controls row.")]),
  row("Three and three · and its quick look", [land("base-TL6", "Shipped", "One of eleven."), land("prop-TL6", "R2", "Four chips and +7."), land("prop-TLm", "Tap +7", "The card over the strip.", 460)], 24),
  row("Six, ends · and its quick look", [land("base-TE6", "Shipped", "One of eleven, name row at the inner edge."), land("prop-TE6", "R2", "Name on the outer edge; 4 chips and +7."), land("prop-TEm", "Tap +7", "Same card.", 460)], 24),
  row("Desktop 1440 × 900 · and its quick look", [desk("base-DK6", "Shipped", "One of eleven."), desk("prop-DK6", "R2", "Five chips and +6; hover a chip for its words."), desk("prop-DKm", "Click +6", "The same card.", 460)], 24),
])))

os.makedirs(out, exist_ok=True)
for name, (w, h, html) in boards.items():
    open(os.path.join(out, name + ".dc.html"), "w").write(html)
print(json.dumps({k: [v[0], v[1]] for k, v in boards.items()}))
