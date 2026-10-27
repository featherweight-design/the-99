"""The round's front board: the three calls and what each needs."""
import kit
from kit import doc, board_head

kit.CSS += r"""
.calls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;max-width:1500px}
.call{border:1px solid var(--border-strong);border-radius:12px;background:#15120F;padding:18px 20px;display:flex;flex-direction:column;gap:10px;font-size:13px;line-height:1.6;color:var(--fg-body)}
.call .n{font:600 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.call h3{margin:0;font:700 19px 'Cinzel',serif;color:var(--fg)}
.call b{color:var(--fg)}
.call ul{margin:0;padding-left:18px}.call li{margin:3px 0}
.call .bd2{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);border-top:1px solid var(--border);padding-top:10px}
"""

CALLS = [
    ("1 · Proposed cuts", "Three alternatives on each cut",
     "<p>Each pending cut gets a strip, <b>Or cut one of these instead</b>, with <b>three card tiles</b> under its reason and figures. "
     "A tile is one press: it swaps that card into the row with its own reason, and the card it replaced takes the tile’s slot, so switching "
     "back is one press too. <b>Cut</b> and <b>Keep</b> are unchanged and still the only way a card leaves the list.</p>"
     "<ul><li>Phone: three 72 × 100 card tiles across the row. Desktop: a row of three on the reason’s indent, card, name and type line, with the shipped hover preview.</li>"
     "<li>Three because three card-size tiles fit the phone row without scrolling. Fewer when the run can’t back three; none and the row is as shipped.</li>"
     "<li>Engineering: the same Look deeper run names the runners-up (same credit, same checks). A pick is remembered, so History shows the card you chose.</li></ul>",
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
     "<li>The Home item’s press reads <b>Your request ›</b> (was <i>Your requests ›</i>). The item’s own ✕ still only hides it.</li></ul>",
     "Board: Spare-Answer-Sheet"),
]


def board():
    cards = "".join(f'<div class="call"><span class="n">{n}</span><h3>{t}</h3>{b}<span class="bd2">{f}</span></div>' for n, t, b, f in CALLS)
    body = (board_head("Three small items · 27 Oct 2026", "Three calls, one board each",
                       "A light addendum: three unrelated items, each drawn over the shipped surface it changes. Your new rule (give the player a choice, "
                       "never lock them in) drives the first. Copy is shipped where it exists; new strings are placeholders for /copy-review.", tag="R1")
            + f'<div class="calls">{cards}</div>')
    return doc("Three small items", body, 1612)


BOARDS = [("Main", board, "R1 · the three calls")]
