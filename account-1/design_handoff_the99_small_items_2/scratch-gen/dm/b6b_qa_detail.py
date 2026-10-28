"""Item 6b · reaching card details from quick-add (#412 §2)."""
import kit
from kit import doc, board_head, frame
import pieces as P
import deck as D

kit.CSS += r"""
.qr .dt{display:flex;align-items:center;gap:10px;min-width:0;flex:1;border-radius:6px}
.dkm .qr .dt{flex:none;gap:12px}
.qr .dt .nm{text-decoration:none}
.qr .dt.hov .nm{text-decoration:underline;text-decoration-color:var(--fg-faint);text-underline-offset:3px}
.qr .dt.cell{box-shadow:0 0 0 2px var(--accent);outline:3px solid color-mix(in oklab,var(--accent) 22%,transparent);outline-offset:2px}
.qr .ad.cell{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)}
.qr .hit{outline:1.5px dashed rgba(143,166,190,.9);outline-offset:3px;border-radius:6px}
.hint b{color:var(--fg-muted);font-weight:500}
.sheet{position:absolute;left:0;right:0;bottom:0;z-index:16;border-radius:18px 18px 0 0;background:var(--surface);border-top:1px solid var(--border-strong);padding:10px 16px 18px;display:flex;flex-direction:column;gap:12px;box-shadow:0 -20px 50px rgba(0,0,0,.55)}
.sheet .grip{width:36px;height:4px;border-radius:2px;background:var(--border-strong);align-self:center}
.sheet .sh{display:flex;align-items:center;justify-content:space-between}
.sheet .sh b{font:600 18px Cinzel,serif}
.sheet .sh span{width:30px;height:30px;border-radius:50%;border:1px solid var(--border-strong);background:var(--surface-raised);display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--fg-muted)}
.sheet .bd{display:flex;gap:14px}
.sheet .bd img{width:150px;height:209px;border-radius:8px;display:block;flex:none}
.sheet .bd .tx{display:flex;flex-direction:column;gap:8px;font-size:13px;line-height:1.5;color:var(--fg-body)}
.sheet .bd .tx .mt{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.cdx{position:absolute;inset:0;z-index:30;overflow:hidden;background:var(--surface-sunken);border-radius:34px}
.cdx .wash{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(28px);transform:scale(1.25);opacity:.55}
.cdx .grad{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.45) 100%)}
.cdx .cnt{position:absolute;z-index:3;top:22px;left:18px;height:32px;padding:0 12px;border-radius:16px;display:flex;align-items:center;font:11px 'IBM Plex Mono';color:var(--fg-body);background:color-mix(in oklab,var(--bg) 55%,transparent)}
.cdx .xx{position:absolute;z-index:3;top:22px;right:18px;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--fg);background:color-mix(in oklab,var(--bg) 55%,transparent)}
.cdx .cd{position:absolute;z-index:1;top:64px;left:35px;width:320px;height:447px;border-radius:14px;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.5)}
.cdx .cd img,.cdx .pk img{width:100%;height:100%;object-fit:cover;display:block}
.cdx .pk{position:absolute;z-index:1;top:64px;left:367px;width:320px;height:447px;border-radius:14px;overflow:hidden;opacity:.5}
.cdx .ts{position:absolute;z-index:2;left:0;right:0;bottom:0;height:280px;border-radius:18px 18px 0 0;border-top:1px solid var(--border-strong);background:var(--surface-rail);box-shadow:0 -14px 34px rgba(0,0,0,.45);padding:0 20px 34px;display:flex;flex-direction:column}
.cdx .gr{height:22px;display:flex;align-items:center;justify-content:center;flex:none}
.cdx .gr i{width:36px;height:4px;border-radius:2px;background:var(--border-strong);display:block}
.cdx .hd{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.cdx .hd h3{margin:0;font:400 24px/1.15 Cinzel,serif;color:var(--fg)}
.cdx .hd p{margin-top:5px;font-size:13px;color:var(--fg-muted)}
.cdx .ow{margin-top:12px;font:12px 'IBM Plex Mono';color:var(--fg-body)}
.cdx .ow b{font-weight:400;color:var(--accent-text)}
.cdx .or{margin-top:12px;max-height:64px;overflow:hidden;font-size:13.5px;line-height:1.6;color:var(--fg-body);-webkit-mask-image:linear-gradient(180deg,#000 55%,transparent);mask-image:linear-gradient(180deg,#000 55%,transparent)}
.scrim2{position:absolute;inset:0;z-index:15;background:color-mix(in oklab,var(--bg) 72%,transparent)}
"""

