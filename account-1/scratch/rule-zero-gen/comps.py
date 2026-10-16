"""Fixtures and the table's own pieces: a seat, the read, the rail, the suggestion, the pickers."""
from kit import *

# ---------- fixtures ----------
# The pod: Thursday night, owned by Colin. You, Colin, Peter, Max (Colin's friend, not yours), Chris (no decks yet).
# Every deck is a commander crop from the design folder, so no board loads Scryfall.
DECKS = {
    # yours
    "ghalta": dict(deck="Ghalta Stompy", cmd="Ghalta, Primal Hunger", art="ghalta", permits=[3], f=dict(gameChangers=2, tutors=3)),
    "dina": dict(deck="Dina’s Garden", cmd="Dina, Essence Brewer", art="dina", permits=[2], f=dict(tutors=1)),
    "rootha": dict(deck="Rootha Spells", cmd="Rootha, Mastering the Moment", art="rootha", permits=[3], f=dict(gameChangers=1, extraTurns=1, tutors=2)),
    "killian": dict(deck="Killian Stax", cmd="Killian, Decisive Mentor", art="killian", permits=[4], f=dict(gameChangers=5, tutors=7)),
    # Colin's
    "zimone": dict(deck="Zimone Combo", cmd="Zimone, Infinite Analyst", art="zimone", permits=[4], f=dict(gameChangers=3, twoCardCombos=1, tutors=5)),
    "sai": dict(deck="Sai Thopters", cmd="Sai, Master Thopterist", art="sai", permits=[3], f=dict(gameChangers=1, tutors=2)),
    "jace": dict(deck="Jace Clones", cmd="Jace, Multiverse Architect", art="jace", permits=[3], f=dict(gameChangers=2, tutors=1)),
    # Peter's
    "giada": dict(deck="Giada Angels", cmd="Giada, Font of Hope", art="giada", permits=[2], f=dict(tutors=1)),
    "miku": dict(deck="Miku Tokens", cmd="Trostani, Selesnya’s Voice", art="miku", permits=[1, 2], f=dict()),
    "ashling": dict(deck="Ashling Elementals", cmd="Ashling, the Limitless", art="ashling", permits=[3], f=dict(gameChangers=1, tutors=2)),
    # Max's
    "gisa": dict(deck="Gisa Zombies", cmd="Ghoulcaller Gisa", art="gisa", permits=[3], f=dict(gameChangers=2, tutors=2)),
}

def S(who, key, **kw):
    d = dict(DECKS[key])
    d.update(dict(who=who, you=(who == "You"), state="ok", ans=None, drift=None, flag=None, why="", drivers=(),
                  tag="", changed="", own=False, sug=None, pickable=False))
    d.update(kw)
    if who == "Colin" and not d["tag"]:
        d["tag"] = "owner"
    return d

ZIMONE_WHY = ('<b>What puts it here:</b> it can find a two-card combo, Thassa’s Oracle + Demonic Consultation, '
              'with 5 tutors to reach it. Upgraded allows a combo only as a draw away.')
GIADA_WHY = ('<b>What puts it here:</b> nothing we counted passes Core’s limits, and the rest of the table reads '
             'Upgraded. Counts can miss cards, so ask what it’s built to do.')
KILLIAN_WHY = '<b>What puts it here:</b> 5 Game Changers, where Upgraded allows 3, and 7 tutors.'

