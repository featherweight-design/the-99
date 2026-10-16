"""R1 - Log-Phone / Log-Desktop: logging from the table, the pre-filled game log, games off, and an expired table."""
from comps import *

PH, DH = {}, {}

def table_bottom(desk=False, games=True):
    s = [S("You", "ghalta", own=True), S("Colin", "zimone", tag="owner", flag="hi", why=ZIMONE_WHY, drivers=("twoCardCombos", "tutors")),
         S("Peter", "giada", flag="lo", why=GIADA_WHY), S("Max", "gisa", tag="not a friend")]
    rd = read("Two decks sit off the table, one each way.",
              "The middle is <b>Upgraded</b>. Colin’s Zimone Combo reads <b>Optimized</b>, Peter’s Giada Angels reads <b>Core</b>.", s, (3, 3))
    return s, rd

def seatrow(name, sub, art, you=False, tag=""):
    t = f'<small class="mono" style="font-size:9.5px;color:var(--fg-faint);margin-left:6px">{tag}</small>' if tag else ""
    th = f'<span class="pth"><img src="art/{art}.jpg" alt=""></span>'
    right = '<span class="ytag">YOU</span>' if you else '<button class="px" type="button" aria-label="Clear ' + name + '’s seat">✕</button>'
    return (f'<div class="prow"><span class="pa">{th}<span class="pt"><span class="pn">{name}{t}</span>'
            f'<span class="ps">{sub}</span></span></span>{right}</div>')

def logform(desk=False):
    pods = "".join(f'<button class="pz{" on" if n == 4 else ""}" type="button">{n}</button>' for n in range(2, 9))
    seats = (seatrow("You", "Ghalta Stompy", "ghalta", you=True) + seatrow("Colin", "Zimone Combo", "zimone")
             + seatrow("Peter", "Giada Angels", "giada") + seatrow("Max", "Gisa Zombies", "gisa", tag="from the table"))
    return (f'<div class="form"><div class="fh"><h3>Log a game</h3><span>played <b style="color:var(--fg-body);font-weight:400">tonight</b></span></div>'
            f'<div class="from" style="margin-top:14px">{ico_table(16)}<span>From <b>Thursday night’s table</b>. Seats filled; change anything.</span></div>'
            f'<div style="margin-top:16px"><span class="flb">Result</span><div class="rg"><button class="rb" type="button">Won</button><button class="rb" type="button">Lost</button><button class="rb" type="button">Draw</button></div></div>'
            f'<div style="margin-top:16px"><span class="flb">Pod size</span><div class="rg" style="gap:5px">{pods}</div></div>'
            f'<div style="border-top:1px solid var(--border);padding-top:14px;margin-top:18px"><div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px">'
            f'<span class="flb" style="margin:0">Across the table</span><span class="cnt">3 of 3</span></div>'
            f'<div style="display:flex;flex-direction:column;gap:6px">{seats}</div></div>'
            f'<div style="margin-top:16px"><span class="flb" style="color:var(--success)">What worked</span>'
            f'<div class="ax"><span class="bx"></span><span style="display:flex;flex-direction:column"><b>Speed</b><span>got going fast</span></span></div>'
            f'<div class="ax"><span class="bx"></span><span style="display:flex;flex-direction:column"><b>Cards in hand</b><span>kept drawing</span></span></div></div>'
            f'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button class="btn gho sm" type="button">Cancel</button><button class="btn pri sm" type="button">Save game</button></div></div>')

def deck_page(desk=False):
    tabs = "".join(f'<span class="{"on" if t == "Games" else ""}">{t}{f"<small>{n}</small>" if n else ""}</span>'
                   for t, n in [("Your deck", "99"), ("Analysis", ""), ("Consider", "40"), ("Games", "6")])
    if desk:
        return ('<div class="dph"><div><div class="bk">‹ Decks</div><h1>Ghalta Stompy</h1><div class="meta">Ghalta, Primal Hunger · Gruul</div></div></div>'
                f'<div class="dtabs" style="padding:0 34px">{tabs}</div><div style="padding:22px 34px;max-width:760px">{logform(True)}</div>')
    return (f'<div class="dhero" style="height:150px"><img src="art/ghalta.jpg" alt="" style="top:-20px"><div class="t"><h1>Ghalta Stompy</h1>'
            f'<div class="m">Ghalta, Primal Hunger · Gruul {chip([3])}</div></div></div><div class="dtabs">{tabs}</div>'
            f'<div style="padding:14px 16px 20px">{logform()}</div>')

