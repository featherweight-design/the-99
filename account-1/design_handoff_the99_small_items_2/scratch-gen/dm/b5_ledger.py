"""Item 5 · the auto-added ledger's numbers (#477). Drawn over account 2's deck-messages pieces (the to-do card's foot)."""
import kit
from kit import doc, board_head, frame
import pieces as P
from pieces import DECKS
import alts as A
import a2
import a3

kit.CSS += r"""
.ll .se b{font-weight:600;color:var(--fg)}
.ll .se .tl{color:var(--fg-locked)}
.ll.gone{background:transparent;border:1px dashed var(--border-strong)}
.ll.gone .lb{color:var(--fg-locked)}
.ll.gone .se{color:var(--fg-faint)}
.ll.gone .se b{color:var(--fg-muted)}
.ll .ud span.pend{color:var(--fg-faint);border-color:var(--border)}
.ll .bt span.ac{color:var(--accent);border-color:var(--accent-shadow)}
.ll .bt span.sw{border:0;padding:0;height:auto;min-height:44px;border-bottom:0;color:var(--fg-faint)}
.ll .bt span.sw u{text-decoration:none;border-bottom:1px dashed var(--border-strong)}
.ll.nw .bt span.sw{color:var(--accent)}
.ll.nw .bt span.sw u{border-bottom-color:var(--accent-shadow)}
.dkm .ll .bt span.sw{min-height:0}
.dkm .ll .ud{width:126px;flex:none;display:flex;justify-content:flex-end}
.ll .ud{margin-left:auto;display:flex}
.ll .ud span{display:inline-flex;align-items:center;height:36px;padding:0 12px;border-radius:7px;border:1px solid var(--border-strong);font:11px 'IBM Plex Mono';color:var(--fg-body)}
.dkm .ll .ud span{height:26px}
.rvn{font-style:normal}
.ll .rv{text-transform:none;letter-spacing:0}
.notes{display:grid;gap:16px;max-width:2400px}
.note h4{margin:0 0 4px;font:600 13px 'IBM Plex Sans';color:var(--fg)}
.ll .bt{align-items:center}
.ll .rvn{font:10px 'IBM Plex Mono';color:var(--fg-locked);text-align:right;white-space:nowrap}
.lspec{display:grid;grid-template-columns:180px 390px 1236px;gap:28px;align-items:center}
.lspec .k{font-size:13px;line-height:1.55;color:var(--fg-muted)}
.lspec .k b{display:block;color:var(--fg);font:700 15px Cinzel,serif;margin-bottom:4px}
.lbox{background:color-mix(in srgb,var(--bg) 40%,var(--surface-rail));border:1px solid var(--border-strong);border-radius:12px;padding:10px 14px}
.lbox.dkm{padding:10px 16px}
.sum{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.sum b{color:var(--fg);font-weight:600}
"""

N = 80
TOTAL_BUY = 6

# (label, placed, here, kept, removed, clause, buy, state)   state: live | gone-undone | gone-kept | pending
PASSES = [
    ("the seed", 52, 52, 0, 0, "the roles and the mana base", 4, "live"),
    ("1st top-off", 31, 24, 3, 4, None, 0, "live"),
    ("2nd top-off", 9, 0, 0, 9, None, 0, "undone"),
    ("3rd top-off", 4, 4, 0, 0, "you chose them from the last 9", 2, "live"),
]


def sentence(placed, here, kept, removed, clause, buy, state):
    if state == "undone":
        return f"<b>{placed} placed, none still here</b> <span class=\"tl\">· undone</span>"
    if state == "kept":
        return f"<b>{placed} placed, none still here</b> <span class=\"tl\">· all {placed} now yours</span>"
    if here == placed:
        head = f"<b>{placed} placed, all {here} still here</b>"
    else:
        head = f"<b>{placed} placed, {here} still here</b>"
    if clause:
        tail = f": {clause}" + (f", {buy} to buy." if buy else ".")
        return head + tail
    bits = []
    if kept:
        bits.append(f"{kept} now yours")
    if removed:
        bits.append(f"{removed} removed since")
    return head + (f' <span class="tl">· {", ".join(bits)}</span>' if bits else "")


