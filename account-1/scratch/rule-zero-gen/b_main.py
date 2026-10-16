"""The 99 - Rule Zero (R1): the calls, the locks, the gaps. Start here."""
from comps import *

CALLS = [
    ("1", "Where the entry point lives", "Open 1",
     "On the pod: one row, <b>Rule 0 check</b>, at the foot of the shipped pod card on Friends, for any member. A table is a pod’s, so it starts where the pod is; nothing joins the nav or the user menu. While a table is open the row becomes <b>Tonight’s table</b> with its faces and closing time. A seated player who didn’t set it finds it on <b>Home</b>, a card at the head of the Friends section (who seated you, with which deck, Open the table) until it closes. Not on the Games tab: that is per deck, and it is where logging from the table lands."),
    ("2", "The seat picker", "Open 2",
     "One sheet (phone) or dialog (desktop), two steps. <b>Who’s playing?</b> shows the pod’s members as the pod card’s own art seats, You already in; a tap seats or unseats; 2 to 8, with Next held and one line outside that. A member with <b>no decks</b> is dimmed and says so. Someone <b>not on the app</b> gets a dashed row into Add a friend › Invite someone new, unchanged. <b>Tonight’s decks</b> gives each seat a row: yours and your friends’ open their decks by name and commander (no bracket before the table exists); a member who isn’t your friend picks their own, since their decks are never listed to you. Set the table opens it for everyone."),
    ("3", "How the outlier and its drivers read", "Open 3, 5, 7",
     "<b>The read</b> sits on top: a headline, one sentence, a <b>rail</b> of the five brackets with each seat’s face over its reading and a dashed band on the table’s middle, the counts key, and the honesty line with <b>How we make these decisions</b>. Then the seats, in the same order on every phone: art, name, deck, the shipped bracket chip and the five counts. <b>High</b> is amber with ▲ and <b>Above the table</b>; <b>low</b> is steel blue with ▼ and <b>Below the table</b>; a two-seat <b>split</b> is violet on both. A flagged seat names what puts it there in a sentence and lifts those counts. A zero is a dim count, never a clean bill. Seats not in the read say why: cards short of 100, over 100, being read, or waiting for its player."),
    ("4", "How the suggestion reads", "Open 4, 6",
     "On the flagged seat, under its reason, on <b>its own player’s phone only</b>: <b>Closer to the table</b>, up to three of their own read decks nearest the table’s middle, each art, name, chip and one <b>Swap in</b>. One tap seats it, the read redraws, and the shared toast offers Undo. Other phones get it on their next check (20 seconds while open, and on refresh): the seat and the read carry a changed dot until seen. Any seat can also <b>Change deck</b> on its own seat."),
]

LOCKS = [
    "The read is slotDeck and findings, as the chip and the findings already draw them. No model call, no credit chip.",
    "Any deck a bracket or more from the table’s middle is flagged; a split two-seat table flags both.",
    "The detection disclosure is on the read, with the shipped provenance opener. No seat reads clean for a fact not found.",
    "Seats are pod members with decks. No guest seat; someone not on the app is an invite.",
    "One player sets it; each seat changes only its own deck, from its own phone.",
    "A seat shows only its chosen deck: name, commander, bracket and facts. Nothing links on to anyone’s other decks or collection.",
    "Suggestions offer only the flagged player’s own read decks.",
    "Logging from the table pre-fills the seats and decks, onto your own seated deck.",
    "It closes about 24 hours after it’s set; logged games stay.",
    "Behind its own switch, which needs friends on. Off: absent everywhere.",
    "No About entry, no ABOUT_VERSION bump.",
]

BOARDS_LIST = [
    ("Entry · phone / desktop", "the pod card’s row, a table open, Home’s table card, switch off."),
    ("Setup · phone / desktop", "who’s playing, too few, a deck for each seat, a friend’s decks."),
    ("Read · phone / desktop", "balanced, high, low, two outliers, split, range seats, a drifted declaration, not ready, read on the spot, not enough."),
    ("Swap · phone / desktop", "the suggestion, one tap later, Change deck, another seat’s view before and after, a low deck’s offer."),
    ("Log · phone / desktop", "Log this game, the pre-filled log, games off, expired."),
]

GAPS = [
    ("G1", "Engineering", "The seat-grant read (lock 6) returns, per seat: display name, deck name, commander art, permits, the declaration and declarationAsk’s verdict on it, the five finding counts and the verdict sub-line for the drivers sentence, legality now (card count) and whether the reading predates the last edit. Nothing else; a non-friend seat’s name is plain text."),
    ("G2", "Engineering", "Setup needs, per pod member, whether they have any deck (to dim Chris). A boolean only, from the pod membership, so it browses nothing."),
    ("G3", "Hugh", "Setup lists only your friends’ decks, so a member who isn’t your friend always picks their own. The alternative, showing their deck names to the setter, would widen the grant before the table exists. Drawn as the narrow version."),
    ("G4", "Engineering", "Logging a seat who isn’t your friend: deck_game_opponents has friend, friend’s deck and anyone. Drawn as a seat marked from the table with their snapshot name and deck; engineering picks the kind (likely anyone, commander plus label)."),
    ("G5", "Engineering", "Changes reach other phones by a 20 second poll while the page is visible, and on focus or refresh. The changed dot compares each seat’s change time with when this viewer last loaded the table."),
    ("G6", "Engineering", "Suggestions: the player’s own decks that are legal now and have a reading, strictly nearer the table’s middle than the seated deck, nearest first, then most recently played, at most three. Recomputed with the read."),
    ("G7", "Hugh", "One open table per pod. Its setter changes who sits with Seats on the table; a second Rule 0 check while one is open opens that one."),
    ("G8", "Engineering", "Starting decks in setup: each seat starts on that player’s most recently played deck, else most recently edited."),
    ("G9", "Copy", "Every string is in rule-zero · copy strings.ts for /copy-review. No About entry (paused)."),
]

