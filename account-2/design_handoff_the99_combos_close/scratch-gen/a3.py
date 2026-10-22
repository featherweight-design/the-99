"""Alternative A, round 3 (Hugh 2026-10-22 02:35): every next step in the head vs as a row; a shorter precon band;
the card's foot disclosures opened."""
import kit
from kit import doc, board_head, frame
import pieces as P
from pieces import DECKS
import alts as A
import a2

kit.CSS += r"""
.spc{width:390px;flex:none;background:var(--bg);border:1px solid var(--border-strong);border-radius:16px;overflow:hidden;padding:0 0 0}
.spc.dkm{width:1236px}
.t2 .ft .op{color:var(--fg)}
.t2 .fo{border-top:1px solid var(--border);padding:4px 14px 12px;background:color-mix(in srgb,var(--bg) 40%,var(--surface-rail))}
.t2 .fo .sld{margin-top:8px}
.t2 .hx .nb{font:12px/1.5 'IBM Plex Mono';color:var(--fg-locked)}
.dkm .t2 .fo{padding:4px 16px 12px}
.dkm .t2 .hx{flex-direction:row;align-items:center;gap:20px;padding:4px 16px 14px}
.dkm .t2 .hx .q{flex:1}
.dkm .t2 .hx .big{padding:0 22px;flex:none}
.steph{display:grid;grid-template-columns:200px 390px 390px;gap:28px;align-items:start}
.steph .k{font-size:13px;line-height:1.55;color:var(--fg-muted)}
.steph .k b{display:block;color:var(--fg);font:700 16px Cinzel,serif;margin-bottom:6px}
.t2 .hx .q .m,.t2 .hx .q .m span{display:inline;margin:0;font:inherit;font-family:'IBM Plex Mono';font-size:13px;color:inherit}
.t2 .hx .q .m span[style]{color:unset}
.colh{font:500 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
"""

row = a2.row
PM = a2.PM
OG = A.OG


def receipt(desk=False):
    return ('<div class="rc"><span class="ok">✓</span><div class="tx"><span class="hd">Started from the Veloci-Ramp-Tor precon</span>'
            '<span class="mt" style="font-size:11px">You own 71 of its 99 <a>History</a></span></div><span class="x">✕</span></div>')


def foot(segs, opened=None, desk=False, n=31):
    sep = '<span class="sep">·</span>'
    out = []
    for t, ds in segs:
        if ds:
            op = t == opened
            out.append(f'<span class="ds{" op" if op else ""}">{t} {"▴" if op else "▾"}</span>')
        else:
            out.append(f"<span>{t}</span>")
    det = ""
    if opened and opened.startswith("Where"):
        det = f'<div class="fo">{P.ledger_detail(desk, n)}</div>'
    elif opened:
        det = f'<div class="fo">{P.soft_detail(4)}</div>'
    return f'<div class="ft">{sep.join(out)}</div>{det}'


def head_card(eyebrow, count, q, sub, press, rows, segs, opened=None, desk=False, extra_head=""):
    pr = f'<span class="big">{press}</span>' if press else ""
    head = (f'<div class="hx"><p class="q">{extra_head}{q}' + (f"<span>{sub}</span>" if sub else "") + f'</p>{pr}</div>'
            + ('<div class="lt">Also to do</div>' if rows else ""))
    return (f'<div class="t2"><div class="th"><span class="e">{eyebrow}</span><span class="n">{count}</span></div>'
            f'{head}{"".join(rows)}{foot(segs, opened, desk)}</div>')


def row_card(eyebrow, count, rows, segs, opened=None, desk=False):
    return (f'<div class="t2"><div class="th"><span class="e">{eyebrow}</span><span class="n">{count}</span></div>'
            f'{"".join(rows)}{foot(segs, opened, desk)}</div>')


R_SOL = a2.R_SOL
R_SOL2 = row("w", OG, "2 cards here are spoken for twice", "Both are on more committed decks than you have copies.", "Shopping")
R_P9 = a2.R_PEND3()
R_LAST = row("a", "12", "Choose the last 12", "151 candidates ranked by synergy. 6 you can sleeve.", "Choose")
F3 = a2.F3
CRUMB = '<span class="crumb" style="margin:0 0 6px;display:flex"><i></i><i></i><i class="a"></i></span>'