# ---------- a seat ----------
def seat(s, desk=False):
    flagcls = {"hi": " flag hi", "lo": " flag lo", "sp": " flag sp"}.get(s["flag"] or "", "")
    cls = "seat" + (" you" if s["you"] else "") + flagcls
    art = (f'<span class="art"><img src="art/{s["art"]}.jpg" alt=""></span>' if s.get("art") and s["state"] != "pick"
           else f'<span class="art ini">{s["who"][:2].upper()}</span>')
    wash = f'<span class="wash" aria-hidden="true"><img src="art/{s["art"]}.jpg" alt=""></span>' if s.get("art") and s["state"] != "pick" else ""
    tag = f'<small>{s["tag"]}</small>' if s["tag"] else ""
    you = '<span class="yt">YOU</span>' if s["you"] else ""
    name = "You" if s["you"] else s["who"]
    if s["state"] == "pick":
        deckline = '<span class="dkn" style="color:var(--fg-muted)">Picking their deck</span><span class="cm">their seat joins the read when they do</span>'
    else:
        deckline = f'<span class="dkn">{s["deck"]}</span><span class="cm">{s["cmd"]}</span>'
    top = (f'<div class="top">{art}<span class="who"><span class="nm">{name}{you}{tag}</span>{deckline}</span></div>')
    # the line under the seat: chip + facts, or why it is not in the read
    parts = []
    st = s["state"]
    ctrl = ""
    if s["own"]:
        ctrl = '<button class="lnk" type="button" style="min-height:36px;font-size:13px">Change deck</button>'
    if st in ("ok", "stale"):
        chipline = chip(s["permits"], s["ans"])
        right = flagtag(s["flag"]) if s["flag"] else ""
        parts.append(f'<div class="ln">{chipline}{right}</div>')
        sub = []
        if s["ans"]:
            sub.append(f'<span class="mono" style="font-size:10.5px;color:var(--fg-faint)">declared {NAMES[s["ans"]]} · reads {" or ".join(NAMES[b] for b in s["permits"])}</span>')
        elif s["drift"]:
            sub.append(f'<span class="mono" style="font-size:10.5px;color:var(--fg-faint)">declared {NAMES[s["drift"]]}, outside this reading · measured from {NAMES[s["permits"][0]]}</span>')
        elif len(s["permits"]) == 2:
            sub.append(f'<span class="mono" style="font-size:10.5px;color:var(--fg-faint)">not declared · measured from {NAMES[s["permits"][0] if s.get("near","low")=="low" else s["permits"][1]]}</span>')
        if st == "stale":
            sub.append('<span class="stale"><i></i>from before its last change</span>')
        if sub:
            parts.append(f'<div class="ln" style="margin-top:-4px;justify-content:flex-start;flex-wrap:wrap;gap:4px 10px">{"".join(sub)}</div>')
        parts.append(f'<div class="ln">{facts(s["f"], s["drivers"])}</div>')
        if s["why"]:
            parts.append(f'<div class="why">{s["why"]}</div>')
    elif st == "short":
        pct = int(s["cards"])
        parts.append(f'<div class="wait"><b>{s["cards"]} of 100 cards.</b> A deck is read once it’s complete, so this seat is left out of the read for now.<div class="bar"><i style="width:{pct}%"></i></div></div>')
    elif st == "over":
        parts.append(f'<div class="wait"><b>{s["cards"]} cards, over 100.</b> Its last reading is from before that change and isn’t used. Back at 100, it joins the read.</div>')
    elif st == "reading":
        parts.append('<div class="wait" style="display:flex;align-items:center;gap:10px"><span class="spin" aria-hidden="true"></span><span><b>Reading this deck.</b> It’s at 100 and hasn’t been read before; this takes a second or two.</span></div>')
    elif st == "pick":
        parts.append(f'<div class="wait">{s["who"]} picks their own deck on their phone. Until then this seat is left out of the read.</div>')
    if s["sug"]:
        parts.append(s["sug"])
    foot = ""
    if ctrl or s["changed"]:
        chg = f'<span class="chg"><i></i>{s["changed"]}</span>' if s["changed"] else "<span></span>"
        foot = f'<div class="ln" style="padding-top:0;margin-top:-6px">{chg}{ctrl}</div>'
    return f'<article class="{cls}" aria-label="{name}’s seat">{wash}{top}{"".join(parts)}{foot}</article>'

