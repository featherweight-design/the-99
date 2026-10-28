"""All-decks cart v2 R1: the boards. Each returns a whole .dc.html."""
import kit
import sr as S
import cart2 as X
from kit import doc, board_head, frame, frames, phone, desk

BADGE = {"Home": 2, "Friends": 2}
DH = 980      # desktop frame height
LH = 668      # desktop list box height inside it


def ph(inner, h=None, over=""):
    return phone(inner, "Decks", h=h, badges=BADGE, over=over)


def dk(inner, h=DH, over=""):
    return desk(inner, "Decks", badges=BADGE, over=over, h=h)


def note(t, b):
    return f'<div class="note"><h4>{t}</h4>{b}</div>'


def notes(*ns, cols=3):
    return f'<div class="notes" style="grid-template-columns:repeat({cols},minmax(0,1fr))">' + "".join(ns) + "</div>"


def sec(kicker, title, cap):
    return (f'<div class="bh" style="gap:6px;margin-top:10px"><div class="kick">{kicker}</div>'
            f'<h2 style="font-size:22px">{title}</h2>' + (f"<p>{cap}</p>" if cap else "") + "</div>")


FRIEND_RESULT = "4 friends · 188 spare"
CARD_RESULT = "48 cards · 9 with a friend’s spare"
DECK_RESULT = "6 decks · 50 copies"


# ================================================================ Main
CALLS = [
    ("1 · Three facts, three places",
     "A row is the card, then <b>what you need</b> (how many, for which decks), <b>what’s spare</b> and <b>what you own</b> "
     "(how many, and where they’re in use). On desktop each fact is a column under one header, so the same fact sits in the same "
     "place on every row. On a phone each fact is its own labelled line (NEED, SPARE, OWN) that never wraps. The count leads every "
     "fact, in bold mono."),
    ("2 · Long deck lists: what fits, then +N",
     "The need fact shows the deck names that fit on one line and a <b>+N</b> for the rest. It truncates at a name, never mid-name. "
     "Pressing +N opens the full list in place, each deck with its count, and <b>less</b> folds it back. It’s inline, not a modal, "
     "so you keep your place in the list. The own fact works the same way."),
    ("3 · Ask above the buy tag",
     "The right edge is one stack: Ask on top, the buy tag under it, right-aligned. Requested, Accepted, Declined, Ask instead and "
     "Ask again take Ask’s place in the stack, so the tag never moves. The press sizes are the shipped ones, one size up on a phone "
     "(36px Ask), and the two hit areas meet at the gap between them."),
    ("4 · The shipped filter chassis, in all three views",
     "The same frame as /decks, /collection and /commanders. Row 1 has <b>Search cards</b>, <b>Friend</b> and <b>Owned</b>, with "
     "<b>Sort</b> past the hairline. Row 2 has the chips, or NO FILTERS ON. Row 3 is the result line, which replaces today’s list "
     "head. Below 1000px it’s search, the sort button and a <b>Filters</b> sheet. You filter by deck with the Decks selection you "
     "already have, so there’s no second deck control. Price is a sort, not a filter."),
    ("5 · One filter across the three views",
     "Search and filters narrow the same lines, so switching views keeps them. <b>Friend · Chris</b> in By card shows the cards "
     "Chris has spare, in By deck those cards under each deck, and in By friend only Chris’s panel. <b>Any friend</b> is the "
     "“spare available” filter. Sort belongs to each view, because each view orders something different."),
    ("6 · By friend narrows and folds",
     "Each friend panel folds from its header, the same shape as the shipped By deck group. All panels start open. On desktop the "
     "open panel’s header sticks to the top of the list box while its rows scroll. The header’s figure counts both cards and spare "
     "copies: <b>41 cards · 130 spare</b>."),
    ("7 · Loading: the view is there at once",
     "The By friend segment always shows (eng’s change). While friends’ spares are read, every friend-dependent cell breathes as the "
     "shipped skeleton bar. The Friend trigger reads <b>reading…</b> and the result line says so. By friend draws skeleton panels. "
     "Everything that doesn’t depend on friends works straight away."),
    ("8 · By friend with nothing to show",
     "This view had no empty state until now, and it has two real causes, each with its own state. <b>No friends yet</b> points to "
     "Friends. <b>No friend has a spare of these</b> says what a spare is and that one will show here. A search or filter that "
     "matches nothing is the chassis’s own no-match state, with the one fix that would bring rows back."),
]
DECIDE = [
    ("D1", "Columns on desktop?", "Board 1, frames <b>A2</b> vs <b>A3</b>. Columns line facts up down a long list; the alternative is the phone’s labelled lines at every width. <b>Recommended: columns.</b>"),
    ("D2", "+N opens in place?", "Board 1, frame <b>C1 / C2</b>. In place keeps you in the list; a modal on desktop and a sheet on phone is the dense-row pattern. <b>Recommended: in place.</b>"),
    ("D3", "Are Friend and Owned the right two filters?", "Board 3, frames <b>A1</b> and <b>B1</b>. Left out on purpose: deck (the Decks selection already does it), price (a sort), commander (the sort puts commanders first). Also possible: a <b>Friend</b> segmented control in place of the trigger, if four friends is the norm."),
    ("D4", "Filters carry across views?", "Board 3, frames <b>C1</b> (Chris in By card) and <b>C2</b> (Chris in By friend). <b>Recommended: yes.</b> Sort stays per view."),
    ("D5", "Pin the whole chassis on a phone?", "Board 2, frame <b>B</b>. Pinned, the switch and the three chassis rows take about 190px of a 844px screen. The other option pins only the switch and the search row, and lets the chips and result line scroll away."),
    ("D6", "About", "The existing <b>Shopping for all decks</b> About entry doesn’t mention the views. Add one line on sorting and filtering, or leave it as it is? Not drawn until you say."),
]
GAPS = [
    ("G1", "Where owned copies are in use", "<code>CartLine.heldElsewhere</code> is a count, so the own fact needs the names of the decks holding those copies. Fallback if the read can’t give them: <b>2 · in other decks</b> (today’s words), with no +N."),
    ("G2", "Loading as a state", "<code>useByFriend</code> returns null both before the read and when it has nothing, and null hides the segment and sends <code>?view=friend</code> to By card. With eng’s change it needs three states: reading, none, groups. The segment always shows, and <code>?view=friend</code> stays put."),
    ("G3", "Filter and sort state", "This visit only, like the deck selections (Q1). Proposed: mirror <code>?q</code>, <code>?friend</code>, <code>?owned</code> and <code>?sort</code> into the URL the way <code>?view</code> is, so a reload keeps them."),
    ("G4", "Price sort", "Sorts by the line’s figure (<code>lineFact</code>, each deck at its own pick). Unpriced and sold-out lines sort last. In By deck the sort is by deck cost (the roll-up’s cents), and the lines within a deck stay commander first, then A to Z, as shipped."),
    ("G5", "A failed spares read", "Not drawn, since today’s behaviour stands: the shared toast, the cells left empty, and By friend showing its none state. Say if it needs its own state."),
]


