"""Small items 4 (account 2, 2026-10-29): the filter trigger on Collection and the cart, and Suggested changes'
"cards in my other decks" toggle.

Item 1 is drawn over Hugh's shipped Collection capture (public/about/pages/amonkhet/phone/p-collection.webp, main
@c6909b9): only the pinned head's second row is redrawn, from filter-bar.tsx. The cart is redrawn from cart-view.tsx /
cart-chassis.tsx / filter-chassis.tsx, the way cart v2 addendum R3 drew it, at the shipped sizes Small items 3 ruled.
Item 2 extends the Suggested changes v2 kit (sc.py) over the shipped tuning-limits-box.tsx, suggested-changes-pick-line.tsx
(addMarkOf, AvailabilityMarker) and suggested-changes-confirm.tsx. Copy marked as a draft is for /copy-review.
"""
import os
import sys
import json
import shutil

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
import parts as P
import graph  # noqa: F401
import sc as S
from kit import doc, frame, img

for k in ("col-header", "col-subnav", "col-head-pill", "col-head-rowa", "col-content", "col-rows", "col-tabbar"):
    P.LOCAL[k] = f"art/{k}.png"


def head(kicker, title, cap, tag="SI4"):
    return kit.board_head(kicker, title, cap, tag=tag)


def sec(title, sp, body):
    return f'<div class="sec"><h3>{title}</h3><p class="sp">{sp}</p>{body}</div>'


def frames(*fs, gap=44):
    return f'<div class="frames" style="gap:{gap}px">{"".join(fs)}</div>'


def tbl(rows):
    return '<div class="tbl2">' + "".join(f'<div class="tr"><div>{a}</div><div>{b}</div><div>{c}</div></div>' for a, b, c in rows) + '</div>'


SEARCH_ICON = ('<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="7" cy="7" r="4.8" fill="none" stroke="currentColor" stroke-width="1.5"/>'
               '<path d="M10.6 10.6 14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>')
SORT_ICON = ('<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M5 3v10M5 3 2.6 5.4M5 3l2.4 2.4M11 13V3M11 13l-2.4-2.4M11 13l2.4-2.4" '
             'fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>')
SPARE_ICON = ('<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="6" cy="5.5" r="2.4" fill="none" stroke="currentColor" stroke-width="1.3"/>'
              '<path d="M1.8 13c.6-2.4 2.2-3.6 4.2-3.6S9.6 10.6 10.2 13" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="11.2" cy="6" r="2" fill="none" stroke="currentColor" stroke-width="1.2"/>'
              '<path d="M11 9.4c1.7 0 3 1 3.4 3" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>')