def line(p, desk=False, newest=False, pending=False):
    label, placed, here, kept, removed, clause, buy, state = p
    gone = state in ("undone", "kept")
    seed = label == "the seed"
    se = sentence(placed, here, kept, removed, clause, buy, state)
    cls = "ll" + (" nw" if newest else "") + (" gone" if gone else "")
    if gone:
        btns = ""
    else:
        show = f'<span class="sw"><u>{"Show this 1" if here == 1 else f"Show these {here}"}</u></span>'
        if seed:
            undo = '<em class="rvn">Clear all auto reverses it</em>' if desk else ""
        elif pending:
            undo = f'<span class="pend">Putting {here} back…</span>'
        else:
            undo = f'<span>{"Undo this 1" if here == 1 else f"Undo these {here}"}</span>'
        btns = f'<div class="bt">{show}<div class="ud">{undo}</div></div>' if desk else f'<div class="bt">{show}{undo and f"<div class=ud>{undo}</div>"}</div>'
    rv = '<span class="rv">Clear all auto reverses it</span>' if (seed and not desk) else ""
    return f'<div class="{cls}"><div class="lt"><span class="lb">{label}</span>{rv}</div><p class="se">{se}</p>{btns}</div>'


def ledger(desk=False, passes=PASSES, n=N, pending_idx=None):
    live = [p for p in passes if p[7] == "live"]
    meta = f'<span class="mm">{len(passes)} passes · {TOTAL_BUY} to buy</span>' if desk else ""
    rows = "".join(line(p, desk, newest=(i == len(passes) - 1), pending=(i == pending_idx)) for i, p in enumerate(passes))
    return f'<div class="sld"><div class="lh"><span class="disc">i</span>Where these {n} cards came from{meta}</div>{rows}</div>'


def ledger_today(desk=False):
    """Shipped: the line leads with what the pass placed (or the recount); an undone pass's line has gone."""
    def l(lb, se, here, newest=False, seed=False):
        rv = '<em class="rvn">Clear all auto reverses it</em>'
        show = f'<span class="sw"><u>Show these {here}</u></span>'
        undo = '' if seed else f'<span>Undo these {here}</span>'
        if desk:
            bt = f'<div class="bt">{show}<div class="ud">{rv if seed else undo}</div></div>'
            return f'<div class="ll{" nw" if newest else ""}"><div class="lt"><span class="lb">{lb}</span></div><p class="se">{se}</p>{bt}</div>'
        return (f'<div class="ll{" nw" if newest else ""}"><div class="lt"><span class="lb">{lb}</span>{rv if seed else ""}</div><p class="se">{se}</p>'
                f'<div class="bt">{show}{f"<div class=ud>{undo}</div>" if undo else ""}</div></div>')
    meta = '<span class="mm">3 passes · 6 to buy</span>' if desk else ""
    return (f'<div class="sld"><div class="lh"><span class="disc">i</span>Where these {N} cards came from{meta}</div>'
            + l("the seed", "<b>52</b> cards: the roles and the mana base, 4 to buy.", 52, seed=True)
            + l("1st top-off", "<b>31</b> cards <span class=\"tl\">· 3 now yours, 4 removed since</span>", 24)
            + l("3rd top-off", "<b>4</b> cards you chose from the last 9, 2 of them to buy.", 4, newest=True)
            + "</div>")


SEGS = [("v2", False), (f"Where these {N} cards came from", True), ("4 in other drafts too", True)]


def card(desk=False, body=None):
    head = a3.head_card("Next step · Big Stompy", "3 to do", "Choose the last 12", "151 candidates ranked by synergy. 6 you can sleeve.",
                        "Choose the last 12 ↓", [a3.R_SOL, a3.R_P9], SEGS, None, desk)
    det = f'<div class="fo">{body}</div>'
    # open the ledger segment and put our detail under the foot
    head = head.replace(f'<span class="ds">Where these {N} cards came from ▾</span>', f'<span class="ds op">Where these {N} cards came from ▴</span>')
    return head[: -len("</div>")] + det + "</div>"


def page(desk=False, body=None):
    d = dict(DECKS["stompy-short"])
    c = card(desk, body)
    if desk:
        return P.desk(P.desk_header(d) + c + P.mix(desk=True, cells=A.C3) + P.dtabs(built=87)
                      + P.desk_list('<span class="nt">9 of these differ from v2</span>', changed=True), 0)
    return P.phone(P.phone_header(d) + c + P.mix(cells=A.C3, phone_parity=True) + P.tabs(built=87)
                   + P.phone_list(changed=True, shopping="9", built=87), 0)


def spec_row(k, note, ph, dk):
    return (f'<div class="lspec"><p class="k"><b>{k}</b>{note}</p><div class="lbox">{ph}</div>'
            f'<div class="lbox dkm">{dk}</div></div>')


