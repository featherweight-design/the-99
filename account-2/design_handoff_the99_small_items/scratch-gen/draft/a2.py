"""Alternative A, round 2 (Hugh 2026-10-22 02:15): receipt band back on top; one deliberate next step."""
import kit
from kit import doc, board_head, frame
import pieces as P
from pieces import DECKS
import alts as A

kit.CSS += r"""
.t2{margin:14px 14px 14px;border-radius:12px;background:var(--surface-rail);border:1px solid var(--border-strong);overflow:hidden}
.t2 .th{display:flex;align-items:center;gap:10px;padding:12px 14px 10px}
.t2 .th .e{font:9.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.t2 .th .n{margin-left:auto;font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.t2 .r{display:flex;align-items:center;gap:11px;padding:11px 14px;border-top:1px solid var(--border)}
.t2 .r .mk{flex:none;width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font:600 12px 'IBM Plex Mono'}
.t2 .r .mk.w{background:color-mix(in srgb,var(--danger) 16%,var(--bg));color:var(--danger)}
.t2 .r .mk.a{background:color-mix(in srgb,var(--accent) 14%,var(--bg));color:var(--accent)}
.t2 .r .tx{flex:1;min-width:0}
.t2 .r .h{font-size:13.5px;font-weight:600;line-height:1.4}
.t2 .r.wn .h{color:var(--avail-over-fg)}
.t2 .r .b{font-size:12px;line-height:1.5;color:var(--fg-muted);margin-top:2px}
.t2 .r .bt{flex:none;width:96px;height:36px;display:flex;align-items:center;justify-content:center;gap:5px;border-radius:8px;border:1px solid var(--border-strong);color:var(--fg);font:600 12.5px 'IBM Plex Sans';white-space:nowrap}
.t2 .r .bt .ch{color:var(--fg-faint);font-weight:400}
.t2 .r.nx{background:color-mix(in srgb,var(--accent) 7%,var(--surface-rail));box-shadow:inset 3px 0 0 var(--accent)}
.t2 .r.nx .bt{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.t2 .r.nx .bt .ch{color:var(--bg)}
.t2 .r .ne{font:9px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:2px}
.t2 .lt{padding:6px 14px 4px;border-top:1px solid var(--border);font:9px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.t2 .lt+.r{border-top:0}
.t2 .ft{border-top:1px solid var(--border);padding:9px 14px;font:11px/1.7 'IBM Plex Mono';color:var(--fg-faint);background:color-mix(in srgb,var(--bg) 40%,var(--surface-rail))}
.t2 .ft .sep{color:var(--fg-locked);margin:0 5px}
.t2 .ft .ds{color:var(--fg-body);border-bottom:1px dotted var(--fg-faint)}
.t2 .hx{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px}
.t2 .hx .q{font:600 15px/1.35 'IBM Plex Sans';color:var(--fg)}
.t2 .hx .q span{display:block;font:400 12px/1.5 'IBM Plex Sans';color:var(--fg-muted);margin-top:3px}
.t2 .hx .big{display:flex;align-items:center;justify-content:center;height:42px;border-radius:9px;background:var(--fg);color:var(--bg);font:600 13.5px 'IBM Plex Sans'}
.dkm .t2{margin:18px 26px 18px}
.dkm .t2 .r{padding:10px 16px}
.dkm .t2 .r .tx{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.dkm .t2 .r .b{margin:0;font-size:12.5px}
.dkm .t2 .r .ne{margin:0}
.dkm .t2 .r .bt{width:132px}
.dkm .t2 .ft{padding:9px 16px}
"""

OG = A.OG
PM = lambda p, m: f'<span class="m" style="font-weight:400;font-size:12px"><span style="color:var(--success)">+{p}</span> / <span style="color:var(--warning)">−{m}</span></span>'


def row(kind, mark, h, b, verb, nxt=False):
    ne = '<div class="ne">Next step</div>' if nxt else ""
    return (f'<div class="r{" wn" if kind == "w" else ""}{" nx" if nxt else ""}"><span class="mk {kind}">{mark}</span>'
            f'<div class="tx">{ne}<div class="h">{h}</div>' + (f'<p class="b">{b}</p>' if b else "")
            + f'</div><span class="bt">{verb}<span class="ch">›</span></span></div>')


def card(eyebrow, count, rows, foot, head=""):
    sep = '<span class="sep">·</span>'
    ft = sep.join(f'<span class="ds">{t} ▾</span>' if ds else f"<span>{t}</span>" for t, ds in foot)
    return (f'<div class="t2"><div class="th"><span class="e">{eyebrow}</span><span class="n">{count}</span></div>'
            f'{head}{"".join(rows)}<div class="ft">{ft}</div></div>')


R_LAST = lambda nxt=True: row("a", "12", "Choose the last 12", "151 candidates ranked by synergy. 6 you can sleeve.", "Choose", nxt)
R_SOL = row("w", OG, "Sol Ring is spoken for twice", "It’s on 3 committed decks and you own 2.", "Shopping")
R_PEND3 = lambda nxt=False: row("a", "±", f"9 changes since v2 {PM(5, 4)}", "Commit or discard them in Review.", "Review", nxt)
F3 = [("v2", False), ("Where these 31 cards came from", True), ("4 in other drafts too", True)]


def s3(desk=False):
    return card("Before Big Stompy is complete", "3 to do", [R_LAST(), R_SOL, R_PEND3()], F3)


