"""Buying credits · R3 addendum boards (items 1 to 11)."""
from common import *

LINK = '<span class="lk">What uses credits?</span>'
MAIL = "support@the-99.dev"


def mail(fg=False):
    return f'<span class="mail{" fg" if fg else ""}">{MAIL}</span>'


def page_head():
    return f'<div class="phead"><h1>Credits</h1><span class="sub">1 credit is 1 run of any tool · {LINK}</span></div>'


def bal(cells, added=None, today=None, hydrated=True, new_plus=False, new_today=False):
    """cells: list of (key, value). today: None | ('near'|'limit', used)."""
    total = sum(v for _, v in cells)
    lab = {"free": "Free", "plan": "Plan", "pack": "Packs"}
    lis = []
    for k, v in cells:
        small = '<small>of 5</small>' if k == "free" else ""
        plus = ""
        if k == "pack" and added and v > added:
            plus = f'<span class="plus{" new" if new_plus else ""}">+{added}</span>'
        if k == "free":
            sub = ("reset at 2:01 AM" if hydrated else "") if v < 5 else "all 5 ready"
        else:
            sub = {"plan": "roll over", "pack": "never expire"}[k]
        lis.append(f'<li class="cell"><span class="k">{lab[k]}</span><span class="n">{v}{small}{plus}</span><span class="su">{sub}</span></li>')
    order = '<div class="ord"><span>Spent in this order</span><span>→</span></div>' if len(cells) > 1 else ""
    td = ""
    if today:
        kind, used = today
        if kind == "near":
            words = f"{used} of 20 paid credits used today{' · the limit resets at 2:01 AM' if hydrated else ''}. Free credits still run."
            fill = f'<i style="width:{used * 5}%;background:var(--fg-muted)"></i>'
        else:
            words = f"20 of 20 paid credits used today.{' Back at 2:01 AM.' if hydrated else ''} Free credits still run, and nothing banked is lost."
            fill = '<i style="width:100%;background:var(--warning)"></i>'
        td = f'<p class="today{" new" if new_today else ""}"><span class="m">{fill}</span><span>{words}</span></p>'
    return (f'<section class="bal"><div class="tot"><b>{total}</b><span>credits to spend</span></div>{order}'
            f'<ul class="cells">{"".join(lis)}</ul>{td}</section>')


def numeral(n=40):
    return f'<span class="art" aria-hidden="true"><span class="dia"><b class="dnum">{n}</b></span></span>'


def pack_card(new_btn=False):
    return (f'<div class="pack"><div class="top"><div class="tx"><span class="kk">Credit pack</span><h3>40 credits</h3>'
            f'<span class="pr">$5</span></div>{numeral()}</div>'
            f'<p class="fine">Pack credits never expire. They’re forfeited if you delete your account.</p>'
            f'<div class="row"><span class="buy{" new" if new_btn else ""}" aria-label="Buy pack: 40 credits · $5">Buy pack</span>'
            f'<span class="via">Checkout on Stripe · US cards</span></div></div>')


def offers(new_btn=False):
    return f'<section class="offers"><h2>Get more credits</h2>{pack_card(new_btn)}</section>'


def refund(fg=False, new=False):
    return (f'<p class="refund{" new" if new else ""}">Refunds: email {mail(fg)} within 14 days. Unused packs and a plan’s first month come back in full; '
            f'used credits don’t. A run that fails refunds itself.</p>')


def history(items=None, fg=False, new_refund=False):
    if not items:
        body = '<p class="hempty">Nothing bought yet. Receipts show here once you do.</p>'
    else:
        lis = "".join(f'<li><span class="dt">{d}</span><span class="lb">{l}<small>{u}</small></span><span class="am">{a}</span>'
                      f'<span class="rc">Receipt<span style="font-size:11px">↗</span></span></li>' for d, l, u, a in items)
        body = f'<ul class="hl">{lis}</ul>'
    return f'<section class="hist"><h2>Purchase history</h2>{body}{refund(fg, new_refund)}</section>'


H_PACK = [("Oct 17", "Credit pack", "40 credits", "$5.00")]
H_TWO = [("Oct 17", "Credit pack", "40 credits", "$5.00"), ("Oct 9", "Credit pack", "40 credits", "$5.00")]