def main_board():
    calls = notes(*[note(t, f"<p>{b}</p>") for t, b in CALLS], cols=2)
    dec = notes(*[note(f"{k} · {t}", f"<p>{b}</p>") for k, t, b in DECIDE], cols=3)
    gaps = notes(*[note(f"{k} · {t}", f"<p>{b}</p>") for k, t, b in GAPS], cols=3)
    boards = ('<div class="note"><h4>The boards</h4><ol>'
              '<li><b>1 · The row</b>: before and after, the parts of the row, every Ask state, +N opened.</li>'
              '<li><b>2 · By friend</b>: the long list at both widths, with folded panels.</li>'
              '<li><b>3 · Sort, filter, search</b>: the Friend menu, the sort menus, the phone sheet, a filtered list, no match.</li>'
              '<li><b>4 · By card and By deck</b>: the same row and chassis in the other two views.</li>'
              '<li><b>5 · Empty and one</b>: a friend with one spare, no friends yet, no friend has a spare.</li>'
              '<li><b>6 · Loading</b>: By card and By friend while friends’ spares are read.</li></ol></div>')
    body = (board_head("Shopping for all decks · v2 · account 1 · 2026-10-27",
                       "Each fact in its own place, and a way to narrow the list",
                       "A light redesign of all three views, built around <b>By friend</b>. "
                       "The brief’s problem, in Hugh’s words: “Parsing the information on each row is confusing and runs together.” "
                       "Everything here is drawn over the shipped cart (cart-view, cart-line, cart-by-friend, cart-deck-group, view-switch) "
                       "and the shipped filter chassis. It adds no new tokens and no new motion. Fixtures are illustrative: six real "
                       "decks, the four fixture friends, and made-up prices.")
            + sec("The calls", "What changed and why", "") + calls
            + sec("Your decisions", "Six things to rule on", "Each one names the artboard and frame to look at.") + dec
            + sec("For engineering", "Gaps", "") + gaps + boards)
    return doc("All decks cart v2 · the calls", body, 1612)


