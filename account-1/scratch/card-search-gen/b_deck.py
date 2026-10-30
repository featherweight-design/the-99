from kit import *
from b_rail import rail

CREAT = [("Terror of the Peaks", "5"), ("Thundermaw Hellkite", "5"), ("Goldspan Dragon", "5"), ("Hellkite Charger", "6"),
         ("Utvara Hellkite", "8"), ("Scourge of Valkas", "5"), ("Dragonmaster Outcast", "1"), ("Sarkhan, Fireborn", "5"),
         ("Dragonlord’s Servant", "2"), ("Thunderbreak Regent", "4"), ("Moonveil Regent", "5"), ("Old Gnawbone", "7")]
SPELLS = [("Dragon Tempest", "2"), ("Chaos Warp", "3"), ("Lightning Bolt", "1"), ("Vandalblast", "1"), ("Sarkhan’s Unsealing", "4")]


def drows(items, dashed=()):
    out = []
    for i, (n, mv) in enumerate(items):
        d = " d" if n in dashed else ""
        out.append(f'<div class="drow"><span class="dot{d}"></span><span class="n">{n}</span><span class="pips">'
                   f'<span class="pip" style="background:#D9D6CF">{mv}</span><span class="pip" style="background:var(--r)"></span></span><span class="x">✕</span></div>')
    return "".join(out)


def hero():
    return ('<div class="dhero"><img src="art/lathliss.jpg" alt="" style="top:-66px;width:100%;left:0"><div class="t"><h1>HD - Dragons</h1>'
            '<div class="m"><span class="chip-ok">Draft</span><span class="sw" style="background:var(--r)"></span>Lathliss, Dragon Queen · Red</div></div></div>'
            '<div class="dprog"><div class="bar"><i style="width:94%"></i></div><b>94</b><span style="font:13px IBM Plex Mono,monospace;color:var(--fg-faint)">/ 99</span></div>')


def dtabs():
    return '<div class="dtabs"><span class="on">Your deck<small>94</small></span><span>Analysis</span><span>Consider<small>64</small></span><span>Games</span></div>'


def dock(text="Add a card by name · Red only", on=False):
    cls = "f on" if on else "f"
    inner = (f'<span style="color:var(--fg)">{text}</span><span style="width:1.5px;height:18px;background:var(--accent);margin-left:-8px"></span>'
             if on else f'<span>{text}</span>')
    return f'<div class="dock"><div class="{cls}">{ico_search(17)}{inner}</div><span class="tog"><i></i>Owned only</span></div>'


def pin(n, x, y):
    return f'<span class="ann" style="left:{x}px;top:{y}px"><span class="pin">{n}</span></span>'