def band_added(n=40):
    return (f'<div class="band ok" role="status"><span class="tick">✓</span><div class="bt"><b>{n} pack credits added</b>'
            f'<span class="rcp">Receipt<span style="font-size:11px">↗</span></span></div></div>')


def band_slow(fg=False, new=False):
    return (f'<div class="band{" new" if new else ""}" role="status"><span class="dot"></span><div class="bt"><b>Still adding your credits</b>'
            f'<p>This can take a few minutes. You won’t be charged twice. If they haven’t landed in an hour, email {mail(fg)}.</p></div></div>')


def page(*parts, desk_=False):
    return f'<div class="pg{" d" if desk_ else ""}">{"".join(parts)}</div>'


# ------------------------------------------------------------------ the chip (shell/credit-chip.tsx) and the menu
def chip(kind="held", n="117", rest=" credits", sheet=True, hollow=False, line=None, ink="", new=False):
    if kind == "out":
        inner = '<span>Get more credits</span>'
        cls = "out"
    else:
        inner = f'<span><b class="ct">{n}</b>{rest}</span>'
        cls = {"held": "held", "warn": "warn", "off0": "held"}[kind]
    dm = '<i class="dm hol"></i>' if hollow else '<i class="dm"></i>'
    ln = f'<div class="chipline">{line}</div>' if line else ""
    return (f'<span class="chip {cls}{" sheet" if sheet else ""}{" " + ink if ink else ""}{" new" if new else ""}">{dm}{inner}<em>›</em></span>{ln}')


def idb(chip_html, pop=False):
    return (f'<div class="idb"><span class="av">CO</span><div class="nm"><b>Colin</b><span class="em">colin@example.com</span>'
            f'{chip_html}</div></div>')


def menu_sheet(theme, chip_html, h=330, note=""):
    body = (f'<div class="sht"><div class="grab"></div>{idb(chip_html)}'
            f'<div class="thp"><span class="on"></span><span></span><span></span></div></div>')
    return crop(theme, body + note, w=390, h=h, style="background:color-mix(in oklab,var(--bg) 72%,#000)")


def menu_pop(theme, chip_html, h=200):
    body = f'<div class="pop" style="left:14px;top:14px">{idb(chip_html, pop=True)}</div>'
    return crop(theme, body, w=330, h=h, style="background:var(--bg)")