def board():
    passes = PASSES
    head = board_head("Item 5 · the auto-added ledger’s numbers · #477 · low priority",
                      "Each line says what it placed and what is still here",
                      "Today the header counts the deck’s live auto-added cards (<b>80</b>) while each line leads with what its pass placed, "
                      "so 52, 31 and 4 never add up to it, and a pass you undo simply vanishes. Hugh’s direction: each line gives <b>two figures</b>, "
                      "<b>placed</b> and <b>still here</b>, and the header stays as it is. The still-here figures then add up to the header "
                      "(52 + 24 + 0 + 4 = 80). A pass that has been fully undone keeps a quiet line, so the record stays whole. "
                      "Fixture: Big Stompy, 87 of 99, the shipped to-do card with its foot’s ledger opened.", tag="R1")
    pages = ('<div class="frames">'
             + frame("<b>5</b> · 390 · ledger opened", page(False, ledger(False)),
                     "The foot’s <b>Where these 80 cards came from ▴</b> opens the ledger under it, as shipped. Only the sentences change. The undone pass keeps its place and ordinal.")
             + frame("<b>5</b> · 1300 · ledger opened", page(True, ledger(True)),
                     "One row per pass, the shipped 66px label column and 126px undo column. The header’s meta now counts every line shown.")
             + "</div>")
    today = ('<div class="sec"><h3>Today and R1, the ledger alone</h3><div class="frames">'
             + frame("Today · 390", f'<div class="spc" style="padding:4px 14px 12px">{ledger_today(False)}</div>',
                     "52 + 31 + 4 is 87, not 80: the 1st top-off’s 31 still counts 7 cards that left. The undone 2nd top-off is gone without a trace.")
             + frame("<b>R1</b> · 390", f'<div class="spc" style="padding:4px 14px 12px">{ledger(False)}</div>',
                     "Placed, then still here. The still-here figures add to 80.")
             + '<div style="display:flex;flex-direction:column;gap:34px">'
             + frame("Today · 1300", f'<div class="spc dkm" style="padding:4px 16px 12px">{ledger_today(True)}</div>', "")
             + frame("<b>R1</b> · 1300", f'<div class="spc dkm" style="padding:4px 16px 12px">{ledger(True)}</div>', "")
             + "</div></div></div>")
    S = [
        ("Untouched", "Every card the pass placed is still here and still auto.",
         ("the seed", 52, 52, 0, 0, "the roles and the mana base", 4, "live")),
        ("Some gone", "Kept cards (no longer auto) and removed ones ride after the two figures, in the quiet ink, as today’s recount does.",
         ("1st top-off", 31, 24, 3, 4, None, 0, "live")),
        ("Fully undone", "No Show, no Undo. Dashed, no ground, label in the locked ink. It stays until the pass would leave the deck’s record (a new version, or Clear all auto).",
         ("2nd top-off", 9, 0, 0, 9, None, 0, "undone")),
        ("Fully kept", "Every card was kept, so none is auto any more. Same quiet line.",
         ("2nd top-off", 9, 0, 9, 0, None, 0, "kept")),
        ("Putting back", "While its undo runs, only its own press changes, as shipped.",
         ("1st top-off", 31, 24, 3, 4, None, 0, "live")),
    ]
    rows = []
    for k, note, p in S:
        pend = k == "Putting back"
        rows.append(spec_row(k, note, line(p, False, pending=pend), line(p, True, pending=pend)))
    states = ('<div class="sec"><h3>Every line, both widths</h3><div style="display:flex;flex-direction:column;gap:18px">'
              '<div class="lspec"><span></span><span class="colh">390</span><span class="colh">1300</span></div>'
              + "".join(rows) + "</div></div>")
    notes = ('<div class="notes" style="grid-template-columns:repeat(3,minmax(0,1fr))">'
             '<div class="note"><h4>The words</h4><ul><li><b>{placed} placed, {here} still here</b>, both in --fg 600; equal: <b>all {n} still here</b>; zero: <b>none still here</b>.</li>'
             '<li>The seed and top-off clauses follow after a colon, as today (<i>the roles and the mana base, 4 to buy</i>).</li>'
             '<li>Kept and removed follow after a <b>·</b> in --fg-locked: <i>3 now yours, 4 removed since</i>.</li>'
             '<li>Undone: <b>· undone</b>. Fully kept: <b>· all {n} now yours</b>. For /copy-review.</li></ul></div>'
             '<div class="note"><h4>The header</h4>Unchanged: <i>Where these 80 cards came from</i>, counting live auto-added cards. It now equals the sum of the still-here figures, which is the point. '
             'Desktop meta counts every line shown: <i>4 passes · 6 to buy</i>.</div>'
             '<div class="note"><h4>For engineering</h4><ul><li><code>summariseFillPasses</code> keeps a pass with <code>live = 0</code> instead of dropping it; the line needs to know whether it ended by undo or by keeping.</li>'
             '<li><code>provenance-line.test.tsx:92</code> stays (the header still counts live auto cards); add a test that the still-here figures sum to it.</li>'
             '<li>No new control. Show and Undo still count the live cards.</li></ul></div></div>')
    return doc("Ledger", head + pages + today + states + notes, 3000)
