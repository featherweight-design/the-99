"""R1 - Setup-Phone / Setup-Desktop: who is playing, then a deck for each seat."""
from comps import *

PH, DH = {}, {}

def friends_behind():
    return ('<div class="pg"><div class="pgh"><h1>Friends</h1></div>'
            '<div class="fsec"><span>Pods · 1</span><a href="#">New pod</a></div>' + pod_card() + '</div>')

def who_body(seated, n_label, held=""):
    tiles = "".join(mtile(m, on=(m["who"] in seated)) for m in MEMBERS)
    ok = len(seated) >= 2
    btn = (f'<button class="btn pri" type="button"{"" if ok else " aria-disabled=\"true\""}>Next: decks</button>')
    msg = f'<p class="shs" role="status" style="padding:0;color:var(--warning)">{held}</p>' if held else ""
    return (f'<div class="shb"><div class="mtiles" role="group" aria-label="Who is playing">{tiles}</div>{INVITE}{msg}</div>'
            f'<div class="dfoot"><span class="cnt">{n_label}</span>{btn}</div>')

WHO_HEAD = ('<div class="shh"><h3>Who’s playing?</h3><button class="x" type="button" aria-label="Close">✕</button></div>'
            '<p class="shs">Thursday night · pick tonight’s players. A game seats 2 to 8.</p>')

def deck_rows(peter=None):
    def row(name, art, line, sub, cls="", tag=""):
        a = f'<span class="a"><img src="art/{art}.jpg" alt=""></span>' if art else f'<span class="a ini">{name[:2].upper()}</span>'
        t = f'<small style="font:10px IBM Plex Mono,monospace;color:var(--fg-muted);font-weight:400;margin-left:6px">{tag}</small>' if tag else ""
        return (f'<button class="srow {cls}" type="button"><span class="t"><span style="display:flex;align-items:baseline;font:500 12px IBM Plex Sans,sans-serif;color:var(--fg-muted)">{name}{t}</span>'
                f'</span></button>').replace('<span class="t">', f'{a}<span class="t">').replace('</span></button>', f'<b>{line}</b><span>{sub}</span></span><span class="go">{chev()}</span></button>')
    rows = [
        row("You", "ghalta", "Ghalta Stompy", "Ghalta, Primal Hunger"),
        row("Colin", "zimone", "Zimone Combo", "Zimone, Infinite Analyst"),
        (row("Peter", "giada", "Giada Angels", "Giada, Font of Hope") if peter else
         row("Peter", "", '<span class="pick">Pick a deck</span>', "or leave it to Peter")),
        row("Max", "", '<span style="color:var(--fg-body);font-weight:500">Max picks his own</span>', "not your friend, so his decks aren’t listed", tag="not a friend").replace('<span class="go">' + chev() + '</span>', '<span class="go"></span>').replace('class="srow ', 'class="srow" aria-disabled="true" data-x="'),
    ]
    return "".join(rows)

DECK_HEAD = ('<div class="shh"><h3>Tonight’s decks</h3><button class="x" type="button" aria-label="Close">✕</button></div>'
             '<p class="shs">You start each seat; everyone can change their own on their phone.</p>')

def deck_body(peter=None):
    return (f'<div class="shb" style="gap:8px">{deck_rows(peter)}</div>'
            f'<div class="dfoot"><button class="lnk" type="button" style="font-size:13px">‹ Players</button>'
            f'<button class="btn pri" type="button">Set the table</button></div>')

def peter_body():
    def o(k, on=False):
        d = DECKS[k]
        return (f'<button class="dopt{" on" if on else ""}" type="button" role="option"><span class="a"><img src="art/{d["art"]}.jpg" alt=""></span>'
                f'<span class="t"><b>{d["deck"]}</b><span>{d["cmd"]}</span></span></button>')
    return (f'<div class="shb" role="listbox" aria-label="Peter’s decks" style="gap:2px">{o("giada")}{o("miku")}{o("ashling")}'
            f'<button class="dopt" type="button" role="option"><span class="a" style="display:flex;align-items:center;justify-content:center;border:1px dashed var(--border-dashed);color:var(--fg-muted);font-size:16px">?</span>'
            f'<span class="t"><b>Leave it to Peter</b><span>his seat waits until he picks</span></span></button></div>'
            f'<p class="shs" style="padding-bottom:18px">Name and commander only, as the game log’s picker shows a friend’s decks. Brackets appear once the table is set.</p>')

