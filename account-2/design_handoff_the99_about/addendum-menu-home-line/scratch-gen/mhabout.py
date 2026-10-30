"""Menu and Home line: its About entry (account 2, 2026-10-22). Drawn with the launch-end batch's kit (la.py), so the
Reference, the window and the halo are the ones that batch measured. The picture is Home B rendered per theme by
../mh/frames.py (the recapture's stand-in), with the five-slot bar."""
import json, os, sys, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit, la
from la import board_head, frame, doc, S, THEMES, hexa, RATIO

# ---- the shell with the line on: five slots, Friends last, Discover gone (menu-home call 1)
kit.ICONS["friends"] = ('<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">'
                        '<circle cx="7.6" cy="7.4" r="2.7"/><path d="M2.8 16.4c.5-2.9 2.4-4.5 4.8-4.5s4.3 1.6 4.8 4.5"/><path d="M12.4 4.9a2.4 2.4 0 1 1 1.3 4.5"/><path d="M14.6 11.6c1.5.5 2.4 1.9 2.7 4"/></svg>')
la.TABS[:] = [("home", "Home"), ("coll", "Collection"), ("cmd", "Commanders"), ("decks", "Decks"), ("friends", "Friends")]

BOXES = json.load(open(f"{S}/../mh/frames/boxes.json"))
ID = "whats-new"


def window(theme, w, key="lead", label=None, src=None):
    x, y, bw, bh = BOXES[theme][key]
    win = 2 / 3
    centre = (y + bh / 2) * RATIO
    off = min(max(centre - win / 2, 0), RATIO - win)
    t = next(t for t in THEMES if t[0] == theme)
    halo = (f'<span class="halo" style="left:{x*w:.1f}px;top:{(y*RATIO-off)*w:.1f}px;width:{bw*w:.1f}px;height:{bh*RATIO*w:.1f}px;'
            f'box-shadow:0 0 0 2px {hexa(t[2],.75)},0 0 0 6px {hexa(t[2],.2)},0 0 0 2000px {hexa(t[3],.28)}"></span>')
    lab = f'<span class="wlab">{label}</span>' if label else ""
    return (f'<div class="frm" style="width:{w}px;height:{w*win:.1f}px"><img src="{src or la.shot(theme, "home")}" alt="" '
            f'style="top:{-off*w:.1f}px;height:{RATIO*w:.1f}px">{halo}{lab}</div>')


la.window = lambda theme, key, w, **kw: window(theme, w)   # ref_desk / ref_phone call la.window(theme, id, w)

TITLE = "Home’s news, and the new bar"
CAPTION = ("Home now opens on what’s new for you. One story leads at the top, then the decks you touched last, then the rest of What’s new:\n\n"
           "- A set or a precon that just came out\n- A price drop on a card on your wishlist\n- A combo you can now make with cards you own\n"
           "- A friend with a spare of a card on your wishlist\n\n"
           "Nothing shows until you choose what you’d like to hear about: right on Home the first time, then in Settings, in the account menu.\n\n"
           "Commanders is one place now, with a tab for each way in:\n\n"
           "- For you: the commanders you own, ranked by fit\n- Discover: the ones worth buying\n- Help me choose: a few questions, and we pick\n\n"
           "Friends has its own spot in the bar, and a friend’s page shows their spares and decks.\n\n"
           "In Settings, you choose how many spare copies a card needs before friends see it, and keep any card back.")
KEYS = ["News stays in the app: a count on Home in the bar, and the list. No email, ever.",
        "A story stays 14 days. Opening Home marks it seen.",
        "Old links to Discover and Help me choose land on their tabs.",
        "Friends see your deck names, commanders and statuses, never the lists."]