# ---------- the rail ----------
def rail5(seats, band=None, note=""):
    """Five columns, Exhibition to cEDH. Each read seat's face sits over its bracket; a range seat spans both
    columns with its face at the end it is measured from. The band marks the table's middle."""
    cols = {b: [] for b in range(1, 6)}
    spans = []
    for s in seats:
        if s["state"] not in ("ok", "stale"):
            continue
        p = s["ans"] and [s["ans"]] or s["permits"]
        at = p[0] if len(p) == 1 else (p[0] if s.get("near", "low") == "low" else p[1])
        fc = ("you " if s["you"] else "") + ("flag " + s["flag"] if s["flag"] else "")
        cols[at].append(face(s["art"], fc, alt=("You" if s["you"] else s["who"])))
        if len(p) == 2:
            spans.append(p)
    band_html = ""
    if band:
        lo, hi = band
        left = (lo - 1) * 20
        width = (hi - lo + 1) * 20
        band_html = (f'<span class="band" style="left:calc({left}% + 6px);width:calc({width}% - 4px)" aria-hidden="true">'
                     f'<span>TABLE</span></span>')
    span_html = "".join(
        f'<span class="span" style="left:calc({(a - 1) * 20 + 4}% + 4px);width:calc({(b - a + 1) * 20 - 8}% )" aria-hidden="true"></span>'
        for a, b in spans)
    colhtml = "".join(
        f'<div class="col"><span class="fc">{"".join(cols[b])}</span><span class="lab">{mark(b, 22)}<span>{NAMES[b]}</span></span></div>'
        for b in range(1, 6))
    return f'<div class="rail5" role="img" aria-label="Each seat placed on the five brackets">{band_html}{span_html}{colhtml}</div>'

FKEY = ('<div class="rkey" aria-label="What the counts on each seat are">' + "".join(
    f'<span style="color:var(--fg-muted)">{glyph(g, 12, "var(--fact)")}{label}</span>' for _, g, label in FACT) + '</div>')

HONEST = ('<div class="honest"><span>Each bracket is read from the list. Game Changers are exact; combos, tutors, extra '
          'turns and land denial can be missed. A flag is a reason to talk, not a ruling.</span>'
          '<button class="lnk" type="button">How we make these decisions →</button></div>')

def read(head, body, seats, band=None, extra="", upd="updated just now", rail=True):
    r = rail5(seats, band) if rail else ""
    return (f'<section class="read" aria-label="The read"><div class="kk"><span class="k">The read</span><span class="upd">{upd}</span></div>'
            f'<h2>{head}</h2><p>{body}</p>{extra}{r}{FKEY}{HONEST}</section>')

# ---------- the suggestion (the flagged player's own phone only) ----------
def sugbox(opts, title="Closer to the table", sub="Your decks that read nearer Upgraded. One tap swaps it in for everyone."):
    rows = "".join(
        f'<div class="sopt"><span class="a"><img src="art/{DECKS[k]["art"]}.jpg" alt=""></span><span class="t"><b>{DECKS[k]["deck"]}</b>'
        f'<span>{chip(DECKS[k]["permits"])}</span></span><button class="btn gho sm" type="button">Swap in</button></div>'
        for k in opts)
    return f'<div class="sug"><div class="hd"><b>{title}</b><span>{sub}</span></div>{rows}</div>'

# ---------- page parts ----------
def page_head(title, meta, right=""):
    return (f'<div class="pgh"><div class="row"><h1>{title}</h1>{right}</div><div class="meta">{meta}</div></div>')

def back(label="Friends"):
    return f'<div class="back">{ico_back()}{label}</div>'

META = {
    "c3you": '<b>Thursday night</b> · set by you · 3 seated<br>open until 9:40 pm tomorrow',
    "c3": '<b>Thursday night</b> · set by Colin · 3 seated<br>open until 9:40 pm tomorrow',
    "colin": '<b>Thursday night</b> · set by Colin · 4 seated<br>open until 9:40 pm tomorrow',
    "you": '<b>Thursday night</b> · set by you · 4 seated<br>open until 9:40 pm tomorrow',
    "you2": '<b>Thursday night</b> · set by you · 2 seated<br>open until 9:40 pm tomorrow',
}

def table_phone(seats, rd, meta="colin", h=1500, setter=False, after="", overlay="", logbtn=True, hd=None, av="HH", fixed=False):
    right = '<button class="btn gho sm" type="button">Seats</button>' if setter else ""
    lg = ('<button class="btn gho full" type="button">Log this game</button>' if logbtn else "")
    body = (back() + '<div class="pg">' + page_head("Rule 0 check", META[meta], right) + rd +
            f'<div class="seats">{"".join(seat(s) for s in seats)}</div>{after}{lg}</div>')
    return phone(body, h=h, overlay=overlay, hd=hd, av=av, fixed=fixed)

