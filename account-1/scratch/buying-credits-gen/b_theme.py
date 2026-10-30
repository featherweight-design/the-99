from ck import *
import kit
from b_line import ph_crop, cuts_offer
from b_menu import interstitial, dtabs_ph

THEMES = [
    ("amonkhet", "Low Sun · Amonkhet (the default)", "'Cinzel',serif",
     dict(bg="#14110E", surface="#1E1A15", **{"surface-raised": "#211D18", "surface-rail": "#1A1611", "surface-sunken": "#18140F", "surface-inset": "#1B1712",
          "elevated": "#29241F", "border": "#2B241B", "border-strong": "#3A3229", "border-dashed": "#494037", "fg": "#EDE6D8", "fg-body": "#C0B8A6",
          "fg-muted": "#A59C89", "fg-faint": "#8B8270", "fg-placeholder": "#8B8270", "fg-disabled": "#4A4033", "accent": "#CF8745",
          "accent-shadow": "#6B482A", "warning": "#DEAA29"})),
    ("eldraine", "Witching Hour · Eldraine", "'Cormorant Garamond',serif",
     dict(bg="#120E17", surface="#1B1821", **{"surface-raised": "#1F1C25", "surface-rail": "#15121B", "surface-sunken": "#131018", "surface-inset": "#17141D",
          "elevated": "#26232C", "border": "#241D30", "border-strong": "#342C41", "border-dashed": "#443C52", "fg": "#E4DEEE", "fg-body": "#B9B2C5",
          "fg-muted": "#9C95A8", "fg-faint": "#898395", "fg-placeholder": "#898395", "fg-disabled": "#443F4D", "accent": "#AE88E6",
          "accent-shadow": "#4A3568", "warning": "#E0913C"})),
    ("kaldheim", "First Frost · Kaldheim", "'Metamorphous',serif",
     dict(bg="#121217", surface="#1E1F26", **{"surface-raised": "#22232B", "surface-rail": "#181920", "surface-sunken": "#16171D", "surface-inset": "#1A1B22",
          "elevated": "#2D2E35", "border": "#1A1F2B", "border-strong": "#2E3340", "border-dashed": "#424755", "fg": "#C6D2D3", "fg-body": "#B3C0C2",
          "fg-muted": "#95A4A6", "fg-faint": "#7C8A8C", "fg-placeholder": "#7C8A8C", "fg-disabled": "#3B4647", "accent": "#5C86C9",
          "accent-shadow": "#2C405F", "warning": "#E0913C"})),
]


def theme_css():
    out = []
    for key, _, disp, toks in THEMES:
        v = ";".join(f"--{k}:{c}" for k, c in toks.items())
        out.append(f".th-{key}{{{v};--disp:{disp}}}")
    out.append(".th-kaldheim *{font-synthesis-weight:none}")
    out.append(".th-row{display:flex;gap:36px;align-items:flex-start;flex-wrap:nowrap}")
    out.append(".th-head{display:flex;align-items:baseline;gap:14px}")
    out.append(".th-head b{font:700 22px 'Chakra Petch',sans-serif;color:#E6E8F0}")
    out.append(".th-sw{display:flex;gap:6px}.th-sw i{width:18px;height:18px;border-radius:5px;display:block;border:1px solid rgba(255,255,255,.08)}")
    return "\n".join(out)


TOP = f'<div style="position:absolute;left:0;right:0;bottom:74px;height:70px;z-index:4;background:linear-gradient(180deg,transparent,var(--bg))"></div>'


def row(key):
    pg = page(bal=balance((3, 5), plan=74, packs=40, new=False), plan="active")
    pg_none = page(bal=balance((2, 5), new=False), plan="none", hist_empty=True)
    line = ph_crop(cuts_offer(cbutton("Look deeper", spent=True), cline(C["line.spent"]), getmore(new=False)))
    plan = ('<div class="cropped" style="width:390px"><div class="pg" style="gap:14px">'
            + sec("Your plan", plan_card("cancelled", new=False)) + '</div></div>')
    bg = dtabs_ph() + cuts_offer(cbutton("Look deeper"), cline(C["line.withPaid"]))
    return ('<div class="th-row">'
            + frame("Credits page, subscribed · 390", mphone(pg, h=844, check="scroll", over=TOP), "")
            + frame("Never bought: the offers · 390", mphone(pg_none.replace('<div class="pg">', '<div class="pg" style="margin-top:-190px">', 1), h=844, check="scroll", over=TOP), "")
            + '<div style="display:flex;flex-direction:column;gap:36px">'
            + frame("Out of credits · L4", line, "")
            + frame("Cancelled · K3", plan, "") + '</div>'
            + frame("Deletion warning · D1", mphone(bg, h=844, check="scroll", over=interstitial()), "")
            + frame("Credits page · desktop", desk(pg, h=844, check="scroll"), "", width=1300)
            + '</div>')


def board():
    kit.FONTS = kit.FONTS.replace("&amp;display=swap", "&amp;family=Cinzel:wght@700&amp;family=Cormorant+Garamond:wght@600;700&amp;family=Metamorphous&amp;display=swap")
    kit.CSS = kit.CSS + theme_css()
    secs = []
    for key, name, disp, toks in THEMES:
        sw = "".join(f'<i style="background:{toks[k]}"></i>' for k in ["bg", "surface", "elevated", "accent", "fg"])
        secs.append(f'<div class="sec th th-{key}"><div class="th-head"><b>{name}</b><span class="th-sw">{sw}</span>'
                    f'<span class="k">display face {disp.split(",")[0]}</span></div>{row(key)}</div>')
    body = (
        board_head("Buying credits R1b · themes", "The same screens in three other themes",
                   "Round 1 was drawn in Neon Rain (Kamigawa). These are the same boards in Low Sun (Amonkhet, the default), Witching Hour (Eldraine) and First Frost (Kaldheim), "
                   "with each theme’s shipped tokens and display face, nothing else changed. Every color here is a theme token: the accent, the plan and pack card fan, the warning, the disabled press. "
                   "The account line, the brand mark and the mono figures are the same in every theme, as shipped.")
        + "".join(secs)
    )
    return doc("Buying credits · themes", body, 3600, 3600)