def s1():
    return card("Before Thopter Works is ready", "2 to do", [
        row("a", "±", f"6 changes since v3 {PM(4, 2)}", "Thopter Spy Network, Whirler Rogue and 4 more. Commit them as v4 in Review.", "Review", True),
        row("w", OG, "2 cards here are spoken for twice", "Both are on more committed decks than you have copies.", "Shopping"),
    ], [("1 of these is a proxy", False), ("Where these 31 cards came from", True)])


def s2():
    return card("Before Big Stompy is legal", "2 to do", [
        row("w", "+1", "One over the ninety-nine", "Cut one and it is legal.", "Cuts", True),
        R_PEND3(),
    ], [("v2", False)])


def s3_head():
    """Variant: the next step is the card's head; the rest are 'also' rows."""
    head = ('<div class="hx"><p class="q">Choose the last 12<span>151 candidates ranked by synergy. 6 you can sleeve.</span></p>'
            '<span class="big">Choose the last 12 ↓</span></div><div class="lt">Also to do</div>')
    return card("Next step · Big Stompy", "3 to do", [R_SOL, R_PEND3()], F3, head)


def view(v):
    if v == "s1":
        return P.phone(P.phone_header(DECKS["thopter"]) + s1() + P.mix(phone_parity=True) + P.tabs() + P.phone_list(changed=True), 704)
    if v == "s2":
        return P.phone(P.phone_header(DECKS["stompy"]) + s2() + P.mix(cells=A.C2, phone_parity=True) + P.tabs(built=100)
                       + P.phone_list(changed=True, shopping="3", built=100), 704)
    d = DECKS["stompy-short"]
    if v == "desk":
        return P.desk(P.desk_header(d) + P.receipt("precon", desk=True) + s3(True) + P.mix(desk=True, cells=A.C3) + P.dtabs(built=87)
                      + P.desk_list('<span class="nt">9 of these differ from v2</span>', changed=True), 820)
    body = s3_head() if v == "head" else s3()
    return P.phone(P.phone_header(d) + P.receipt("precon") + body + P.mix(cells=A.C3, phone_parity=True) + P.tabs(built=87)
                   + P.phone_list(changed=True, shopping="9", built=87), 704)


def board():
    body = (board_head("Deck page messages · alternative A · round 2", "One to-do card, with one next step",
                       "Your A feedback: the precon receipt is back on top as R1’s arrival band, the one thing you can ✕, above the card. "
                       "Every row now has <b>one</b> press, the same size and shape, in one column on the right, so no row’s press runs into another’s. "
                       "<b>One row is the next step</b>: it leads the card, carries a ‘Next step’ label and an accent edge, and its press is the only filled one. "
                       "The rest are outlined. Pending changes’ Commit and Discard live in Review, which already shows both. Copy is placeholder.", tag="A2")
            + '<div class="frames">'
            + frame("<b>A2</b> · Stack 3 · 390", view("s3"),
                    "Receipt band, then the card. Choose the last 12 is the next step; Sol Ring and the changes wait below with outlined presses.")
            + frame("<b>A2</b> · Stack 1 · 390", view("s1"),
                    "Nothing left to fill, so committing the changes is the next step. Spoken for twice is never the next step: you sort it in Shopping, not in this deck.")
            + frame("<b>A2</b> · Stack 2 · 390", view("s2"),
                    "Over the 99 is the next step and its press is Cuts (Proposed cuts). M3 anchors to it.")
            + frame("<b>A2</b> · Stack 3 · 1300", view("desk"),
                    "Rows on one line; presses line up in one column at the right edge.")
            + "</div>"
            + '<div class="sec"><h3>Another way to show the next step</h3><div class="frames">'
            + frame("<b>A2 variant</b> · next step in the head · 390", view("head"),
                    "The next step becomes the card’s head with a full-width press; the others sit under ‘Also to do’. "
                    "Clearer as a single ask, but the tabs arrive 37px later and the head changes shape from deck to deck.")
            + '<div class="note" style="width:620px;align-self:flex-start"><b>How the next step is picked</b><ul>'
              "<li>The first present of: <i>fill failed › unresolved › over the 99 › the last N › pending changes</i>. Each one changes the deck itself, and each one before the next makes the later ones moot (cut before you commit; fill before you commit).</li>"
              "<li><b>Spoken for twice is never the next step.</b> It is red, it sits right under the next step, and its press goes to Shopping, but you fix it by buying or by changing another deck.</li>"
              "<li><b>Order of the rest:</b> warnings, then actions, in the order above.</li>"
              "<li><b>One press per row,</b> 96px at 390 and 132px at 1300, the verb plus ›. Filled only on the next step. The whole row is the hit area on the phone.</li>"
              "<li><b>Moved:</b> Commit and Discard into Review (the shipped review already has both). Your call: keep Commit on the row as a second press if one press is too far.</li>"
              "<li><b>Receipts:</b> R1’s arrival band, above the card, ✕ for the visit (as ruled).</li>"
              "<li><b>New copy for /copy-review:</b> the card’s head, ‘Next step’, the rows’ short verbs (Choose, Shopping, Review, Cuts) and their bodies.</li></ul></div>"
            + "</div></div>")
    return doc("Deck messages · alternative A round 2", body, A.W)


BOARDS = [("Alt-A2", board, "Alternative A2 · one to-do card, one next step")]
