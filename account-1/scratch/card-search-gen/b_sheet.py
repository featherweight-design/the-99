from kit import *

RESULTS_IN = ["invisible-woman", "zimone", "heroes", "ashling", "dina", "doom", "quintorius", "rootha", "zada", "captain-america"]
RECENT = ["lathliss", "ghalta", "miku", "killian", "giada"]


def sheet_head(text="", focused=True, clear=False):
    if text:
        inner = f'<span>{text}</span><span class="caret"></span>' if focused else f'<span>{text}</span>'
        if clear:
            inner += '<span class="clr">✕</span>'
        cls = "sfld on" if focused else "sfld"
        return (f'<div class="ssh"><div class="{cls}" style="color:var(--fg)">{ico_search(18)}{inner}</div>'
                f'<span class="sx" aria-label="Close search">✕</span></div>')
    caret = '<span class="caret" style="margin-left:-2px"></span>' if focused else ''
    cls = "sfld on" if focused else "sfld"
    return (f'<div class="ssh"><div class="{cls}">{ico_search(18)}{caret}<span>Search all cards</span></div>'
            f'<span class="sx" aria-label="Close search">✕</span></div>')


def sheet(head, body, keyboard=True, prog=False):
    return (f'<div class="ss new" style="outline-offset:-3px;border-radius:34px">{head}{"<div class=prog><i></i></div>" if prog else ""}'
            f'<div class="ssb">{body}</div>{kbd() if keyboard else ""}</div>')


def under():
    # the page the sheet was opened from, mounted under it (Collection grid)
    return header() + '<div class="pb"></div>' + tabbar("Collection")