kit.CSS += r"""
/* ---------- item 1: Collection, over the capture ---------- */
.cw{display:flex;gap:10px;align-items:flex-start}
.cph{width:390px;flex:none;border-radius:34px;border:1px solid var(--border-strong);background:#15110D;overflow:hidden;position:relative;display:flex;flex-direction:column}
.cph img.cp{display:block;width:390px;flex:none}
.cph .crop{overflow:hidden;flex:none;position:relative}
.cph .crop img{display:block;width:390px}
.cph .tb{position:absolute;left:0;right:0;bottom:0}
.cph .vf{position:absolute;left:0;right:0;bottom:0;height:90px;background:linear-gradient(to bottom,rgba(21,17,13,0),#15110D 80%);z-index:3}
.cph .vf::after{content:"scrolls on";position:absolute;left:0;right:0;bottom:12px;text-align:center;font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.cph .stuck{box-shadow:0 10px 18px -12px rgba(0,0,0,.9);position:relative;z-index:2}
.rb{display:flex;align-items:center;gap:8px;height:44px;margin-top:6px;padding:0 16px}
.hd2{background:#15110D;border-bottom:1px solid #282320;padding-bottom:7px}
.fbx{height:44px;flex:none;display:inline-flex;align-items:center;gap:7px;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface-sunken);padding:0 13px;font:13px 'IBM Plex Sans';color:var(--fg)}
.fbx.on{border-color:var(--accent);padding:0 11px}
.fpl{height:36px;flex:none;display:inline-flex;align-items:center;gap:7px;border-radius:999px;border:1px solid var(--border-strong);background:var(--elevated);padding:0 13px;font:500 12.5px 'IBM Plex Sans';color:var(--fg)}
.fpl.on{border-color:var(--accent)}
.bdg{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;border-radius:999px;background:var(--accent);padding:0 5px;font:600 10.5px 'IBM Plex Mono';color:var(--bg)}
.hair{width:1px;height:20px;flex:none;background:var(--border)}
.spl{height:44px;flex:none;display:inline-flex;align-items:center;gap:8px;border-radius:999px;border:1px solid var(--border-strong);background:var(--elevated);padding:0 13px;font:500 12.5px 'IBM Plex Sans';color:var(--fg)}
.spl .cv{font-size:9px;color:var(--fg-body)}
.cnt{font:11px 'IBM Plex Mono';color:var(--fg-muted);letter-spacing:.04em}
.rul{position:relative;width:54px;flex:none}
.rul .r{position:absolute;left:4px;width:10px;border:1.5px solid var(--fact);border-left:0}
.rul .r b{position:absolute;left:16px;top:50%;transform:translateY(-50%);font:600 11px 'IBM Plex Mono';color:#0D0B09;background:var(--fact);border-radius:4px;padding:2px 5px;white-space:nowrap}
.rul .r.up b{background:var(--accent)}
.rul .r.up{border-color:var(--accent)}
.hit{outline:1.5px dashed rgba(143,166,190,.85);outline-offset:0}
.pin2{position:absolute;z-index:8;font:600 9.5px 'IBM Plex Mono';color:#0D0B09;background:var(--fact);border-radius:4px;padding:2px 6px;white-space:nowrap}
/* ---------- item 1: the cart (as addendum R3 drew it, shipped sizes) ---------- */
.cart{width:390px;flex:none;border-radius:34px;border:1px solid var(--border-strong);background:var(--bg);overflow:hidden;position:relative;display:flex;flex-direction:column;font-family:'IBM Plex Sans'}
.cart .q-ptop{display:flex;flex-direction:column;gap:5px;padding:14px 16px 10px}
.cart .q-ptop .q-back{font-size:12.5px;color:var(--accent)}
.cart .q-ptop h1{margin:0;font:700 21px/1.25 'Cinzel',serif;color:var(--fg)}
.cart .q-ptop .q-sub{font-size:12px;color:var(--fg-muted)}
.cart .q-pco{margin:0 16px;border:1px solid var(--border-strong);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:5px}
.cart .q-pco b{font:700 15px 'Cinzel',serif}
.cart .q-pco p{font-size:11px;color:var(--fg-muted)}
.cart .q-pco span{font-size:12px;color:var(--accent);text-decoration:underline}
.cart .q-pdecks{margin:10px 16px 0;border:1px solid var(--border);border-radius:12px;padding:11px 14px;display:flex;justify-content:space-between;font:500 10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.cart .q-pctl{display:flex;flex-direction:column;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg);position:relative}
.cart .q-pctl.q-st{box-shadow:0 10px 18px -12px rgba(0,0,0,.9);z-index:2}
.cart .q-vrow{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.cart .q-seg{display:inline-flex;border:1px solid var(--border-strong);border-radius:9px;padding:3px;gap:2px}
.cart .q-seg span{font-size:12.5px;color:var(--fg-muted);padding:6px 10px;border-radius:6px;white-space:nowrap}
.cart .q-seg span.on{background:var(--elevated);color:var(--fg)}
.cart .q-keys{display:flex;gap:8px;font-size:11px;color:var(--fg-muted)}
.cart .q-k{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.cart .q-k svg{color:var(--fact)}
.cart .q-kb{font:600 10px 'IBM Plex Mono';background:color-mix(in oklab,var(--accent) 20%,transparent);color:var(--accent);border-radius:3px;padding:1px 4px}
.cart .q-crow1{display:flex;gap:8px;align-items:center;margin-top:2px}
.cart .q-sf{flex:1;min-width:0;height:44px;display:flex;align-items:center;gap:8px;border:1px solid var(--border-strong);border-radius:10px;padding:0 11px;color:var(--fg-faint);background:var(--surface-sunken);font-size:14px}
.cart .q-srt{flex:none;width:44px;height:44px;border:1px solid var(--border-strong);border-radius:8px;display:grid;place-items:center;color:var(--fg-body)}
.cart .q-chips{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:11.5px;color:var(--fg-muted)}
.cart .q-chip{border:1px solid var(--border-strong);background:var(--surface);color:var(--fg);border-radius:999px;padding:3px 9px;white-space:nowrap}
.cart .q-chip b{color:var(--fg-faint);font-weight:400;margin-left:2px}
.cart .q-ca{margin-left:auto;text-decoration:underline;color:var(--fg-body)}
.cart .q-res{font-size:11.5px;color:var(--fg-muted)}
.cart .q-prow{display:flex;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border)}
.cart .q-pr-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.cart .q-cn{color:var(--fg);font-size:14px}
.cart .q-fl{display:flex;align-items:center;gap:6px;font-size:11.5px;white-space:nowrap;overflow:hidden}
.cart .q-fl .q-lb{font:500 9.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);width:40px;flex:none}
.cart .q-fl b{color:var(--fg);font:600 13px 'IBM Plex Mono'}
.cart .q-fl .q-v{color:var(--fg-body);font:11.5px 'IBM Plex Mono'}
.cart .q-fl.q-own .q-v,.cart .q-fl.q-own b{color:var(--fg-muted)}
.cart .q-pill{font:500 10px 'IBM Plex Mono';border:1px solid var(--border-strong);border-radius:4px;padding:0 4px;color:var(--fg-muted)}
.cart .q-bt{display:inline-flex;align-items:center;gap:8px;background:color-mix(in oklab,var(--accent) 14%,transparent);border-radius:5px;padding:3px 8px;font:500 11px 'IBM Plex Mono';white-space:nowrap}
.cart .q-bt b{font-weight:600;color:var(--accent)}
.cart .q-bt i{font-style:normal;color:var(--fg-body)}
.cart .q-tabbar{position:absolute;z-index:5;left:0;right:0;bottom:0;height:64px;display:flex;justify-content:space-around;align-items:center;border-top:1px solid var(--border);background:var(--surface-rail)}
.cart .q-tabbar span{display:flex;flex-direction:column;align-items:center;gap:4px;font:500 9px 'IBM Plex Mono';color:var(--fg-faint)}
.cart .q-tabbar i{width:16px;height:16px;border:1.5px solid currentColor;border-radius:4px}
.cart .q-tabbar .q-cur{color:var(--fg)}
.cart .mhd{height:73px}
/* ---------- item 2 ---------- */
.lim .ock{display:flex;align-items:flex-start;gap:10px;min-height:44px;padding:4px 2px 0}
.dkm .lim .ock{grid-column:3;min-height:0;padding:0 2px}
.lim .ock .bx2{width:18px;height:18px;flex:none;border-radius:4px;border:1.5px solid var(--fg-faint);display:flex;align-items:center;justify-content:center;font:700 12px 'IBM Plex Sans';color:var(--bg);margin-top:1px}
.lim .ock .bx2.on{background:var(--accent);border-color:var(--accent)}
.lim .ock .tx{display:flex;flex-direction:column;gap:3px}
.lim .ock .tx b{font:500 13px 'IBM Plex Sans';color:var(--fg)}
.lim .ock .tx span{font-size:12px;line-height:1.45;color:var(--fg-muted)}
.am{display:inline-flex;align-items:center;gap:6px;font:10.5px 'IBM Plex Mono';color:var(--accent);white-space:nowrap;flex:none}
.am i{width:8px;height:8px;background:var(--accent);transform:rotate(45deg);display:block;flex:none}
.am .pl{font:500 10px 'IBM Plex Mono';border:1px solid var(--border-strong);border-radius:4px;padding:0 4px;color:var(--fg-muted);height:19px;display:inline-flex;align-items:center}
.ln2 .amr{display:flex;align-items:center;gap:8px}
.ln2 .amx{display:flex;flex-direction:column;gap:2px;border-radius:7px;background:var(--surface-sunken);border:1px solid var(--border);padding:6px 10px}
.ln2 .amx span{display:flex;justify-content:space-between;font:11px 'IBM Plex Mono';color:var(--fg-body)}
.ln2 .amx span em{font-style:normal;color:var(--fg-faint)}
.mdl .mb .cr2 .nw{display:flex;flex-direction:column;gap:2px;min-width:0;padding:3px 0}
.mdl .mb .cr2 .st{align-self:flex-start;font:10.5px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap}
.mdl .mb .cr2 .st b{font-weight:400;color:var(--accent)}
.dlr{width:390px;border:1px solid var(--border-strong);border-radius:16px;background:var(--bg);padding:14px 16px;display:flex;flex-direction:column;gap:10px}
"""


