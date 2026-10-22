"""Friend decks: its About entry. Drawn with the launch-end batch's kit (la.py over akit.py), so the Reference, the
window and the halo are the ones that batch measured. The picture is main's own /friends capture with the privacy line
set as FRIEND_DECKS_ENABLED draws it (fdframes.py), standing in for the recapture."""
import json, os
import kit as mkit
import akit, la
from la import board_head, frame, doc, THEMES, hexa, RATIO

HERE = os.path.dirname(os.path.abspath(__file__))
akit.ICONS["friends"] = ('<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">'
                         '<circle cx="7.6" cy="7.4" r="2.7"/><path d="M2.8 16.4c.5-2.9 2.4-4.5 4.8-4.5s4.3 1.6 4.8 4.5"/><path d="M12.4 4.9a2.4 2.4 0 1 1 1.3 4.5"/><path d="M14.6 11.6c1.5.5 2.4 1.9 2.7 4"/></svg>')
la.TABS[:] = [("home", "Home"), ("coll", "Collection"), ("cmd", "Commanders"), ("decks", "Decks"), ("friends", "Friends")]
# The index as main stands at 6560671 (79 entries), plus this one under Friends.
MAIN_COUNTS = {"home": 5, "collection": 10, "card-details": 4, "sets": 1, "proxies": 1, "history": 1, "wishlist": 1, "upload": 4,
               "commanders": 4, "discover": 1, "new-deck": 6, "decks": 4, "deck-your-deck": 13, "deck-shopping": 5, "deck-stats": 1,
               "deck-notes": 1, "deck-analysis": 6, "deck-games": 3, "deck-versions": 2, "friends": 4, "account": 2}
la.SCREENS[:] = [(k, n, w, MAIN_COUNTS[k]) for k, n, w, _ in la.SCREENS]
la.SCREENS.insert(len(la.SCREENS), ("credits", "Credits", "/credits", 1))
la.ADDED.clear(); la.ADDED["friends"] = 0
la.TOTAL = 80

BOXES = json.load(open(f"{HERE}/frames/boxes.json"))
ID = "friend-decks"


def window(theme, w, label=None):
    x, y, bw, bh = BOXES[theme]
    win = 2 / 3
    centre = (y + bh / 2) * RATIO
    off = min(max(centre - win / 2, 0), RATIO - win)
    t = next(t for t in THEMES if t[0] == theme)
    halo = (f'<span class="halo" style="left:{x*w:.1f}px;top:{(y*RATIO-off)*w:.1f}px;width:{bw*w:.1f}px;height:{bh*RATIO*w:.1f}px;'
            f'box-shadow:0 0 0 2px {hexa(t[2],.75)},0 0 0 6px {hexa(t[2],.2)},0 0 0 2000px {hexa(t[3],.28)}"></span>')
    lab = f'<span class="wlab">{label}</span>' if label else ""
    return (f'<div class="frm" style="width:{w}px;height:{w*win:.1f}px"><img src="{mkit.img(f"friends-fd-{theme}.png")}" alt="" '
            f'style="top:{-off*w:.1f}px;height:{RATIO*w:.1f}px">{halo}{lab}</div>')


la.window = lambda theme, key, w, **kw: window(theme, w)

TITLE = "Your friends’ decks"
CAPTION = ("Your friends’ decks open now. On a friend’s page, press any deck under Decks to see its whole list, read-only: the commander, every card by type, and a dot on each card you own yourself. Press a card for its details, and add it to your wishlist from there.\n\n"
           "Your decks open for friends the same way. Out of the box they see a deck once its list is full and committed, never your drafts or the decks you’re still building. In Settings, under Your decks:\n\n"
           "- Friends can see my decks: turn it off and they see none\n- Include drafts and decks I’m building: turn it on and they see them all\n\n"
           "To keep one deck to yourself, tick Hidden from friends in its ⋯ menu. For friends it simply isn’t there.\n\n"
           "Logging a game with a friend? Their decks are listed when you seat them. If the one they played isn’t, pick “A deck not listed”: they’re seated by name, with no deck. A game already logged keeps the deck it named, even if it’s hidden later.")
KEYS = ["Friends never see a deck’s prices, what it still needs to buy, or its notes.",
        "A hidden deck has no tile, and its link stops working, the same as a deleted deck’s.",
        "Hiding a deck never changes your spares: its cards still count as in use.",
        "“A deck not listed” shows for every friend, so it never gives away a hidden deck."]
LINES = [(", and add it to your wishlist from there", ["SOCIAL_WISHLIST_ENABLED"]),
         ("Logging a game with a friend? … even if it’s hidden later. <i>(one line: the whole paragraph)</i>", ["SOCIAL_GAMES_ENABLED"])]
