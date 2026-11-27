# Friend trades R1: writes the canvas index and each board (frames are uploaded /_blob webp shots of the SSR renders).
import json, html, os, sys
C = sys.argv[1]
B = dict(l.split() for l in open(f"{C}/blobs.txt"))
SZ = json.load(open(f"{C}/sizes.json"))
os.makedirs(f"{C}/root/project", exist_ok=True)
HEAD = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{t}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
body{{margin:0}}
</style>
</helmet>
'''
FOOT = '''</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''
ROOT = "box-sizing: border-box; background: #161412; color: #e9e3d8; font-family: system-ui, -apple-system, sans-serif"
def e(s): return html.escape(s, quote=True)

def frame_row(fid, title, sub):
    dw, dh = SZ[f"{fid}-desk"]; pw, ph = SZ[f"{fid}-phone"]
    h = max(dh, ph)
    cols = []
    for dev, w, hh, lab in (("desk", dw, dh, "Desktop"), ("phone", pw, ph, "Phone")):
        cols.append(f'<div style="display: flex; flex-direction: column; gap: 10px; width: {w}px"><p style="margin: 0; font-family: ui-monospace, monospace; font-size: 12px; letter-spacing: .1em; color: #9a917f">{fid} · {lab.upper()}</p>'
                    f'<img src="/_blob/{B[fid + "-" + dev]}" alt="{e(title)}, {lab.lower()}" style="width: {w}px; height: {hh}px; border-radius: 10px; display: block"></div>')
    row = (f'<div style="display: flex; flex-direction: column; gap: 14px">'
           f'<p style="margin: 0; font-size: 22px; font-weight: 700">{e(title)}</p>'
           f'<p style="margin: 0; font-size: 15px; line-height: 1.55; color: #b9b1a3; max-width: 1700px">{e(sub)}</p>'
           f'<div style="display: flex; gap: 60px; align-items: flex-start">{"".join(cols)}</div></div>')
    return row, 22 * 1.3 + 14 + 15 * 1.55 * (1 + len(sub) // 210) + 14 + 24 + h

def board(name, title, rows):
    parts, H = [], 0
    for r in rows:
        x, hh = frame_row(*r); parts.append(x); H += hh
    W = 64 + 1300 + 60 + 390 + 64
    H = int(48 + 64 + H + 70 * (len(rows) - 1) + 40)
    body = f'<div style="width: {W}px; height: {H}px; padding: 48px 64px 64px; {ROOT}; display: flex; flex-direction: column; gap: 70px">' + "".join(parts) + "</div>\n"
    open(f"{C}/root/project/{name}", "w").write(HEAD.format(t=e(title)) + body + FOOT.format(w=W, h=H))
    return W, H

BOARDS = [
 ("AskBack.dc.html", "A · Ask back, on the Yes receipt", [
   ("A1", "A1 · Friends › Requests, Waiting on you: Peter's ask answered Yes", "The shipped receipt row, with Ask back › at its end (the row's action line). Only after a Yes to an ask; an offer's receipt never carries it. The visit's receipt is client state, as shipped."),
   ("A2", "A2 · Home's lead story: the same receipt", "The lead's filled press becomes Ask back ›. The What's new row's receipt carries it the same way (the row's text press)."),
 ]),
 ("Propose.dc.html", "P · Propose a trade: the friend page's Trade tab", [
   ("T1", "T1 · Colin's Trade tab: two of his spares, one of yours", "The fourth tab of the shipped friend strip. One box holds both sides (the To buy box's cells: mono label, the 17px total, the card count) with the store's provenance line; Send offer sits in its foot. Below, the picker: the Requests box's switch in its band, then the Spares tab's own chassis and grid. A tile opens card details; Add under it is the pick, and the same press takes it out (✓ In the trade). Picked tiles are ringed."),
   ("T1b", "T1b · Nothing on your side yet, picker on Your spares", "Send waits until each side has a card. In its place the line says what it waits on (no dead press)."),
 ]),
 ("AskBackTrade.dc.html", "P · Ask back opens the asker's Trade tab", [
   ("T2", "T2 · Ask Peter back: Lathliss already on your side", "Lathliss is the card you said yes to, marked Already a yes. Pick from Peter's spares and Send. The foot says Peter has 14 days and your yes on Lathliss stands either way."),
 ]),
 ("Answer.dc.html", "R · Offered to you, and waiting on them", [
   ("T3", "T3 · Colin's offer, as you read it", "The shipped Yes and No presses with the days left beside them, then Counter. Nothing else on the band repeats the days."),
   ("T6", "T6 · Your offer to Max, waiting", "Withdraw and Waiting on Max. The band ends in the days left."),
 ]),
 ("Counter.dc.html", "C · A counter, against the offer it replaces", [
   ("T4", "T4 · Your counter to Colin, being made", "The box redraws as the counter: a card new to a side is ringed with ADDED; a card taken out stays, faded, with TAKEN OUT; under each total, was $16.99 (that side's total in the offer it replaces). The foot says it replaces Colin's offer and the days stay as they are. Keep their offer backs out."),
   ("T5", "T5 · Peter's counter to your offer", "The same marks, read from the other side, with Yes, No and Counter. One counter at a time: it replaces the offer (D2)."),
 ]),
 ("Accepted.dc.html", "D · Accepted, marked traded, traded", [
   ("T7", "T7 · Chris accepted", "Mark traded is the one filled press. Call it off ends it for both (the other sees Withdrawn)."),
   ("T8", "T8 · Colin marked it traded, you haven't", "The same foot, with Colin's mark in words."),
   ("T8b", "T8b · You marked it traded, Colin hasn't", "Nothing to press: the line says it waits on Colin."),
   ("T9", "T9 · Traded by both", "The receipt's success wash. Your collection stays as it is until you change it (D5). Propose a new trade starts the tab over."),
 ]),
 ("Look.dc.html", "L · Needs a look", [
   ("T10", "T10 · Sai stopped being spare for Colin", "The card fades with NO LONGER SPARE (warning ink). The foot says why Yes is gone, then Counter (without it) or Withdraw, with the days left. Both people see it (D6)."),
 ]),
 ("Trades.dc.html", "S · Every state in the Trades list", [
   ("L1", "L1 · Friends › Requests › Trades", "A third tab of the shipped Requests box, its label in accent while a trade waits on you. Waiting on you's own row: kicker and age, title, one line, the action at its end. The picture is the friend's first card with their face, your first card fanned behind. Open first (offer, countered, needs a look, accepted, traded by one side, offered), then ended (traded, declined, withdrawn, no answer), which ✕ clears. Mark traded works in place."),
 ]),
 ("Feed.dc.html", "N · What's new: one row per push kind", [
   ("N1", "N1 · Offer, counter, accept, decline", "The shipped feed row with the new kicker Trade and the Trades row's fanned picture. Each push sends the same title and line. The press opens the friend's Trade tab."),
   ("N2", "N2 · An offer leading Home", "An offer or a counter waits on you, so it can lead, right after a spare request in the lead order."),
 ]),
 ("Empty.dc.html", "E · Empty states", [
   ("E1", "E1 · You have no spares to offer", "In the picker's Your spares tab: the Requests box's empty mark, what a spare is, and a way on: Ask Max for a spare instead › (his Spares tab)."),
   ("E2", "E2 · Chris has no spares right now", "In the picker's Chris's spares tab. His Spares tab is absent from the strip, as shipped when there's no figure."),
   ("E3", "E3 · No trades yet", "The Trades tab, empty: where trades start."),
 ]),
 ("Settings.dc.html", "N · Settings › Notifications: the Trades row", [
   ("S1", "S1 · Trades, after Friends asking for your spares", "Its own name and line, On from the start, in app and push both ticked by default (D7). Mutable like every row."),
 ]),
]

index = {"v": 3, "createdOnFiles": {"v": 1, "at": "2026-11-27T10:30:00Z"}, "title": "Friend trades", "launch": {"view": "canvas"}, "pages": [], "boards": {}, "order": [], "notes": {}, "designSystems": []}
index["boards"]["Main.dc.html"] = {"x": 0, "y": 0, "w": 1400, "h": int(sys.argv[2]), "title": "Main · calls and questions"}
index["order"].append("Main.dc.html")
x, y, rowh = 1480, 0, 0
col = 0
sizes = {}
for name, title, rows in BOARDS:
    sizes[name] = board(name, title, rows)
# lay boards in rows of three, Main first in row one
x, y, rowh = 1480, 0, int(sys.argv[2])
per = 2
n = 1
for name, title, rows in BOARDS:
    w, h = sizes[name]
    if n == per + 1 - (1 if y == 0 else 0) and False: pass
    if x + w > 1480 + 2 * (1878 + 80):
        x, y, rowh = 0, y + rowh + 160, 0
    index["boards"][name] = {"x": x, "y": y, "w": w, "h": h, "title": title}
    index["order"].append(name)
    x += w + 80; rowh = max(rowh, h)
json.dump(index, open(f"{C}/root/project/canvas.json", "w"), indent=0)
print({k: (v["x"], v["y"], v["w"], v["h"]) for k, v in index["boards"].items()})