# ================================================================ 1 · The row
def old_row_desk():
    return ('<div class="fg" style="margin:0;width:860px"><div class="fh">' + X.face("Chris", 30, 8)
            + '<span class="nm"><b>Chris</b><span>shares with The Bros</span></span><small>130 spares</small></div>'
            '<div class="cl" style="padding:11px 14px"><span class="t"><b>Lightning Greaves</b>'
            '<span>4 · HD - Gishath, HD - Kratos, HD - Elves, HD - Goblins · <em style="font-style:normal;color:var(--fact)">7 spares</em></span>'
            '<span class="f">you own 2 · all 2 in other decks</span></span>'
            '<span class="rt"><span class="ask">Ask</span>' + S.buytag("$9.60", True) + '</span></div></div>')


def old_row_phone():
    return ('<div class="fg" style="margin:0;width:358px"><div class="fh">' + X.face("Chris", 30, 8)
            + '<span class="nm"><b>Chris</b><span>shares with The Bros</span></span><small>130 spares</small></div>'
            '<div class="cl" style="padding:11px 14px"><span class="t"><b>Lightning Greaves</b>'
            '<span>4 · HD - Gishath, HD - Kratos, HD - Elves, HD - Goblins · <em style="font-style:normal;color:var(--fact)">7 spares</em></span>'
            '<span class="f">you own 2 · all 2 in other decks</span></span>'
            '<span class="rt"><span class="ask">Ask</span>' + S.buytag("$9.60", True) + '</span></div></div>')


def new_panel_desk(cards, states=None, opened=None, w=860, colhead=True):
    st = states or {}
    rows = "".join(X.drow(c, "friend", "Chris", st.get(c), open_=(c == opened)) for c in cards)
    ch = X.colh("friend", "padding-top:2px") if colhead else ""
    return f'<div style="width:{w}px;display:flex;flex-direction:column;gap:8px">{ch}<div class="fpn">{X.fhead("Chris")}{rows}</div></div>'


def new_panel_phone(cards, states=None, opened=None):
    st = states or {}
    rows = "".join(X.prow(c, "friend", "Chris", st.get(c), open_=(c == opened)) for c in cards)
    return f'<div class="fpn" style="width:358px">{X.fhead("Chris", ph=True)}{rows}</div>'


def labelled_desk():
    """D1's alternative: the phone's labelled lines at desktop width, no columns."""
    rows = []
    for c in ["Lightning Greaves", "Sol Ring", "Swiftfoot Boots"]:
        need, price, sp, own, inuse, cmd, over = X.C[c]
        st = X.ASK.get(("Chris", c), "ask")
        owl = f'<div class="f"><em>own</em>{X.own_val(c, 2)}</div>' if own else ""
        rows.append(f'<div class="prw"><div class="l" style="max-width:520px"><span class="nm2">{c}</span>'
                    f'<div class="f"><em>need</em>{X.need_val(c, 3)}</div><div class="f"><em>spare</em><span class="fv"><b>{sp["Chris"]}</b></span></div>{owl}</div>'
                    f'<span class="act">{X.status(st)}{X.buy(price, over)}</span></div>')
    return f'<div class="fpn" style="width:860px">{X.fhead("Chris")}{"".join(rows)}</div>'