# (line, switches): every switch listed must be on; two at once is gap G1.
LINES = [("- A price drop on a card on your wishlist", ["SOCIAL_WISHLIST_ENABLED"]),
         ("- A friend with a spare of a card on your wishlist", ["SOCIAL_FRIENDS_ENABLED", "SOCIAL_WISHLIST_ENABLED"]),
         ("Commanders is one place now, with a tab for each way in:", ["COMMANDERS_PLACE_ENABLED"]),
         ("- For you: the commanders you own, ranked by fit", ["COMMANDERS_PLACE_ENABLED"]),
         ("- Discover: the ones worth buying", ["COMMANDERS_PLACE_ENABLED"]),
         ("- Help me choose: a few questions, and we pick", ["COMMANDERS_PLACE_ENABLED", "HELP_ME_CHOOSE_ENABLED"]),
         ("Friends has its own spot in the bar, and a friend’s page shows their spares and decks.", ["COMMANDERS_PLACE_ENABLED", "SOCIAL_FRIENDS_ENABLED"]),
         ("In Settings, you choose how many spare copies a card needs before friends see it, and keep any card back.", ["SOCIAL_FRIENDS_ENABLED"])]
KEYSW = [(KEYS[2], ["COMMANDERS_PLACE_ENABLED"]), (KEYS[3], ["SOCIAL_FRIENDS_ENABLED"])]

NB = json.load(open(f"{S}/gen/neighbors.json"))
ROWS = ["OPEN", (*NB["resume"], False), (*NB["commitments"], False),
        ("Getting help on any screen", "Every screen has a ? with the About entries for what you’re looking at.", False)]
E = dict(id=ID, title=TITLE, screen="home", caption=CAPTION, keys=KEYS, rows=ROWS)


def sw(names):
    return " + ".join(f"<code>{n}</code>" for n in names)


def entry_board():
    head = board_head("About · the menu and Home line · one entry · Home", TITLE,
                      "One entry for the whole line, on <b>Home</b>, in <code>ready-to-build</code>’s place: it <b>replaces</b> that entry while the feed is on, because Ready to build leaves Home. "
                      "Opened in the shipped Reference at 1300 and 390 (Neon Rain). The halo is the <b>lead story</b>, the top of What’s new: the one part of the feed that is always on the first screen. "
                      "The picture is Home B as the handoff draws it (no welcome strip, five-slot bar), standing in for the recapture engineering shoots at PR 8. Every word is a placeholder for <code>/copy-review</code>.")
    fr = [frame("Reference, entry open · desktop 1300 · Neon Rain", la.ref_desk(E)), frame("Reference, entry open · 390 · Neon Rain", la.ref_phone(E))]
    body = head + f'<div class="frames" style="max-width:{1300+390+44}px">' + "".join(fr) + "</div>"
    cells = "".join(f'<div class="six-c">{window(t, 250)}<span class="m six-l">{n} · {t}</span></div>' for t, n, *_ in THEMES)
    body += ('<div class="sec"><h3>The picture in all six themes</h3><p class="cap" style="margin:0;font-size:13px;color:var(--fg-muted)">Home B in each theme’s tokens and display face, '
             'windowed and haloed as <code>EntryFrame</code> draws it. The lead story’s height follows its title’s wrap, so the box is measured per frame, as the locator script does.</p>'
             f'<div class="six">{cells}</div></div>')
    lines = "".join(f"<tr><td>{l}</td><td>{sw(s)}</td></tr>" for l, s in LINES + KEYSW)
    body += ('<div style="display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:20px">'
             '<div class="sec"><h3>Line switches</h3><table class="tbl"><tr><th>Line or key</th><th>Drawn while on</th></tr>'
             f'<tr><td><i>the entry itself</i></td><td><code>HOME_FEED_ENABLED</code> (and it replaces <code>ready-to-build</code> while on)</td></tr>{lines}</table></div>'
             '<div class="sec"><h3>Today’s frame, and why it can’t be used</h3><div class="cmp"><div>'
             f'{window("kamigawa", 330, src="art/kamigawa-home-today.webp", label="TODAY · NOT USABLE")}'
             '<p>The shipped <code>home</code> capture (#2083) shows Ready to build and the old bar with Discover. Nothing the entry describes is on it, so the box has nowhere to go until the recapture '
             '(<b>G3</b>). The window here is today’s frame at the same place, for comparison.</p></div></div></div></div>')
    return doc(f"About · {TITLE}", body, 1300 + 390 + 44 + 112)


