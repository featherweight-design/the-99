# Life tracker addendum: more commander art in the shelf (account 1, 2026-11-24).
# Writes the boards twice: for the canvas (/_blob urls from blobs.json) and for the repo (art/).
import json, sys, os
mode, out = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
BLOB = json.load(open(os.path.join(HERE, "blobs.json"))) if mode == "canvas" else {}
def src(k): return BLOB[k] if mode == "canvas" else f"art/sh-{k}.webp"
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
def call(n, t, body): return f'<div style="display:flex;flex-direction:column;gap:8px;padding:20px 24px;border:1px solid #262A35;border-radius:14px;background:#11131A"><p style="margin:0;font:600 17px \'IBM Plex Sans\',sans-serif;color:#E6E8F0"><span style="font-family:\'IBM Plex Mono\',monospace;color:{A}">{n}</span> · {t}</p><div style="font-size:14px;line-height:1.6;color:#B1B6C7">{body}</div></div>'
def ul(items): return '<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">' + "".join(f"<li>{i}</li>" for i in items) + '</ul>'
def table(rows, head_):
    th = "".join(f'<th style="text-align:left;padding:8px 12px;font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.08em;text-transform:uppercase;color:#959AAD;border-bottom:1px solid #262A35">{h}</th>' for h in head_)
    tr = "".join("<tr>" + "".join(f'<td style="padding:8px 12px;font-size:13.5px;line-height:1.5;color:#B1B6C7;border-bottom:1px solid #1B1E27;vertical-align:top">{c}</td>' for c in r) + "</tr>" for r in rows)
    return f'<table style="border-collapse:collapse;width:100%">{"<tr>" + th + "</tr>"}{tr}</table>'
def q(n, t, a, b, rec):
    opt = lambda l, body, r: f'<div style="flex:1;display:flex;flex-direction:column;gap:6px;padding:14px 16px;border-radius:10px;border:1px solid {A if r else "#262A35"};background:{"#1A1610" if r else "#0E1016"}"><p style="margin:0;font:600 14px \'IBM Plex Sans\',sans-serif;color:#E6E8F0">{l}{" · recommended" if r else ""}</p><p style="margin:0;font-size:13px;line-height:1.55;color:#B1B6C7">{body}</p></div>'
    return f'<div style="display:flex;flex-direction:column;gap:10px;padding:20px 24px;border:1px solid #262A35;border-radius:14px;background:#11131A"><p style="margin:0;font:600 17px \'IBM Plex Sans\',sans-serif;color:#E6E8F0"><span style="font-family:\'IBM Plex Mono\',monospace;color:{A}">{n}</span> · {t}</p><div style="display:flex;gap:14px">{opt("A", a, rec == "A")}{opt("B", b, rec == "B")}</div></div>'


FIX = "Fixture: Chris (you, Sai) at a 4-seat table, 8 from Colin's Ghalta, 6 from Peter's Zimone, 5 from Max's Giada; the sideways sheet is Colin's, 4 from Sai. Phone 390 × 844."
def three(k, notes, cap=("Shipped", "A · taller strip", "B · art fills the card")):
    return [phone(f"{t}-{k}", c, n) for t, c, n in zip(["base", "sA", "sB"], cap, notes)]
boards = {}
boards["Main"] = (1600, 2480, page("Main", 1600, 2480, "\n".join([
  head("Life tracker · more commander art in the shelf", "On a phone, each commander damage card in the shelf shows its art as a 56 px strip, and on a sideways seat the rest of the card is empty felt. The iPad and desktop sheet already fills each card with the art under a fade. Two ways to show more on the phone. " + FIX),
  row("Sideways seat · the screenshot you sent", three("S4", ["A 56 px strip on a tall card: most of the card is empty.", "The strip grows to 104 px. The name and stepper keep the plain card under it.", "The art fills the card; the stepper sits over a dark fade at its foot. Same card as the iPad."])),
  row("Upright seat", three("U4", ["Art cut to a band; the face is lost.", "Twice the art; the cards grow 48 px.", "Most art of the three; the cards grow less than A, since the name moves onto the art."])),
  call("Rec", "B: art fills the card", ul([
    "It shows the most art on every seat and on a sideways seat it uses the whole card.",
    "It is the card the iPad and desktop already draw (" + m("DamageArt") + "), so the shelf looks the same on every device.",
    "Trade: the steppers sit on the art. The fade keeps them readable, and a disabled − at 0 is the faintest thing on the card; it reads on every crop here.",
    "A is the safer, smaller change if you would rather keep the steppers on the plain card.",
  ])),
  q("Q1", "Which card on the phone?", "A taller 104 px strip; name and steppers stay on the plain card.", "The art fills the card under a fade, as on iPad and desktop.", "B"),
  call("Scope", "What changes", ul([
    "Phone only: " + m("DamageTab") + " in " + m("sheet.tsx") + ". iPad and desktop are untouched; they already fill the card.",
    "No copy changes. Partner decks keep one stepper per commander, split by a faint line over the art.",
    "The other shelf tabs (Counters, Tax, Mana, Table) are unchanged.",
  ])),
])))
boards["Phone"] = (1600, 3480, page("Phone", 1600, 3480, "\n".join([
  head("Phone · every seat", "Upright and sideways seats at 2, 3, 4 and 6 players, shipped against A and B. " + FIX),
  row("Six players, upright", three("U6", ["Strip only.", "Taller strip.", "Full art."])),
  row("Six players, sideways", three("S6", ["Empty card under the strip.", "Taller strip.", "Full art."])),
  row("Three players, sideways end", three("S3", ["Two cards, tall and empty.", "Taller strip.", "Full art."])),
  row("Two players, upright", three("U2", ["One card.", "Taller strip.", "Full art."])),
])))

os.makedirs(out, exist_ok=True)
for name, (w, h, html) in boards.items():
    open(os.path.join(out, name + ".dc.html"), "w").write(html)
print(json.dumps({k: [v[0], v[1]] for k, v in boards.items()}))
