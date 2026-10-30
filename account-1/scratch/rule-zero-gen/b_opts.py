"""R2 - Desktop-Options: two ways to stop uneven seat heights on desktop, side by side (Hugh's note on D7)."""
from comps import *
import comps

PH, DH = {}, {}

OPT_CSS = r"""
.drows{display:flex;flex-direction:column;gap:10px}
.srw{position:relative;border-radius:12px;border:1px solid var(--border-strong);background:var(--surface-rail);overflow:hidden}
.srw.you{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.srw.flag{border-color:color-mix(in oklab,var(--flag) 70%,transparent)}
.srw.you.flag{border-color:var(--accent)}
.srw .wash{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.srw .wash img{position:absolute;inset:-30px;width:calc(100% + 60px);height:calc(100% + 60px);object-fit:cover;filter:blur(30px) saturate(1.2);opacity:.18}
.srw .main{position:relative;display:grid;grid-template-columns:96px minmax(0,1fr) 196px 236px;align-items:center;gap:16px;padding:10px 14px 10px 10px;min-height:88px}
.srw .art{width:96px;height:68px;border-radius:9px;overflow:hidden;box-shadow:0 8px 18px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.08)}
.srw .art img{width:100%;height:100%;object-fit:cover;display:block}
.srw .who{display:flex;flex-direction:column;gap:3px;min-width:0}
.srw .nm{display:flex;align-items:baseline;gap:7px;font:600 15px 'IBM Plex Sans',sans-serif}
.srw .nm small{font:10px 'IBM Plex Mono',monospace;font-weight:400;color:var(--fg-muted)}
.srw .nm .yt{font:500 9.5px 'IBM Plex Mono',monospace;letter-spacing:.12em;color:var(--accent)}
.srw .dkn{font-size:13.5px;color:var(--fg-body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.srw .cm{font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.srw .br{display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:0}
.srw .br .sub{font:10px 'IBM Plex Mono',monospace;color:var(--fg-faint);line-height:1.4}
.srw .rt{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.srw .more{position:relative;display:flex;flex-direction:column;gap:10px;padding:0 14px 12px 122px}
.srw .why,.srw .sug,.srw .wait{margin:0}
.srw .why{padding:10px 12px;border-radius:9px;background:color-mix(in srgb,var(--flag) 9%,var(--surface-sunken));border:1px solid color-mix(in oklab,var(--flag) 35%,transparent);font-size:13px;line-height:1.55;color:var(--fg-body)}
.srw .why b{color:var(--fg);font-weight:600}
.srw .ctl{position:relative;display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:0 14px 6px 122px;margin-top:-6px}
.dseats.eq{align-items:stretch}
.dseats.eq .seat{display:flex;flex-direction:column}
.reasons{display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:1px solid var(--border)}
.rsn{display:flex;gap:10px;align-items:flex-start;padding:10px;border-radius:9px;background:color-mix(in srgb,var(--flag) 9%,var(--surface-sunken));border:1px solid color-mix(in oklab,var(--flag) 35%,transparent);font-size:12.5px;line-height:1.55;color:var(--fg-body)}
.rsn b{color:var(--fg);font-weight:600}
.rsn .face{width:26px;height:26px}
.optlab{display:flex;align-items:baseline;gap:12px}
.optlab b{font:700 22px 'Chakra Petch',sans-serif}
.optlab span{font-size:13.5px;color:var(--fg-muted)}
"""

def seat_row(s):
    """Option A: one full-width row per seat. Extras open below the row, across its width."""
    flagcls = {"hi": " flag hi", "lo": " flag lo", "sp": " flag sp"}.get(s["flag"] or "", "")
    cls = "srw" + (" you" if s["you"] else "") + flagcls
    name = "You" if s["you"] else s["who"]
    tag = f'<small>{s["tag"]}</small>' if s["tag"] else ""
    you = '<span class="yt">YOU</span>' if s["you"] else ""
    sub = ""
    if s["ans"]:
        sub = f'declared {NAMES[s["ans"]]} · reads {" or ".join(NAMES[b] for b in s["permits"])}'
    elif s["drift"]:
        sub = f'declared {NAMES[s["drift"]]}, outside this reading<br>measured from {NAMES[s["permits"][0]]}'
    elif len(s["permits"]) == 2:
        sub = f'not declared · measured from {NAMES[s["permits"][0]]}'
    br = f'<span class="br">{chip(s["permits"], s["ans"])}' + (f'<span class="sub">{sub}</span>' if sub else "") + '</span>'
    rt = f'<span class="rt">{flagtag(s["flag"]) if s["flag"] else ""}{facts(s["f"], s["drivers"])}</span>'
    main = (f'<div class="main"><span class="art"><img src="art/{s["art"]}.jpg" alt=""></span>'
            f'<span class="who"><span class="nm">{name}{you}{tag}</span><span class="dkn">{s["deck"]}</span><span class="cm">{s["cmd"]}</span></span>{br}{rt}</div>')
    more = []
    if s["why"]:
        more.append(f'<div class="why">{s["why"]}</div>')
    if s["sug"]:
        more.append(s["sug"])
    more_html = f'<div class="more">{"".join(more)}</div>' if more else ""
    ctl = ""
    if s["own"] or s["changed"]:
        chg = f'<span class="chg" style="margin-right:auto"><i></i>{s["changed"]}</span>' if s["changed"] else ""
        btn = '<button class="lnk" type="button" style="min-height:36px;font-size:13px">Change deck</button>' if s["own"] else ""
        ctl = f'<div class="ctl">{chg}{btn}</div>'
    wash = f'<span class="wash" aria-hidden="true"><img src="art/{s["art"]}.jpg" alt=""></span>'
    return f'<article class="{cls}" aria-label="{name}’s seat">{wash}{main}{more_html}{ctl}</article>'

