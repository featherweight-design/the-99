from kit import *
from b_sheet import RESULTS_IN, RECENT

GRID = ["lathliss", "ghalta", "miku", "killian", "ashling", "dina", "invisible-woman", "quintorius", "rootha", "heroes",
        "sai", "captain-america"]


def rail(state="rest", active="Collection"):
    cls = {"rest": "", "on": " on", "hov": " hov"}[state]
    slots = "".join(f'<span class="rsl{" on" if n == active else ""}">{nav_icon(n)}</span>'
                    for n in ["Home", "Collection", "Commanders", "Discover", "Decks"])
    return (f'<div class="rail"><span class="mk">{crown(6, 8.5, 3)}<span class="nn">99</span></span>'
            f'<span class="rsrch{cls} new" aria-label="Search all cards" aria-keyshortcuts="Meta+K">{ico_search(17)}<small>⌘K</small></span>'
            f'{slots}<span class="rfoot"><span class="rav">HH</span></span></div>')


def coll_page():
    tl = "".join(f'<div class="tile"><div class="ar"><img src="art/{k}.jpg" alt=""></div><div class="cpt"><span class="cn">{CARDS[k].get("flavor") or CARDS[k]["name"]}</span>'
                 f'<span class="cs">×{CARDS[k]["owned"] or 1} · {"in a deck" if CARDS[k]["decks"] else "free"}</span></div></div>' for k in GRID)
    return ('<div class="main"><div class="chd"><div><h1>Collection</h1><div class="stats">1,284 cards · 912 unique</div></div><span class="hbtn">+ Add cards</span></div>'
            '<div class="dtb"><span class="tab on">Cards</span><span class="tab">Sets</span><span class="tab">Proxies</span><span class="tab">History</span><span class="tab">Wishlist</span></div>'
            '<div class="tb"><div class="sf">' + ico_search(18) + 'Search by card name…</div><span class="dd">Name ▾</span></div>'
            f'<div class="grid">{tl}</div></div>')


def fly(field, panel=""):
    return f'<div class="fly new" style="outline-offset:6px">{field}{panel}</div>'


def fld(text="", caret=True, esc=True):
    if text:
        return (f'<div class="dfld">{ico_search(18)}<span>{text}</span>{"<span class=caret></span>" if caret else ""}'
                f'<span class="clr">✕</span></div>')
    return (f'<div class="dfld ph0">{ico_search(18)}<span class="caret" style="margin-left:-2px"></span><span>Search all cards</span>'
            f'{"<span class=esc>esc</span>" if esc else ""}</div>')


def dres(inner, prog=False):
    return f'<div class="dres">{"<div class=prog><i></i></div>" if prog else ""}{inner}</div>'


def desk(rail_state, overlay=""):
    return f'<div class="dk" data-check="desktop">{rail(rail_state)}{coll_page()}{overlay}</div>'