def board():
    # ---- phone ----
    p1 = phone(header() + '<div class="pb">' + hero() + dtabs() + '<div class="gh"><b>Creatures</b><span>32</span></div>' + drows(CREAT[:4]) + '</div>'
               + dock() + tabbar("Decks") + pin(1, 250, 34) + pin(2, 4, 700))
    p2 = phone('<div class="pb">' + header(float_=True) + '<div style="padding-top:80px"></div><div class="gh"><b>Creatures</b><span>32</span></div>'
               + drows(CREAT[2:12], dashed=("Utvara Hellkite",)) + '<div class="gh"><b>Instants</b><span>9</span></div>' + drows(SPELLS[:2]) + '</div>'
               + dock() + tabbar("Decks")
               + '<span class="meas" style="left:356px;top:74px;width:26px;height:582px;border-left:0;border-right:0;writing-mode:vertical-rl">582px between them</span>')
    qres = ('<div class="qres" style="bottom:357px">'
            + "".join(f'<div class="qrow"><span class="th"><img src="art/{k}.jpg" alt=""></span><span class="tx"><b>{n}</b><span>{t} · {o}</span></span><span class="ad">↵</span></div>'
                      for k, n, t, o in [("lathliss", "Lathliss, Dragon Queen", "Legendary Creature — Dragon", "✓ In deck"),
                                         ("ghalta", "Ghalta, Primal Hunger", "Legendary Creature", "not red")][:1]) + '</div>')
    p3 = phone('<div class="pb"><div style="padding-top:8px"></div><div class="gh"><b>Creatures</b><span>32</span></div>' + drows(CREAT[4:12]) + '</div>'
               + '<div style="position:absolute;left:0;right:0;bottom:291px;z-index:9">'
               + '<div class="qres" style="position:relative;bottom:auto">'
               + '<div class="qrow"><span class="th"><img src="art/zada.jpg" alt=""></span><span class="tx"><b>Zada, Hedron Grinder</b><span>Legendary Creature — Goblin Ally · not owned</span></span><span class="ad">↵</span></div>'
               + '<p style="margin:2px 2px 4px;font:10.5px IBM Plex Mono,monospace;color:var(--fg-locked)">1 match · Red only</p></div>'
               + dock("zad", on=True) + '</div>' + kbd())
    sh_rows = (row("giada", "gia", first=True) + row("gisa", "gi", c=dict(CARDS["gisa"])))
    p4 = phone(header(search="on") + '<div class="pb">' + hero() + dtabs() + '</div>' + dock() + tabbar("Decks")
               + '<div class="ss new" style="outline-offset:-3px;border-radius:34px"><div class="ssh"><div class="sfld on" style="color:var(--fg)">'
               + ico_search(18) + '<span>gia</span><span class="caret"></span><span class="clr">✕</span></div><span class="sx">✕</span></div>'
               + '<div class="ssb"><div class="smeta">1 card</div>' + row("giada", "gia", first=True) + '</div>' + kbd() + '</div>')

    # ---- desktop ----
    def deskdeck(overlay="", dockon=False):
        rows_l = drows(CREAT[:8])
        rows_r = drows(SPELLS) + drows(CREAT[8:11])
        page = ('<div class="main"><div style="position:relative;height:260px;flex:none;overflow:hidden">'
                '<img src="art/lathliss.jpg" alt="" style="position:absolute;left:0;top:-120px;width:620px;opacity:.95">'
                '<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(14,15,20,0) 30%,rgba(14,15,20,1) 52%)"></div>'
                '<div style="position:absolute;left:620px;bottom:30px;display:flex;flex-direction:column;gap:10px">'
                '<h1 style="margin:0;font:700 30px Cinzel,serif">HD - Dragons</h1>'
                '<div class="m" style="display:flex;gap:8px;align-items:center;font:12.5px IBM Plex Mono,monospace;color:var(--fg-body)"><span class="sw" style="background:var(--r)"></span>Lathliss, Dragon Queen · Red <span class="chip-ok">Draft</span></div>'
                '<div class="dprog" style="padding:0;width:260px"><div class="bar"><i style="width:94%"></i></div><b>94</b></div></div></div>'
                '<div class="dtabs" style="padding:0 30px;gap:30px"><span class="on" style="font-size:15px">Your deck<small>94</small></span><span style="font-size:15px">Analysis</span><span style="font-size:15px">Consider<small>64</small></span><span style="font-size:15px">Games</span><span style="font-size:15px">Versions<small>3</small></span></div>'
                '<div style="flex:1;min-height:0;overflow:hidden;display:grid;grid-template-columns:1fr 1fr;gap:0 24px;padding:6px 18px">'
                f'<div><div class="gh"><b>Creatures</b><span>32</span></div>{rows_l}</div><div><div class="gh"><b>Instants</b><span>9</span></div>{rows_r}</div></div>'
                '<div class="dock" style="padding:11px 30px">'
                + ('<div class="f on" style="max-width:520px;height:38px;font-size:14px;color:var(--fg)">' + ico_search(16) + 'moonv</div>' if dockon else
                   '<div class="f" style="max-width:520px;height:38px;font-size:14px">' + ico_search(16) + 'Add a card by name · Red only</div>')
                + '<span class="tog"><i></i>Owned only</span></div></div>')
        return f'<div class="dk" data-check="desktop">{rail("on" if overlay else "rest", active="Decks")}{page}{overlay}</div>'

    from b_rail import fly, fld, dres
    dd1 = deskdeck()
    dd2 = deskdeck(fly(fld("gia"), dres('<div class="hd">1 card</div>' + row("giada", "gia", first=True, cls="act"))))

    body = (
        '<div class="bh"><span class="k">Card search · the deck page · round 2</span><h2>Two searches on the deck page</h2>'
        '<p class="cap" style="max-width:2000px">Lock 6: the deck keeps its own bottom field for adding a card to <b>this</b> deck, filtered by the commander’s colors, '
        'and the global search looks up <b>any</b> card. They are labelled apart: <b>Search all cards</b> <span class="pin">1</span> and <b>Add a card</b> <span class="pin">2</span>. '
        'Fixture: HD - Dragons, Lathliss, Red, 94 of 99.</p></div>'
        '<div class="sec"><h3>Phone</h3><div class="frames">'
        + frame("DP1 · both on one screen", p1, "<b>1</b> is the header’s icon, named <code>Search all cards</code>. <b>2</b> is the deck’s field, which already reads <code>Add a card by name · Red only</code>, so d9’s label is its first three words and nothing changes. One is a glyph at the top, the other a field at the bottom, so they never read as one control.")
        + frame("DP2 · the header back over the list", p2, "Mid-page, a small scroll up brings the header back. The dock and the tab bar keep the bottom, the header takes the top, and 582px of list sits between them at 844 (lock 7). The header only ever overlays the list.")
        + frame("DP3 · typing in Add a card", p3, "The deck’s field has focus, the keyboard is up and its results rise above the dock. Quick return is suspended, so scrolling the list up won’t bring the header over these results. When the keyboard goes, the rule resumes.")
        + frame("DP4 · Search all cards from the deck", p4, "The header’s sheet covers the dock and everything else. It finds Giada, a white card the deck’s Red-only field would never offer, which is the difference between the two searches in one picture.")
        + '</div></div>'
        '<div class="sec"><h3>Desktop</h3><div class="frames">'
        + frame("DD1 · the rail slot beside the page’s own add field", dd1, "The rail’s search slot at the top left, the deck’s add field docked at the foot of the column, as shipped. A whole screen apart, and the deck’s field still names the colors it filters by.", 1300)
        + frame("DD2 · the rail field open on the deck page", dd2, "⌘K opens the field over the deck. It never touches the deck: pressing Giada opens her card details, where Find a deck is the way to put her in one. The deck’s add field stays where it is.", 1300)
        + '</div></div>'
    )
    return doc("Deck page, both searches", body, 2770, 2400)