# ------------------------------------------------------------------ boards
def b_pack():
    ph = phone("amonkhet", page(page_head(), bal([("free", 3)]), offers(new_btn=True), history()), h=900, check="p-pack")
    dk = desk("amonkhet", page(page_head(), bal([("free", 3)]), offers(new_btn=True), history(), desk_=True), w=1300, h=900, check="d-pack")
    aria = ('<div class="note" style="max-width:390px"><b>The button, as built</b><br>'
            '<code>&lt;button aria-label="Buy pack: 40 credits · $5"&gt;Buy pack&lt;/button&gt;</code><br><br>'
            'The visible words open the name (label in name), so a voice command of “Buy pack” finds it, and a second pack on sale is still told apart '
            'by the count and the price. The card already shows both above the button, so they are not repeated in it.</div>')
    s1 = sec("1", "The pack button: Buy pack", "ok",
             "Redrawn to what shipped: the button reads <code>Buy pack</code> and its accessible name carries the rest, "
             "<code>Buy pack: 40 credits · $5</code>. This replaces <code>Buy 40 credits</code> on R1 Billing-Page and R2b Picks.",
             '<div class="frames">'
             + frame("390 · /credits, never bought · Low Sun", ph, "The pack card as <code>pack-offers.tsx</code> draws it: 44px button, full width at 390.")
             + frame("1300 · /credits, never bought · Low Sun", dk, "At desktop the button sits beside <code>Checkout on Stripe · US cards</code> at 40px, inside the 463px offers column.", width=1300)
             + '<div class="fr" style="width:390px;padding-top:24px">' + aria + '</div></div>')

    tiles = []
    for k in ORDER:
        m = NUM[k]["shipped"]
        ink = m["h"]
        lining = "lining figures" if ink < 16 else "old-style figures (the 4 descends); no lining set in this face"
        zoom = (f'<div style="position:relative;width:296px;height:300px;overflow:hidden;border-radius:10px;border:1px solid var(--border);background:var(--surface)">'
                f'<div style="position:absolute;left:0;top:28px;transform:scale(4);transform-origin:0 0">{numeral()}</div>'
                f'<i style="position:absolute;left:0;right:0;top:{28 + 27 * 4}px;height:1px;background:rgba(255,255,255,.5)"></i>'
                f'<i style="position:absolute;top:0;bottom:0;left:{37 * 4}px;width:1px;background:rgba(255,255,255,.5)"></i></div>')
        card = f'<div style="width:296px">{pack_card()}</div>'
        body = crop(k, f'<div style="padding:14px;display:flex;flex-direction:column;gap:12px">{card}{zoom}</div>', w=326)
        sign = lambda v: ("+" if v > 0 else "−" if v < 0 else "±") + f"{abs(v):.2f}".rstrip("0").rstrip(".") + "px"
        tiles.append(frame(f"{NAME[k]} · {FACE[k]}", body,
                           f'Ink centre {sign(m["dy"])} vertical, {sign(m["dx"])} horizontal from the diamond’s centre. '
                           f'Ink {ink}px tall: {lining}.' + (" <code>.offer-numeral</code> adds 3px under it." if k == "kaldheim" else ""), width=326))
    s2 = sec("2", "The diamond’s numeral, in all six display faces", "ok",
             "Drawn as shipped: 21px, the face’s bold, <code>lining-nums</code>, centred on cap height with <code>text-box: trim-both cap alphabetic</code>. "
             "Measured headless at 4×, every face’s ink sits within half a pixel of the diamond’s centre.",
             '<div class="frames" style="gap:20px">' + "".join(tiles) + '</div>',
             "Each tile is the pack card’s top row at 1×, then the diamond at 4× with its centre lines. "
             "First Frost is the one exception to “lining”: Metamorphous has no lining figures, so its digits keep their own heights, and the shipped 3px pad is what centres them. "
             "No change asked of engineering.")
    body = head("Buying credits · R3 addendum · items 1–2", "The pack button, and the diamond’s numeral",
                "Small redraws to what shipped on main. Where engineering departed from a board, the shipped value is Hugh’s ruling, so these boards draw it rather than reopen it. "
                "Dashed outlines mark what moved since R2b.") + s1 + s2
    return doc("Buying credits R3 · pack and diamond", body, 2200, 2700)


