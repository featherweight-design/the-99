from ck import *
import ck, kit
from b_theme import THEMES, theme_css

OFFERS = [
    ("fan", "R1 · The card fan (as drawn)", "For reference. Three card backs, the front one carrying the count."),
    ("diamond", "A · The crown’s diamond", "The count sits in one diamond from the brand mark; the plan adds the crown’s three small diamonds above it. No cards at all."),
    ("numeral", "B · The number alone", "No graphic: the count in the theme’s display face and accent, its unit under it. The quietest option."),
    ("wash", "C · Card art, washed", "The shipped art wash: a commander’s art fades in from the card’s right edge under a mask, text untouched. Engineering would take the art from the reader’s own most recent commander, falling back to a fixed card."),
    ("card", "D · One real card, tilted", "One card at card shape with a subtle tilt and the count on a chip, instead of three backs. Same art source as C."),
]

MENUS = [
    ("line", "A1 · As drawn in R1", "A small accent mono line under the email."),
    ("chip", "M1 · A chip", "The count in a tinted accent pill under the email. Reads as one tappable thing."),
    ("big", "M2 · The number on the right", "The count large in the display face at the identity row’s right edge, `credits ›` under it. The whole block is the link."),
    ("meter", "M3 · The count over a split bar", "The total right-aligned in accent over a thin bar split free, plan and packs, the same spend order as the Credits page."),
]

NR = ("kamigawa", "Neon Rain")
LS = ("amonkhet", "Low Sun")


def wrap(theme, inner):
    cls = "" if theme == "kamigawa" else f"th th-{theme}"
    return f'<div class="{cls}">{inner}</div>'


def offer_pair(theme):
    body = ('<div class="dk" style="height:auto;width:1000px;display:block;border-radius:14px"><div class="pg" style="padding:24px 28px 28px;gap:18px">'
            + sec("Get more credits", '<div class="offers">' + plan_card("none", new=False) + pack_card(new=False) + '</div>')
            + '</div></div>')
    return wrap(theme, body)


def subscribed(theme):
    body = ('<div class="cropped" style="width:390px"><div class="pg" style="gap:14px">'
            + sec("Your plan", plan_card("active", new=False)) + '</div></div>')
    return wrap(theme, body)


def menu_crops(theme, entry):
    sheet = (f'<div class="cropped" style="width:390px;height:560px;position:relative;background:var(--bg)">{menu_sheet(entry)}</div>')
    pop = (f'<div class="cropped" style="width:330px;height:600px;position:relative;background:var(--bg)">'
           f'<div style="position:absolute;inset:0">{menu_pop(entry)}</div></div>')
    html = '<div style="display:flex;gap:24px;align-items:flex-start">' + sheet + pop + '</div>'
    if theme == "amonkhet":
        html = html.replace('<span class="on">Kamigawa</span>', '<span class="">Kamigawa</span>').replace('<span class="">Amonkhet</span>', '<span class="on">Amonkhet</span>')
    return wrap(theme, html)


def board():
    kit.FONTS = kit.FONTS.replace("&amp;display=swap", "&amp;family=Cinzel:wght@700&amp;display=swap") if "Cinzel:wght@700" not in kit.FONTS else kit.FONTS
    if ".th-amonkhet" not in kit.CSS:
        kit.CSS = kit.CSS + theme_css()
    rows = []
    for v, title, cap in OFFERS:
        ck.OFFER_ART["v"] = v
        rows.append(f'<div class="sec"><h3>{title}</h3><p class="cap" style="max-width:1400px">{cap}</p><div class="frames" style="gap:36px">'
                    + frame(f"{NR[1]} · offers, desktop", offer_pair(NR[0]), "", width=1000)
                    + frame(f"{LS[1]} · offers, desktop", offer_pair(LS[0]), "", width=1000)
                    + frame(f"{LS[1]} · subscribed, 390", subscribed(LS[0]), "")
                    + '</div></div>')
    ck.OFFER_ART["v"] = "diamond"
    mrows = []
    for v, title, cap in MENUS:
        ck.MENU_COUNT["v"] = v
        mrows.append(f'<div class="sec"><h3>{title}</h3><p class="cap" style="max-width:1400px">{cap}</p><div class="frames" style="gap:36px">'
                     + frame(f"{NR[1]} · phone sheet, desktop popover", menu_crops(NR[0], C["menu.entry"]), "", width=744)
                     + frame(f"{LS[1]} · same", menu_crops(LS[0], C["menu.entry"]), "", width=744)
                     + frame(f"{LS[1]} · never bought", menu_crops(LS[0], C["menu.entryFree"]), "", width=744)
                     + '</div></div>')
    ck.MENU_COUNT["v"] = "line"
    body = (
        board_head("Buying credits R2 · options for Hugh", "Offer art without the fan, and a louder menu count",
                   "<b>Decided (Hugh, 2026-10-16):</b> cancel is A, inline with undo; the menu entry is A1, in the identity block; the expiry warning shows 3 days out. "
                   "<b>Two picks on this board:</b> one offer art (A to D, top half) and one menu count (M1 to M3, bottom half). Each is drawn in Neon Rain and Low Sun.")
        + '<h2 class="disp" style="margin:6px 0 0;font:700 24px \'Chakra Petch\',sans-serif">1 · The plan and pack art</h2>'
        + "".join(rows)
        + '<h2 class="disp" style="margin:10px 0 0;font:700 24px \'Chakra Petch\',sans-serif">2 · The credit count in the account menu</h2>'
        + "".join(mrows)
    )
    return doc("Buying credits · R2 options", body, 2600, 6000)