# =============================================================== item 1
def ruler(top, h, label, up=False):
    return f'<div class="r{" up" if up else ""}" style="top:{top}px;height:{h}px"><b>{label}</b></div>'


def rowb(box, badge=0, sort44=False, hit=False):
    b = f'<span class="bdg">{badge}</span>' if badge else ""
    if box:
        f = f'<span class="fbx{" on" if badge else ""}">Filters{b}</span>'
    else:
        f = f'<span class="fpl{" on" if badge else ""}{" hit" if hit else ""}">Filters{b}</span>'
    s = (f'<span class="spl">Name · A–Z<span class="cv">▼</span></span>' if sort44
         else '<span class="spl" style="height:36px">Name · A–Z<span class="cv">▼</span></span>')
    return f'<div class="rb">{f}<span class="hair"></span>{s}<span class="cnt">2,926</span></div>'


def col_head(variant, badge=0):
    """The pinned head. 'pill' is the capture itself; 'box' redraws row B at 44 (row A is the capture)."""
    if variant == "pill" and not badge:
        return f'<img class="cp" src="{img("col-head-pill")}" alt="" style="height:108px">'
    if variant == "pill":
        return (f'<div class="hd2"><img class="cp" src="{img("col-head-rowa")}" alt="" style="height:58px">'
                f'<div class="rb" style="height:36px">{rowb(False, badge)[16:-6]}</div></div>')
    return (f'<div class="hd2"><img class="cp" src="{img("col-head-rowa")}" alt="" style="height:58px">'
            f'{rowb(True, badge, sort44=True)}</div>')


def crop(key, top, h, full=1070):
    return f'<div class="crop" style="height:{h}px"><img src="{img(key)}" alt="" style="margin-top:-{top}px;height:{full}px;width:390px"></div>'