# (key, title, note, row-form card, head-form card)
STEPS = [
    ("Fill failed", "A9. The deck was made but the fill didn’t run. Nothing else can be due on an empty deck.",
     row_card("Before Big Stompy is built", "1 to do", [row("a", "!", "The deck is here, the cards aren’t.", "We made the deck but couldn’t fill it. Nothing is lost.", "Try again", True)], [("No version yet", False)]),
     head_card("Next step · Big Stompy", "1 to do", "The deck is here, the cards aren’t.", "We made the deck but couldn’t fill it. Nothing is lost.", "Try filling again", [], [("No version yet", False)])),
    ("Unresolved", "A15. Lines from an import that we couldn’t put a card to.",
     row_card("Before Big Stompy is complete", "2 to do", [row("a", "2", "2 lines unresolved", "They’re at the bottom of the list and keep the deck off Complete.", "Look", True), R_SOL], [("v1", False)]),
     head_card("Next step · Big Stompy", "2 to do", "2 lines unresolved", "2 lines came over that we couldn’t put a card to. They’re at the bottom of the list, not counted in the mix, and they’ll keep the deck off Complete until you sort them out.", "Take a look →", [R_SOL], [("v1", False)])),
    ("Over the 99", "A4. One card too many.",
     row_card("Before Big Stompy is legal", "2 to do", [row("w", "+1", "One over the ninety-nine", "Cut one and it is legal.", "Cuts", True), R_P9], [("v2", False)]),
     head_card("Next step · Big Stompy", "2 to do", '<span style="color:var(--danger);font:600 15px \'IBM Plex Mono\';display:inline;margin:0 6px 0 0">+1</span>One over the ninety-nine', "Cut one and it is legal.", "Proposed cuts →", [R_P9], [("v2", False)])),
    ("The last N", "A8. Short of 99 and the collection has candidates.",
     row_card("Before Big Stompy is complete", "3 to do", [a2.R_LAST(), R_SOL, R_P9], F3),
     head_card("Next step · Big Stompy", "3 to do", "Choose the last 12", "151 candidates ranked by synergy. 6 you can sleeve.", "Choose the last 12 ↓", [R_SOL, R_P9], F3)),
    ("Ran out", "A8’s plate. Short of 99 and nothing left to rank. Today the plate has no press; here it points to Consider, which is new (your call).",
     row_card("Before Big Stompy is complete", "2 to do", [row("a", "12", "12 short, and your collection ran out", "Nothing left in it that EDHREC ranks for this commander.", "Consider", True), R_P9], F3),
     head_card("Next step · Big Stompy", "2 to do", "87 of 99, and your collection ran out", "There was nothing left in it that EDHREC ranks for this commander. Consider has cards to buy.", "Open Consider →", [R_P9], F3)),
    ("Pending changes", "A14. Nothing left to fill: committing is next.",
     row_card("Before Thopter Works is ready", "2 to do", [row("a", "±", f"6 changes since v3 {PM(4, 2)}", "Commit them as v4 in Review.", "Review", True), R_SOL2], [("1 of these is a proxy", False), ("Where these 31 cards came from", True)]),
     head_card("Next step · Thopter Works", "2 to do", f"6 changes since v3 {PM(4, 2)}", "Thopter Spy Network, Whirler Rogue, Efficient Construction, Hangarback Walker in; Ornithopter and Sol Ring out.", "Review and commit as v4", [R_SOL2], [("1 of these is a proxy", False), ("Where these 31 cards came from", True)])),
    ("First run", "A17. The first deck, no cards yet. The guided banner’s step and crumbs head the card.",
     row_card("Step 3 of 3 · Build your first deck", "1 to do", [row("a", "99", "Choose the last 99", "140 candidates ranked by synergy for this commander.", "Choose", True)], [("No version yet", False)]),
     head_card("Step 3 of 3", "1 to do", "Build your first deck", "Search cards or pick from your suggestions below. 140 candidates ranked for Sai.", "Choose the last 99 ↓", [], [("No version yet", False)], extra_head=CRUMB)),
]