KEYSW = [(KEYS[3], ["SOCIAL_GAMES_ENABLED"])]
ROWS = [("Friends and pods", "", False), "OPEN", ("Inviting someone new", "opens Add a friend", False),
        ("Checking tonight’s table", "from a pod’s “Rule 0 check”", False)]
E = dict(id=ID, title=TITLE, screen="friends", caption=CAPTION, keys=KEYS, rows=ROWS)

GAPS = [
    "A1 · <b>Version.</b> Switched, so no bump: <code>since: 16</code>, the <code>ABOUT_VERSION</code> on main, announced by its id when <code>FRIEND_DECKS_ENABLED</code> flips. The count goes 79 to 80 (<code>design-tables/about.md</code>, <code>gap-report-about.md</code>) and the content hash is re-pinned. <code>FRIEND_DECKS_ENABLED</code> is already in About’s switch map (#2228, key lines only); it now also names an entry.",
    "A2 · <b>Place.</b> In <code>aboutEntries</code> right after <code>friends</code>, so the Reference lists it second under Friends. Chapter 04.",
    "A3 · <b>Locator.</b> <code>'friend-decks': { screen: 'friends', locator: '[data-decks-seen]' }</code>, scope main. The attribute is already on the line (<code>friends-head.tsx</code>).",
    "A4 · <b>Capture.</b> <code>friends</code> at 390×844 in six themes with <code>FRIEND_DECKS_ENABLED</code> on for the fixture account and its rules at the defaults, so the line reads the <i>finished</i> variant. It is one line longer, so the frame’s Add a friend moves down 17px; <code>friends</code>, <code>invites</code> and <code>rule-zero</code> keep their locators. The picture here is main’s capture with only that line reset, standing in.",
    "A5 · <b>The ? on a friend’s pages.</b> <code>screenForPath</code> returns null for <code>/friends/{publicId}</code> and its deck pages, so the ? there draws the empty line. Optional, engineering’s call: map <code>/friends/{publicId}/**</code> to <code>friends</code>, so this entry is one press away where a friend’s deck is open.",
    "A6 · <b>Release.</b> With the entry in, <code>FRIEND_DECKS_ENABLED</code> leaves <code>ALL_FEATURES_EXCLUDED</code> (#2228 holds it there until this ships).",
]


def sw(names):
    return " + ".join(f"<code>{n}</code>" for n in names)


def about_board():
    head = board_head("About · friend decks · one entry · Friends", TITLE,
                      "One entry on the <b>Friends</b> screen, chapter 04, following <code>FRIEND_DECKS_ENABLED</code> (which needs <code>SOCIAL_FRIENDS_ENABLED</code>). It covers the four things: a friend’s deck opens read-only, Hidden from friends, Settings › Your decks, and the game log’s “A deck not listed”. "
                      "Opened in the shipped Reference at 1300 and 390 (Neon Rain). The halo is the <b>privacy line</b> on /friends: the one place every reader meets that says what friends can open and points to Settings. Words are placeholders for <code>/copy-review</code>.")
    fr = [frame("Reference, entry open · desktop 1300 · Neon Rain", la.ref_desk(E)), frame("Reference, entry open · 390 · Neon Rain", la.ref_phone(E))]
    body = head + f'<div class="frames" style="max-width:{1300+390+44}px">' + "".join(fr) + "</div>"
    cells = "".join(f'<div class="six-c">{window(t, 250)}<span class="m six-l">{n} · {t}</span></div>' for t, n, *_ in THEMES)
    body += ('<div class="sec"><h3>The picture in all six themes</h3><p class="cap" style="margin:0;font-size:13px;color:var(--fg-muted)">Main’s own /friends capture in each theme, '
             'with only the privacy line set as the switch draws it (two lines become three; the page under it moves down one line). Windowed and haloed as <code>EntryFrame</code> draws it, the box measured on <code>[data-decks-seen]</code>.</p>'
             f'<div class="six">{cells}</div></div>')
    lines = "".join(f"<tr><td>{l}</td><td>{sw(s)}</td></tr>" for l, s in LINES + KEYSW)
    gaps = "<ul>" + "".join(f"<li>{g}</li>" for g in GAPS) + "</ul>"
    body += ('<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px">'
             '<div class="sec"><h3>Line switches</h3><table class="tbl"><tr><th>Line or key</th><th>Drawn while on</th></tr>'
             f'<tr><td><i>the entry itself</i></td><td><code>FRIEND_DECKS_ENABLED</code></td></tr>{lines}</table>'
             '<p class="cap" style="margin:10px 0 0;font-size:12.5px;color:var(--fg-muted)">Checked by hand in all four combinations: removing the fragment leaves “Press a card for its details.”; removing the paragraph leaves no stray break (the renderer drops empty blocks).</p></div>'
             f'<div class="note"><b>Gaps</b>{gaps}</div></div>')
    return doc(f"About · {TITLE}", body, 1300 + 390 + 44 + 112)
