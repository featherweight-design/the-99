"""R1 - Entry-Phone / Entry-Desktop: where the table starts, and how a seated player finds it."""
from comps import *

PH, DH = {}, {}

def friends_page(state, desk=False):
    rows = "".join(
        f'<div class="frow"><span class="a{" ini" if not a else ""}">{('<img src="art/' + a + '.jpg" alt="">') if a else n[:2].upper()}</span>'
        f'<span class="t"><b>{n}</b><span>{c}</span></span><span class="s">{d}</span><span class="m" aria-hidden="true">···</span></div>'
        for n, a, c, d in [("Chris", "", "", "since Sep 14"), ("Colin", "zimone", "Zimone, Infinite Analyst", "since Aug 30"),
                           ("Peter", "giada", "Giada, Font of Hope", "since Oct 2")])
    head = ('<div class="pgh" style="display:flex;gap:14px;align-items:center"><span class="face" style="width:56px;height:56px;border-radius:12px">'
            '<img src="art/ghalta.jpg" alt=""></span><div><h1>Friends</h1><div class="meta">Friends see you as <b>your name</b></div></div></div>')
    add = '<button class="btn pri full" type="button">Add a friend</button>'
    pods = f'<div class="fsec"><span>Pods · 1</span><a href="#">New pod</a></div>{pod_card(state, desk=desk)}'
    if desk:
        return ('<div class="dph"><div><h1>Friends</h1><div class="meta">Friends see you as <b>your name</b></div></div>'
                '<button class="btn pri" type="button">Add a friend</button></div>'
                f'<div style="display:grid;grid-template-columns:360px minmax(0,1fr);gap:36px;padding:22px 34px">'
                f'<div><div class="fsec"><span>Friends · 3</span></div>{rows}</div><div>{pods}</div></div>')
    return f'<div class="pg" style="padding-top:16px">{head}{add}<div class="fsec"><span>Friends · 3</span></div>{rows}{pods}</div>'

def home_card(desk=False):
    fs = "".join(face(a) for a in ["zimone", "ghalta", "giada", "gisa"])
    wash = "".join(f'<img src="art/{a}.jpg" alt="">' for a in ["zimone", "ghalta", "giada", "gisa"])
    return (f'<section class="htab" aria-label="Tonight’s table"><div class="pwsh" aria-hidden="true">{wash}</div>'
            f'<span class="k" style="color:var(--accent)">Tonight’s table</span><h3>Thursday night</h3>'
            f'<div class="fs">{fs}</div><p>Colin seated you with <b style="color:var(--fg)">Ghalta Stompy</b>. 4 seated, open until 9:40 pm tomorrow.</p>'
            f'<button class="btn pri full" type="button">Open the table</button></section>')

def home_page(card=True):
    resume = "".join(
        f'<div class="srow"><span class="a"><img src="art/{a}.jpg" alt=""></span><span class="t"><b>{n}</b><span>{s}</span></span></div>'
        for a, n, s in [("ghalta", "Ghalta Stompy", "played 2 days ago"), ("rootha", "Rootha Spells", "edited 5 days ago")])
    fr = (f'<div class="fsec"><span>Friends</span></div>{home_card() if card else ""}'
          if card else "")
    return (f'<div class="pg" style="padding-top:12px"><div class="mono" style="font-size:10px;color:var(--fg-locked)">Home · scrolled to Friends</div>'
            f'<div class="fsec"><span>Pick up where you left off</span></div><div style="display:flex;flex-direction:column;gap:8px">{resume}</div>{fr}'
            f'<div class="fsec"><span>Commitments</span></div><div class="srow" style="min-height:120px"><span class="t"><b>Cards in use</b><span>214 of 1,418</span></span></div></div>')

FR = [
    ("E1 · the pod card · Rule 0 check", lambda: friends_page(None),
     "The entry is the pod, because a table is a pod’s: one row at the foot of the shipped pod card, under Share my spares, for any member. It opens setup (Setup board). One control; no new page in the nav and nothing in the user menu."),
    ("E2 · the pod card · a table is open", lambda: friends_page("open"),
     "While a table for this pod is open, the same row becomes Tonight’s table with its seats’ faces and when it closes, and opens it. One table per pod at a time; its setter changes who sits from the table’s Seats button."),
    ("E3 · Home · a seated player who didn’t set it", lambda: home_page(True),
     "A seated player finds it on Home, in the Friends section, until the table closes: who seated you, with which deck, and Open the table. The setter’s own seat gets it too. Not drawn on the Games tab: a table is a pod’s, not a deck’s; the Games tab is where logging from it lands (Log board)."),
    ("E4 · switch off · absent", lambda: friends_page("off"),
     "Switch off: the pod card is the shipped card, no row and no space kept; Home has no table card; a table link is not found. Same with friends off, which the switch needs."),
]

def board_phone():
    out = []
    for lab, body, cap in FR:
        tab = "Home" if lab.startswith("E3") else "none"
        out.append(frame(lab, phone(body(), h=PH.get(lab, 1400), tab=tab), cap))
    body = ('<div class="bh"><span class="k">R1 · Rule 0 check · where it starts · phone 390 · full page</span>'
            '<h2>The pod starts the table; Home brings the other seats to it</h2>'
            '<p class="cap" style="max-width:1800px">Drawn over the shipped Friends page (Social R1, the pod as a table) and Home’s Friends section. Thursday night is Colin’s pod: you, Colin, Peter, Max (Colin’s friend, not yours) and Chris (no decks yet).</p></div>'
            f'<div class="frames">{"".join(out)}</div>')
    return doc("Rule 0 check, entry, phone", body, 1860, 1600)

def home_desk():
    return ('<div class="dph"><div><div class="meta">1,418 cards · read today</div><h1>Welcome back</h1></div></div>'
            '<div style="display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:28px;padding:22px 34px">'
            '<div><div class="fsec"><span>Pick up where you left off</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px">'
            '<div class="srow"><span class="a"><img src="art/ghalta.jpg" alt=""></span><span class="t"><b>Ghalta Stompy</b><span>played 2 days ago</span></span></div>'
            '<div class="srow"><span class="a"><img src="art/rootha.jpg" alt=""></span><span class="t"><b>Rootha Spells</b><span>edited 5 days ago</span></span></div></div></div>'
            f'<div style="display:flex;flex-direction:column;gap:10px"><div class="fsec"><span>Friends</span></div>{home_card(True)}</div></div>')

DFR = [
    ("F1 · Friends · the pod card’s row", lambda: friends_page(None, desk=True), "The row spans the card under the five seats."),
    ("F2 · Friends · a table is open", lambda: friends_page("open", desk=True), "Tonight’s table, with faces and the closing time."),
    ("F3 · Home · the right column’s Friends", lambda: home_desk(), "The table card heads Home’s Friends column while you’re seated."),
]

def board_desk():
    out = [frame(lab, desk(b(), h=DH.get(lab, 820), active="Home" if lab.startswith("F3") else ""), cap, width=1300) for lab, b, cap in DFR]
    body = ('<div class="bh"><span class="k">R1 · Rule 0 check · where it starts · desktop 1300</span>'
            '<h2>The same two entries on desktop</h2></div>'
            f'<div class="frames">{"".join(out)}</div>')
    return doc("Rule 0 check, entry, desktop", body, 4120, 1100)