CALLS = [
    ("1", "About entry", "<b>Drawn: board E1.</b> One entry, <code>whats-new</code>, on Home, chapter 04, following <code>HOME_FEED_ENABLED</code> and replacing <code>ready-to-build</code>. "
     "Commanders, Friends in the bar and Settings’ spares are caption lines with their own switches. Halo: the lead story.", "draw"),
    ("2", "Friend page", "<b>Ratified, drawn on board Friend-Page.</b> The privacy line under /friends’ name line in 11px mono <code>--fg-faint</code>; the four empty states in the dashed box "
     "(Spares has two: none to show, and not shared with you); a spare press opens the shipped card details, sheet at 390 and modal at 1300.", "ok"),
    ("3", "Over the 99 as the next step", "<b>Ratified.</b> The title draws in <code>--fg</code> when it is the next step: <code>--avail-over-fg</code> measures 4.24 to 4.49 on the 7% tint (checked: Low Sun 4.26, Neon 4.37, Canopy 4.24, Oil 4.38, Witching 4.49, Frost 4.38). "
     "The red still speaks through the <code>+N</code> mark tile. Drawn on Deck-Calls.", "ok"),
    ("4", "The seed’s pass sheet", "<b>Ratified, with one line added.</b> Done only, no Undo. The sheet’s foot carries the ledger’s own <i>Clear all auto reverses it</i>, so the reader is told how, as on the ledger line. Drawn on Deck-Calls.", "add"),
    ("5", "A10 · History", "<b>Ratified.</b> History only when the start added cards, beside <i>N cards added to your collection.</i> With no ledger entry the band reads <i>You own N of its 99.</i> and nothing links. Both drawn on Deck-Calls.", "ok"),
    ("6", "A11 · the mark", "<b>Ratified: no glyph.</b> STATES was right and the board’s <b>?</b> was Design’s slip. A suggestion is not a receipt, so it carries no ✓ and no stand-in mark. Drawn on Deck-Calls.", "ok"),
    ("7", "Credits erratum", "<b>Ratified.</b> “Running a deck’s Analysis” is not a spender (the Analysis calls no model), and the shipped <code>buying-credits</code> caption already leaves it out. "
     "The handoff’s <code>aboutCredits</code> string in bracket-reach keeps it; this addendum supersedes that line.", "ok"),
]

EDITS = [
    ("<code>ready-to-build</code>", "Replaced by <code>whats-new</code> while <code>HOME_FEED_ENABLED</code> is on (<code>replaces</code>, as <code>buying-credits</code> does <code>credits</code>). Draws again if the feed is turned off."),
    ("<code>friends</code>", "Caption, sentence 2: “Open “Friends” from your account menu” reads <b>“Press “Friends” in the bar”</b> with <code>COMMANDERS_PLACE_ENABLED</code> on (the entry already needs <code>SOCIAL_FRIENDS_ENABLED</code>)."),
    ("<code>discover</code>", "Route <code>/commanders/discover</code> with the place on (<code>discoverPath</code>). Its screen stays <code>discover</code>; <code>screenForPath</code> maps the new route to it."),
    ("<code>help-me-choose</code>", "Route <code>/commanders/choose</code> with the place on (<code>choosePath</code>). Screen stays <code>new-deck</code> until a recapture; engineering may move it to <code>commanders</code>."),
    ("<code>about-rebuilt</code>", "Its line “Help me choose, waiting on Decks, Home and Commanders while you have no decks yet” must still be true with the feed on: engineering confirms Home B keeps that door at zero decks (G4)."),
]

GAPS = [
    "G1 · A caption line or key can need two switches (Help me choose’s tab, Friends in the bar, the trade match). <code>AboutLineSwitch</code> takes one: let it take a list, all of which must be on.",
    "G2 · The entry follows <code>HOME_FEED_ENABLED</code>. A reader with the Commanders place on and the feed off gets no entry for the tabs. The plan turns the line on together, so this is accepted, not drawn.",
    "G3 · <b>Recapture at PR 8, every screen.</b> Every frame shows the bar, and with <code>COMMANDERS_PLACE_ENABLED</code> on the shipped bar has no Discover slot and gains Friends. "
    "<code>home</code> also needs <code>HOME_FEED_ENABLED</code>, <code>SOCIAL_FRIENDS_ENABLED</code>, <code>SOCIAL_WISHLIST_ENABLED</code> on, and a fixture with the feed’s kinds on, one <b>unseen</b> item (the lead) and no welcome strip.",
    "G4 · <code>about-rebuilt</code>’s Help me choose line names Home: confirm it with the feed on, or gate that word.",
    "G5 · The spare request kind (G5 of the handoff) is not named: it ships with its own round and its own line.",
    "G6 · Version: <code>since: 17</code>, one <code>ABOUT_VERSION</code> bump 16 to 17 at PR 8, as the plan says. Home’s banner line names it when the reader’s switches are on.",
]