PETER_HEAD = ('<div class="shh"><span style="display:flex;align-items:center;gap:6px"><button class="x" type="button" aria-label="Back to the seats" style="font-size:20px">‹</button>'
              '<h3 style="margin:0">Peter’s deck</h3></span><button class="x" type="button" aria-label="Close">✕</button></div>')

def sheet(head, body, top=None):
    st = f' style="top:{top}px"' if top else ""
    return f'<div class="scrim"></div><div class="sh"{st}><span class="grip"></span>{head}{body}</div>'

FR = [
    ("U1 · who’s playing · four of five", lambda: sheet(WHO_HEAD, who_body({"You", "Colin", "Peter", "Max"}, "4 seated")),
     "Rule 0 check on the pod card opens this sheet over Friends. The pod’s members as its own seats (the pod card’s tiles), You already in. A tap seats or unseats. Chris has no decks in The 99: his tile is dimmed, not seatable, and says why. Max isn’t your friend but is in the pod, so he can sit. The dashed row points at the invite flow for someone not on the app."),
    ("U2 · too few · Next held", lambda: sheet(WHO_HEAD, who_body({"You"}, "1 seated", held="Seat one more player. A game seats 2 to 8.")),
     "With one seat Next is held and one line says why. At 8 seated the unseated tiles are held the same way with “A game seats up to 8.” (a pod can hold 32)."),
    ("U3 · a deck for each seat", lambda: sheet(DECK_HEAD, deck_body()),
     "One row per seat, in the order they were seated. Yours and Colin’s start on each one’s most recently played deck. Peter’s can be picked or left to him. Max isn’t your friend, so his decks aren’t listed to you at all: his row says he picks his own and has no control. Set the table opens it for everyone."),
    ("U4 · Peter’s decks", lambda: sheet(PETER_HEAD, peter_body()),
     "A row opens that friend’s decks in the same sheet with a back arrow: art, name and commander, newest first, as the game log’s picker lists them. No bracket here: a friend’s brackets are shown only by the table, once it is set. One tap picks and returns. Leave it to Peter keeps his seat waiting for him."),
]

def board_phone():
    out = []
    for lab, ov, cap in FR:
        ph = phone(friends_behind(), h=844, overlay=ov(), fixed=True)
        out.append(frame(lab, ph, cap))
    body = ('<div class="bh"><span class="k">R1 · Rule 0 check · setting up a table · phone 390 · the shipped bottom sheet over Friends</span>'
            '<h2>Two steps in one sheet: who’s playing, then a deck for each seat</h2>'
            '<p class="cap" style="max-width:1800px">Started from the pod (Entry board). The sheet keeps the pod card’s faces, so it reads as the pod becoming tonight’s table. Nothing is created until Set the table; closing the sheet keeps nothing.</p></div>'
            f'<div class="frames">{"".join(out)}</div>')
    return doc("Rule 0 check, setup, phone", body, 1860, 1100)

def modal(head, body):
    return f'<div class="dscrim"></div><div class="dmod" role="dialog" aria-label="Rule 0 check">{head}{body}</div>'

def friends_desk():
    return ('<div class="dph"><div><h1>Friends</h1><div class="meta">Friends see you as <b>you</b></div></div></div>'
            '<div style="padding:22px 34px;max-width:760px"><div class="fsec"><span>Pods · 1</span><a href="#">New pod</a></div>'
            + pod_card(desk=True) + '</div>')

DFR = [
    ("V1 · who’s playing", lambda: modal(WHO_HEAD, who_body({"You", "Colin", "Peter", "Max"}, "4 seated")),
     "The pod’s add-friends dialog pattern: 640px, the members five across at the pod card’s desktop size."),
    ("V2 · a deck for each seat", lambda: modal(DECK_HEAD, deck_body(peter=True)),
     "Peter has been picked (Giada Angels). Same rows and rules as the phone; ‹ Players returns to step one with the seats kept."),
    ("V3 · Peter’s decks", lambda: modal(PETER_HEAD, peter_body()),
     "The same second step in the dialog."),
]

def board_desk():
    out = []
    for lab, ov, cap in DFR:
        d = desk(friends_desk(), h=820, overlay=ov(), fixed=True)
        out.append(frame(lab, d, cap, width=1300))
    body = ('<div class="bh"><span class="k">R1 · Rule 0 check · setting up a table · desktop 1300 · dialog over Friends</span>'
            '<h2>The same two steps in a dialog</h2></div>'
            f'<div class="frames">{"".join(out)}</div>')
    return doc("Rule 0 check, setup, desktop", body, 4120, 1000)