def b_balance():
    first = crop("amonkhet", page(band_added(), bal([("free", 3), ("pack", 40)], added=40), ""), w=390)
    second = crop("amonkhet", page(band_added(), bal([("free", 3), ("pack", 80)], added=40, new_plus=True), ""), w=390)
    second_d = crop("amonkhet", page(band_added(), bal([("free", 3), ("pack", 80)], added=40, new_plus=True), "", desk_=True), w=1040)
    s3 = sec("3", "The Packs cell’s +N, after Checkout", "ok",
             "The rule: <code>+N</code> shows only while the Packs cell holds more than N. On a first purchase the delta is the whole cell, and the band above already says it.",
             '<div class="frames">'
             + frame("390 · a first pack · R2", first, "Packs holds 40 and 40 just landed: no <code>+40</code>. The band reads <code>40 pack credits added</code>.")
             + frame("390 · a second pack", second, "Packs holds 80 and 40 just landed: <code>+40</code> in <code>--success</code> beside the count, until the reader leaves the page.")
             + frame("1040 · a second pack", second_d, "", width=1040)
             + '</div>')

    rows = []
    for k in ORDER:
        t = T[k]
        a_bg, a_s = cr(t["accent"], t["bg"]), cr(t["accent"], t["surface"])
        f_bg, f_s = cr(t["fg"], t["bg"]), cr(t["fg"], t["surface"])
        rows.append([NAME[k], (f"{a_bg:.2f}", "n" + (" bad" if a_bg < 4.5 else "")), (f"{a_s:.2f}", "n" + (" bad" if a_s < 4.5 else "")),
                     (f"{f_bg:.2f}", "n good"), (f"{f_s:.2f}", "n good")])
    tbl = table(["Theme", "--accent · Refunds line (--bg)", "--accent · slow band (--surface)", "--fg · Refunds line", "--fg · slow band"], rows)
    pair = []
    for k in ["phyrexia", "kaldheim", "amonkhet"]:
        shipped = crop(k, page(band_slow(), refund(), ""), w=390)
        prop = crop(k, page(band_slow(fg=True, new=True), refund(fg=True, new=True), ""), w=390)
        pair.append(f'<div class="frames" style="gap:28px">'
                    + frame(f"{NAME[k]} · shipped, --accent", shipped,
                            f"Band: {cr(T[k]['accent'], T[k]['surface']):.2f}:1. Refunds: {cr(T[k]['accent'], T[k]['bg']):.2f}:1.")
                    + frame(f"{NAME[k]} · proposed, --fg underlined in --accent", prop,
                            f"Band: {cr(T[k]['fg'], T[k]['surface']):.2f}:1. Refunds: {cr(T[k]['fg'], T[k]['bg']):.2f}:1.")
                    + '</div>')
    s4 = sec("4", "support@the-99.dev, a link in both sentences", "call",
             "Confirmed as one mailto link in the Refunds line and in R4’s slow-return sentence (<code>SupportLink</code>). One change: measured, "
             "<code>--accent</code> on the band’s <code>--surface</code> is 4.25:1 in Oil Haze and 4.46:1 in First Frost, under 4.5. "
             "I draw the address in <code>--fg</code> with its underline in <code>--accent</code>: 10.60:1 at the lowest, in both sentences, every theme.",
             tbl + "".join(pair),
             "The underline is what marks it as a link (it differs from the sentence around it in more than colour), and the accent rule keeps it reading as the app’s link. "
             "Same treatment in both places, so <code>SupportLink</code> stays one component. The Refunds line on <code>--bg</code> clears with <code>--accent</code> too (4.51:1 lowest), "
             "but one rule for one component is simpler than two. <b>If the text inks addendum (account 1, 2026-10-17) is approved first</b>, its <code>--accent-text</code> clears 4.5:1 on every ground, "
             "and the link simply moves to <code>--accent-text</code> with the app’s other text links; this --fg treatment is only needed without it.")

    def hyd(kind, used, hydrated, new=False):
        cells = [("free", 0), ("plan", 74), ("pack", 40)]
        return crop("amonkhet", page(bal(cells, today=(kind, used), hydrated=hydrated, new_today=new), ""), w=390)
    s7 = sec("7", "P5 and P5b: the clock clause after hydration", "ok",
             "Drawn as shipped. The server renders the line without a clock time (it has no reader clock); the clause arrives on hydration. "
             "The Free cell’s <code>reset at</code> follows the same rule, holding one line’s height while empty.",
             '<div class="frames" style="gap:28px">'
             + frame("P5 · first paint", hyd("near", 17, False), "<code>17 of 20 paid credits used today. Free credits still run.</code>")
             + frame("P5 · after hydration", hyd("near", 17, True, True), "<code>· the limit resets at 2:01 AM</code> joins the line in the reader’s clock.")
             + frame("P5b · first paint", hyd("limit", 20, False), "The meter is already <code>--warning</code>; only the time waits.")
             + frame("P5b · after hydration", hyd("limit", 20, True, True), "<code>Back at 2:01 AM.</code> joins.")
             + '</div>',
             "Two shifts land with the clock, both drawn above. The near line grows from two lines to three at 390. And, found while drawing: with all three cells at 390 the Free cell is 94px inside, "
             "so <code>reset at 2:01 AM</code> wraps to two lines, past the one line <code>min-h-[14.7px]</code> holds, and the strip grows 15px. "
             "Both sit above the offers and move them once, at hydration. A note for engineering, not a redraw: reserving two lines (29.4px) for the Free cell’s sub at 390 when three cells show would hold the strip still.")
    body = head("Buying credits · R3 addendum · items 3, 4, 7", "The return’s +N, the support address, and the clock clause",
                "Drawn over <code>/credits</code> as built (<code>balance.tsx</code>, <code>return-band.tsx</code>, <code>history.tsx</code>, <code>support-link.tsx</code>).") + s3 + s4 + s7
    return doc("Buying credits R3 · balance and return", body, 2200, 3900)


