"""Showing a pass's cards from the card's foot (Hugh 2026-10-22 02:42): today, filter + jump, sheet."""
import kit
from kit import doc, board_head, frame
import pieces as P
from pieces import DECKS
import alts as A
import a2, a3

kit.CSS += r"""
.scr .ph{height:844px}
.scr .ph>*{flex:none}
.scrim{position:absolute;inset:0;background:rgba(8,6,5,.62);z-index:30}
.bs{position:absolute;left:0;right:0;bottom:0;z-index:31;background:var(--surface);border-top:1px solid var(--border-strong);border-radius:18px 18px 0 0;display:flex;flex-direction:column;box-shadow:0 -14px 40px rgba(0,0,0,.6)}
.bs .gr{width:40px;height:4px;border-radius:9px;background:var(--border-strong);margin:8px auto 2px}
.bs .hd2,.md .hd2{display:flex;align-items:flex-start;gap:10px;padding:10px 8px 10px 18px;border-bottom:1px solid var(--border)}
.hd2 .tt{flex:1;min-width:0}
.hd2 .ey{font:9.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.hd2 h3{margin:4px 0 0;font:700 17px Cinzel,serif;color:var(--fg)}
.hd2 p{margin:4px 0 0;font-size:12.5px;line-height:1.5;color:var(--fg-body)}
.hd2 .x{width:44px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:15px}
.sr{display:flex;flex-direction:column;gap:6px;padding:12px 14px}
.sr .row .buy{font:10px 'IBM Plex Mono';color:var(--warning);border:1px solid var(--accent-shadow);border-radius:4px;padding:1px 5px}
.sr .row .ot{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap}
.sf{display:flex;gap:8px;padding:12px 14px 26px;border-top:1px solid var(--border)}
.sf span{flex:1;display:flex;align-items:center;justify-content:center;height:44px;border-radius:9px;font:600 13.5px 'IBM Plex Sans'}
.sf .o{border:1px solid var(--border-strong);color:var(--fg)}
.sf .p{background:var(--fg);color:var(--bg)}
.md{position:absolute;z-index:31;left:50%;top:90px;transform:translateX(-50%);width:560px;background:var(--surface);border:1px solid var(--border-strong);border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.6);display:flex;flex-direction:column}
.md .sf{padding:12px 16px 14px}
.md .sf span{flex:none;padding:0 18px;height:38px}
.md .sf .sp{flex:1;background:none}
.fchip{display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 4px 0 12px;border-radius:999px;border:1px solid var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--bg));font:11.5px 'IBM Plex Mono';color:var(--accent)}
.fchip .x{width:28px;height:28px;display:flex;align-items:center;justify-content:center;color:var(--fg)}
.fbar{display:flex;align-items:center;gap:10px;padding:12px 16px 0}
.fbar .n{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.ln-press{outline:2px solid var(--accent);outline-offset:2px;border-radius:7px}
"""

PASS = [("Cultivate", ["c2", "g"], True, ""), ("Kodama’s Reach", ["c2", "g"], False, "$0.40"), ("Rampant Growth", ["c1", "g"], True, ""),
        ("Beast Within", ["c2", "g"], False, "$1.10"), ("Garruk’s Uprising", ["c2", "g"], True, ""),
        ("Return of the Wildspeaker", ["c4", "g"], False, "$2.30"), ("Harmonize", ["c2", "g"], True, ""),
        ("Elvish Mystic", ["g"], False, "$0.30"), ("Heroic Intervention", ["c1", "g"], False, "$3.90")]
SOFT = [("Cultivate", ["c2", "g"], True, "also in Elf Tribal"), ("Beast Within", ["c2", "g"], False, "also in Elf Tribal"),
        ("Harmonize", ["c2", "g"], True, "also in Mono-G Stompy"), ("Heroic Intervention", ["c1", "g"], False, "also in Elf Tribal")]


def rows(items, soft=False):
    out = []
    for n, ps, own, extra in items:
        tag = f'<span class="ot">{extra}</span>' if soft else (f'<span class="buy">{extra}</span>' if extra else "")
        out.append(f'<div class="row"><span class="ow{"" if own else " no"}"></span><span class="nm">{n}</span>{tag}{P.mana(ps)}</div>')
    return '<div class="sr">' + "".join(out) + "</div>"


def ledger_card(pressed=False, desk=False):
    card = a3.head_card  # unused; keep A2's row form
    c = (f'<div class="t2"><div class="th"><span class="e">Before Big Stompy is complete</span><span class="n">3 to do</span></div>'
         f'{a2.R_LAST()}{a2.R_SOL}{a2.R_PEND3()}{a3.foot(a2.F3, "Where these 31 cards came from", desk)}</div>')
    if pressed:
        c = c.replace("<span>Show these 9</span>", '<span class="ln-press">Show these 9</span>', 1)
    return c


def page(desk=False, pressed=False):
    d = DECKS["stompy-short"]
    if desk:
        return P.desk(P.desk_header(d) + ledger_card(pressed, True) + P.mix(desk=True, cells=A.C3) + P.dtabs(built=87)
                      + P.desk_list('<span class="nt">9 of these differ from v2</span>', changed=True), None)
    return P.phone(ledger_card(pressed) + P.mix(cells=A.C3, phone_parity=True) + P.tabs(built=87)
                   + P.phone_list(changed=True, shopping="9", built=87), None)