def seat_row(s):
    """R2 desktop seat: one full-width row. Art, then name, deck, commander and the chip together; the flag tag
    over the five counts on the right. The reason, the offer, or why the seat is waiting open under the row."""
    flagcls = {"hi": " flag hi", "lo": " flag lo", "sp": " flag sp"}.get(s["flag"] or "", "")
    cls = "srw" + (" you" if s["you"] else "") + flagcls
    name = "You" if s["you"] else s["who"]
    tag = f'<small>{s["tag"]}</small>' if s["tag"] else ""
    you = '<span class="yt">YOU</span>' if s["you"] else ""
    st = s["state"]
    pick = st == "pick"
    art = (f'<span class="art"><img src="art/{s["art"]}.jpg" alt=""></span>' if not pick
           else f'<span class="art ini">{s["who"][:2].upper()}</span>')
    wash = f'<span class="wash" aria-hidden="true"><img src="art/{s["art"]}.jpg" alt=""></span>' if not pick else ""
    if pick:
        deck = '<span class="dkn" style="color:var(--fg-muted)">Picking their deck</span><span class="cm">their seat joins the read when they do</span>'
    else:
        deck = f'<span class="dkn">{s["deck"]}</span><span class="cm">{s["cmd"]}</span>'
    br, rt = "", ""
    more = []
    if st in ("ok", "stale"):
        sub = []
        if s["ans"]:
            sub.append(f'declared {NAMES[s["ans"]]} · reads {" or ".join(NAMES[b] for b in s["permits"])}')
        elif s["drift"]:
            sub.append(f'declared {NAMES[s["drift"]]}, outside this reading · measured from {NAMES[s["permits"][0]]}')
        elif len(s["permits"]) == 2:
            near = s["permits"][0] if s.get("near", "low") == "low" else s["permits"][1]
            sub.append(f'not declared · measured from {NAMES[near]}')
        subs = "".join(f'<span class="sub">{x}</span>' for x in sub)
        if st == "stale":
            subs += '<span class="stale"><i></i>from before its last change</span>'
        br = f'<span class="br">{chip(s["permits"], s["ans"], lg=True)}{subs}</span>'
        rt = f'<span class="rt">{flagtag(s["flag"]) if s["flag"] else ""}{facts(s["f"], s["drivers"])}</span>'
        if s["why"]:
            more.append(f'<div class="why">{s["why"]}</div>')
    elif st == "short":
        more.append(f'<div class="wait"><b>{s["cards"]} of 100 cards.</b> A deck is read once it’s complete, so this seat is left out of the read for now.<div class="bar"><i style="width:{int(s["cards"])}%"></i></div></div>')
    elif st == "over":
        more.append(f'<div class="wait"><b>{s["cards"]} cards, over 100.</b> Its last reading is from before that change and isn’t used. Back at 100, it joins the read.</div>')
    elif st == "reading":
        more.append('<div class="wait" style="display:flex;align-items:center;gap:10px"><span class="spin" aria-hidden="true"></span><span><b>Reading this deck.</b> It’s at 100 and hasn’t been read before; this takes a second or two.</span></div>')
    elif pick:
        more.append(f'<div class="wait">{s["who"]} picks their own deck on their phone. Until then this seat is left out of the read.</div>')
    if s["sug"]:
        more.append(s["sug"])
    main = f'<div class="main">{art}<span class="who"><span class="nm">{name}{you}{tag}</span>{deck}{br}</span>{rt}</div>'
    more_html = f'<div class="more">{"".join(more)}</div>' if more else ""
    ctl = ""
    if s["own"] or s["changed"]:
        chg = f'<span class="chg" style="margin-right:auto"><i></i>{s["changed"]}</span>' if s["changed"] else ""
        btn = '<button class="lnk" type="button" style="min-height:36px;font-size:13px">Change deck</button>' if s["own"] else ""
        ctl = f'<div class="ctl">{chg}{btn}</div>'
    return f'<article class="{cls}" aria-label="{name}’s seat">{wash}{main}{more_html}{ctl}</article>'