def board():
    q = "in"
    d1 = desk("rest")
    d1h = desk("hov", '<span style="position:absolute;left:72px;top:82px;z-index:9;height:28px;padding:0 10px;border-radius:7px;background:var(--surface-raised);border:1px solid var(--border-strong);display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--fg);box-shadow:0 10px 24px rgba(0,0,0,.45)">Search all cards<span style="font:10.5px IBM Plex Mono,monospace;color:var(--fg-faint)">⌘K</span></span>')
    d2 = desk("on", fly(fld(), dres('<div class="hd">Recent cards<a href="#">Clear</a></div>' + "".join(row(k, first=(i == 0), cls=("act" if i == 0 else "")) for i, k in enumerate(RECENT)))))
    d2n = desk("on", fly(fld(), dres('<div class="msg"><b>Look up any card</b><p>Type part of a card’s name to see what it does, whether you own it, and which of your decks hold it.</p></div>')))
    d3 = desk("on", fly(fld(q), dres('<div class="hd">Searching…</div>' + "".join(
        f'<div class="skel" style="height:58px;padding:0 14px{";border-top:0" if i == 0 else ""}"><span class="a" style="width:30px;height:42px"></span><span class="l"><i style="width:{w}%"></i><i style="width:{w2}%"></i></span></div>'
        for i, (w, w2) in enumerate([(52, 30), (40, 24), (60, 34)])), prog=True)))
    d4 = desk("on", fly(fld(q), dres('<div class="hd">10 cards</div>' + "".join(row(k, q, first=(i == 0), cls=("act" if i == 2 else "")) for i, k in enumerate(RESULTS_IN[:8]))
                                      + '<div class="ft"><span>↑ ↓ to move · ↵ to open · esc to close</span><span>10 of 10</span></div>')))
    d5 = desk("on", fly(fld("zqx"), dres('<div class="msg"><b>No card is named “zqx”</b><p>Check the spelling, or try part of the name. Tokens and emblems aren’t in the catalog.</p></div>')))
    d6 = desk("on", fly(fld(q, caret=False), dres('<div class="msg" role="alert"><p style="color:var(--fg-body)">We couldn’t search just now. Check your connection and try again.</p><span class="obtn">Try again</span></div>')))
    c = CARDS["heroes"]
    modal = ('<div class="dscrim"></div><div class="cmod"><div class="cl"><span class="ctr">3 of 10</span><div class="card"><img src="art/heroes.jpg" alt=""></div>'
             '<span style="font:11.5px \'IBM Plex Mono\',monospace;color:var(--fg-faint)">Click to zoom</span></div>'
             '<div class="cr"><span class="cx">✕</span><div class="cbody"><h3>Heroes in a Half Shell</h3>'
             f'<span class="ty" style="margin-top:-8px">{c["type"]}</span>'
             '<div class="rules"><p>Vigilance, menace, trample, haste</p><p>Whenever one or more Mutants, Ninjas, and/or Turtles you control deal combat damage to a player, put a +1/+1 counter on each of those creatures and draw a card.</p></div>'
             '<div class="box"><div class="bl">In your collection<a href="#">Edit copies</a></div><div class="bv">×1 <span style="color:var(--fg-faint)">·</span> ◆ none free</div>'
             '<div class="bl" style="margin-top:4px">In your decks</div><div class="dkr"><u>HD - Turtles</u><span>holds 1</span></div>'
             f'<div style="height:1px;background:var(--border);margin:4px 0"></div><div class="bl">Wishlist</div><span class="wbtn">{ico_bookmark(15, False)} Add to wishlist</span></div></div>'
             '<div class="cfoot"><div style="display:flex;flex-direction:column;gap:9px"><span class="lk">Buy any printing at Mana Pool ↗</span><span class="lk">◆◆ Find a deck for it →</span></div></div></div></div>')
    d7 = desk("rest", modal)
    d8 = desk("on", fly(fld(q, caret=False), dres('<div class="hd">10 cards</div>' + "".join(row(k, q, first=(i == 0), cls=("foc" if i == 2 else "")) for i, k in enumerate(RESULTS_IN[:8])))))

    W = 1300
    fr = [
        frame("D1 · the rail field at rest", d1, "The field sits at the top of the rail, under the mark and above Home: a sunken 46×48 well with the search glyph and <code>⌘K</code> (<code>Ctrl K</code> off a Mac). The rail is 62px, so the well is the field’s resting shape; it opens to its full width on a press or the shortcut.", W),
        frame("D1h · hover", d1h, "Hover fills the well with <code>--elevated</code>, like a nav slot. The rail’s name tag reads <code>Search all cards ⌘K</code>. On a touch rail (88px, no hover) the well carries the word <code>Search</code> under the glyph instead of the shortcut, as the touch rail labels its slots.", W),
        frame("D2 · focused, with recent cards", d2, "A press or ⌘K opens the field beside the rail, the way the rail’s lock note opens: 12px out, its top on the well’s, with a caret pointing back. The well stays lit. Empty, the panel lists recent cards; ↓ moves into them.", W),
        frame("D2n · focused, nothing recent", d2n, "With no recent cards the panel holds one sentence, so the field never opens onto an empty box.", W),
        frame("D3 · typing, first search in flight", d3, "The same 2-character rule and 150ms debounce as the phone. Three skeleton rows under a 2px accent bar.", W),
        frame("D4 · results", d4, "The dropdown under the field, never a panel of its own: the page stays visible, and the reader is one glance from where they were. Row 3 is active. The foot line lists the keys.", W),
        frame("D5 · no results", d5, "The shipped words, unchanged.", W),
        frame("D6 · failed", d6, "The shipped failure sentence and Try again.", W),
        frame("D7 · card details from a result", d7, "↵ or a click closes the field and opens the shipped 820 card modal, unstacked, paging through the results (3 of 10). <b>Find a deck for it</b> is there because nothing sits below the card (lock 1).", W),
        frame("D8 · back to the field", d8, "Closing the card reopens the field as it was, with focus on the row that opened it. Escape there closes the field and returns focus to wherever it was before ⌘K.", W),
    ]
    rows = "".join(f'<div class="frames">{fr[i]}{fr[i + 1]}</div>' for i in range(0, len(fr), 2))
    keys = ('<div class="note" style="width:1300px"><b>⌘K, and the keys (open items 4 and 7)</b><ul>'
            '<li><b>⌘K on a Mac, Ctrl+K elsewhere</b>, from anywhere in the app, including while a page field has focus: neither is an editing key in a text field. '
            'Never Ctrl+K on a Mac, where every text field uses it to delete to the end of the line.</li>'
            '<li>Pressed while the field is open, it selects the query, so ⌘K then typing starts a new search.</li>'
            '<li>Not while a modal or sheet is up: the shortcut is the page’s, and a dialog’s keys are the dialog’s (the rule the rail lock note already follows).</li>'
            '<li>The field is a combobox (<code>aria-expanded</code>, <code>aria-controls</code>, <code>aria-activedescendant</code>), as the deck’s Add a card field already is. ↑ ↓ move, ↵ opens, Escape clears a query and then closes.</li>'
            '<li>A polite live region, always mounted, says <code>10 cards</code> or the no-results line once typing has paused for 500ms, so each key doesn’t chatter.</li>'
            '<li>The well carries <code>aria-keyshortcuts="Meta+K"</code> (<code>Control+K</code> off a Mac) and its name is <code>Search all cards</code>.</li></ul></div>')
    body = (
        '<div class="bh"><span class="k">Card search · desktop 1300 · round 1</span><h2>The rail field and ⌘K · desktop</h2>'
        '<p class="cap" style="max-width:2000px">The shipped <code>NavRail</code> (62px, the crowned mark, five slots, the account control at the foot) over Collection. '
        'Desktop has no header, so search lives at the top of the rail (lock 4). New parts carry a dashed pink outline.</p></div>'
        + rows + keys)
    return doc("Rail field, desktop", body, 2770, 5600)