def main_board():
    calls = "".join(f'<div class="note"><span class="pill {"pick" if k != "ok" else "eng"}">{"DRAWN" if k == "draw" else ("RATIFIED + LINE" if k == "add" else "RATIFIED")}</span>'
                    f'<b>{n} · {t}</b><p style="margin:8px 0 0">{b}</p></div>' for n, t, b, k in CALLS)
    edits = "".join(f"<tr><td>{a}</td><td>{b}</td></tr>" for a, b in EDITS)
    gaps = "<ul>" + "".join(f"<li>{g}</li>" for g in GAPS) + "</ul>"
    loc = ('<table class="tbl"><tr><th>Entry</th><th>Screen</th><th>Locator (suggested)</th><th>Scope</th><th>Frame needs</th></tr>'
           '<tr><td><code>whats-new</code></td><td>home</td><td>the lead story section, e.g. <code>[data-feed-lead]</code></td><td>main</td><td>G3: the line’s switches on, an unseen feed item, no welcome strip</td></tr></table>')
    body = (board_head("About · menu and Home line · account 2 · 2026-10-22 · addendum to #2174 and #2170",
                       "One About entry, and six calls on what shipped",
                       "Hugh’s prompt: an About entry for the menu and Home line (it stays off in production until this exists), and a ruling on each place engineering built something the boards didn’t draw. "
                       "Every call below is checked against main (<code>653499e</code>). Five are ratified as built; the seed’s pass sheet keeps its build and gains one line of words. Boards: <b>E1</b> the entry, <b>Friend-Page</b> call 2, <b>Deck-Calls</b> calls 3 to 6.")
            + '<div class="sec"><h3>The calls</h3><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px">' + calls + "</div></div>"
            + f'<div class="sec"><h3>The entry’s picture</h3><div class="call">{window("kamigawa", 330)}<div><h4>{TITLE}</h4><span class="id">whats-new · home · chapter 04 · replaces ready-to-build · since 17</span>'
              '<p>The halo is the <b>lead story</b>. It is the top of What’s new, it is on the first screen of every Home that has news, and it is the one thing on the frame no other Home entry points at. '
              '<b>Not picked:</b> the What’s new head (on a phone it lands at the bar’s edge, and only a sliver of the list is on the frame), and the bar (a strip across the foot; the Commanders and Friends lines describe it in words).</p>'
              '<p>The Reference lists it first under Home, where <code>ready-to-build</code> stood.</p></div></div></div>'
            + '<div class="sec"><h3>For engineering</h3>' + loc + "</div>"
            + '<div style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:20px">'
              f'<div class="sec"><h3>Entries the line makes stale</h3><table class="tbl"><tr><th>Entry</th><th>Edit, no bump</th></tr>{edits}</table></div>'
              f'<div class="note"><b>Gaps</b>{gaps}</div></div>')
    return doc("About · menu and Home line", body, 1810)


BOARDS = [("Main", main_board, "Main · the entry and the seven calls", 1810),
          ("E1-Whats-new", entry_board, "E1 · What’s new on Home, and where things moved", 1846)]

if __name__ == "__main__":
    mode = sys.argv[1]
    la.MODE["blob"] = mode == "blob"
    out = sys.argv[2]
    os.makedirs(out, exist_ok=True)
    if mode == "local":
        shutil.copytree(f"{S}/art", f"{out}/art", dirs_exist_ok=True)
    for n, fn, _, _ in BOARDS:
        open(f"{out}/{n}.dc.html", "w").write(fn())
    print("ok", mode)
