"""Item 7 (account 2, 2026-10-28): an edit state for a pod. The shipped pod card (pod-card.tsx) puts the owner's ✕ disc
over every member's art; Hugh: distracting on so small an image. Seats show no control until the owner presses Edit;
editing, each removable seat gets a Remove press under its name, off the art. Drawn with the item-6 page."""
import kit
import parts as P
import w4
import f6
from kit import doc, board_head, frame, frames, phone
from parts import img

kit.CSS += r"""
.f7hd-e{margin-left:auto;display:flex;align-items:center;gap:2px}
.f6pod .f6hd i{margin-left:0}
.f7ed{display:flex;align-items:center;min-height:44px;padding:0 10px;font:500 13.5px 'IBM Plex Sans';color:var(--accent-text)}
.dk .f7ed{min-height:32px;font-size:13px}
.f7ed.done{color:var(--bg);background:var(--accent);border-radius:8px;min-height:36px;padding:0 14px;font-weight:600}
.dk .f7ed.done{min-height:32px;border-radius:6px}
.f7dots{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);letter-spacing:1px}
.dk .f7dots{width:32px;height:32px}
.f7rm{align-self:flex-start;display:flex;align-items:center;min-height:44px;margin:-8px 0 -10px -2px;padding:0 2px;font:500 12.5px 'IBM Plex Sans';color:var(--danger)}
.dk .f7rm{min-height:28px;margin:-4px 0 -4px -2px}
.f6pod.f7edit{box-shadow:0 0 0 1px var(--accent) inset}
.f7cap{font:11px 'IBM Plex Mono';color:var(--fg-muted);margin:-4px 0 0}
/* phone seats: three to a row, 74px tall (pod-card.tsx) */
.ph .f6pod{padding:12px 14px 12px;gap:10px}
.ph .f6pod .f6st{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 10px}
.ph .f6pod .f6se img,.ph .f6pod .f6ad{width:100%;height:74px}
.f7pg{padding:18px 16px 30px;display:flex;flex-direction:column}
"""

SEATS = f6.SEATS


def pod(mode="rest", desk=False, gone=None):
    """mode: shipped (✕ on the art) | rest (no control on the seats, Edit in the header) | edit (Done, Remove under names)."""
    seats = []
    for n, a, me in SEATS:
        if n == gone:
            continue
        x = '<span class="f6x">✕</span>' if (mode == "shipped" and not me) else ""
        rm = '<span class="f7rm">Remove</span>' if (mode == "edit" and not me) else ""
        seats.append(f'<span class="f6se{" me" if me else ""}"><img src="{img(a)}" alt="">{x}{n}{rm}</span>')
    n = len(seats)
    if mode == "shipped":
        right = '<i>···</i>'
        head = f'<div class="f6hd"><b>The Bros</b><small>{n} members · yours</small>{right}</div>'
    else:
        ed = '<span class="f7ed done">Done</span>' if mode == "edit" else '<span class="f7ed">Edit</span>'
        dots = "" if mode == "edit" else '<span class="f7dots">···</span>'
        head = f'<div class="f6hd" style="align-items:center"><b>The Bros</b><small>{n} members · yours</small><span class="f7hd-e">{ed}{dots}</span></div>'
    add = '<span class="f6ad">+ Add friends</span>'
    tail = ('<div class="f6sh"><span class="box on"></span>Share my spares with this pod</div>'
            '<div class="f6r0"><span class="ic">◇</span><span><b>Rule 0 check</b><small>Seat tonight’s players, compare their decks</small></span><span class="f6c">›</span></div>')
    cls = "f6pod f7edit" if mode == "edit" else "f6pod"
    return (f'<section class="sec"><div class="sech">Pods · 1<span class="r">New pod</span></div>'
            f'<div class="{cls}"><div class="f6bl"><img src="{img("art-ghalta.jpg")}" alt=""><img src="{img("art-heroes.jpg")}" alt=""></div>'
            f'{head}<div class="f6st" style="--n:{3 if not desk else 3}">{"".join(seats)}{add}</div>{tail}</div></section>')