def b_chip():
    # 5: the pill on the phone
    ruler = ('<span style="position:absolute;left:82px;top:{t}px;height:44px;width:12px;border:1px solid #FF6FAE;border-right:0"></span>'
             '<span class="dim" style="position:absolute;left:52px;top:{t2}px">44</span>')
    s5 = sec("5", "The chip on the phone: the pill is 44px", "ok",
             "The pill itself is 44px tall inside the phone’s sheet, as shipped (<code>min-h-[44px]</code> on the link). Redrawn so. The desktop popover keeps its 30px pill.",
             '<div class="frames">'
             + frame("390 · account sheet", menu_sheet("amonkhet", '<span style="position:relative;display:inline-flex;flex-direction:column">' + chip(new=True)
                     + '<span style="position:absolute;right:-30px;top:8px;height:44px;width:10px;border:1px solid #FF6FAE;border-left:0"></span>'
                     + '<span class="dim" style="position:absolute;right:-56px;top:22px">44</span></span>', h=300), "The whole pill is the press; nothing pads it invisibly.")
             + frame("1280 · account popover", menu_pop("amonkhet", chip(sheet=False), h=170), "30px, in a pointer’s popover.", width=330)
             + '</div>')

    cases = [
        ("Paid limit reached, free spent", chip("held", "94"),
         "The count is what the reader holds (<code>chipFor</code>: free plus plan plus packs), not what today’s limit allows. The limit is said where a run is pressed (L5) and on <code>/credits</code> (P5b)."),
        ("Spent, payments off, credits once bought", chip("off0", "0", hollow=True),
         "<code>0 credits</code>, hollow. No <code>Get more credits</code>: it is a purchase, and the switch is off. The chip still leads to the reduced <code>/credits</code> with the history."),
        ("Expiring, payments off", chip("warn", "74", line="74 plan credits expire Nov 16"),
         "Unchanged by the switch: expiry is a fact about credits already held, not an offer. The words under the chip carry it."),
    ]
    s6 = sec("6", "The chip’s three undrawn cases", "ok",
             "Drawn from <code>chipFor</code> as built. Nothing new: each case falls out of the four shipped states.",
             '<div class="frames">' + "".join(frame(f"390 · {t}", menu_sheet("amonkhet", c, h=300 if "Expiring" not in t else 320), cap) for t, c, cap in cases) + '</div>')

    rows, tiles = [], []
    for k in ORDER:
        c = CON[k]
        acc = min(c["sheet"]["accent_on_held"], c["popover"]["accent_on_held"])
        fg = min(c["sheet"]["fg_on_held"], c["popover"]["fg_on_held"])
        tint = min(c["sheet"]["tint35_on_held"], c["popover"]["tint35_on_held"])
        rows.append([NAME[k], (f"{acc:.2f}", "n" + (" bad" if acc < 4.5 else "")), (f"{fg:.2f}", "n good"), (f"{tint:.2f}", "n good")])
        col = (f'<div style="display:flex;flex-direction:column;gap:10px">'
               + menu_sheet(k, chip("held", "117"), h=196)
               + menu_sheet(k, chip("held", "117", ink="tint"), h=196) + '</div>')
        tiles.append(frame(f"{NAME[k]}", col, f"Top: <code>--fg</code>, {fg:.2f}:1. Under it: the 35% accent tint, {tint:.2f}:1.", width=390))
    s8 = sec("8", "The chip’s count: --fg, confirmed", "ok",
             "Confirmed <code>--fg</code>. It clears 8.17:1 at its lowest (First Frost) on the chip’s 16% accent tint, on both the sheet and the popover ground. "
             "A tint that also clears is <code>color-mix(in srgb, var(--accent) 35%, var(--fg))</code>, 6.15:1 at its lowest; drawn under each for comparison, not proposed: "
             "the diamond, the border, the fill and the <code>›</code> already carry the accent.",
             table(["Theme", "--accent on its tint (before #2062)", "--fg (shipped)", "35% accent tint"], rows) + '<div class="frames" style="gap:20px">' + "".join(tiles) + '</div>',
             "Measured here, <code>--accent</code> on its own tint is 4.48:1 in Low Sun (the brief’s 4.10 is what I find for Oil Haze’s accent straight on the menu, 4.14). "
             "Either way it fails in three themes, and <code>--fg</code> was the right fix.")

    rows2, tiles2 = [], []
    for k in ORDER:
        c = CON[k]
        wa = c["warning_vs_accent"]
        line = min(c["sheet"]["warning_line_on_ground"], c["popover"]["warning_line_on_ground"])
        cnt = min(c["sheet"]["warning_on_warn"], c["popover"]["warning_on_warn"])
        rows2.append([NAME[k], (f"{wa:.2f}", "n bad"), (f"{line:.2f}", "n good"), (f"{cnt:.2f}", "n good")])
        both = (f'<div style="display:flex;gap:10px;align-items:flex-start">'
                + menu_sheet(k, chip("held", "117", sheet=False), h=150) + '</div>')
        pairc = crop(k, f'<div style="padding:16px 18px;display:flex;flex-direction:column;gap:6px;background:var(--surface)">'
                        f'{chip("held", "117", sheet=True)}<div style="height:6px"></div>{chip("warn", "74", sheet=True, line="74 plan credits expire Nov 16")}</div>', w=260)
        tiles2.append(frame(f"{NAME[k]} · held, then expiring", pairc, f"Warning and accent: {wa:.2f}:1 apart.", width=260))
    s11 = sec("11", "Warning against accent: the expiring chip leans on its words", "ok",
              "Confirmed, and wider than Low Sun: <code>--warning</code> and <code>--accent</code> sit 1.11:1 to 1.71:1 apart in every theme (Witching Hour is the closest, 1.11). "
              "The expiring chip’s meaning is the line under it, <code>74 plan credits expire Nov 16</code>, which clears 6.17:1 everywhere. The colour only agrees with it.",
              table(["Theme", "--warning vs --accent", "The line under the chip", "The count on its tint"], rows2)
              + '<div class="frames" style="gap:24px">' + "".join(tiles2) + '</div>')
    body = head("Buying credits · R3 addendum · items 5, 6, 8, 11", "The menu chip: its height, its undrawn cases, its ink",
                "The chip as <code>credit-chip.tsx</code> and <code>chip-rule.ts</code> build it, inside the account menu’s identity block. Every ratio on this board is measured from "
                "the six themes’ tokens in <code>globals.css</code>, WCAG 2 relative luminance, the tints composited in sRGB over the menu’s own ground "
                "(<code>--surface</code> for the sheet, <code>--surface-raised</code> for the popover), the lower of the two shown.") + s5 + s6 + s8 + s11
    return doc("Buying credits R3 · the chip", body, 2700, 3700)