def col_rest(variant, badge=0, h=640):
    hh = 116 if variant == "box" else 108
    body = (f'<img class="cp" src="{img("col-header")}" alt="" style="height:79px">'
            f'<img class="cp" src="{img("col-subnav")}" alt="" style="height:48px">'
            + col_head(variant, badge)
            + crop("col-content", 0, h - 79 - 48 - hh, 535))
    ph = f'<div class="cph" style="height:{h}px">{body}<div class="vf"></div></div>'
    rul = ruler(127, hh, f"{hh}", up=(variant == "box"))
    return f'<div class="cw">{ph}<div class="rul" style="height:{h}px">{rul}</div></div>'


def col_pinned(variant, badge=0, h=600, scrolled=0):
    hh = 116 if variant == "box" else 108
    body = (f'<img class="cp" src="{img("col-header")}" alt="" style="height:79px;position:relative;z-index:3">'
            f'<div class="stuck">{col_head(variant, badge)}</div>'
            + crop("col-rows", scrolled, h - 79 - hh, 420))
    ph = f'<div class="cph" style="height:{h}px">{body}<div class="vf"></div></div>'
    rul = ruler(79, hh, f"{hh}", up=(variant == "box"))
    return f'<div class="cw">{ph}<div class="rul" style="height:{h}px">{rul}</div></div>'


CART_ROWS = [
    ("Lightning Greaves", 4, "HD - Gishath, HD - Kratos", "+2", 2, "HD - Thorin", "9.60", (8, "Chris", "+1")),
    ("Heroic Intervention", 3, "HD - Elves, HD - Gishath", "+1", 0, "", "8.40", (1, "Peter", "")),
    ("Swiftfoot Boots", 3, "HD - Gishath, HD - Kratos", "+1", 1, "HD - Elves", "5.70", (3, "Chris", "+1")),
    ("Arcane Signet", 2, "HD - Kratos, HD - Thorin", "", 0, "", "1.20", (9, "Chris", "")),
    ("Beast Within", 2, "HD - Elves, HD - Gishath", "", 1, "HD - Thorin", "2.20", (5, "Chris", "+1")),
]


def cart_row(r):
    name, need, decks, more, own, ownin, price, sp = r
    ls = [f'<div class="q-fl"><span class="q-lb">need</span><b>{need}</b><span class="q-v">{decks}</span>' + (f'<span class="q-pill">{more}</span>' if more else "") + "</div>",
          f'<div class="q-fl"><span class="q-lb">spare</span><b>{sp[0]}</b><span class="q-v">{sp[1]}</span>' + (f'<span class="q-pill">{sp[2]}</span>' if sp[2] else "") + "</div>"]
    if own:
        ls.append(f'<div class="q-fl q-own"><span class="q-lb">own</span><b>{own}</b><span class="q-v">in {ownin}</span></div>')
    return (f'<div class="q-prow"><div class="q-pr-main"><span class="q-cn">{name}</span>{"".join(ls)}</div>'
            f'<div><span class="q-bt"><b>buy</b><i>${price}</i></span></div></div>')


def cart_ctl(box, badge=1, stuck=False):
    seg = "".join(f'<span class="{"on" if v == "card" else ""}">{l}</span>' for v, l in (("card", "By card"), ("deck", "By deck"), ("friend", "By friend")))
    keys = (f'<span class="q-k">{SPARE_ICON}<span>friend has a spare</span></span>'
            '<span class="q-k"><span class="q-kb">buy</span><span>press to add</span></span>')
    b = f'<span class="bdg">{badge}</span>' if badge else ""
    fb = (f'<span class="fbx{" on" if badge else ""}">Filters{b}</span>' if box
          else f'<span class="fpl{" on" if badge else ""}">Filters{b}</span>')
    return (f'<div class="q-pctl{" q-st" if stuck else ""}"><div class="q-vrow"><div class="q-seg">{seg}</div><div class="q-keys">{keys}</div></div>'
            f'<div class="q-crow1"><span class="q-sf">{SEARCH_ICON}<span>Search</span></span>{fb}<span class="hair"></span><span class="q-srt">{SORT_ICON}</span></div>'
            '<div class="q-chips"><span class="q-chip">Owned: None <b>×</b></span><span class="q-ca">Clear all</span></div>'
            '<div class="q-res">31 of 48 cards</div></div>')


CART_TAB = ('<div class="q-tabbar">' + "".join(f'<span class="{"q-cur" if t == "Decks" else ""}"><i></i>{t}</span>'
                                             for t in ["Home", "Collection", "Commanders", "Decks", "Friends"]) + "</div>")


def cart_pinned(box, h=640):
    rows = "".join(cart_row(r) for r in CART_ROWS[1:])
    return (f'<div class="cart" style="height:{h}px">{P.ph_top()}{cart_ctl(box, stuck=True)}'
            f'<div style="overflow:hidden;flex:1;position:relative">{rows}</div>{CART_TAB}</div>')