def row_board():
    three = ["Lightning Greaves", "Sol Ring", "Swiftfoot Boots"]
    a = frames(
        frame("<b>A1</b> · shipped · 1300 list", f'<div class="cmpw"><span class="tg old">today</span>{old_row_desk()}</div>',
              "Hugh’s example as it ships today. The count, four deck names, the friend’s spares and the owned fact run together over two grey lines."),
        frame("<b>A1</b> · shipped · 390", f'<div class="cmpw"><span class="tg old">today</span>{old_row_phone()}</div>',
              "At 390 the deck names wrap mid-list, and Ask sits beside the tag."),
        gap=44)
    b = frames(
        frame("<b>A2</b> · new · 1300 list", f'<div class="cmpw"><span class="tg nw">v2</span>{new_panel_desk(three)}</div>',
              "<b>Columns under one header</b> (the header sits once above the list, not in every panel): card · <b>4</b> for two decks +2 · "
              "<b>7</b> spare · <b>2</b> owned, in use in Thorin +1 · Ask above the tag. Sol Ring shows a Requested status in Ask’s place."),
        frame("<b>A2</b> · new · 390", f'<div class="cmpw"><span class="tg nw">v2</span>{new_panel_phone(three)}</div>',
              "One labelled line per fact, which never wraps: <b>NEED</b>, <b>SPARE</b>, <b>OWN</b>. The action stack sits top right."),
        gap=44)
    c = frames(
        frame("<b>A3</b> · D1’s alternative · labelled lines at 1300", f'<div class="cmpw"><span class="tg old">alt</span>{labelled_desk()}</div>',
              "The phone’s labelled lines at desktop width. It reads fine for one row, but down a list of 41 the facts don’t line up, "
              "and each row is taller. Drawn so you can compare it with A2."),
        gap=44)
    # anatomy
    an = ('<div style="display:flex;flex-direction:column;gap:10px;width:560px">'
          '<div class="ann"><b>1</b><span>Name: the shipped press (card details, hover preview), with the commander tag under it as shipped.</span></div>'
          '<div class="ann"><b>2</b><span>You need: the count, then the decks that fit, then +N. Truncated at a name, never mid-name.</span></div>'
          '<div class="ann"><b>3</b><span>Spare: this friend’s spare copies. In By card and By deck it is everyone’s spares, with the shipped glyph press that opens the spares modal.</span></div>'
          '<div class="ann"><b>4</b><span>You own: the count, then where those copies are in use (G1). The cell is empty when you own none.</span></div>'
          '<div class="ann"><b>5</b><span>The action stack: Ask (or its status) above the buy tag. The tag is the shipped tag and press, including over $5.</span></div></div>')
    pins = ('<div style="position:relative;width:860px">' + new_panel_desk(["Lightning Greaves"])
            + '<span class="pin" style="left:10px;top:72px">1</span><span class="pin" style="left:212px;top:72px">2</span>'
            '<span class="pin" style="left:463px;top:72px">3</span><span class="pin" style="left:541px;top:72px">4</span>'
            '<span class="pin" style="left:836px;top:72px">5</span></div>')
    anat = f'<div style="display:flex;gap:44px;align-items:flex-start">{pins}{an}</div>'
    # states
    st_cards = ["Lightning Greaves", "Sol Ring", "Arcane Signet", "Cultivate", "Beast Within", "Swiftfoot Boots"]
    st_map = {"Lightning Greaves": "ask", "Sol Ring": "asked", "Arcane Signet": "yes", "Cultivate": "no", "Beast Within": "again", "Swiftfoot Boots": "instead"}
    labels = ('<div style="display:flex;flex-direction:column;gap:6px;font:11px/1.5 \'IBM Plex Mono\';color:var(--fg-muted);width:300px">'
              '<span><b style="color:var(--fg)">Ask</b> · nobody asked yet</span>'
              '<span><b style="color:var(--accent-text)">Requested</b> · your open ask (days left in Your requests)</span>'
              '<span><b style="color:var(--success)">Accepted</b> · Chris said yes; press buy when it’s yours</span>'
              '<span><b style="color:var(--fg-body)">Declined</b> · no Ask for 14 days</span>'
              '<span><b style="color:var(--fg)">Ask again</b> · the last ask expired</span>'
              '<span><b style="color:var(--fg-body)">Ask instead</b> · open with someone else; one press moves it</span>'
              '<span style="margin-top:6px">The rule for which state shows is the shipped <code>rowAsk</code>, unchanged. Only where the state sits has changed.</span></div>')
    sts = frames(
        frame("<b>B1</b> · every Ask state · 1300", new_panel_desk(st_cards, st_map)),
        frame("<b>B1</b> · every Ask state · 390", new_panel_phone(st_cards, st_map)),
        frame("<b>B1</b> · key", labels), gap=44)
    op = frames(
        frame("<b>C1</b> · +2 opened · 1300", new_panel_desk(["Lightning Greaves", "Sol Ring"], opened="Lightning Greaves"),
              "Pressing <b>+2</b> opens the decks in place, each with its count, and <b>less</b> folds them back. The row grows and the rest of the row stays top-aligned."),
        frame("<b>C2</b> · +3 opened · 390", new_panel_phone(["Lightning Greaves", "Sol Ring"], opened="Lightning Greaves"),
              "The same press at 390. The list sits under NEED and lines up with its value. The +N press has a 44px hit area."),
        gap=44)
    body = (board_head("1 · The card row", "Separated: what you need, what’s spare, what you own",
                       "Lightning Greaves is Hugh’s real example. Before and after, the parts of the row, every Ask state in the new stack, and +N opened.")
            + sec("A · before and after", "One line of everything, or three facts in three places", "") + a + b + c
            + sec("Anatomy", "The five parts", "") + anat
            + sec("B · Requested, Accepted and the rest", "The spare-request states, carried into the new row", "") + sts
            + sec("C · Long deck lists", "+N, opened in place", "") + op)
    return doc("All decks cart v2 · the row", body, 2080)