def desk_head(meta, setter):
    right = '<button class="btn gho sm" type="button">Seats</button>' if setter else ""
    m = META[meta].replace("<br>", " · ")
    return f'<div class="dph"><div><div class="bk">‹ Friends</div><h1>Rule 0 check</h1><div class="meta">{m}</div></div>{right}</div>'

def desk_A(seats, rd, meta="colin", av="HH", h=1000):
    body = (desk_head(meta, meta.startswith("you") or meta.endswith("you")) +
            f'<div class="dbody"><div class="drows">{"".join(seat_row(s) for s in seats)}</div>'
            f'<div class="dside">{rd}<button class="btn gho full" type="button">Log this game</button></div></div>')
    return desk(body, h=h, av=av)

def reasons_block(seats):
    items = []
    for s in seats:
        if s["why"]:
            nm = "Your" if s["you"] else s["who"] + "’s"
            items.append(f'<div class="rsn {s["flag"]}">{face(s["art"], "flag " + s["flag"])}<span><b>{nm} {s["deck"]}.</b> {s["why"].replace("<b>What puts it here:</b> ", "")}</span></div>')
    return f'<div class="reasons">{"".join(items)}</div>' if items else ""

def desk_B(seats, rd_args, meta="colin", av="HH", h=1000, own_sug=None):
    head, body, band = rd_args
    plain = [dict(s, why="", sug=None) for s in seats]
    extra = reasons_block(seats)
    rd = read(head, body, seats, band, extra=extra)
    side = rd
    if own_sug:
        side = own_sug.replace('class="sug"', 'class="sug" style="margin:0"') + rd
    b = (desk_head(meta, meta.startswith("you") or meta.endswith("you")) +
         f'<div class="dbody"><div class="dseats eq">{"".join(seat(s, True) for s in plain)}</div>'
         f'<div class="dside">{side}<button class="btn gho full" type="button">Log this game</button></div></div>')
    return desk(b, h=h, av=av)

def cases():
    C = []
    s = [S("You", "ghalta", own=True), S("Colin", "zimone", permits=[4, 5], drift=1, flag="hi", why=ZIMONE_WHY, drivers=("twoCardCombos", "tutors")),
         S("Peter", "ashling"), S("Max", "gisa", tag="not a friend")]
    C.append(("1 · D7, the case you flagged: one high seat with a reason", s,
              ('Colin’s Zimone Combo reads <span class="hiw">above the table</span>.',
               "The table sits at <b>Upgraded</b>; Zimone Combo reads <b>Optimized or cEDH</b>. Colin’s declared Exhibition is from before its last reading, so it settles nothing.", (3, 3)),
              "colin", "HH", None))
    s = [S("You", "zimone", own=True, flag="hi", why=ZIMONE_WHY, drivers=("twoCardCombos", "tutors"), sug=sugbox(["sai", "jace"])),
         S("Peter", "ashling"), S("Max", "gisa")]
    C.append(("2 · W1, the tallest seat: your own flagged deck with the suggestion", s,
              ('Your Zimone Combo reads <span class="hiw">above the table</span>.',
               "The table sits at <b>Upgraded</b>; Zimone Combo reads <b>Optimized</b>. You have decks that sit closer.", (3, 3)),
              "c3you", "CO", sugbox(["sai", "jace"])))
    s = [S("You", "ghalta", own=True), S("Colin", "zimone", flag="hi", why=ZIMONE_WHY, drivers=("twoCardCombos", "tutors")),
         S("Peter", "giada", flag="lo", why=GIADA_WHY), S("Max", "gisa", tag="not a friend")]
    C.append(("3 · D4, two reasons at once", s,
              ("Two decks sit off the table, one each way.",
               "The middle is <b>Upgraded</b>. Colin’s Zimone Combo reads <b>Optimized</b>, Peter’s Giada Angels reads <b>Core</b>.", (3, 3)),
              "colin", "HH", None))
    return C

def board_desk():
    rows = []
    for lab, s, (hd, bd, band), meta, av, own_sug in cases():
        la, lb = f"A{lab[0]} · one seat per row", f"B{lab[0]} · two across, extras in the read column"
        a = frame(la, desk_A(s, read(hd, bd, s, band), meta=meta, av=av, h=DH.get(la, 1000)),
                  "Each seat is one full-width row; its reason and, on your own flagged seat, the suggestion open under it across the row. Nothing sits beside a taller seat, so no gap.", width=1300)
        b = frame(lb, desk_B(s, (hd, bd, band), meta=meta, av=av, h=DH.get(lb, 1000), own_sug=own_sug),
                  "Seats stay two across at one height: the card carries the chip, the counts with the drivers lifted, and the tag. The reasons move into the read; your own suggestion sits at the top of the right column.", width=1300)
        rows.append(f'<div class="sec"><h3>{lab}</h3><div class="frames">{a}{b}</div></div>')
    body = ('<div class="bh"><span class="k">R2 · Rule 0 check · desktop seat layout · two options for Hugh’s note on D7 · not a pick until Hugh says so</span>'
            '<h2>A: one seat per row  ·  B: two across, reasons and the offer in the read column</h2>'
            '<p class="cap" style="max-width:2500px">The same three tables drawn both ways. A keeps every seat’s reason and offer on the seat and avoids the gap by never putting two seats side by side. '
            'B keeps the two-across grid at one height by moving the reasons into the read and the flagged player’s offer to the top of the right column. The phone is unchanged either way.</p></div>'
            + "".join(rows))
    return doc("Rule 0 check, desktop seat options", body, 2760, 3000).replace("</style>", OPT_CSS + "</style>", 1)