def board_filters():
    a = frames(
        frame("<b>shipped · keep the pill</b> · at rest", col_rest("pill"),
              "The capture as shipped. Row B is drawn at 36px (decision 7): the Filters pill and the sort pill keep a 44px hit target through an overlay. The pinned head is <b>108px</b>."),
        frame("<b>A · the 44px box</b> · at rest", col_rest("box"),
              "Filters becomes the shared 44px box with a 10px radius (Small items 3’s ruling, the rack’s FilterRackTrigger look). Sort drops its 36px override and takes the panel’s own 44. The head is <b>116px</b>, and the list starts 8px lower."),
        gap=36)
    b = frames(
        frame("<b>shipped · keep the pill</b> · pinned, one filter on", col_pinned("pill", badge=1),
              "Scrolled: the head sticks under the app header, as the tabs go by. <b>79 + 108</b> of the screen is header."),
        frame("<b>A · the 44px box</b> · pinned, one filter on", col_pinned("box", badge=1),
              "<b>79 + 116</b>. At 844 tall that leaves 575px of list (was 583), about a third of a row less."),
        gap=36)
    c = frames(
        frame("<b>shipped · the pill</b> · the cart, pinned", f'<div class="cw">{cart_pinned(False)}</div>',
              "The cart’s controls row is already 44px: the search field and the ⇅ sort are both 44. The 36px pill sits inside it."),
        frame("<b>A · the 44px box</b> · the cart, pinned", f'<div class="cw">{cart_pinned(True)}</div>',
              "The same row with the box. <b>Nothing moves</b>: the row was 44 tall, so the cart’s pinned block keeps its height. The cart reads like Decks."),
        gap=36)
    calls = tbl([
        ("1", "Call: the 44px box on both pages", "Collection and the cart take the shared Filters box: 44px tall, 10px radius, <code>--surface-sunken</code>, a 1px <code>--border-strong</code> edge (accent with a filter on), 13px label and the shipped count badge. Every compact page then has one Filters control, as Small items 3 ruled."),
        ("2", "What it costs", "The cart: <b>nothing</b>. Its controls row is already 44px tall (search and ⇅), so its pinned block keeps its height. Collection: <b>+8px</b>. Row B goes from 36 to 44, so the pinned head goes from 108 to 116, and the list loses 8px under it."),
        ("3", "Collection’s Sort", "It stays the labelled pill (Name · A–Z ▾), drawn at the panel’s own compact 44 (drop <code>compactTriggerHeightPx={36}</code>), so row B has one height. No other page shows its sort’s label, so it keeps its own shape."),
        ("4", "Engineering", "<code>FiltersTrigger</code> takes the rack trigger’s classes (<code>filter-rack.tsx</code>), or the two share one component. Its <code>after:</code> overlay goes, since the box is the hit area. <code>filter-bar.tsx</code>’s head arithmetic and STATES H1 note become 8+50+6+44+7+1 = <b>116</b>; the 900–999 one-row form stays 66 (its row is the 50px well already)."),
        ("5", "If you keep the pill", "Nothing changes in code. Small items 3’s table gets an exception: Collection and the cart keep the 36px pill with a 44px hit overlay, so the pinned head stays 108."),
    ])
    body = (head("small items 4 · item 1", "Filters on Collection and the cart",
                 "Small items 3 ruled the 44px Filters box for every compact page, but drew Collection and the cart as if they already had it. They ship a deliberate "
                 "36px pill (<code>FiltersTrigger</code> in <code>filter-bar.tsx</code>, reused by <code>cart-chassis.tsx</code>). Both choices are drawn at 390 over the shipped "
                 "Collection capture, at rest and pinned. <b>Recommended: A, the 44px box.</b> Rulers: <span style=\"color:var(--fact)\">blue</span> is the shipped head, "
                 "<span style=\"color:var(--accent)\">orange</span> the box.")
            + sec("A · Collection at rest", "Only row B is redrawn; the app header, the tabs, row A and the list are the shipped capture.", a)
            + sec("B · Collection pinned", "The head is sticky under the app header (<code>UNDER_HEADER</code>) while the list scrolls.", b)
            + sec("C · The cart pinned", "Drawn as cart addendum R3 drew it, at the shipped sizes Small items 3 ruled (44px search, 44×44 ⇅ with an 8px radius).", c)
            + '<div class="sec"><h3>The call</h3>' + calls + '</div>')
    return doc("Small items 4 · filters", body, 2 * (390 + 64) + 36 + 112)


# =============================================================== item 2
HELD = {}            # card key -> list of decks holding every owned copy
SHOW_HELD = {"on": False, "open": set(), "stay": False}
OWN = {"own": False, "other": False, "show": True}