# ================================================================ 2 · By friend
def friend_board():
    ctl = X.chassis("friend", True, result=FRIEND_RESULT)
    lst = X.by_friend_list(True, sticky_first=False)
    d1 = dk(X.page("friend", lst, True, ctl, LH))
    lst2 = X.by_friend_list(True, folded=("Chris",), cards={"Colin": ["Lightning Greaves", "Sol Ring", "Beast Within", "Chaos Warp"]})
    d2 = dk(X.page("friend", lst2, True, ctl, LH))
    pctl = X.chassis("friend", False, result=FRIEND_RESULT)
    plst = X.by_friend_list(False)
    p1 = ph(X.page("friend", plst, False, pctl, 1180))
    body = (board_head("2 · By friend", "The long list: four friends, 188 spare copies, 71 cards",
                       "Panels most spare first (shipped order), each foldable, all open to start. The chassis sits above the list in the controls "
                       "that already stay put (the list scrolls in its own box on desktop, and the controls are pinned on a phone). The column header "
                       "sits once above the list.")
            + frames(frame("<b>A</b> · By friend · 1300", d1,
                           "Chris’s panel is open. Its header sticks to the top of the list box while its 41 rows scroll, so you always know whose spares you’re looking at."),
                     frame("<b>A′</b> · Chris folded · 1300", d2,
                           "Press Chris’s header to fold the panel and reach Colin’s. A folded panel still shows its figure. The fold is kept for this visit."))
            + frames(frame("<b>B</b> · By friend · 390", p1,
                           "The checkout heads the page as shipped. The switch and the chassis are pinned (D5) while the panels scroll under them. Each row is labelled lines with the action stack on the right.")))
    return doc("All decks cart v2 · By friend", body, 2880)


# ================================================================ 3 · Sort, filter, search
def friend_pop():
    rows = [("Any friend", "9", True)] + [(f, str(X.FTOT[f][0]), False) for f in X.FR]
    its = "".join(f'<div class="it{" on" if on else ""}"><span class="rad"></span>{n}<small>{c}</small></div>' for n, c, on in rows[:1])
    its += '<div class="sep2"></div>'
    its += "".join(f'<div class="it"><span class="box"></span>{X.face(n, 22, 6)}{n}<small>{c}</small></div>' for n, c, _ in rows[1:])
    return f'<div class="pop" style="left:600px;top:92px"><div class="ph2">Friend · has a spare</div>{its}</div>'


def sort_pop(view, left):
    opts = {"card": ["Most decks", "Price, high first", "Price, low first", "Most spare", "Name"],
            "deck": ["Largest first", "Cost, high first", "Name"],
            "friend": ["Most spare", "Most cards", "Name"]}[view]
    its = "".join(f'<div class="it{" on" if i == 0 else ""}"><span class="rad"></span>{o}</div>' for i, o in enumerate(opts))
    return f'<div class="pop" style="left:{left}px;top:92px;width:220px"><div class="ph2">Sort</div>{its}</div>'


def sheet():
    pills = "".join(f'<span class="pill{" on" if f == "Chris" else ""}">{X.face(f, 32, 16)}{f}<small>{X.FTOT[f][0]}</small></span>' for f in X.FR)
    return ('<div class="scr"></div><div class="sht2"><span class="grab"></span>'
            '<div class="hd"><b>Filters</b><small>23 of 48 cards match</small></div>'
            '<span class="gh">Friend · has a spare</span>'
            f'<div class="pills"><span class="pill np">Any friend</span>{pills}</div>'
            '<span class="gh">Owned</span><div class="segx"><span class="on">Any</span><span>You own some</span><span>None</span></div>'
            '<div class="bts"><span class="bp">Show 23 cards</span><span class="lnk">Clear all</span></div></div>')


def sort_sheet():
    opts = ["Most decks", "Price, high first", "Price, low first", "Most spare", "Name"]
    its = "".join(f'<div class="it{" on" if i == 1 else ""}" style="min-height:48px;font-size:15px"><span class="rad"></span>{o}</div>' for i, o in enumerate(opts))
    return ('<div class="scr"></div><div class="sht2"><span class="grab"></span><div class="hd"><b>Sort</b><small>By card</small></div>'
            f'<div class="pop" style="position:static;width:auto;border:0;box-shadow:none;background:transparent;padding:0">{its}</div></div>')