def ph_page(mode, gone=None):
    inner = f'<div class="f7pg">{f6.friends()}{pod(mode, False, gone)}</div>'
    return phone(inner, "Friends", badges={"Friends": None})


def dk_page(mode, gone=None):
    left = f6.waiting() + f6.requests() + f6.friends()
    body = f'<div class="fp f6two">{f6.head()}<div class="f6cols"><div>{left}</div><div>{pod(mode, True, gone)}</div></div></div>'
    return w4.dk(body, "Friends", "new")


def board():
    body = (board_head("Item 7 · pods · an edit state", "Remove members from Edit, not from the art",
                       "Shipped, the owner sees a ✕ disc on every member’s art, all the time, for an action they rarely take. <b>Redrawn: the seats carry "
                       "no control.</b> The pod’s head gets <b>Edit</b> (owner only, beside the ··· menu). Pressed, the card takes an accent edge, Edit "
                       "becomes <b>Done</b>, and each member’s seat shows <b>Remove</b> under the name, off the art. A member who isn’t the owner sees "
                       "neither, as today.", tag="R1")
            + frames(frame("<b>As shipped</b> · 390 · for reference", ph_page("shipped"), "A ✕ on four of five tiles, each 28px on a 74px picture."),
                     frame("<b>Redrawn</b> · 390", ph_page("rest"), "No control on the art. <b>Edit</b> sits in the head, beside ···."),
                     frame("<b>Redrawn</b> · 390 · editing", ph_page("edit"), "Remove under each name, 44px tall. Done ends it; ··· is hidden while editing."),
                     frame("<b>Redrawn</b> · 390 · Max removed", ph_page("edit", "Max"), "Removed at once, no confirm (as shipped); still editing."))
            + frames(frame("<b>Redrawn</b> · 1300 · editing", dk_page("edit"),
                           "Item 6’s right column. Remove is a 28px line under the name (coarse pointer: 44px hit). The head reads Done alone."),
                     '<div style="display:flex;flex-direction:column;gap:14px;width:440px;flex:none">'
                     '<div class="note"><b>The rule</b><ul>'
                     '<li><b>Edit</b>: owner only, a text press in the head before ···. Rename, Leave and Delete stay in ···.</li>'
                     '<li><b>Editing</b>: the card’s edge goes accent; <b>Done</b> (filled) replaces Edit and ···; every seat but yours shows '
                     '<b>Remove</b> under the name in the danger ink. Add friends and the spares box work as usual.</li>'
                     '<li><b>Remove</b> removes at once, no confirm, as shipped; the member is not told. A failed write puts the seat back with the shared toast.</li>'
                     '<li>Editing ends on Done, Escape, or leaving the page; it also ends by itself when you are the only one left.</li>'
                     '<li>Focus: Edit moves focus to the first Remove; Done returns it to Edit. After a Remove, focus goes to the next Remove, else Done.</li></ul></div>'
                     '<div class="note"><b>For engineering</b><ul>'
                     '<li><code>pod-card.tsx</code>: an <code>editing</code> state on <code>PodCard</code>; <code>Seat</code> loses the absolute ✕ disc and '
                     'renders a text button after the name when <code>editing</code> (same <code>removeMemberAria</code>, same <code>onRemove</code>).</li>'
                     '<li>Copy for /copy-review: <i>Edit</i>, <i>Done</i>, <i>Remove</i>.</li></ul></div></div>'))
    return doc("Pod edit state", body, 390 * 4 + 44 * 3 + 112 if 390 * 4 + 44 * 3 > 1300 + 44 + 440 else 1300 + 44 + 440 + 112)


BOARDS = [("Pod-Edit", board, "Item 7 · an edit state for pods")]