def steps_section():
    hdr = ('<div class="steph"><span></span><span class="colh">Next step as a row (A2)</span><span class="colh">Next step in the head</span></div>')
    rows = "".join(f'<div class="steph"><p class="k"><b>{k}</b>{n}</p><div class="spc">{r}</div><div class="spc">{h}</div></div>'
                   for k, n, r, h in STEPS)
    return (f'<div class="sec"><h3>1 · Every next step, both ways</h3>'
            '<p class="sp">Each next step the deck can have, at 390, with what else is usually waiting beside it. Left: the step as the first row. Right: the step as the card’s head, '
            'with a full-width press and the rest under ‘Also to do’. Spoken for twice never heads the card. A deck with nothing to do shows no card, only its status line (the quiet deck).</p>'
            f'<div style="display:flex;flex-direction:column;gap:26px">{hdr}{rows}</div></div>')


def receipt_section():
    old = P.receipt("precon")
    return ('<div class="sec"><h3>2 · The precon band, shorter</h3><div class="frames">'
            + frame("Before (A2)", f'<div class="spc">{old}</div>', "Four lines at 390.")
            + frame("<b>A3</b> · 390", f'<div class="spc">{receipt()}</div>', "Which precon, how many you own, History. The ‘28 you don’t’ line and the set and printings line go.")
            + frame("<b>A3</b> · 1300", f'<div class="spc dkm">{receipt(True)}</div>', "One line.")
            + "</div></div>")


def stack3(opened=None, desk=False):
    d = DECKS["stompy-short"]
    card = head_card("Next step · Big Stompy", "3 to do", "Choose the last 12", "151 candidates ranked by synergy. 6 you can sleeve.",
                     "Choose the last 12 ↓", [R_SOL, R_P9], F3, opened, desk)
    if desk:
        return P.desk(P.desk_header(d) + receipt(True) + card + P.mix(desk=True, cells=A.C3) + P.dtabs(built=87)
                      + P.desk_list('<span class="nt">9 of these differ from v2</span>', changed=True), 820)
    return P.phone(P.phone_header(d) + receipt() + card + P.mix(cells=A.C3, phone_parity=True) + P.tabs(built=87)
                   + P.phone_list(changed=True, shopping="9", built=87), 704)


def foot_section():
    return ('<div class="sec"><h3>3 · Pressing the card’s foot</h3>'
            '<p class="sp">The foot is R1’s status line. Plain facts (v2, ‘1 of these is a proxy’) are not presses. A segment with ▾ opens <b>inside the card, under the foot</b>, '
            'one at a time; pressing it again, or the other one, closes it. It stays open for the visit only. What opens is the shipped content, unchanged.</p><div class="frames">'
            + frame("<b>A3</b> · Stack 3 · 390 · closed", stack3(), "The precon band is the shorter one.")
            + frame("<b>A3</b> · 390 · Where these 31 cards came from ▴", stack3("Where these 31 cards came from"),
                    "The shipped provenance ledger: the seed and each top-off, with Show these (filters the list) and Undo these. Clear all auto’s note stays on the seed.")
            + frame("<b>A3</b> · 390 · 4 in other drafts too ▴", stack3("4 in other drafts too"),
                    "The soft claim’s shipped sentence with its hollow mark. The 4 rows carry the same mark in the list.")
            + "</div><div class=\"frames\">"
            + frame("<b>A3</b> · Stack 3 · 1300 · Where these 31 cards came from ▴", stack3("Where these 31 cards came from", True),
                    "At desktop the head runs on one line with its press on the right, and the ledger keeps the shipped one-line rows.")
            + "</div></div>")


def board():
    body = (board_head("Deck page messages · alternative A · round 3", "Next step in the head, every case; the card’s foot opened",
                       "Your A2 feedback: (1) every next step the deck can have, as a row and as the card’s head, side by side; "
                       "(2) the precon band says which precon, how many you own, and History, nothing else; "
                       "(3) what the foot’s ▾ segments open. The rest of A2 stands: one press per row, Commit and Discard in Review (your call). Copy is placeholder.", tag="A3")
            + steps_section() + receipt_section() + foot_section())
    return doc("Deck messages · alternative A round 3", body, 390 * 3 + 1300 + 44 * 3 + 112)


BOARDS = [("Alt-A3", board, "Alternative A3 · every next step, short precon band, foot opened")]