def controls_board():
    # A1: Friend menu open, By card
    ctl = X.chassis("card", True, result=CARD_RESULT, open_="friend")
    d1 = dk(X.page("card", X.by_card_list(True), True, ctl, LH, over=friend_pop()))
    # A2: sort open, By card
    ctl2 = X.chassis("card", True, result=CARD_RESULT, open_="sort")
    d2 = dk(X.page("card", X.by_card_list(True), True, ctl2, LH, over=sort_pop("card", 676)))
    # B1 phone sheet, B2 phone sort
    pctl = X.chassis("card", False, result=CARD_RESULT, open_="filters")
    p1 = ph(X.page("card", X.by_card_list(False), False, pctl, 600), h=844, over=sheet())
    pctl2 = X.chassis("card", False, result=CARD_RESULT, open_="sort")
    p2 = ph(X.page("card", X.by_card_list(False), False, pctl2, 600), h=844, over=sort_sheet())
    # C1: filtered By card, Chris + "boots"
    chris_cards = [c for c in X.ORDER_CARD if "Chris" in X.C[c][2]]
    ctl3 = X.chassis("card", True, friend="Chris", result=f"{len(chris_cards)} of 48 cards · Chris has a spare")
    d3 = dk(X.page("card", X.by_card_list(True, chris_cards), True, ctl3, LH, fade=False))
    ctl4 = X.chassis("friend", False, q="boots", friend="Chris", nfilters=1, result="1 friend · 1 card")
    p3 = ph(X.page("friend", X.by_friend_list(False, ["Chris"], cards={"Chris": ["Swiftfoot Boots"]}), False, ctl4))
    # D: no match
    ctl5 = X.chassis("card", False, q="greaves", friend="Max", nfilters=1, result="0 of 48 cards")
    nm = ('<div class="emp"><h3>No card matches both</h3><p>Lightning Greaves matches “greaves”, but Max has no spare of it. '
          'Drop Max and you get one card.</p><span class="bg">Drop Max</span></div>')
    p4 = ph(X.page("card", nm, False, ctl5))
    table = ('<div class="note" style="width:620px"><h4>Sort, per view</h4><table class="tbl"><tr><th>View</th><th>Options (first is the default, as shipped)</th></tr>'
             '<tr><td><b>By card</b></td><td>Most decks (commanders first, then most decks, then A to Z) · Price, high first · Price, low first · Most spare · Name</td></tr>'
             '<tr><td><b>By deck</b></td><td>Largest first · Cost, high first · Name. Lines in a deck stay commander first, then A to Z.</td></tr>'
             '<tr><td><b>By friend</b></td><td>Most spare · Most cards · Name. Lines in a panel keep the By card order.</td></tr></table>'
             '<h4 style="margin-top:14px">Filters, in every view</h4><table class="tbl">'
             '<tr><td><b>Search cards</b></td><td>The card name, front face included. In By friend it narrows each panel, and a panel with no match leaves.</td></tr>'
             '<tr><td><b>Friend</b></td><td><b>Any friend</b> = spare available. Pick one or more friends for the cards they have spare. Hidden when no friend has a spare. It reads <b>reading…</b> until the spares land.</td></tr>'
             '<tr><td><b>Owned</b></td><td>Any · You own some (copies you might move instead of buy) · None.</td></tr></table></div>')
    body = (board_head("3 · Sort, filter, search", "The shipped chassis over the cart’s list",
                       "Search, two filters and the sort, at both widths. The chassis is the app’s one filter frame, with the same anatomy and sizes as /decks. "
                       "The Decks selection is still how you narrow by deck.")
            + sec("A · desktop", "Friend and Sort open", "")
            + frames(frame("<b>A1</b> · Friend · 1300", d1, "One radio for <b>Any friend</b> (spare available), then each friend who has a spare, with how many of the cart’s cards they hold. More than one friend can be picked."),
                     frame("<b>A2</b> · Sort · 1300", d2, "Sort is past the hairline and is never empty. Its options change with the view (the table below)."))
            + sec("B · phone", "The Filters sheet and the sort button", "")
            + frames(frame("<b>B1</b> · Filters · 390", p1, "The chassis’s compact sheet: friends as pills with their faces, Owned as a segmented control. The primary press counts what you’ll get."),
                     frame("<b>B2</b> · Sort · 390", p2, "The ⇅ button opens the view’s sort as a sheet with 48px rows."),
                     frame("Sort and filters", table))
            + sec("C · narrowed", "A filter in By card, the same filter in By friend", "")
            + frames(frame("<b>C1</b> · Friend · Chris, By card · 1300", d3, "The cards Chris has spare, with every friend’s spares still shown in the spare cell. Switch to By friend and only Chris’s panel is left (frame C2)."),
                     frame("<b>C2</b> · Chris + “boots”, By friend · 390", p3, "The search and the filter carried across from By card. The chips row shows both, and one ✕ drops each."),
                     frame("<b>D</b> · no match · 390", p4, "The chassis’s no-match state, which names the one fix. There’s no empty list and no dead end.")))
    return doc("All decks cart v2 · sort, filter, search", body, 2900)