def b_line():
    L3 = "Uses a paid credit. 0 of 5 free · reset at 2:01 AM · 114{sp}paid."
    press = ('<span class="press d"><span style="display:inline-flex;align-items:center;height:30px;padding:0 10px;border-radius:7px;'
             'font:600 11px \'IBM Plex Mono\',monospace;color:var(--bg);background:color-mix(in oklab,var(--bg) 22%,transparent);margin:0 10px 0 -16px">1 credit</span>Find commanders</span>')

    def foot(sp, new=False):
        return crop("amonkhet", f'<div style="display:flex;align-items:center;gap:18px;padding:20px 26px;border-top:1px solid var(--border);background:var(--surface-rail)">'
                                f'{press}<p class="dline2{" new" if new else ""}">{L3.format(sp=sp)}</p></div>', w=680)

    def dockline(sp, new=False):
        return crop("amonkhet", f'<div style="padding:10px 16px 12px;border-top:1px solid var(--border)"><span class="press">'
                                f'<span style="display:inline-flex;align-items:center;height:32px;padding:0 10px;border-radius:7px;font:600 11px \'IBM Plex Mono\',monospace;color:var(--bg);background:color-mix(in oklab,var(--bg) 22%,transparent);margin-right:10px">1 credit</span>Find commanders</span>'
                                f'<p class="dline{" new" if new else ""}">{L3.format(sp=sp)}</p></div>', w=390)
    s9 = sec("9", "“114 paid.” never splits", "ok",
             "Confirmed: <code>paid()</code> joins the count and its word with a no-break space (PR #2066), so a narrow line wraps before the number, never between it and <code>paid.</code>",
             '<div class="frames" style="gap:28px">'
             + frame("1280 · Help me choose, ordinary space (before)", foot(" "), "At the 380px line, <code>paid.</code> falls to a line of its own.", width=680)
             + frame("1280 · no-break space (shipped)", foot("&nbsp;", True), "<code>114 paid.</code> wraps as one.", width=680)
             + frame("390 · the dock’s line, no-break space", dockline("&nbsp;", True), "Same rule on the phone’s centred line.")
             + '</div>')

    def form(top, words, shipped, at_box=False):
        caption = ("Kept here for when a credit comes back." if words else "")
        gm_field = '' if shipped else '<span class="gm new">Get more credits<i>→</i></span>'
        fields = (
            '<div class="hmc"><div class="ti"><h1>Help me choose</h1><p>Every answer is optional.</p></div>'
            '<div class="fld"><span class="fl">Colors</span><div class="segs"><span class="on">Any of</span><span>Exactly</span></div><p class="fcap">No preference: every identity, five-color included.</p></div>'
            '<div class="fld"><span class="fl">Theme</span><div class="inp">Add a theme…</div><p class="fcap">EDHREC’s themes. Pick more than one if you like.</p></div>'
            '<div class="fld"><span class="fl">Sets</span><div class="setc"><span class="sc"><b>DSK</b>Duskmourn<i>✕</i></span><span class="sc"><b>BLB</b>Bloomburrow<i>✕</i></span><span class="add">Add a set…</span></div>'
            '<p class="fcap">Only commanders printed in one of these. Leave it empty for every set.</p></div>'
            '<div class="fld"><span class="fl">Cards for the 99</span><div class="segs"><span class="on">Any cards</span><span>Only cards I own</span></div><p class="fcap">Owned or not. The budget caps what you’d buy.</p></div>'
            '<div class="fld"><span class="fl">Budget</span><div class="inp">No cap</div><p class="fcap">The most you would spend on cards you don’t own. It caps the fill and never ranks.</p></div>'
            '<div class="fld"><span class="fl">Bracket</span><div class="segs"><span class="on">Any</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div><p class="fcap">No preference: every bracket.</p></div>'
            f'<div class="fld"><span class="fl">Anything else?<i>optional</i></span><div class="ta">{words}</div>'
            f'<p class="fcap">{caption}</p>{gm_field}</div><div style="height:180px"></div></div>')
        spent = "Won’t be read: 0 of 5 left · reset at 2:01 AM."
        gm_dock = '<span class="gm">Get more credits<i>→</i></span>' if shipped else ""
        dock = (f'<div class="dock" data-dock="1"><span class="press">Find commanders</span><p class="dline">{spent}</p>{gm_dock}</div>')
        return phone("amonkhet", fields, h=844, over=dock, top=top, check=f"hmc-{top}-{shipped}")
    words = "something scary and a little nasty"
    s10 = sec("10", "Help me choose at 390, out of credits: Get more credits moves from the dock to the box", "call",
              "With L4’s <code>Get more credits →</code> the phone’s dock measures 138px here (Hugh’s reading, about 145) and covers whichever field passes under it, Sets in the report. "
              "My call: on the phone, the dock keeps the press and its line, and <code>Get more credits →</code> moves under the <em>Anything else?</em> box, "
              "after <code>Kept here for when a credit comes back.</code> That is where the credit is missing: the only words a credit buys here are in that box. "
              "The dock drops to 92px. No new string; desktop is unchanged (its line sits beside the press, nothing docks).",
              '<div class="frames" style="gap:28px">'
              + frame("390 · shipped, mid-form", form(200, words, True), "The dock, 138px: the press, the spent line, then a 44px <code>Get more credits →</code>.")
              + frame("390 · proposed, mid-form", form(200, words, False), "The same scroll: the dock is the press and its line, and 46px more of the form shows.")
              + frame("390 · proposed, at the box", form(620, words, False), "Under the box, its spent caption, then <code>Get more credits →</code> at 44px, left-aligned with the field.")
              + '</div>',
              "Held: <code>Get more credits</code> stays its own line directly under a line that says nothing can be spent (the box’s caption), as README’s placement call says, "
              "and shows only while payments are on, as today. If Hugh would rather keep it in the dock, the alternative is the link at 32px there "
              "(dock 126px), which still covers most of Sets.")
    body = head("Buying credits · R3 addendum · items 9, 10", "The credit line in Help me choose",
                "Drawn over <code>intake-form.tsx</code> as built: the desktop footer with its 380px line, and the phone’s fixed dock above the tab bar.") + s9 + s10
    return doc("Buying credits R3 · the credit line", body, 2200, 2500)


BOARDS = {"Credits-Pack": b_pack, "Credits-Balance": b_balance, "Credits-Chip": b_chip, "Credits-Line": b_line}