def table_desk(seats, rd, meta="colin", h=1000, setter=False, overlay="", logbtn=True, side_extra="", av="HH", fixed=False):
    right = '<button class="btn gho sm" type="button">Seats</button>' if setter else ""
    m = META[meta].replace("<br>", " · ")
    head = (f'<div class="dph"><div><div class="bk">‹ Friends</div><h1>Rule 0 check</h1><div class="meta">{m}</div></div>{right}</div>')
    lg = ('<button class="btn gho full" type="button">Log this game</button>' if logbtn else "")
    body = (head + f'<div class="dbody rows"><div class="drows">{"".join(seat_row(s) for s in seats)}</div>'
            f'<div class="dside">{rd}{side_extra}{lg}</div></div>')
    return desk(body, h=h, overlay=overlay, av=av, fixed=fixed)

# ---------- members, for the pickers and the pod card ----------
MEMBERS = [
    dict(who="You", art="ghalta", you=True, sub="5 decks"),
    dict(who="Colin", art="zimone", tag="owner", sub="3 decks"),
    dict(who="Peter", art="giada", sub="3 decks"),
    dict(who="Max", art="gisa", tag="not a friend", sub="picks their own"),
    dict(who="Chris", art="", sub="no decks yet", off=True),
]

def mtile(m, on=False):
    im = (f'<span class="im"><img src="art/{m["art"]}.jpg" alt=""></span>' if m["art"]
          else f'<span class="im ini">{m["who"][:2].upper()}</span>')
    ck = f'<span class="ck" aria-hidden="true">{check_svg() if on else ""}</span>' if not m.get("off") else ""
    cls = "mt" + (" on" if on else "") + (" off" if m.get("off") else "")
    tag = f'<small>{m["tag"]}</small>' if m.get("tag") else ""
    dis = ' aria-disabled="true"' if m.get("off") else ""
    return (f'<button class="{cls}" type="button" role="checkbox" aria-checked="{"true" if on else "false"}"{dis}>{im}{ck}'
            f'<span class="n"><span>{m["who"]}</span>{tag}</span><span class="s">{m["sub"]}</span></button>')

INVITE = ('<button class="inv" type="button"><span class="pl" aria-hidden="true">+</span><span>'
          '<b>Playing with someone not on The 99?</b><br>Invite them. Once they join and Colin adds them to the pod, they can take a seat.</span></button>')

def pod_card(table=None, owner_you=False, desk=False):
    ms = MEMBERS
    lis = "".join(
        f'<li class="{"you" if m.get("you") else ""}">'
        + (f'<span class="pi"><img src="art/{m["art"]}.jpg" alt=""></span>' if m["art"] else f'<span class="pi ini">{m["who"][:2].upper()}</span>')
        + f'<span class="pn">{m["who"]}' + (f'<small>{m["tag"]}</small>' if m.get("tag") else "") + '</span></li>'
        for m in ms)
    wash = "".join(f'<img src="art/{m["art"]}.jpg" alt="">' for m in ms if m["art"])
    if table == "open":
        row = (f'<a class="rz open" href="#"><span class="ic">{ico_table()}</span><span class="tx"><b>Tonight’s table</b>'
               f'<span>4 seated · open until 9:40 pm tomorrow</span></span><span class="faces">'
               + "".join(face(a) for a in ["ghalta", "zimone", "giada", "gisa"]) + f'</span><span style="width:28px;color:var(--fg-faint)">{chev()}</span></a>')
    elif table == "off":
        row = ""
    else:
        row = (f'<button class="rz" type="button"><span class="ic">{ico_table()}</span><span class="tx"><b>Rule 0 check</b>'
               f'<span>Seat tonight’s players, compare their decks</span></span><span style="width:28px;color:var(--fg-faint)">{chev()}</span></button>')
    grid = ' style="grid-template-columns:repeat(5,116px)"' if desk else ""
    return (f'<div class="podc"><div class="pwsh" aria-hidden="true">{wash}</div><div class="hd"><b>Thursday night</b>'
            f'<span>5 members · Colin owns it</span><span class="mn" aria-hidden="true">···</span></div><ul{grid}>{lis}</ul>'
            f'<label class="share"><i></i>Share my spares with this pod</label>{row}</div>')