# ================================================================ 4 · By card and By deck
def card_deck_board():
    marks = {"Sol Ring": "asked", "Arcane Signet": "yes"}
    d1 = dk(X.page("card", X.by_card_list(True, marks=marks), True, X.chassis("card", True, result=CARD_RESULT), LH))
    p1 = ph(X.page("card", X.by_card_list(False, marks=marks), False, X.chassis("card", False, result=CARD_RESULT), 1050))
    d2 = dk(X.page("deck", X.by_deck_list(True), True, X.chassis("deck", True, result=DECK_RESULT), LH))
    p2 = ph(X.page("deck", X.by_deck_list(False), False, X.chassis("deck", False, result=DECK_RESULT), 1050))
    body = (board_head("4 · By card and By deck", "The same row and the same chassis in the other two views",
                       "By card: the spare cell is the shipped glyph press (it opens the spares modal, where Ask lives) followed by everyone’s spare copies and who has them. "
                       "The requested and accepted marks are on the glyph, as shipped. There’s no Ask on these rows, so the stack is just the buy tag. "
                       "By deck: the need fact reads from the deck’s point of view (this deck’s count, then <b>also</b> the other decks).")
            + frames(frame("<b>A</b> · By card · 1300", d1, "The commander leads (shipped order). Sol Ring has a requested mark on its glyph and Arcane Signet an accepted one."),
                     frame("<b>B</b> · By card · 390", p1, "The SPARE line shows only when a friend has a spare, so Gishath and Smothering Tithe are two lines shorter."))
            + frames(frame("<b>C</b> · By deck · 1300", d2, "The deck group keeps its shipped header (select, figure, chevron). The open group’s rows use the new columns."),
                     frame("<b>D</b> · By deck · 390", p2, "DECK in place of NEED: this deck’s count, then the other decks that need it.")))
    return doc("All decks cart v2 · By card and By deck", body, 1850)


# ================================================================ 5 · Empty and one
def empty_none(desk):
    return ('<div class="emp"><span class="glyph">' + S.sg("spare", 22) + '</span><h3>No friend has a spare of these</h3>'
            '<p>A spare is a copy none of a friend’s decks use. None of your friends has one of these 48 cards right now. When one does, it shows here.</p></div>')


def empty_nofriends(desk):
    return ('<div class="emp"><span class="glyph">' + S.sg("spare", 22) + '</span><h3>No friends yet</h3>'
            '<p>When you add friends, the spares they have of these cards show here, and you can ask for them.</p>'
            '<span class="bg">Go to Friends</span></div>')


def states_board():
    X.FTOT["Peter"] = (1, 1)
    one = X.by_friend_list(True, ["Peter"], cards={"Peter": ["Heroic Intervention"]})
    ctl1 = X.chassis("friend", True, result="1 friend · 1 spare")
    d1 = dk(X.page("friend", one, True, ctl1), h=None)
    p1 = ph(X.page("friend", X.by_friend_list(False, ["Peter"], cards={"Peter": ["Heroic Intervention"]}), False, X.chassis("friend", False, result="1 friend · 1 spare")))
    ctl0 = X.chassis("friend", True, result="0 friends", nofriend=True)
    d2 = dk(X.page("friend", empty_none(True), True, ctl0), h=None)
    p2 = ph(X.page("friend", empty_none(False), False, X.chassis("friend", False, result="0 friends", nofriend=True)))
    p3 = ph(X.page("friend", empty_nofriends(False), False, X.chassis("friend", False, result="0 friends", nofriend=True)))
    body = (board_head("5 · Empty and one", "One spare, none, and no friends",
                       "Real triggers only. In each of these the By friend segment still shows (eng’s change), so the view gets the empty state it never had. "
                       "With no friend’s spare, the Friend trigger and the Filters sheet’s Friend group leave the chassis, and the spare cells in the other views stay empty.")
            + frames(frame("<b>A</b> · a friend with one spare · 1300", d1, "One panel with one row. The header says <b>1 card · 1 spare</b>, so it never reads “1 cards”."),
                     frame("<b>A</b> · one spare · 390", p1, "The same at 390."))
            + frames(frame("<b>B</b> · friends, but no spares of these · 1300", d2, "The read landed and nobody has a spare. It says what a spare is and that one will show here. There’s nothing to press."),
                     frame("<b>B</b> · no spares · 390", p2, "The same at 390."),
                     frame("<b>C</b> · no friends yet · 390", p3, "No friends at all. The one press goes to Friends, where friend links live. Desktop has the same block at its width.")))
    X.FTOT["Peter"] = (9, 14)
    return doc("All decks cart v2 · empty and one", body, 2520)


