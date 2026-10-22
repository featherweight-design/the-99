"""Calls 3 to 6 (menu and Home About addendum, account 2, 2026-10-22): what the deck messages PRs built differently
from the boards, drawn with the deck messages kit (Low Sun) over its own pieces."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import doc, board_head, frame
import pieces as P
import a2, a3, sh
from boards import col

kit.CSS += r"""
.t2 .r.wn.nx .h{color:var(--fg)}
.cg{display:grid;grid-template-columns:390px 390px minmax(0,1fr);gap:32px;align-items:start}
.cg .lab{font:500 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);margin-bottom:8px}
.cg .lab b{color:var(--accent)}
.cg p.cp{margin-top:10px;font-size:12.5px;line-height:1.55;color:var(--fg-muted)}
.ctab{border-collapse:collapse;font-size:12.5px;color:var(--fg-body);width:100%}
.ctab th{text-align:left;font:500 10px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint);padding:6px 8px;border-bottom:1px solid var(--border-strong)}
.ctab td{padding:7px 8px;border-bottom:1px solid var(--border);font-family:'IBM Plex Mono'}
.ctab td.no{color:var(--avail-over-fg)}
.sf .rv{flex:none;align-self:center;font:11px 'IBM Plex Mono';color:var(--fg-faint);background:none;height:auto}
.sfp{flex-direction:column;gap:8px}
.sfp .rv{align-self:center}
.sfp .p{flex:none;width:100%}
.verdict{display:inline-block;font:600 10px 'IBM Plex Mono';letter-spacing:.08em;border-radius:4px;padding:3px 7px;margin-right:8px;vertical-align:3px;background:#2C2620;color:var(--fg-body)}
.verdict.add{background:var(--accent);color:#14110E}
.call-o{outline:1.5px dashed rgba(207,135,69,.8);outline-offset:2px;border-radius:6px}
"""

ROW = a2.row
OVER_NX = ROW("w", "+1", "One over the ninety-nine", "Cut 1 and it is legal.", "Cuts", True)
OVER = ROW("w", "+1", "One over the ninety-nine", "Cut 1 and it is legal.", "Cuts")
UNRES = ROW("a", "2", "2 lines unresolved", "They’re at the bottom of the list and keep the deck off Complete.", "Look", True)
FOOT = [("v2", False), ("Where these 31 cards came from", True)]


def card(rows, n):
    return a3.row_card("Before Big Stompy is legal", f"{n} to do", rows, FOOT)


def sec(title, verdict, add, intro):
    v = f'<span class="verdict{" add" if add else ""}">{verdict}</span>'
    return f'<div class="sec"><h3>{v}{title}</h3><p class="sp">{intro}</p>'


CONTRAST = [("Low Sun", "4.26", "4.68", "13.18"), ("Neon Rain", "4.37", "4.70", "13.98"), ("Canopy", "4.24", "4.78", "12.67"),
            ("Oil Haze", "4.38", "4.66", "13.93"), ("Witching Hour", "4.49", "4.92", "12.88"), ("First Frost", "4.38", "4.83", "10.26")]


def call3():
    rows = "".join(f'<tr><td>{t}</td><td class="no">{a}</td><td>{b}</td><td>{c}</td></tr>' for t, a, b, c in CONTRAST)
    tab = ('<table class="ctab"><tr><th>Theme</th><th>red on the next-step tint</th><th>red on the card</th><th>--fg on the tint</th></tr>' + rows + "</table>"
           '<p class="cp" style="margin-top:10px;font-size:12.5px;color:var(--fg-muted)">Measured from <code>globals.css</code> as <code>todo-warning-contrast.test.ts</code> does; text holds to 4.5. The <code>+N</code> mark tile keeps <code>--danger</code> on its own tint (3.6 to 4.0, a decorative duplicate of the title’s figure).</p>')
    return (sec("3 · Over the 99, as the next step", "RATIFIED", False,
                "Over the 99 is the only warning that can be the next step. There its title draws in <code>--fg</code>, because <code>--avail-over-fg</code> falls under 4.5 on the next step’s 7% accent tint in every theme. "
                "The row still reads as over: the red <code>+1</code> tile, the red title the moment it is not the next step, and the next step’s label above it.")
            + '<div class="cg">'
            + f'<div><div class="lab"><b>Next step</b> · 390 · title in --fg</div>{col(390, card([OVER_NX, a2.R_SOL, a2.R_PEND3()], 3))}<p class="cp">A brew at 100 of 99: over leads, so it is the next step and its title takes <code>--fg</code>.</p></div>'
            + f'<div><div class="lab"><b>Not the next step</b> · 390 · title red</div>{col(390, card([UNRES, OVER, a2.R_SOL], 3))}<p class="cp">Unresolved lines lead (fill failed › unresolved › over), so over drops to a warning row and its title stays <code>--avail-over-fg</code>.</p></div>'
            + f'<div>{tab}</div></div></div>')


def seed_sheet_phone():
    s = sh.sheet()
    s = s.replace(sh.HD_PASS, HD_SEED).replace('<div class="sf"><span class="o">Undo these 9</span><span class="p">Done</span></div>',
                                                '<div class="sf sfp"><span class="rv call-o">Clear all auto reverses it</span><span class="p">Done</span></div>')
    return s


def seed_modal():
    m = sh.modal()
    return m.replace(sh.HD_PASS, HD_SEED).replace('<div class="sf"><span class="o">Undo these 9</span><span class="sp"></span><span class="p">Done</span></div>',
                                                  '<div class="sf"><span class="rv call-o">Clear all auto reverses it</span><span class="sp"></span><span class="p">Done</span></div>')


HD_SEED = ('<div class="hd2"><div class="tt"><div class="ey">The seed</div><h3>22 cards</h3>'
           '<p>22 cards: the roles and the mana base, 4 to buy.</p></div><span class="x">✕</span></div>')


def call4():
    return (sec("4 · The seed’s pass sheet", "RATIFIED + ONE LINE", True,
                "Done only, as built: the ledger’s seed line has no Undo either, and a second destructive press beside Done would be the one the ledger chose not to grow. "
                "<b>One addition:</b> the foot carries the ledger’s own words, <i>Clear all auto reverses it</i> (<code>ledger.seedReversal</code>), in the foot’s mono <code>--fg-faint</code>, "
                "so a reader who opened the seed to undo it is told how. At 390 it sits centred above Done; at 1300, where Undo stands on a top-off’s sheet. Not a press.")
            + '<div class="frames" style="gap:40px">'
            + frame("<b>The seed</b> · 390", seed_sheet_phone(), "Title, lead and rows as built; the seed’s rows are the list’s own, scrolled.")
            + frame("<b>The seed</b> · 1300", seed_modal(), "The shipped modal over the page, Done on the right where it stands on every pass sheet; the line takes Undo’s place on the left.")
            + "</div></div>")


def band(lines_html, x=True, lk=None, glyph="✓"):
    g = f'<span class="ok">{glyph}</span>' if glyph else ""
    l = f'<span class="lk">{lk}</span>' if lk else ""
    return f'<div class="rc">{g}<div class="tx">{lines_html}</div>{l}<span class="x">✕</span></div>'


A10_ADDED = band('<span class="hd">Started from the Veloci-Ramp-Tor precon</span><span class="mt" style="font-size:11px">98 cards added to your collection. <a class="call-o">History</a></span>')
A10_OWN = band('<span class="hd">Started from the Veloci-Ramp-Tor precon</span><span class="mt" style="font-size:11px">You own 71 of its 99.</span>')
A11 = band('<span class="hd">Looks like this started as Veloci-Ramp-Tor, with a different commander.</span><span class="mt">74 of its 99 cards are in this deck · led by Pantlaza</span>',
           lk="Link it", glyph="")


def spec2(label, ph, dk, cap):
    return (f'<div style="display:grid;grid-template-columns:240px 390px 1000px;gap:28px;align-items:start">'
            f'<div><div class="lab m" style="font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)">{label}</div>'
            f'<p style="margin-top:6px;font-size:12.5px;line-height:1.55;color:var(--fg-muted)">{cap}</p></div>{col(390, ph)}{col(1000, dk)}</div>')


def call56():
    return (sec("5 · A10: History only with a ledger entry", "RATIFIED", False,
                "History opens the collection ledger entry the start wrote. A start that added nothing wrote none, so there is nothing to link: that band says what you own and stops.")
            + spec2("A10 · the start added cards", A10_ADDED, A10_ADDED, "The start put the box in your collection: the body says so and History links its entry.")
            + spec2("A10 · nothing added", A10_OWN, A10_OWN, "You own N of its 99, no link. With every card owned: <i>You own every card.</i>")
            + "</div>"
            + sec("6 · A11: no mark", "RATIFIED", False,
                  "STATES said “no ✓”, the board drew a <b>?</b>: the board was wrong. A suggestion is not a receipt, so it carries no mark at all; Link it and the bare ✕ are its only presses.")
            + spec2("A11 · one precon", A11, A11, "As built: lead, mono meta, Link it, ✕ remembered on the account (#2191).")
            + "</div>")


def board():
    body = (board_head("Calls 3 to 6 · ratified as built in #2183, #2188, #2190", "The deck page: what shipped differently",
                       "Four departures from the deck messages boards, each checked against main. Three are ratified as built; the seed’s sheet keeps Done only and gains one line of words. "
                       "Dashed outlines mark what the call is about.", tag="Addendum")
            + call3() + call4() + call56())
    return doc("Deck page calls · 3 to 6", body, 1820)


if __name__ == "__main__":
    out = sys.argv[1]
    open(f"{out}/Deck-Calls.dc.html", "w").write(board()); print("ok")