def lim(cap=None, sets="Any set", own=False, ph=False):
    own = OWN["own"]
    capv = f'<span class="d">$</span>{cap}' if cap else '<span class="d">$</span><span class="pl0">No cap</span>'
    tg = f'<div class="tg2"><span class="{"" if own else "on"}">Any card</span><span class="{"on" if own else ""}">Only cards I own</span></div>'
    ck = ""
    if own and OWN["show"]:
        on = OWN["other"]
        ck = (f'<div class="ock new"><span class="bx2{" on" if on else ""}">{"✓" if on else ""}</span>'
              '<span class="tx"><b>Also cards in my other decks</b><span>Each one says which deck has it. It stays in that deck too.</span></span></div>')
    return ('<div class="lim"><span class="lh">Kept for this deck</span>'
            f'<div class="fl"><span class="lh">Most per card</span><div class="box">{capv}</div></div>'
            f'<div class="fl"><span class="lh">Set</span><div class="box" style="font-family:IBM Plex Sans;font-size:13px">{sets}<span class="cv">▾</span></div></div>'
            f'<div class="fl"><span class="lh">Cards to add</span>{tg}</div>{ck}</div>')


S.lim = lim


def marker(key):
    decks = HELD[key]
    more = f'<span class="pl">{"less" if key in SHOW_HELD["open"] else "+" + str(len(decks) - 1)}</span>' if len(decks) > 1 else ""
    return f'<span class="am"><i></i>none free, in {decks[0]}{more}</span>'


def expander(key):
    if key not in SHOW_HELD["open"]:
        return ""
    return '<div class="amx">' + "".join(f'<span>{d}<em>1 copy</em></span>' for d in HELD[key]) + "</div>"


_row = S.row


def row(side, it, ph, state="", flag_on=True):
    h = _row(side, it, ph, state, flag_on)
    k = it[0]
    if side != "add" or k not in HELD or not SHOW_HELD["on"]:
        return h
    nm_end = h.index("</span>", h.index('<span class="nm a">')) + len("</span>")
    if ph:
        l1_end = h.index("</div>", nm_end) + len("</div>")
        return h[:l1_end] + f'<div class="amr"><span class="new" style="display:inline-flex">{marker(k)}</span></div>' + expander(k) + h[l1_end:]
    l1_end = h.index("</div>", nm_end) + len("</div>")
    h = h[:nm_end] + f'<span class="new" style="display:inline-flex">{marker(k)}</span>' + h[nm_end:]
    l1_end = h.index("</div>", nm_end) + len("</div>")
    return h[:l1_end] + expander(k) + h[l1_end:]


S.row = row


def confirm(adds, cuts, ph=False, bracket="Bracket stays 2 · Core.", big=False):
    def li(sign, it):
        c = "var(--accent)" if sign == "+" else "var(--fg-faint)"
        st = ""
        if sign == "+" and it[0] in HELD:
            d = HELD[it[0]]
            st = f'<span class="st new">stays in <b>{d[0]}</b>{" +" + str(len(d) - 1) if len(d) > 1 else ""}</span>'
        return (f'<div class="cr2"><span style="color:{c};font:600 13px IBM Plex Mono;width:10px">{sign}</span>'
                f'<img src="{P.card(it[0])}" alt=""><span class="nw">{it[1]}{st}</span></div>')
    n = len(adds)
    return (f'<div class="scrim"><div class="mdl"><div class="mh"><div><p class="ey">Suggested changes</p><h4>Apply {n} in, {n} out</h4>'
            f'<p>The deck stays at 99. {bracket}</p></div><span class="x">✕</span></div>'
            f'<div class="mb"><div><span class="k">Coming in · {n}</span>{"".join(li("+", a) for a in adds)}</div>'
            f'<div><span class="k">Going out · {n}</span>{"".join(li("−", c) for c in cuts)}</div></div>'
            f'<div class="mf"><span class="ab2">Apply {2 * n} changes</span></div></div></div>')


ASKED = "<b>3 in, 3 out</b> · keep 2 · Core · no cap · any set · only cards I own, <b>and in my other decks</b>"


def by_key(keys):
    d = {it[0]: it for it in S.ADDS}
    out = []
    for k in keys:
        it = list(d[k])
        it[3], it[4] = True, None
        out.append(tuple(it))
    return out


def overlay(frame_html, layer):
    return frame_html[:-6] + layer + "</div>"


def tool_ph(panel, h=None):
    hub = P.hub_open(panel, True, active="suggested")
    f = P.phone(f'<div class="at">{hub}</div>', head=False, cut="Analysis tab · Tuning · Suggested changes", nav=False)
    if h:
        f = f.replace('<div class="ph">', f'<div class="ph vp" style="height:{h}px">', 1)
    return f


def tool_dk(panel, h=None):
    f = P.desk(f'<div class="at">{P.hub_open(panel, active="suggested")}</div>', head=False, cut="Analysis tab · Tuning · Suggested changes")
    if h:
        f = f.replace('<div class="dk">', f'<div class="dk vp" style="height:{h}px">', 1)
    return f


def lift_bar(panel):
    i = panel.find('<div class="abar')
    if i < 0:
        return panel, ""
    return panel[:i] + "</div>", panel[i:-6].replace('<div class="abar', '<div class="abar pin', 1)


