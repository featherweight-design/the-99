#!/usr/bin/env python3
"""All-decks cart v2, addendum R3: four boards (one per defect) and a canvas page holding all four.

Drawn over the shipped cart on feat/cart-v2-closeout (cart-view.tsx, cart-chassis.tsx, cart-filter-sheet.tsx,
filter-chassis.tsx) and the v2 / R2 boards, in Low Sun tokens. Fixtures are the v2 boards' own: six HD decks, the four
fixture friends, made-up prices."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))

ROWS = [
    ("Lightning Greaves", 4, "HD - Gishath, HD - Kratos", "+2", 2, "HD - Thorin", "9.60", True),
    ("Heroic Intervention", 3, "HD - Elves, HD - Gishath", "+1", 0, "", "8.40", True),
    ("Swiftfoot Boots", 3, "HD - Gishath, HD - Kratos", "+1", 1, "HD - Elves", "5.70", True),
    ("Arcane Signet", 2, "HD - Kratos, HD - Thorin", "", 0, "", "1.20", False),
    ("Beast Within", 2, "HD - Elves, HD - Gishath", "", 1, "HD - Thorin", "2.20", False),
    ("Chaos Warp", 2, "HD - Goblins, HD - Kratos", "", 0, "", "2.80", False),
    ("Sol Ring", 2, "HD - Elves, HD - Goblins", "", 4, "HD - Gishath", "3.00", False),
]
ROWS_LONG = ROWS + [
    ("Cultivate", 1, "HD - Gishath", "", 0, "", "0.50", False),
    ("Kodama’s Reach", 1, "HD - Elves", "", 1, "HD - Gishath", "0.40", False),
    ("Rampant Growth", 1, "HD - Elves", "", 0, "", "0.30", False),
]
SPARES = {"Lightning Greaves": (8, "Chris", "+1"), "Heroic Intervention": (1, "Peter", ""), "Swiftfoot Boots": (3, "Chris", "+1"),
          "Arcane Signet": (9, "Chris", ""), "Beast Within": (5, "Chris", "+1"), "Chaos Warp": (2, "Colin", ""), "Sol Ring": (17, "Chris", "+2")}
DECKS = [("HD - Gishath", "18 · $61.40"), ("HD - Kratos", "11 · $38.15"), ("HD - Elves", "9 · $27.70"),
         ("HD - Goblins", "6 · $22.05"), ("HD - Thorin", "4 · $31.90"), ("HD Tune - Mutant Menace", "2 · $9.60")]

SPARE_ICON = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="6" cy="5.5" r="2.4" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M1.8 13c.6-2.4 2.2-3.6 4.2-3.6S9.6 10.6 10.2 13" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="11.2" cy="6" r="2" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M11 9.4c1.7 0 3 1 3.4 3" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>'
SEARCH_ICON = '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="7" cy="7" r="4.8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.6 10.6 14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
SORT_ICON = '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M5 3v10M5 3 2.6 5.4M5 3l2.4 2.4M11 13V3M11 13l-2.4-2.4M11 13l2.4-2.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
FRIENDS_GLYPH = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><circle cx="9" cy="8" r="3.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2.8 19c.8-3.4 3.2-5.2 6.2-5.2s5.4 1.8 6.2 5.2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="16.8" cy="9" r="2.8" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M16.4 13.8c2.5 0 4.3 1.5 4.9 4.4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>'


def buytag(price, on=False):
    return f'<span class="buy{" on" if on else ""}"><b>buy</b><i>${price}</i></span>'


# ---------- phone parts ----------

def phead():
    return ('<div class="ph-head"><span class="logo"><em>◆◆◆</em><small>THE</small>99</span>'
            f'<span class="ph-ic">{SEARCH_ICON}</span><span class="ph-ic q">?</span><span class="ph-av">S</span></div>')


def tabbar():
    items = ["Home", "Collection", "Commanders", "Decks", "Friends"]
    return '<div class="tabbar">' + "".join(f'<span class="{"cur" if t == "Decks" else ""}"><i></i>{t}</span>' for t in items) + "</div>"


def view_row(view="card", key_spare=True, phone=True):
    seg = "".join(f'<span class="{"on" if v == view else ""}">{l}</span>' for v, l in (("card", "By card"), ("deck", "By deck"), ("friend", "By friend")))
    key = ""
    if key_spare:
        key += f'<span class="k">{SPARE_ICON}<span>friend has a spare</span></span>'
    key += '<span class="k"><span class="kb">buy</span><span>press to add</span></span>'
    return f'<div class="vrow"><div class="seg">{seg}</div><div class="keys">{key}</div></div>'


def phone_chassis(placeholder="Search cards", badge=None, query=None):
    field = (f'<span class="sf{" act" if query else ""}">{SEARCH_ICON}<span class="ph{"" if query else " pl"}">{query or placeholder}</span>'
             + ('<span class="x">✕</span>' if query else "") + "</span>")
    b = f'<span class="badge">{badge}</span>' if badge else ""
    return (f'<div class="pchassis"><div class="crow1">{field}<span class="fb{" on" if badge else ""}">Filters{b}</span>'
            f'<span class="sortb">{SORT_ICON}</span></div>')


def chips(items=None):
    if not items:
        return '<div class="chips"><span class="nof">No filters on</span><span class="ca dim">Clear all</span></div>'
    return '<div class="chips">' + "".join(f'<span class="chip">{c} <b>×</b></span>' for c in items) + '<span class="ca">Clear all</span></div>'


def result(text):
    return f'<div class="res">{text}</div>'


def phone_row(r, spare=True):
    name, need, decks, more, own, ownin, price, onbuy = r
    lines = [f'<div class="fl"><span class="lb">need</span><b>{need}</b><span class="v">{decks}</span>' + (f'<span class="pill">{more}</span>' if more else "") + "</div>"]
    if spare and name in SPARES:
        s = SPARES[name]
        lines.append(f'<div class="fl"><span class="lb">spare</span><b>{s[0]}</b><span class="v">{s[1]}</span>' + (f'<span class="pill">{s[2]}</span>' if s[2] else "") + "</div>")
    if own:
        lines.append(f'<div class="fl own"><span class="lb">own</span><b>{own}</b><span class="v">in {ownin}</span></div>')
    return f'<div class="prow"><div class="pr-main"><span class="cn">{name}</span>{"".join(lines)}</div><div class="pr-end">{buytag(price, onbuy)}</div></div>'


def phone_frame(inner, overlay="", h=844, width=390):
    return f'<div class="phone" style="width:{width}px;height:{h}px">{phead()}<div class="ph-body">{inner}</div>{overlay}{tabbar()}</div>'


def page_top_phone(short=False):
    if short:
        return ""
    return ('<div class="ptop"><span class="back">‹ Decks</span><h1>Shopping for all decks</h1>'
            '<p class="sub">6 of 21 decks are missing cards · brews included</p></div>'
            '<div class="pco"><b>$190.80</b><p>single-copy prices on Mana Pool · last checked Thursday</p><span>Buy these at Mana Pool ↗</span></div>'
            '<div class="pdecks"><span>Decks · 6 of 6 selected</span><i>▾</i></div>')


def controls_phone(view="card", key_spare=True, placeholder="Search cards", badge=None, chip_items=None, res="48 cards · 9 with a friend’s spare", query=None):
    return (f'<div class="pctl">{view_row(view, key_spare)}{phone_chassis(placeholder, badge, query)}{chips(chip_items)}{result(res)}</div></div>')


def toast(text="We couldn’t read your friends’ spares.", act="Try again", cls=""):
    return f'<div class="toast {cls}"><span>{text}</span><b>{act}</b></div>'


def sheet(friend_block, shown="48 of 48 cards match", owned="Any", show="Show 48 cards"):
    segs = "".join(f'<span class="{"on" if o == owned else ""}">{o}</span>' for o in ("Any", "You own some", "None"))
    return (f'<div class="scrim"></div><div class="sheet"><i class="grab"></i><div class="sh-in">'
            f'<div class="sh-h"><h2>Filters</h2><small>{shown}</small></div>{friend_block}'
            f'<div class="grp"><span class="gh">Owned</span><div class="segx">{segs}</div></div>'
            f'<div class="sh-act"><span class="prim">{show}</span><span class="ca">Clear all filters</span></div></div></div>')


def friend_pills():
    pills = '<span class="fp any">Any friend</span>'
    for nme, n in (("Chris", 41), ("Colin", 17), ("Peter", 9), ("Max", 4)):
        pills += f'<span class="fp"><i class="face f-{nme.lower()}"></i>{nme}<small>{n}</small></span>'
    return f'<div class="grp"><span class="gh">Friend · has a spare</span><div class="pills">{pills}</div></div>'


# ---------- desktop parts ----------

def d_chassis(friend=True, friend_label="Friend", friend_reading=False, owned_open=False, chip_items=None, res="48 cards · 9 with a friend’s spare"):
    ft = ""
    if friend:
        ft = f'<span class="trig{" dash" if friend_reading else ""}">{("reading…" if friend_reading else friend_label)}<i>▾</i></span>'
    return (f'<div class="dchassis"><div class="drow1"><span class="dsf">{SEARCH_ICON}<span class="pl">Search cards</span></span>{ft}'
            f'<span class="trig{" open" if owned_open else ""}">Owned<i>▾</i></span><span class="hair"></span><span class="sortt">Sort · Most decks</span></div>'
            f'{chips(chip_items)}{result(res)}</div>')


def d_cols(spare=True):
    return (f'<div class="dcols{"" if spare else " nospare"}"><span>Card</span><span>You need · for</span>' + ('<span>Friends’ spares</span>' if spare else "") + '<span>You own · in use in</span><span></span></div>')


def d_row(r, spare=True, spare_cell=True):
    name, need, decks, more, own, ownin, price, onbuy = r
    needc = f'<b>{need}</b><span class="v">{decks}</span>' + (f'<span class="pill">{more}</span>' if more else "")
    sp = ""
    if spare and name in SPARES:
        s = SPARES[name]
        sp = f'<span class="sp">{SPARE_ICON}</span><b>{s[0]}</b><span class="v">{s[1]}</span>' + (f'<span class="pill">{s[2]}</span>' if s[2] else "")
    ownc = f'<b>{own}</b><span class="v">in {ownin}</span>' if own else ""
    return f'<div class="drowc{"" if spare_cell else " nospare"}"><span class="cn">{name}</span><span class="c">{needc}</span>' + (f'<span class="c">{sp}</span>' if spare_cell else "") + f'<span class="c own">{ownc}</span><span class="end">{buytag(price, onbuy)}</span></div>'


def d_frame(main_inner, width=1300, height=900, left=True, overlay=""):
    rail = ('<div class="rail"><span class="logo"><em>◆◆◆</em>99</span><i></i><i></i><i></i><i class="cur"></i><i></i></div>')
    side = ""
    if left:
        decks = "".join(f'<div class="dk"><span class="cb">✓</span><span>{d}</span><small>{f}</small></div>' for d, f in DECKS)
        side = (f'<div class="dside"><div class="dsel"><div class="dsh"><span>Decks · 6 of 6</span><b>Unselect all</b></div>{decks}</div>'
                '<div class="dco"><b>$190.80</b><p>single-copy prices on Mana Pool · last checked Thursday · a cart with shipping or fewer packages can cost more</p><span>Buy these at Mana Pool ↗</span></div></div>')
    return (f'<div class="desk" style="width:{width}px;height:{height}px">{rail}<div class="dpage"><div class="dtop"><span class="back">‹ Decks</span>'
            f'<h1>Shopping for all decks</h1><p class="sub">6 of 21 decks are missing cards · brews included</p></div>'
            f'<div class="dgrid">{side}<div class="dmain">{main_inner}</div></div></div>{overlay}</div>')


def listbox(inner, fade="always", extra_cls=""):
    f = ""
    if fade == "always":
        f = '<div class="fade"></div>'
    elif fade == "scroll":
        f = '<div class="fade"></div>'
    return f'<div class="lbox {extra_cls}">{inner}{f}</div>'


def dashed_nomatch():
    return ('<div class="dashed"><h3>No card matches</h3>'
            '<p>Drop “greavs” and you get 48 cards.</p><span class="btn2">Drop “greavs”</span></div>')


def dashed_nofriends():
    return (f'<div class="dashed center"><span class="glyph">{FRIENDS_GLYPH}</span><h3>No friends yet</h3>'
            '<p>When you add friends, the spares they have of these cards show here, and you can ask for them.</p><span class="btn2">Go to Friends</span></div>')


# ---------- boards ----------

def fr(label, cap, inner, tone="is"):
    return f'<figure class="fr {tone}"><figcaption class="lab2">{label}</figcaption>{inner}<p class="cap">{cap}</p></figure>'


def board(n, kicker, title, intro, frames, rule=""):
    return (f'<section class="board" id="d{n}"><header class="bh"><span class="kick"><span class="tag">R3 · {n}</span>{kicker}</span>'
            f'<h2>{title}</h2><p>{intro}</p></header><div class="frames">{frames}</div>{rule}</section>')


def rule_box(title, items):
    return f'<div class="rule"><h4>{title}</h4><ol>' + "".join(f"<li>{i}</li>" for i in items) + "</ol></div>"


def board1():
    behind = page_top_phone() + controls_phone(badge="1", chip_items=["Owned: None"], res="31 of 48 cards", placeholder="Search car") + "".join(phone_row(r, spare=False) for r in ROWS[:3])
    behind_r3 = behind.replace(">Search car<", ">Search<")
    now = phone_frame(behind, sheet("", shown="31 of 48 cards match", owned="None", show="Show 31 cards") + toast(cls="over"))
    failed_block = ('<div class="grp"><span class="gh">Friend · has a spare</span><div class="sfail"><span>Friends’ spares didn’t load</span><b>Try again</b></div></div>')
    new = phone_frame(behind_r3, sheet(failed_block, shown="31 of 48 cards match", owned="None", show="Show 31 cards"))
    reading_block = '<div class="grp"><span class="gh">Friend · has a spare</span><span class="freading">reading…</span></div>'
    retry = phone_frame(behind_r3, sheet(reading_block, shown="31 of 48 cards match", owned="None", show="Show 31 cards"))
    closed = phone_frame(page_top_phone() + controls_phone(key_spare=False, badge="1", chip_items=["Owned: None"], res="31 of 48 cards", placeholder="Search") + "".join(phone_row(r, spare=False) for r in ROWS[:3]))
    drows = "".join(d_row(r, spare=False, spare_cell=False) for r in ROWS)
    dmain = view_row("card", key_spare=False, phone=False) + d_chassis(friend=False, owned_open=True, chip_items=["Owned: None"], res="31 of 48 cards") + d_cols(False) + listbox(drows, "scroll")
    panel = ('<div class="dpanel" style="left:1062px;top:262px"><span class="ph">Owned</span><span class="opt on">Any</span><span class="opt">You own some</span><span class="opt sel">None</span></div>')
    desk = d_frame(dmain, overlay=panel + toast(cls="dtoast"))
    frames = (fr("Now · 390, sheet open, read fails", "The toast lands on the sheet’s Owned control: a modal sheet with a live control under a toast that isn’t part of it.", now, "was")
              + fr("R3 · 390, sheet open, read fails", "No toast. The Friend group says it in its own place, with the toast’s one press. Owned is untouched.", new)
              + fr("R3 · 390, after Try again", "The group goes back to Loading A’s dashed reading… until the read lands or fails again.", retry)
              + fr("R3 · 390, sheet closed afterwards", "Said once: closing the sheet raises no toast. The cart is in R2’s failed state (no spare key, no Friend clause).", closed)
              + fr("R3 · 1300, Owned panel open, read fails", "Unchanged from R2: the panel is anchored at the top and the toast at the foot, so they never meet. The Friend trigger is hidden.", desk))
    rule = rule_box("The rule", [
        "While the Filters sheet is open, a failed read is said <b>inside the sheet</b>, in the Friend group’s place: the shipped <code>result.failedByFriend</code> line (“Friends’ spares didn’t load”) and <code>failedRead.retry</code> (<b>Try again</b>). No new string. The toast is not drawn over a sheet.",
        "Said once (R2 ruling 1): a failure said in the sheet raises no toast when the sheet closes. A read that fails while the sheet is shut raises the toast as shipped.",
        "A toast already up when the sheet opens is dismissed, and the sheet opens with the failed line in place.",
        "Try again re-runs the read; the group shows the dashed <b>reading…</b> (Loading A) until it lands, then the friend pills.",
        "Desktop has no sheet: R2 stands as drawn.",
    ])
    return board(1, "Phone · Filters sheet", "A failed read is said inside the open sheet, never on top of it",
                 "The closeout walk caught R2’s failed-read toast drawn over the open Filters sheet, on its Owned control. The toast belongs to the page, and the sheet is modal, so while it is open the failure moves into the sheet itself.", frames, rule)


def board2():
    def at(width, placeholder, badge, chip_items, res, query=None):
        inner = page_top_phone() + controls_phone(badge=badge, chip_items=chip_items, res=res, placeholder=placeholder, query=query) + "".join(phone_row(r) for r in ROWS[:2])
        return phone_frame(inner, h=640, width=width)
    frames = (fr("Now · 390, Owned on", "“Search cards” clipped to “Search car” by the badge, and the chips 10px under the field.", at(390, "Search car", "1", ["Owned: None"], "31 of 48 cards").replace('class="pctl"', 'class="pctl was10"'), "was")
              + fr("R3 · 390, Owned on", "Below 1000px the placeholder is “Search”, and the chips sit 16px under the field.", at(390, "Search", "1", ["Owned: None"], "31 of 48 cards"))
              + fr("R3 · 360, two filters", "", at(360, "Search", "2", ["Friend: Chris", "Owned: None"], "6 of 48 cards"))
              + fr("R3 · 320, two filters", "At 320 the field keeps about 104px, so “Search” fits whole.", at(320, "Search", "2", ["Friend: Chris", "Owned: None"], "6 of 48 cards"))
              + fr("R3 · 320, with a query", "A query is the text itself, with the shipped ✕; long ones end in an ellipsis, as typed text does.", at(320, "", "2", ["“greaves”", "Friend: Chris", "Owned: None"], "1 of 48 cards", query="greaves")))
    dmain = view_row("card", phone=False) + d_chassis(chip_items=["Owned: None"], res="31 of 48 cards") + d_cols() + listbox("".join(d_row(r) for r in ROWS[:4]), "none")
    desk = d_frame(dmain, height=620)
    frames += fr("R3 · 1300", "Desktop keeps “Search cards”: the field is 400px or more there.", desk)
    rule = rule_box("The rule", [
        "Below 1000px (the compact chassis), the cart’s field placeholder is <b>Search</b>. From 1000px it stays <b>Search cards</b>.",
        "The row keeps its order and sizes: the field takes what is left (flex 1, min-width 0), then the Filters pill with its badge, then the 44px ⇅. Nothing in the row wraps or hides.",
        "At 320 with a badge the field is about 104px: the icon and “Search” at 14px fit.",
        "The field’s accessible name stays “Search cards” at every width; only the visible placeholder shortens.",
        "In the compact form, the chips row sits <b>16px</b> under the controls row (shipped: 10px, the chassis’s one row gap). The chips to result line gap stays 10px, so the chips read as belonging to what follows, not glued to the field. Desktop is unchanged.",
    ])
    return board(2, "Phone · cart header", "The field says “Search” on a phone, and the chips get room under it",
                 "With a filter on, the Filters pill grows by its count badge and the field loses the width “Search cards” needed. The shortest fix that keeps every control is the placeholder: the search glyph already carries the rest.", frames, rule)


def board3():
    nomatch_list = dashed_nomatch()
    now_d = d_frame(view_row("card", phone=False) + d_chassis(chip_items=["“greavs”"], res="0 of 48 cards") + listbox(nomatch_list, "always", "short"), height=600)
    new_d = d_frame(view_row("card", phone=False) + d_chassis(chip_items=["“greavs”"], res="0 of 48 cards") + listbox(nomatch_list, "none", "short"), height=600)
    long_mid = d_frame(view_row("card", phone=False) + d_chassis() + d_cols() + listbox("".join(d_row(r) for r in ROWS_LONG), "scroll", "tall"), height=720)
    long_end = d_frame(view_row("card", phone=False) + d_chassis() + d_cols() + listbox('<div class="atend">' + "".join(d_row(r) for r in ROWS_LONG) + '</div>', "none", "tall"), height=720)
    nofr_now = d_frame(view_row("friend", key_spare=False, phone=False) + d_chassis(friend=False, res="0 friends") + listbox(dashed_nofriends(), "always", "short"), height=600)
    nofr_new = d_frame(view_row("friend", key_spare=False, phone=False) + d_chassis(friend=False, res="0 friends") + listbox(dashed_nofriends(), "none", "short"), height=600)
    ph = phone_frame(page_top_phone() + controls_phone(chip_items=["“greavs”"], res="0 of 48 cards", placeholder="Search", query="greavs") + f'<div style="padding:4px 16px">{dashed_nomatch()}</div>')
    frames = (fr("Now · 1300, no match", "The fade sits over the dashed block’s foot, erasing its bottom edge.", now_d, "was")
              + fr("R3 · 1300, no match", "The list doesn’t overflow, so there is no fade. The block closes.", new_d)
              + fr("Now · 1300, By friend, no friends", "Empty-One C loses its bottom dashes the same way.", nofr_now, "was")
              + fr("R3 · 1300, By friend, no friends", "", nofr_new)
              + fr("R3 · 1300, long list, mid-scroll", "The fade shows only while there is more below.", long_mid)
              + fr("R3 · 1300, long list, scrolled to the end", "At the end, the fade goes, so the last row (or last folded By deck group) reads at full strength.", long_end)
              + fr("R3 · 390, no match", "The phone has no fade (the page scrolls, not a box). Nothing changes; drawn for parity.", ph))
    rule = rule_box("The rule", [
        "The list box’s 36px bottom fade draws <b>only while the box has more content below its visible end</b>: <code>scrollHeight − scrollTop − clientHeight &gt; 1</code>, checked on scroll and on resize (one observer for the box).",
        "So it is never drawn over the no-match block, R2’s failed block, Empty-One B or C, a short list, or a By deck list with every group folded.",
        "It appears and goes without a transition (no new motion).",
        "The dashed blocks keep their shipped padding; nothing else moves. Phone: unchanged, it has no fade.",
    ])
    return board(3, "Desktop · cart list", "The bottom fade shows only when there is more to scroll to",
                 "The v1 fade is drawn whether the list overflows or not, so it erases the foot of every dashed block v2 added and dims the last folded By deck group. Tying it to overflow fixes all of them at once without touching the blocks.", frames, rule)


def board4():
    now_rows = "".join(phone_row(r, spare=False) for r in ROWS[:4])
    now = phone_frame(page_top_phone() + controls_phone(key_spare=True, res="48 cards · <span class=\"rd\">reading friends’ spares</span>") + now_rows, toast(cls="over2"))
    new = phone_frame(page_top_phone() + controls_phone(key_spare=False, res="48 cards", placeholder="Search") + now_rows)
    deck_new = phone_frame(page_top_phone() + controls_phone("deck", key_spare=False, res="6 decks · 59 copies", placeholder="Search")
                           + '<div class="dg"><span class="chev">▾</span><b>HD - Gishath</b><small>18 · $61.40</small></div>' + "".join(phone_row(r, spare=False) for r in ROWS[:3]))
    d_now = d_frame(view_row("card", phone=False) + d_chassis(friend=True, friend_reading=True, res="48 cards · <span class=\"rd\">reading friends’ spares</span>") + d_cols(True) + listbox("".join(d_row(r, spare=False) for r in ROWS), "always"), height=800)
    d_new = d_frame(view_row("card", key_spare=False, phone=False) + d_chassis(friend=False, res="48 cards") + d_cols(False) + listbox("".join(d_row(r, spare=False, spare_cell=False) for r in ROWS), "scroll"), height=800)
    frames = (fr("Now · 390, By card, no friends", "The spare key, “reading friends’ spares”, then (on this fixture) the failed toast: three sentences about something this reader can’t have.", now, "was")
              + fr("R3 · 390, By card, no friends", "No spare key, no reading clause, no read, no toast. The result line is the count alone.", new)
              + fr("R3 · 390, By deck, no friends", "By deck the same: the line counts decks and copies, as shipped.", deck_new)
              + fr("Now · 1300, By card, no friends", "A dashed Friend reading… trigger and an empty Friends’ spares column.", d_now, "was")
              + fr("R3 · 1300, By card, no friends", "No Friend trigger and no Friends’ spares column: the grid closes up as it does after a failed read (R2).", d_new))
    rule = rule_box("The state and its copy", [
        "<b>When it applies:</b> the reader has no friends (<code>hasFriends</code> is false, known at first paint). Then the spares read is <b>not made</b>, so it can neither be reading nor fail.",
        "<b>By card and By deck:</b> no spare key item, no Friend trigger (desktop) or Friend group (phone sheet), no <code>Friends’ spares</code> column, no reading clause, no failed toast. Rows never had a spare line for this reader; that stays.",
        "<b>Result line:</b> By card <code>48 cards</code> (with a filter: <code>31 of 48 cards</code>); By deck <code>6 decks · 59 copies</code>. These are the shipped <code>result.byCardNoSpare</code>, <code>result.filtered</code> and <code>result.byDeck</code>, so <b>no new string</b>.",
        "<b>By friend:</b> unchanged, Empty-One C (No friends yet, Go to Friends). It is the one place the cart talks about friends to this reader.",
        "<b>A first friend added mid-visit</b> takes effect on the next load, like the friend count today. Nothing is drawn for the change.",
    ])
    return board(4, "By card and By deck · no friends", "A reader with no friends sees no spare wording at all",
                 "The friend count is known at first paint, yet By card and By deck still start a spares read and narrate it: the spare key, the reading clause, the Friend trigger, the column, and a failed toast when it errs. For this reader the cart reads exactly as it would with spares switched off.", frames, rule)


def build():
    css = open(os.path.join(HERE, "r3.css")).read()
    boards = [board1(), board2(), board3(), board4()]
    names = ["R3-Sheet-Toast", "R3-Header-Width", "R3-List-Fade", "R3-No-Friends"]
    head = lambda title: (f'<title>{title}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
                          '<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">\n'
                          f'<style>{css}</style>\n')
    for nm, b in zip(names, boards):
        open(os.path.join(HERE, f"{nm}.html"), "w").write(head(f"Cart v2 {nm}") + f'<main class="canvas">{b}</main>\n')
    intro = """<header class="top"><span class="kick">The 99 · Shopping for all decks v2 · addendum R3 for Hugh’s audit · 2026-10-29</span>
<h1>Four defects from the closeout walk</h1>
<p>Each board draws the defect as built on <code>feat/cart-v2-closeout</code>, then the call, at phone and desktop width. Everything else in v2 and R2 stays as drawn. No new tokens, motion or controls; strings are drafts for copy review.</p>
<ol class="map">
<li><b>Toast over the open Filters sheet</b><span>Said inside the sheet instead</span><a href="#d1">Board 1</a></li>
<li><div><b>Badge cuts “Search cards”</b><span>Phone placeholder is “Search”; chips 16px below the field</span></div><a href="#d2">Board 2</a></li>
<li><div><b>Fade clips the dashed blocks</b><span>Fade only while more is below</span></div><a href="#d3">Board 3</a></li>
<li><div><b>Spare wording with no friends</b><span>No read, no spare wording</span></div><a href="#d4">Board 4</a></li>
</ol></header>"""
    open(os.path.join(HERE, "R3-Main.html"), "w").write(head("Cart v2 Addendum R3") + f'<main class="canvas">{intro}{"".join(boards)}</main>\n')


build()