# ================================================================ 6 · Loading
def skel_panel(desk, rows=3):
    r = ""
    for i in range(rows):
        w1, w2 = [(150, 210), (120, 170), (170, 190)][i % 3]
        if desk:
            r += (f'<div class="nrw" style="grid-template-columns:{X.COLS["friend"]}"><span class="sk" style="width:{w1}px;height:12px"></span>'
                  f'<span class="sk" style="width:{w2}px"></span><span class="sk" style="width:24px"></span><span class="sk" style="width:110px"></span>'
                  '<span class="act"><span class="sk" style="width:64px;height:28px;border-radius:7px"></span><span class="sk" style="width:88px;height:20px"></span></span></div>')
        else:
            r += (f'<div class="prw"><div class="l"><span class="sk" style="width:{w1}px;height:12px"></span><span class="sk" style="width:{w2 - 20}px"></span>'
                  '<span class="sk" style="width:60px"></span></div><span class="act"><span class="sk" style="width:72px;height:36px;border-radius:9px"></span>'
                  '<span class="sk" style="width:88px;height:22px"></span></span></div>')
    hd = ('<div class="fh2"><span class="sk" style="width:30px;height:30px;border-radius:8px"></span><span class="nm" style="gap:6px">'
          '<span class="sk" style="width:90px;height:12px"></span><span class="sk" style="width:140px;height:8px"></span></span></div>')
    return f'<div class="fpn" aria-hidden="true">{hd}{r}</div>'


def loading_board():
    ctl = X.chassis("card", True, result="48 cards", loading=True)
    d1 = dk(X.page("card", X.by_card_list(True, loading=True), True, ctl, LH))
    p1 = ph(X.page("card", X.by_card_list(False, loading=True), False, X.chassis("card", False, result="48 cards", loading=True), 900))
    fl = X.colh("friend", "padding-left:15px;padding-right:15px") + '<div style="margin-top:10px">' + skel_panel(True, 3) + '<div style="height:12px"></div>' + skel_panel(True, 2) + "</div>"
    ctl2 = X.chassis("friend", True, result="Reading friends’ spares…", loading=True)
    d2 = dk(X.page("friend", fl, True, ctl2, LH, fade=False))
    pf = skel_panel(False, 3) + '<div style="height:12px"></div>' + skel_panel(False, 2)
    p2 = ph(X.page("friend", pf, False, X.chassis("friend", False, result="Reading friends’ spares…", loading=True)))
    flow = ('<div class="flow">'
            '<div class="st"><em>0 ms</em><b>The page lands</b><span>Every view, the segment, the row, the buy tags, search, Owned and Sort all work. Only friend-dependent cells breathe.</span></div><span class="ar">›</span>'
            '<div class="st"><em>reading</em><b>Friends’ spares on their way</b><span>Spare cells and By friend draw the shipped skeleton (<code>anim-skeleton</code>). Friend reads <b>reading…</b>. One sentence for a screen reader.</span></div><span class="ar">›</span>'
            '<div class="st"><em>landed</em><b>Spares arrive</b><span>Cells fill in place with no layout shift on desktop, since the column is reserved. On a phone a row with no spare loses its SPARE line.</span></div><span class="ar">›</span>'
            '<div class="st"><em>landed, none</em><b>Nobody has a spare</b><span>Cells go empty, Friend leaves the chassis, and By friend shows its none state (board 5, B).</span></div></div>')
    body = (board_head("6 · Loading", "Friends’ spares arrive after the page, not before it",
                       "Eng is moving the spares read behind the page. Today the By friend segment and the row markers only show once everything has loaded; "
                       "from now on they show at once, and only the parts that depend on friends wait.")
            + flow
            + frames(frame("<b>A</b> · By card while reading · 1300", d1, "The spare column holds its width, and each cell is a breathing bar. The Friend trigger is dashed and reads <b>reading…</b>. The result line says what it’s waiting for."),
                     frame("<b>B</b> · By card while reading · 390", p1, "Every row keeps a SPARE line while reading. Once the read lands, the rows with no spare lose it."))
            + frames(frame("<b>C</b> · By friend while reading · 1300", d2, "Skeleton panels in the panel’s own shape: face, name, rows, the action stack. Opening By friend before the read lands draws this, not By card."),
                     frame("<b>D</b> · By friend while reading · 390", p2, "The same at 390.")))
    return doc("All decks cart v2 · loading", body, 1850)


BOARDS = [("Main", main_board, "R1 · the calls, your decisions, the gaps"),
          ("Row", row_board, "1 · The card row, separated"),
          ("By-Friend", friend_board, "2 · By friend: the long list"),
          ("Controls", controls_board, "3 · Sort, filter, search"),
          ("By-Card-Deck", card_deck_board, "4 · By card and By deck"),
          ("Empty-One", states_board, "5 · Empty and one"),
          ("Loading", loading_board, "6 · Loading")]
