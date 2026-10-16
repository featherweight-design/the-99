from ck import *
import ck, kit
from b_theme import theme_css
from b_opts import wrap, offer_pair, NR, LS

STATES = [
    ("held", C["menu.entry"], "Holding credits", "The count in accent mono inside a tinted pill, led by the offer art’s diamond."),
    ("free", C["menu.entryFree"], "Never bought, payments on", "The same chip with the free count: the way in to buying."),
    ("out", C["menu.entry"], "Out of credits", "The diamond goes hollow and the chip says what to do: <code>Get more credits ›</code>. Shown only when payments are on."),
    ("expiring", C["menu.entry"], "Plan credits expire within 3 days", "The chip turns <code>--warning</code> and names what expires and when: the same 3-day warning as the credit line (L7) and the plan card (K4)."),
]


def sheet_crop(theme, entry):
    html = (f'<div class="cropped" style="width:390px;height:300px;position:relative;background:var(--bg)">'
            + menu_sheet(entry).replace('<div class="amsh">', '<div class="amsh" style="top:24px;bottom:auto">') + '</div>')
    if theme == "amonkhet":
        html = html.replace('<span class="on">Kamigawa</span>', '<span class="">Kamigawa</span>').replace('<span class="">Amonkhet</span>', '<span class="on">Amonkhet</span>')
    return wrap(theme, html)


def pop_crop(theme, entry):
    html = (f'<div class="cropped" style="width:330px;height:600px;position:relative;background:var(--bg)">'
            f'<div style="position:absolute;inset:0">{menu_pop(entry)}</div></div>')
    if theme == "amonkhet":
        html = html.replace('<span class="on">Kamigawa</span>', '<span class="">Kamigawa</span>').replace('<span class="">Amonkhet</span>', '<span class="on">Amonkhet</span>')
    return wrap(theme, html)


def plan_states(theme):
    body = ('<div class="cropped" style="width:390px"><div class="pg" style="gap:14px">'
            + sec("Your plan", plan_card("active", new=False)) + plan_card("cancelled", new=False) + pack_card(new=False) + '</div></div>')
    return wrap(theme, body)


def board():
    if ".th-amonkhet" not in kit.CSS:
        kit.CSS = kit.CSS + theme_css()
    ck.OFFER_ART["v"] = "diamond"
    offers = ('<div class="frames" style="gap:36px">'
              + frame(f"{NR[1]} · offers, desktop", offer_pair(NR[0]), "", width=1000)
              + frame(f"{LS[1]} · offers, desktop", offer_pair(LS[0]), "", width=1000)
              + frame(f"{LS[1]} · subscribed, cancelled, pack · 390", plan_states(LS[0]),
                      "A cancelled plan dims the mark, as R1 dimmed the fan.")
              + '</div>')
    ck.MENU_COUNT["v"] = "mark"
    rows = []
    for st, entry, title, cap in STATES:
        ck.MENU_STATE["v"] = st
        rows.append(f'<div class="sec"><h3>{title}</h3><p class="cap" style="max-width:1400px">{cap}</p><div class="frames" style="gap:36px">'
                    + frame(f"{NR[1]} · phone sheet", sheet_crop(NR[0], entry), "")
                    + frame(f"{LS[1]} · phone sheet", sheet_crop(LS[0], entry), "")
                    + (frame(f"{LS[1]} · desktop popover", pop_crop(LS[0], entry), "", width=330) if st in ("held", "expiring") else "")
                    + '</div></div>')
    ck.MENU_COUNT["v"] = "line"
    ck.MENU_STATE["v"] = "held"
    body = (
        board_head("Buying credits R2b · Hugh’s picks, 2026-10-16", "The crown’s diamond, and the menu chip by state",
                   "<b>Offer art: A</b>, the crown’s diamond, with the three small diamonds now clear above the large one. It replaces the card fan on every board. "
                   "C and D are dropped: art in the app is only ever real cards or player images, and everything else is our own graphics. "
                   "<b>Menu count:</b> M1’s chip, carrying the same diamond so the menu and the Credits page share one mark, and changing with the reader’s state "
                   "so it says something only when something matters. Drawn in Neon Rain and Low Sun.")
        + '<h2 class="disp" style="margin:6px 0 0;font:700 24px \'Chakra Petch\',sans-serif">1 · Offer art: A, the crown’s diamond</h2>'
        + offers
        + '<h2 class="disp" style="margin:10px 0 0;font:700 24px \'Chakra Petch\',sans-serif">2 · The menu chip (M1b), by state</h2>'
        + "".join(rows)
    )
    return doc("Buying credits · R2b picks", body, 2600, 4000)