def board():
    q = "in"
    fan = graphic_a()

    s1 = phone(under() + sheet(sheet_head(), f'<div class="sempty">{fan}<b>Look up any card</b><p>Type part of a card’s name to see what it does, whether you own it, and which of your decks hold it.</p></div>'))
    s2 = phone(under() + sheet(sheet_head(),
        '<div class="slab"><span class="k">Recent cards</span><a href="#">Clear</a></div>' +
        "".join(row(k, first=(i == 0)) for i, k in enumerate(RECENT))))
    s3 = phone(under() + sheet(sheet_head(q, clear=True),
        '<div class="smeta">Searching…</div>' + "".join(
            f'<div class="skel"{" style=border-top:0" if i == 0 else ""}><span class="a"></span><span class="l"><i style="width:{w}%"></i><i style="width:{w2}%"></i></span></div>'
            for i, (w, w2) in enumerate([(62, 40), (48, 30), (70, 44)])), prog=True))
    s4 = phone(under() + sheet(sheet_head(q, clear=True),
        '<div class="smeta">10 cards</div>' + "".join(row(k, q, first=(i == 0)) for i, k in enumerate(RESULTS_IN[:6]))))
    s4b = phone(under() + sheet(sheet_head(q, focused=False, clear=True),
        "".join(row(k, q, first=(i == 0)) for i, k in enumerate(RESULTS_IN[2:])) , keyboard=False))
    s5 = phone(under() + sheet(sheet_head("zqx", clear=True),
        '<div class="smsg"><b>No card is named “zqx”</b><p>Check the spelling, or try part of the name. Tokens and emblems aren’t in the catalog.</p></div>'))
    s6 = phone(under() + sheet(sheet_head(q, focused=False, clear=True),
        '<div class="smsg" role="alert"><p style="color:var(--fg-body)">We couldn’t search just now. Check your connection and try again.</p><span class="obtn">Try again</span></div>', keyboard=False))
    s7 = phone(under() + sheet(sheet_head("ghal", clear=True),
        '<div class="smsg"><b style="display:flex;align-items:center;gap:8px"><i style="width:8px;height:8px;border-radius:50%;background:var(--warning);display:inline-block"></i>You’re offline</b>'
        '<p>Search needs a connection. Your results come back on their own once you’re online, so keep typing if you like.</p></div>'))

    # handover: card details from result 3 (Heroes in a Half Shell), unstacked
    c = CARDS["heroes"]
    h1 = phone(f'<div class="pwash wash-heroes"></div><span class="pcount">3 of 10</span><span class="pclose">✕</span>'
               f'<div class="pcard" style="transform:rotate(-1deg)"><img src="art/heroes.jpg" alt=""></div>'
               f'<div class="tsr"><span class="grip"></span><h3 style="margin:0;font:700 22px/1.15 \'Chakra Petch\',sans-serif">Heroes in a Half Shell</h3>'
               f'<span style="font-size:14px;color:var(--fg-muted);margin-top:6px">{c["type"]}</span>'
               f'<span style="display:flex;gap:4px;margin-top:12px"><span class="pip" style="width:22px;height:22px;font-size:12px;background:#D9D6CF">W</span><span class="pip" style="width:22px;height:22px;background:var(--u)"></span><span class="pip" style="width:22px;height:22px;background:var(--b)"></span><span class="pip" style="width:22px;height:22px;background:var(--r)"></span><span class="pip" style="width:22px;height:22px;background:var(--g)"></span></span>'
               f'<div style="margin-top:auto;display:flex;gap:10px"><span class="obtn" style="flex:1;justify-content:center;margin:0">All details</span></div></div>')
    h2 = phone(f'<div class="pwash wash-heroes"></div><span class="pcount">3 of 10</span><span class="pclose">✕</span>'
               f'<div class="psheet"><span class="grip"></span><div class="psb">'
               f'<h3 style="margin:0;font:700 24px/1.12 \'Chakra Petch\',sans-serif;padding-right:40px">Heroes in a Half Shell</h3>'
               f'<span style="font-size:14px;color:var(--fg-muted);margin-top:-6px">{c["type"]}</span>'
               f'<div class="rules"><p>Vigilance, menace, trample, haste</p><p>Whenever one or more Mutants, Ninjas, and/or Turtles you control deal combat damage to a player, put a +1/+1 counter on each of those creatures and draw a card.</p></div>'
               f'<div class="box"><div class="bl">In your collection<a href="#">Edit copies</a></div><div class="bv">×1 <span style="color:var(--fg-faint)">·</span> ◆ none free</div>'
               f'<div class="bl" style="margin-top:4px">In your decks</div><div class="dkr"><u>HD - Turtles</u><span>holds 1</span></div>'
               f'<div style="height:1px;background:var(--border);margin:4px 0"></div><div class="bl">Wishlist</div><span class="wbtn">{ico_bookmark(15, False)} Add to wishlist</span></div>'
               f'<div class="pfl"><span class="lk" style="font-size:16px">Buy any printing at Mana Pool ↗</span><span class="lk" style="font-size:16px;align-self:flex-start">◆◆ Find a deck for it →</span></div>'
               f'</div></div>')
    h3 = phone(under() + sheet(sheet_head(q, focused=False, clear=True),
        '<div class="smeta">10 cards</div>' + "".join(row(k, q, first=(i == 0), cls=("foc" if k == "heroes" else ""))
                                                    for i, k in enumerate(RESULTS_IN[:8])), keyboard=False))

    f = [
        frame("S1 · empty, no recent cards", s1, "The icon opens the sheet over the whole screen, header and tab bar included, with the field focused and the keyboard up. Nothing has been opened from search yet, so the sheet says what it’s for under the empty-state graphic: the brand fan with a pink lens over its 99 card (option A, no card art)."),
        frame("S2 · empty, with recent cards", s2, "The last cards opened from search, newest first, up to 8, in the same rows as results. <b>Clear</b> empties the list. The list is this account’s own, on this device."),
        frame("S3 · typing, first search in flight", s3, "Search starts at 2 characters, 150ms after the last key (the shipped debounce). A 2px accent bar runs under the field and three skeleton rows hold the space. A later search keeps the previous rows at 50% under the same bar."),
        frame("S4 · results", s4, "Name only, best match first: names starting with what you typed, then a word starting with it, then any match (G3). Typed letters are in the accent. The count is the live region’s text too."),
        frame("S4b · results, scrolled", s4b, "Dragging the list lowers the keyboard so all of it is in reach. The field keeps the query, and its ✕ clears it. The read returns up to 20 cards, and at 20 a foot line says to type more of the name."),
        frame("S5 · no results", s5, "The shipped Add cards words, unchanged. The keyboard stays up, because the next thing to do is fix the spelling."),
        frame("S6 · failed", s6, "The shipped failure sentence, in the result area, with one <b>Try again</b> press. It isn’t a toast because nothing else is on screen to keep. The field keeps the query."),
        frame("S7 · offline", s7, "The field still takes typing, and search runs by itself when the connection comes back. Recent cards are hidden offline, because card details needs the network too."),
        frame("H1 · a result opens card details", h1, "Pressing row 3 closes the search sheet and opens card details on its own, unstacked, exactly as it ships. It pages through the 10 results (<b>3 of 10</b>), and its close is the plain ✕."),
        frame("H2 · Find a deck stays", h2, "Because the card is a first layer, nothing sits below it and <b>Find a deck for it</b> draws as usual (lock 1). Card details doesn’t change at all."),
        frame("H3 · back to the sheet", h3, "✕, Escape, a swipe down or the back gesture close the card, and the search sheet comes back as it was: query, results, scroll. Focus lands on the row that opened the card. The keyboard stays down."),
    ]
    body = (
        '<div class="bh"><span class="k">Card search · phone 390 · round 2</span><h2>The search sheet · phone</h2>'
        '<p class="cap" style="max-width:1500px">Opened from the header icon on any phone screen. Every frame is the shipped shell at 390×844 with the Kamigawa theme. '
        'The ownership on each row is the reader’s own: their copies, their decks, their wishlist. New parts carry a dashed pink outline.</p></div>'
        '<div class="sec"><h3>The seven states</h3><div class="frames">' + "".join(f[:8]) + '</div></div>'
        '<div class="sec"><h3>The handover to card details (open item 8)</h3><div class="frames">' + "".join(f[8:]) + '</div></div>'
    )
    return doc("Search sheet, phone", body, 1850, 3900)