def vp_ph(panel, h=844):
    body, bar = lift_bar(panel)
    f = tool_ph(body, h)
    return f[:-6] + (bar or '<div class="vfade"></div>') + "</div>"


def vp_dk(panel, h=900):
    body, bar = lift_bar(panel)
    f = tool_dk(body, h)
    return f[:-6] + (bar or '<div class="vfade"></div>') + "</div>"


def trim_intake(html):
    """Steps 3 onward only, under the steps above (a tall phone frame would repeat board 1 of v2)."""
    i = html.find('<div class="stp"><div class="sth"><span class="n">3</span>')
    j = html.find('<div class="sth"><span class="n">1</span>')
    return html[:j] + '<div class="sth" style="opacity:.55"><span class="n">1 · 2</span><span class="t">How many, and what to change</span><span class="s">as drawn in v2</span></div></div>' + html[i:]


def board_other_decks():
    adds = by_key(["path", "atreus", "swords", "heartless-act", "counterspell"])
    cuts = S.CUTS[:5]
    HELD.clear()
    HELD.update({"path": ["HD - Gishath"], "atreus": ["HD - Kratos", "HD - Thorin"]})
    K = lambda items: [it[0] for it in items]
    req = S.REQ3

    def res(ph, pa=(), pc=(), done=False, applied=(), tab="add", lead=None):
        r = S.results(ph, 3, adds, cuts, pa, pc, req=req, done=done, applied=applied, tab=tab, lead=lead)
        return r.replace(r[r.find('<span class="pm">') + 17:r.find("</span>", r.find('<span class="pm">'))], ASKED, 1)

    # A · the form
    OWN.update(own=True, other=False, show=True)
    SHOW_HELD["on"] = False
    fp_off = trim_intake(S.intake(True, 3))
    fd_off = trim_intake(S.intake(False, 3))
    OWN.update(other=True)
    fp_on = trim_intake(S.intake(True, 3))
    fd_on = trim_intake(S.intake(False, 3))
    OWN.update(own=False)
    fp_any = trim_intake(S.intake(True, 3))
    OWN.update(own=True)
    a = frames(frame("<b>390</b> · Only cards I own, box off", tool_ph(fp_off)),
               frame("<b>390</b> · box on", tool_ph(fp_on)),
               frame("<b>390</b> · Any card: no box", tool_ph(fp_any),
                     "With Any card, cards in other decks are already offered (marked, with a buy tag for a second copy), so the box has nothing to add."),
               gap=36)
    a2 = frames(frame("<b>1300</b> · box on, under Only cards I own", tool_dk(fd_on)))

    # B · results
    SHOW_HELD["on"] = True
    SHOW_HELD["open"] = set()
    p_res = res(True, K([adds[0], adds[2]]), K(cuts[:1]))
    SHOW_HELD["open"] = {"atreus"}
    p_open = res(True, K([adds[0], adds[2]]), K(cuts[:1]))
    SHOW_HELD["open"] = set()
    d_res = res(False, K(adds[:3]), K(cuts[:2]))
    b = frames(frame("<b>390</b> · two of five come from other decks", vp_ph(p_res, 1220)),
               frame("<b>390</b> · +1 pressed: which decks", vp_ph(p_open, 1220),
                     "The cart’s +N press (cart v2 call 2): opens in place, each deck with its copy, and reads <b>less</b> to fold it."),
               gap=36)
    b2 = frames(frame("<b>1300</b> · the marker after the name, as the shipped add mark sits", tool_dk(d_res)))

    # C · apply
    pa, pc = K(adds[:3]), K(cuts[:3])
    ina = adds[:3]
    eqP = res(True, pa, pc, tab="add")
    eqD = res(False, pa, pc)
    ap = pa + pc
    doneD = res(False, done=True, applied=ap, lead="<b>Applied 3 in, 3 out.</b> The deck is back at 99, on a new draft. The other 4 stay here.")
    c = frames(frame("<b>390</b> · confirm", overlay(vp_ph(eqP, 844), confirm(ina, cuts[:3], True))),
               frame("<b>1300</b> · confirm", overlay(tool_dk(eqD, 900), confirm(ina, cuts[:3]))))
    c2 = frames(frame("<b>1300</b> · applied: the mark stays on the row", tool_dk(doneD)))

    calls = tbl([
        ("1", "The box", "One checkbox, <b>Also cards in my other decks</b>, under <b>Only cards I own</b> in the Kept for this deck box, off by default and kept for the deck like the other limits. "
              "It shows only while Only cards I own is on. Phone: its own 44px row under the toggle. Desktop: under the toggle, in its column. The shipped 18px <code>Checkbox</code>."),
        ("2", "The mark", "A card that comes from another deck carries the shipped <b>none free, in HD - Gishath</b> marker (AvailabilityMarker, hard, named) where the add mark already sits: after the name on desktop, on its own line on a phone. "
              "Held in two or more decks: the first deck and the cart’s <b>+N</b> press, which opens the list in place. No buy tag on these rows: the player asked for cards they own."),
        ("3", "Apply", "<b>Apply adds the card here and leaves it in the other deck.</b> Nothing changes in HD - Gishath. The confirmation says so on the row (<i>stays in HD - Gishath</i>). "
              "From then on the shipped availability carries it: this deck’s row reads <i>none free, in HD - Gishath</i>, and once both decks are committed the copy is spoken for twice, "
              "which the deck page’s message card (deck messages A6) and Shopping already show, with a buy tag for a second copy."),
        ("4", "Not drawn: move it", "Apply could also cut the card from the other deck. Rejected: it changes a deck the player isn’t looking at, leaves that deck at 98 and needs its own Top off, "
              "and Undo would have to reach two decks. The player can still cut it there themselves; nothing is locked in."),
        ("5", "Engineering", "<code>limits.otherDecks</code> (boolean, stored with the deck’s limits, in the run fingerprint). When on, owned candidates include oracle ids with <code>free ≤ 0</code> whose copies sit in other decks "
              "(<code>loadAvailability</code> with <code>excludeDeckId</code>), and <code>owned</code> on the answer row stops requiring <code>free &gt; 0</code>. "
              "Ordering stays the run’s (recommended first); when two cards fit as well, a spare copy goes ahead of a held one. The row’s marker drops <code>nameless</code> and keeps <code>selfExcluded</code>."),
        ("6", "Copy (drafts)", "<i>Also cards in my other decks</i> · <i>Each one says which deck has it. It stays in that deck too.</i> · <i>stays in {deck}</i> · You asked: <i>only cards I own, and in my other decks</i>. The marker is shipped copy."),
    ])
    body = (head("small items 4 · item 2", "Suggested changes: cards from my other decks",
                 "With <b>Only cards I own</b>, a run offers spare copies only (engineering is widening that to every spare, recommended first). "
                 "This adds a choice to also offer copies that sit in another deck. Drawn over the shipped Kept for this deck box, the v2 pick line and Apply’s confirmation. "
                 "Fixture: HD - Half Shell at 99, N = 3; Path to Exile is in HD - Gishath, Atreus in HD - Kratos and HD - Thorin.")
            + sec("A · The box on the form", "Steps 1 and 2 are as v2 drew them (dimmed here). The box is new; everything else in step 3 is shipped.", a + a2)
            + sec("B · A result from another deck", "Picked rows behave as shipped. Only the marker is new to these rows; it is the one the deck page and Shopping already use.", b + b2)
            + sec("C · Apply", "The shipped confirmation, with where each held card stays. Applying never touches the other deck.", c + c2)
            + '<div class="sec"><h3>The calls</h3>' + calls + '</div>')
    return doc("Small items 4 · other decks", body, 1300 + 390 + 44 + 112)