def scrolled(inner_top):
    """A phone screen scrolled so the page starts at the given html (app header stays)."""
    return f'<div class="scr">{P.phone(inner_top, None)}</div>'


def today():
    return f'<div class="scr">{page(pressed=True).replace("<div class=\"ph\">", "<div class=\"ph\" style=\"height:844px\">", 1)}</div>'


def filtered():
    rs = "".join(f'<div class="row chg"><span class="ow{"" if own else " no"}"></span><span class="nm">{n}</span>{P.mana(ps)}<span class="x">✕</span></div>'
                 for n, ps, own, _ in PASS)
    inner = (P.tabs(built=87)
             + '<div class="seg"><span class="on">All<em>87</em></span><span class="sh">Shopping<em>9</em></span><span>Stats</span><span>Notes<em>2</em></span></div>'
             + '<div class="fbar"><span class="fchip">1st top-off · 9<span class="x">✕</span></span><span class="n">showing 9 of 87</span></div>'
             + f'<div class="grp"><h4>Ramp and removal<em>9</em></h4>{rs}</div>')
    return f'<div class="scr">{P.phone(inner, None)}</div>'


def sheet(soft=False):
    base = page().replace('<div class="ph">', '<div class="ph" style="height:844px">', 1)
    if soft:
        hd = ('<div class="hd2"><div class="tt"><div class="ey">In other drafts too</div><h3>4 cards</h3>'
              '<p>Nothing to sort out yet. None of those is past a draft either. Whichever you sleeve first gets them.</p></div><span class="x">✕</span></div>')
        body = rows(SOFT, True) + '<div class="sf"><span class="p">Done</span></div>'
    else:
        hd = ('<div class="hd2"><div class="tt"><div class="ey">1st top-off</div><h3>9 cards</h3>'
              '<p>9 cards you chose from the last 12, 5 of them to buy.</p></div><span class="x">✕</span></div>')
        body = rows(PASS) + '<div class="sf"><span class="o">Undo these 9</span><span class="p">Done</span></div>'
    ov = f'<div class="scrim"></div><div class="bs"><span class="gr"></span>{hd}{body}</div>'
    return base[:-6] + ov + "</div>"


def sheet_desk():
    base = page(desk=True)
    hd = ('<div class="hd2"><div class="tt"><div class="ey">1st top-off</div><h3>9 cards</h3>'
          '<p>9 cards you chose from the last 12, 5 of them to buy.</p></div><span class="x">✕</span></div>')
    md = (f'<div class="scrim"></div><div class="md">{hd}{rows(PASS)}<div class="sf"><span class="o">Undo these 9</span>'
          '<span class="sp"></span><span class="p">Done</span></div></div>')
    return base[:-6] + md + "</div>"


def board():
    body = (board_head("Deck page messages · showing a pass’s cards", "Show these, made obvious",
                       "Today <b>Show these 9</b> puts an accent edge on those 9 rows in the list below and changes nothing where you pressed; on a phone the list starts a screen and a half down, "
                       "so it reads as a dead press. Two ways to answer where you are looking. Copy is placeholder.", tag="A4")
            + '<div class="frames">'
            + frame("Today · 390 · just pressed", today(), "Scrolled to the card’s foot. The press lights up, then nothing on screen moves. The 9 marked rows are below the mix, the tabs and every row that sorts before them.")
            + frame("<b>1 · Filter and jump</b> · 390", filtered(),
                    "The page scrolls to the list, which shows only the 9 under a chip: ‘1st top-off · 9’. ✕ on the chip, or any other filter, brings the deck back. The tabs and the segment stay where they are.")
            + frame("<b>2 · Sheet</b> · 390 (recommended)", sheet(),
                    "The shipped sheet (stand-ins, friends) over the page: which pass, its sentence, the 9 cards with what they cost to buy, and Undo these 9 in the foot. You never leave the card.")
            + frame("<b>2 · Sheet</b> · 390 · other drafts", sheet(True),
                    "The same sheet answers ‘4 in other drafts too’: the 4 cards and which drafts they are in. The foot’s ▾ then opens the sheet directly instead of a line.")
            + "</div><div class=\"frames\">"
            + frame("<b>2 · Modal</b> · 1300", sheet_desk(), "At desktop the same content in the shipped modal frame.")
            + '<div class="note" style="width:560px;align-self:flex-start"><b>Trade-offs</b><ul>'
              "<li><b>Filter and jump</b> keeps the real rows (you can act on each: ✕, open the card), but it moves you away from the card you pressed and hides 78 cards until you clear the chip. It is a new filter in the list.</li>"
              "<li><b>Sheet</b> answers in place and is one gesture to close. Rows in the sheet open the card; they do not carry ✕. Undo these lives in the sheet’s foot, so the ledger line can keep just Show these.</li>"
              "<li>Either way the accent-edge mark (PassMark) goes: it was the passive half. The ledger’s copy note says ‘a toggle, not a filter’; option 1 reverses that, option 2 keeps it a view.</li>"
              "<li>Rows in either are the shipped one-line card row; the buy price is the Shopping tag.</li></ul></div>"
            + "</div>")
    return doc("Deck messages · showing a pass’s cards", body, 1300 + 560 + 44 + 112)


BOARDS = [("Show-Cards", board, "A4 · Show these, made obvious: filter and jump, or a sheet")]
