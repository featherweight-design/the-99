from kit import *

CASES = [
    ("owned N", "dina", "in", "Copies across every printing, the read’s <code>owned</code>. The shipped quick-add words, <code>×1 owned</code>."),
    ("in a deck", "lathliss", "dra", "The first deck by name, then <code>+N</code> for the rest. Only the reader’s decks."),
    ("in a deck, no copy", None, "roo", "A deck can list a card the reader doesn’t own (a proxy, or still to buy). Both halves still read."),
    ("on your wishlist", "giada", "gia", "The bookmark, filled in the accent: the wishlist’s own glyph from card details. Not a press."),
    ("none of them", "zada", "zad", "<code>not owned</code>, nothing else. The bookmark’s slot stays empty so names line up."),
    ("all of them", "ashling", "ash", "Owned, in two decks, and on the wishlist because the reader wants a third copy."),
    ("a Secret Lair flavor name", "miku", "miku", "The row is titled with the card’s own name. <code>printed as</code> leads line 2, the shipped quick-add words, and ownership takes line 3."),
]

NOCOPY = dict(CARDS["rootha"], owned=0)


def case_row(key, q, first=True, words=False):
    if key is None:
        return row("rootha", q, first=first, c=NOCOPY, wl_words=words)
    return row(key, q, first=first, wl_words=words)


def board():
    # anatomy
    ph_anat = (
        '<div style="position:relative;width:390px;background:var(--bg);border:1px solid var(--border-strong);border-radius:12px;padding:30px 0 34px">'
        + row("ashling", "ash", first=True) +
        '<span class="meas" style="left:16px;top:6px;width:40px;height:18px">40</span>'
        '<span class="meas" style="left:4px;top:38px;width:10px;height:56px;border-left:0;border-right:0;border-bottom:0;writing-mode:vertical-rl">56</span>'
        '<span class="meas" style="left:68px;top:6px;width:286px;height:18px">name 15/600 · line mono 11.5</span>'
        '<span class="meas" style="left:352px;top:6px;width:28px;height:18px">28</span>'
        '<span class="meas" style="left:200px;top:106px;width:180px;height:18px;border-top:0">row ≥ 72, one press</span>'
        '</div>')
    dk_anat = (
        '<div style="position:relative;width:540px;padding-top:28px;padding-bottom:30px"><div class="dres">'
        + row("ashling", "ash", first=True) +
        '</div><span class="meas" style="left:14px;top:4px;width:30px;height:18px">30</span>'
        '<span class="meas" style="left:56px;top:4px;width:440px;height:18px">name 14/600, one line · ownership mono 11</span>'
        '<span class="meas" style="left:340px;top:100px;width:186px;height:18px;border-top:0">row ≥ 58 · 540 panel</span></div>')

    cols = []
    for label, key, q, cap in CASES:
        cols.append(
            f'<div class="fr" style="width:390px"><span class="k">{label}</span>'
            f'<div style="width:390px;background:var(--bg);border:1px solid var(--border-strong);border-radius:12px;overflow:hidden">{case_row(key, q)}</div>'
            f'<div class="dres" style="width:390px;padding:0">{case_row(key, q)}</div>'
            f'<p class="cap">{cap}</p></div>')
    # long name at 360 (phone) where it wraps, and desktop where it clamps
    long_ph = (f'<div class="fr" style="width:390px"><span class="k">a long name · phone 320, the narrowest</span>'
               f'<div style="width:320px;background:var(--bg);border:1px solid var(--border-strong);border-radius:12px;overflow:hidden">{row("doom", "doo", first=True, c=dict(CARDS["doom"], decks=["HD - Fantastic Four"], owned=0))}</div>'
               f'<div class="dres" style="width:390px;padding:0">{row("doom", "doo", first=True, c=dict(CARDS["doom"], decks=["HD - Fantastic Four"], owned=0))}</div>'
               '<p class="cap">The name is the answer, so it wraps to a second line on a phone rather than cutting off, and the row grows. On desktop the 540 panel gives the name about 420px on one line, and a name past that ends in an ellipsis; the whole name is still the row’s accessible name. A long deck name is what ellipsizes, before <code>+N</code>.</p></div>')
    cols.insert(6, long_ph)

    alt = (
        '<div class="frames">'
        '<div class="fr" style="width:390px"><span class="k">A · drawn · the bookmark marker</span>'
        f'<div style="width:390px;background:var(--bg);border:1px solid var(--border-strong);border-radius:12px;overflow:hidden">{row("ashling", "ash", first=True)}{row("giada", "", first=False)}</div>'
        '<p class="cap">One line of words, the wishlist as its own glyph at the end. The row stays at 72, and the bookmark is already the wishlist’s sign in card details and on the tab.</p></div>'
        '<div class="fr" style="width:390px"><span class="k">B · the words, on a line of their own</span>'
        f'<div style="width:390px;background:var(--bg);border:1px solid var(--border-strong);border-radius:12px;overflow:hidden">{row("ashling", "ash", first=True, wl_words=True)}{row("giada", "", first=False, wl_words=True)}</div>'
        '<p class="cap">Lock 3’s words spelled out. A third line on every wishlisted row (88 instead of 72), and a column of rows no longer lines up. At 390 the three signals don’t fit on one line once a deck is named.</p></div>'
        '</div>')

    body = (
        '<div class="bh"><span class="k">Card search · result rows · round 1</span><h2>The result row</h2>'
        '<p class="cap" style="max-width:1500px">One row at both widths, in the Wishlist search’s grammar: card art, the name, one quiet mono line under it. '
        'A press anywhere on the row opens card details; the row holds no other control. Every signal is the reader’s own (lock 8). '
        'Each case is drawn at phone (top) and desktop (bottom).</p></div>'
        '<div class="sec"><h3>Anatomy (open item 2)</h3><div class="frames">'
        f'<div class="fr" style="width:390px"><span class="k">phone · 390</span>{ph_anat}<p class="cap">Art at card shape, 40×56 (63:88), larger than the Wishlist row’s 30×42 because the art is how a player recognizes a card seen across the table. Typed letters in the accent, as the deck’s Add a card search draws them.</p></div>'
        f'<div class="fr" style="width:540px"><span class="k">desktop · in the rail panel</span>{dk_anat}<p class="cap">The Wishlist panel’s row as it ships: 30×42 art, 14px name, 11px mono line. ↑ ↓ move the active row (the --elevated fill), ↵ opens it.</p></div>'
        '<div class="note" style="width:620px"><b>How the line reads</b><ul>'
        '<li><code>×N owned</code> or <code>not owned</code> always comes first. It is the first question, and a row is never blank.</li>'
        '<li>Then <code>· in {deck}</code>, the first of the reader’s decks holding it by name, and <code>+N</code> for the rest. The deck name gives way first, never <code>+N</code>.</li>'
        '<li>The wishlist is the bookmark at the end, filled in the accent, with <code>on your wishlist</code> as its accessible name.</li>'
        '<li>The accessible name of the whole row is one sentence: <code>Ashling, the Limitless, 2 owned, in HD - Elementals and 1 more deck, on your wishlist</code>.</li>'
        '<li>No type line, mana cost or price. Lock 3 names three things, and the card is one press away.</li></ul></div>'
        '</div></div>'
        '<div class="sec"><h3>Every case</h3><div class="frames">' + "".join(cols) + '</div></div>'
        '<div class="sec"><h3>The wishlist signal: A is drawn, B is the alternative (Hugh’s call)</h3>' + alt + '</div>'
    )
    return doc("Result rows", body, 1850, 2400)
