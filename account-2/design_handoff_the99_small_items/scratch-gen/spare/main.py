"""The round's front board: the three calls and what each needs."""
import kit
from kit import doc, board_head

kit.CSS += r"""
.calls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;max-width:1500px}
.call{border:1px solid var(--border-strong);border-radius:12px;background:#15120F;padding:18px 20px;display:flex;flex-direction:column;gap:10px;font-size:13px;line-height:1.6;color:var(--fg-body)}
.call .n{font:600 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.call h3{margin:0;font:700 19px 'Cinzel',serif;color:var(--fg)}
.call b{color:var(--fg)}
.call ul{margin:0;padding-left:18px}.call li{margin:3px 0}
.call .bd2{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);border-top:1px solid var(--border);padding-top:10px}
"""

CALLS = [
    ("1 · Proposed cuts", "Name more cuts than the deck needs",
     "<p><b>R1b, from your feedback:</b> no alternatives strip. The run names <b>three more cuts than the deck needs</b>, and you pick. "
     "At 102 the deck is three over, so six are named and you cut any three. Every row is the shipped CutRow.</p>"
     "<ul><li>Once enough are cut, the rest stay open: Undo one and cut another to change your mind.</li>"
     "<li>Engineering: the same Look deeper run returns over + 3 reasoned rows, same credit and checks. No new control.</li></ul>",
     "Board: Cuts-Alternatives"),
    ("2 · Deck toolbar", "No draft note on the phone",
     "<p><b>Leave it off.</b> On a phone the draft is said four times before the first row: the to-do card’s Review row, the mix strip’s "
     "<i>reading pending changes</i>, the list caption directly under the toolbar (<i>the brass rule marks the 6 rows you have changed</i>), and each group’s "
     "heading and brass rules. The note would repeat the caption’s count one line above it.</p>"
     "<ul><li>The toolbar’s three phone rows are full; any spot for the note costs a line or crowds Lock cards and the view well.</li>"
     "<li>No change to ship. A test pinning the phone’s caption and group notes during a draft would keep it settled.</li></ul>",
     "Board: Draft-Note-Phone"),
    ("3 · Spare requests", "The answer opens a sheet over Home",
     "<p><b>Engineering’s proposal, ratified:</b> ModalChrome at 560 (the phone sheet hugs its row), titled <b>Your request</b>, the shipped row for "
     "this one request with its ✕ moved to a <b>Clear</b> text button at the row’s foot, and <b>All your requests ›</b> in the foot.</p>"
     "<ul><li>The sheet’s ✕ is the only ✕; Clear is words, under the text, far from it.</li>"
     "<li>Clear removes the request for good, closes the sheet and takes the Home item with it. A failure keeps the sheet and shows the shared toast.</li>"
     "<li>The Home item’s press reads <b>Your request ›</b> (was <i>Your requests ›</i>). The item’s own ✕ still only hides it.</li>"
     "<li><b>R1b:</b> the accepted line ends <i>press buy on it in Shopping or add it to your collection</i>.</li></ul>",
     "Board: Spare-Answer-Sheet"),
    ("4 · The ✕ and three rulings", "The ✕ ends the action line; #2284, #2280, #2288 ratified",
     "<p>On What’s new rows, the lead story and Waiting on you, <b>the ✕ moves from the top-right corner to the end of the action line</b>: "
     "after the press on a phone (44px), after time and press on desktop (32px). It no longer sits beside the time or takes width from the title.</p>"
     "<ul><li><b>#2284</b> (time and press on one line, desktop): ratified, with the ✕ joining that line.</li>"
     "<li><b>#2280</b> (one folded mark shows itself, not +1): ratified.</li>"
     "<li><b>#2288</b> (Ask opens the spares sheet over the page): ratified.</li></ul>",
     "Boards: Dismiss-X, Eng-Rulings"),
    ("5 · Precon Overview", "Read how a precon plays, and keep that read",
     "<p>Every precon’s page shows its pre-written <b>Overview</b> under “You own”, above the list, with <i>View full overview →</i> "
     "opening the shipped modal. <b>Start with this precon</b> (with or without <i>I own this precon</i>) carries it and the bracket reading "
     "into the new deck, whose Analysis opens done: <i>Analysis from the precon list · 27 Oct</i>.</p>"
     "<ul><li>The first edit makes it stale exactly as any deck’s: the shipped banner and Re-analyze; after that the reading is the deck’s own.</li>"
     "<li>Engineering: one Overview and reading per precon list, written ahead; the copy is free.</li></ul>",
     "Board: Precon-Overview"),
    ("6 · /friends on desktop", "Use the width: two columns",
     "<p>From 1180px the head runs across, then <b>two columns</b>: Waiting on you, Your requests and Friends on the left; "
     "<b>Pods</b> on the right (420px, seats three to a row as on a phone), whole above the fold.</p>"
     "<ul><li>No tabs for now; nothing new, nothing hidden, phone unchanged.</li>"
     "<li>Engineering: a grid in <code>friends-view.tsx</code>; DOM order stays phone order.</li></ul>",
     "Board: Friends-Desktop"),
]


def board():
    cards = "".join(f'<div class="call"><span class="n">{n}</span><h3>{t}</h3>{b}<span class="bd2">{f}</span></div>' for n, t, b, f in CALLS)
    body = (board_head("Small items · 27 Oct 2026", "Six calls",
                       "A light addendum: six unrelated items, each drawn over the shipped surface it changes. R1b folds in your feedback on 1 and 3; 6 is new. Your new rule (give the player a choice, "
                       "never lock them in) drives the first. Copy is shipped where it exists; new strings are placeholders for /copy-review.", tag="R1b")
            + f'<div class="calls">{cards}</div>')
    return doc("Three small items", body, 1612)


BOARDS = [("Main", board, "R1 · the three calls")]