def call_card(n, title, ref, body):
    return (f'<div style="display:grid;grid-template-columns:28px 210px minmax(0,1fr);gap:18px;padding:18px 0;border-top:1px solid var(--border)">'
            f'<span style="font:700 22px Chakra Petch,sans-serif;color:var(--accent)">{n}</span>'
            f'<div><b style="font:600 15px IBM Plex Sans,sans-serif">{title}</b><div class="k" style="margin-top:6px">{ref}</div></div>'
            f'<p class="cap" style="font-size:13.5px;color:var(--fg-body)">{body}</p></div>')

def side(title, items):
    lis = "".join(f'<li style="margin:6px 0">{i}</li>' for i in items)
    return (f'<div class="note"><span class="k">{title}</span><ul style="margin-top:10px">{lis}</ul></div>')

def sample():
    s = S("Colin", "zimone", flag="hi", why=ZIMONE_WHY, drivers=("twoCardCombos", "tutors"))
    return f'<div style="width:370px">{seat(s)}</div>'

def board():
    arts = "".join(f'<span style="width:150px;height:80px;border-radius:10px;overflow:hidden;display:block;box-shadow:0 10px 24px rgba(0,0,0,.5)"><img src="art/{a}.jpg" alt="" style="width:100%;height:100%;object-fit:cover"></span>'
                   for a in ["ghalta", "zimone", "giada", "gisa"])
    head = ('<div style="display:flex;justify-content:space-between;gap:40px;align-items:flex-end"><div class="bh" style="max-width:1000px">'
            '<span class="k">Rule 0 table check · R1 · behind its own switch (needs friends on) · phone and desktop · 2026-10-16</span>'
            '<h2 style="font-size:36px;line-height:1.15">Rule 0 check: the pod becomes tonight’s table, and every phone at it reads the same spread</h2>'
            '<p class="cap" style="font-size:14px">Pick who’s playing from a pod and a deck for each seat. The page lays every seat’s bracket on one rail of five, '
            'names any deck a bracket or more from the middle, high or low, and what puts it there, and offers that player only their own decks that sit closer, '
            'one tap to swap. Every seat sees the same read on their own phone. Log this game opens the log on your seated deck with the table already across from you. '
            'It closes after the night. Free: the bracket reading is the one the deck page already computes.</p></div>'
            f'<div style="display:flex;gap:10px">{arts}</div></div>')
    calls = "".join(call_card(*c) for c in CALLS)
    left = (f'<div class="note" style="padding:18px 24px"><span class="k">The four open calls (brief, Open for Design), answered</span>{calls}</div>')
    right = (side("Locks, held as drawn", LOCKS)
             + side("Boards on this canvas", [f"<b>{a}</b>: {b}" for a, b in BOARDS_LIST])
             + '<div class="note"><span class="k">A flagged seat, as drawn</span><div style="margin-top:12px">' + sample() + '</div>'
               '<p class="cap" style="margin-top:12px">The shipped chip and the five counts, with the drivers lifted and a sentence. The flag is a tag and a border, the words carry it.</p></div>'
             + '<div class="note"><span class="k">About the pictures</span><p class="cap" style="margin-top:8px">Every board is drawn over a shipped surface in the Kamigawa theme: the pod card, Home’s Friends section, the bottom sheet, the bracket chip, the log form. Commander art is cropped from the design folder (the canvas cannot load Scryfall). Fixtures: Colin’s pod Thursday night with you, Peter, Max (Colin’s friend, not yours) and Chris (no decks yet).</p></div>')
    gaps = "".join(
        f'<div style="display:grid;grid-template-columns:34px 90px minmax(0,1fr);gap:12px;padding:12px 0;border-top:1px solid var(--border)">'
        f'<span class="mono" style="color:var(--warning);font-size:12px">{g}</span><span class="mono" style="font-size:11px;color:var(--fg-faint)">{w}</span>'
        f'<p class="cap" style="color:var(--fg-body)">{t}</p></div>' for g, w, t in GAPS)
    body = (head + f'<div style="display:grid;grid-template-columns:minmax(0,1fr) 440px;gap:28px;align-items:start">{left}<div style="display:flex;flex-direction:column;gap:18px">{right}</div></div>'
            f'<div class="note" style="padding:18px 24px"><span class="k">Gaps for engineering and Hugh (G1 to G9, also in README.md)</span><div style="margin-top:8px">{gaps}</div></div>')
    return doc("Rule 0 check R1", body, 1700, 2600)

PH, DH = {}, {}