D_ = P.DECKS["aang"]
Q = "sw"


def drow(key, desk=False, act=None, hov=False, hit=False):
    """A result row as a grid row: the thumbnail + name is one cell (opens card details), Add is the other."""
    name, art, typ, own, ps = D.CARDS[key]
    cls = "dt" + (" cell" if act == "detail" else "") + (" hov" if hov else "") + (" hit" if hit else "")
    nm = (f'<span class="{cls}"><span class="th"><img alt="" src="{D.img("c-" + art)}"></span>'
          f'<span class="nc"><span class="nm">{D.hi(name, Q)}</span><span class="mt">{typ} · {"×%d owned" % own if own else "<span class=no>not owned</span>"}</span></span></span>')
    if act == "add":
        trail = f'<span class="ad k">{"↵ add" if desk else "↵"}</span>'
    elif act == "detail":
        trail = '<span class="ad">Add</span>'
    else:
        trail = f'<span class="ad{" hit" if hit else ""}">Add</span>'
    owd = f'<span class="ow">×{own} owned</span>' if own else '<span class="ow no">not owned</span>'
    return (f'<li class="qr{" act" if act else ""}"><div class="ln">{nm}'
            f'<span class="ty">{typ}</span><span class="pp">{D.pips(ps)}</span>{owd}{trail}</div></li>')


HINT_NEW = '↑↓ to move · <b>→ details</b> · ↵ to add · Esc to dismiss'
HINT_DET = '↑↓ to move · <b>← back to Add</b> · ↵ opens details · Esc to dismiss'


def ph(dock, over="", kb=True):
    page = P.phone_header(D_) + P.tabs(built=94) + P.phone_list(shopping="5", built=94)
    return D.phone_page(page, over=over, keyboard_up=kb, dock_html=dock)


def dk(dock, over=""):
    page = P.desk_header(D_) + P.dtabs(built=94) + P.desk_list()
    return D.desk_page(page, over=over, dock_html=dock, h=860)


def pop(rows, hint):
    return f'<div class="qp"><ul role="grid">{"".join(rows)}</ul><p class="hint">{hint}</p></div>'


def card_detail_phone():
    """The shipped phone card detail (card-modal.tsx, carousel R2 teaser), opened over the deck with quick-add's list kept behind it.
    A one-result search, so the shipped detail draws no counter and no neighbor peek."""
    base = ph(D.dock("giada", focus=True, status="1 match · 5-color only",
                     pop=pop([drow("giada")], HINT_NEW)), kb=False)
    gi = D.img("c-giada")
    over = (f'<div class="cdx"><img class="wash" alt="" src="{gi}"><span class="grad"></span>'
            '<span class="xx">✕</span>'
            f'<span class="cd"><img alt="" src="{gi}"></span>'
            '<div class="ts"><span class="gr"><i></i></span><div class="hd"><div><h3>Giada, Font of Hope</h3><p>Legendary Creature — Angel</p></div>'
            f'<span style="margin-top:6px;display:flex;gap:3px">{D.pips(["1", "w"])}</span></div>'
            '<p class="ow"><b>×1</b> owned</p>'
            '<p class="or">Flying, vigilance. Each other Angel you control enters with an additional +1/+1 counter on it for each Angel you already control.</p></div></div>')
    return base[:-len("</div>")] + over + "</div>"