def expired(desk=False):
    fcs = "".join(f'<span class="face" style="left:{x}px;top:{y}px"><img src="art/{a}.jpg" alt=""></span>'
                  for a, x, y in [("ghalta", 83, 0), ("zimone", 166, 44), ("giada", 83, 88), ("gisa", 0, 44)])
    return (f'<div class="closed"><div class="ttable" aria-hidden="true"><span class="tb"></span>{fcs}</div>'
            '<h2>This table has closed</h2><p>Tables last the night: Thursday night’s closed 24 hours after Colin set it. '
            'Games logged from it stay on each deck’s Games tab.</p>'
            '<button class="btn gho" type="button">Back to Friends</button></div>')

def table_end_phone(lab, games=True):
    s, rd = table_bottom(games=games)
    return table_phone(s, rd, logbtn=games, h=PH.get(lab, 1600))

FR = [
    ("L1 · the press · Log this game", lambda: table_end_phone("L1 · the press · Log this game"),
     "Log this game sits under the last seat, full width, one press. It logs onto your seated deck: each seat logs its own game. It opens that deck’s Games tab with the form open (L2). Behind the games switch."),
    ("L2 · the pre-filled log", lambda: phone(deck_page(), h=PH.get("L2 · the pre-filled log", 1500)),
     "The shipped form on Ghalta Stompy’s Games tab, opened and pre-filled: a line says where it came from, Pod size is the seated count, and Across the table holds every other seat with the deck they sat with. Max isn’t your friend; the table lets his seat in, marked from the table. Result is yours to pick; anything can be changed or cleared."),
    ("L3 · games off · no log", lambda: table_end_phone("L3 · games off · no log", games=False),
     "With the games switch off the table works and offers no log: the button is absent, no space kept."),
    ("L4 · expired", lambda: phone(back() + expired(), h=844, fixed=True),
     "The link opened after the table closed. The faces are greyed; the line says why and that logged games stay. The pod card has gone back to Rule 0 check and Home’s table card is gone."),
]

def board_phone():
    out = []
    for lab, b, cap in FR:
        html = b()
        out.append(frame(lab, html, cap))
    body = ('<div class="bh"><span class="k">R1 · Rule 0 check · logging, and after the night · phone 390</span>'
            '<h2>Log from the table onto your own deck, with the table already across from you</h2>'
            '<p class="cap" style="max-width:1800px">L2 is the shipped log form (Social R3) on the Games tab; nothing in it is new except the from-the-table line and the seats it arrives with.</p></div>'
            f'<div class="frames">{"".join(out)}</div>')
    return doc("Rule 0 check, log and expiry, phone", body, 1860, 1800)

def board_desk():
    s, rd = table_bottom(desk=True)
    D = [
        ("H1 · the table · Log this game", table_desk(s, rd, h=DH.get("H1 · the table · Log this game", 1000)), "Log this game closes the read’s column."),
        ("H2 · the pre-filled log", desk(deck_page(True), h=DH.get("H2 · the pre-filled log", 1000), active="Decks"), "The same form on desktop’s Games tab."),
        ("H3 · expired", desk(expired(True), h=620, fixed=True), "Centered in the page."),
    ]
    out = [frame(l, h, c, width=1300) for l, h, c in D]
    body = ('<div class="bh"><span class="k">R1 · Rule 0 check · logging, and after the night · desktop 1300</span>'
            '<h2>The same, on desktop</h2></div>'
            f'<div class="frames">{"".join(out)}</div>')
    return doc("Rule 0 check, log and expiry, desktop", body, 4120, 1300)