# =============================================================== main
def board_main():
    rows = tbl([
        ("1", "Filters on Collection and the cart", "<b>Recommended: the 44px box on both.</b> The cart’s controls row is already 44 (search and ⇅), so its pinned block doesn’t change. "
              "Collection’s pinned head goes from 108 to 116. Collection’s Sort pill takes the panel’s own 44 so row B has one height. Board <b>Filters</b>."),
        ("2", "Suggested changes: cards from my other decks", "<b>One checkbox</b> under Only cards I own: <i>Also cards in my other decks</i>. A result from another deck carries the shipped "
              "<i>none free, in HD - Gishath</i> marker (+N when several decks hold it). <b>Apply adds it here and leaves it there</b>; the shipped availability and deck messages take it from there. Board <b>Other-Decks</b>."),
    ])
    body = (head("small items 4 · account 2 · 2026-10-29", "Small items 4",
                 "Two small items: a follow-up on Small items 3’s filter controls, and a new choice on Suggested changes’ form. Each is drawn over the shipped surface it changes, at 390 "
                 "and, for item 2, 1300. Dashed orange outlines mark what is new. Strings marked as drafts are for /copy-review.")
            + '<div class="sec"><h3>The calls</h3>' + rows + '</div>')
    return doc("Small items 4 · main", body, 1300)


BOARDS = [
    ("Main", board_main, "Small items 4 · the calls"),
    ("Filters", board_filters, "1 · Filters on Collection and the cart"),
    ("Other-Decks", board_other_decks, "2 · Suggested changes: cards from my other decks"),
]

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "local"
    kit.MODE["blob"] = mode == "blob"
    if mode == "blob":
        kit.BLOB.update(json.load(open("blobs.json")))
    out = "out4" if mode == "local" else "canvas4"
    os.makedirs(out, exist_ok=True)
    if mode == "local":
        shutil.copytree("art", f"{out}/art", dirs_exist_ok=True)
        shutil.copy("support.js", f"{out}/support.js")
    for n, fn, _ in BOARDS:
        open(f"{out}/{n}.dc.html", "w").write(fn())
        print("wrote", n)