def board():
    head = board_head("Item 6b · card details from quick-add · #412 §2",
                      "Quick-add’s rows open card details from the name, like every other card row",
                      "Every named card row in the app opens the shared card detail from its name; quick-add’s can’t, because each row is an <code>option</code> "
                      "in a listbox and a button can’t live inside one. <b>Recommended (A): make the popup a grid</b>, which a combobox may own instead of a listbox. "
                      "Each row becomes two cells: the <b>thumbnail and name</b> (opens card details) and <b>Add</b>. Nothing new is drawn on the row: "
                      "Add is the shipped Add, the name gets the shipped name trigger’s underline on hover. ↵ still adds the top match, so typing a name and pressing Enter "
                      "works as today. <b>B: quick-add offers no details</b>, ruled on purpose: it is a name-entry tool, and the card is one press away once it lands in the list. "
                      "Your call.", tag="R1")
    A = ('<div class="sec"><h3>A · recommended · a grid with two cells</h3><div class="frames">'
         + frame("<b>A1</b> · 1300 · typing, the top match active", dk(D.dock(Q, focus=True, desk=True, status="3 matches · 5-color only",
                 pop=pop([drow("swan", True, act="add"), drow("swords", True, hov=True), drow("aang", True)], HINT_NEW))),
                 "As shipped: the first row is active on its Add cell (accent edge, <b>↵ add</b>). Hovering another row’s name underlines it, as a decklist name does. "
                 "The hint gains <b>→ details</b> (new copy).")
         + frame("<b>A2</b> · 1300 · → moves to details", dk(D.dock(Q, focus=True, desk=True, status="3 matches · 5-color only",
                 pop=pop([drow("swan", True, act="detail"), drow("swords", True), drow("aang", True)], HINT_DET))),
                 "→ puts the active cell on the name: the focus ring moves there and the trailing slot goes back to the plain Add. ↵ now opens Swan Song’s card details "
                 "over the deck; closing it returns to the field with the list still open. ←, or typing, puts it back on Add.")
         + "</div><div class=\"frames\">"
         + frame("<b>A3</b> · 390 · two targets per row", ph(D.dock(Q, focus=True, status="3 matches · 5-color only",
                 pop=pop([drow("swan", act="add", hit=True), drow("swords", hit=True), drow("aang", hit=True)], HINT_NEW))),
                 "The blue outlines are the two hit areas, drawn for this board only: the thumbnail and name (full row height, so 56px tall) open details; "
                 "<b>Add</b> (56 × 44) adds. A press anywhere else on the row still adds, as today.")
         + frame("<b>A4</b> · 390 · the name pressed (R2)", card_detail_phone(),
                 "The shipped card detail, exactly as a decklist name opens it on a phone (card carousel R2): the card’s art washes the screen, the card sits at y 64, "
                 "and the teaser sheet carries the name, type and what you own. The results are its list, as any row’s siblings are: this search found one card, so there is no counter "
                 "and no peek; with more it reads <b>1 of 3</b> and the next result peeks at the right edge. ✕ returns to the deck with the query and list kept and focus in the field. Nothing in it is new.")
         + "</div></div>")
    B = ('<div class="sec"><h3>B · no details from quick-add</h3><div class="frames">'
         + frame("<b>B1</b> · 1300 · as shipped", dk(D.dock(Q, focus=True, desk=True, status="3 matches · 5-color only",
                 pop=D.popover([D.qrow("swan", Q, active=True, desk=True), D.qrow("swords", Q, desk=True), D.qrow("aang", Q, desk=True)]))),
                 "Nothing changes. The rule goes in the card-row doc: quick-add’s rows are the one card row without details, because the whole row is the add.")
         + frame("<b>B2</b> · 390 · as shipped", ph(D.dock(Q, focus=True, status="3 matches · 5-color only",
                 pop=D.popover([D.qrow("swan", Q, active=True), D.qrow("swords", Q), D.qrow("aang", Q)]))),
                 "Once added, the card’s decklist row opens details as every row does.")
         + "</div></div>")
    notes = ('<div class="notes" style="grid-template-columns:repeat(3,minmax(0,1fr))">'
             '<div class="note"><h4>Why A</h4><ul><li>Every other named card row opens details from its name (#405, #407). The row already shows ownership, availability and the card note, but not the text or the price.</li>'
             '<li>A grid is the combobox pattern built for rows with more than one action, so the accessibility tree describes it honestly.</li>'
             '<li>Nothing changes for the common path: type, ↵.</li></ul></div>'
             '<div class="note"><h4>A, for engineering</h4><ul><li><code>role="grid"</code> on the popup, a <code>row</code> per result with two <code>gridcell</code>s; focus stays in the field via <code>aria-activedescendant</code> on the active cell.</li>'
             '<li>↑↓ move rows (the cell column is kept); →/← switch cells; ↵ acts on the active cell; typing resets to the Add cell of row 1.</li>'
             '<li>The name cell is <code>CardDetailTrigger</code>’s open path without a nested button; aria: <i>View details for Swan Song</i> (shipped <code>triggerAria</code>).</li>'
             '<li>Hint copy for /copy-review: <i>→ details</i>, <i>← back to Add</i>, <i>↵ opens details</i>.</li></ul></div>'
             '<div class="note"><h4>Either way</h4><ul><li>No modifier key, long-press or open-on-focus: none can be found by looking.</li>'
             '<li>In-deck rows (✓ In deck) keep the name cell in A, so you can still read a card you already have.</li></ul></div></div>')
    return doc("Quick-add details", head + A + B + notes, 2920)
