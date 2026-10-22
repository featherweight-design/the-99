"""Combos one piece away R1 (account 2, 2026-10-22). Drawn with the deck messages kit (kit, pieces, alts, a2, a3, sh),
Low Sun tokens. Real cards are cropped from Hugh's screenshots (Avatar Aang, Searing Touch, Polyraptor); every combo
named is a real Commander Spellbook pair. Words are placeholders for /copy-review."""
import kit
from kit import doc, board_head, frame
import pieces as P
import alts as A
import a2, a3, sh

kit.LOCAL.update({"aang": "art/aang-hero.jpg", "c-aang": "art/card-avatar-aang.jpg",
                  "c-searing": "art/card-searing-touch.jpg", "c-poly": "art/card-polyraptor.jpg"})

LEM = ('<svg width="{s}" height="{s}" viewBox="0 0 16 16" class="lem" aria-hidden="true"><path d="M5.2 4.9 A 3.1 3.1 0 1 0 5.2 11.1 '
       'C 8.3 11.1 7.7 4.9 10.8 4.9 A 3.1 3.1 0 1 1 10.8 11.1 C 7.7 11.1 8.3 4.9 5.2 4.9 Z" fill="none" stroke="currentColor" '
       'stroke-width="1.8" stroke-linecap="round"/></svg>')
TURN = ('<svg width="{s}" height="{s}" viewBox="0 0 16 16" class="lem" aria-hidden="true"><path d="M10.98 3.74 A 5.2 5.2 0 1 1 6.65 2.98" '
        'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.0 2.4 L7.1 4.6 L6.2 1.3 Z" fill="currentColor"/></svg>')


def lem(s=16):
    return LEM.format(s=s)


def turn(s=16):
    return TURN.format(s=s)


kit.CSS += r"""
.lem{display:block;flex:none;color:var(--fact);filter:drop-shadow(0 0 3px color-mix(in oklab,var(--fact) 45%,transparent))}
.cbs{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.cbs .lem{display:inline-block}
.sl .cbs,.t2 .ft .cbs{color:var(--fg-body);border-bottom:1px dotted var(--fg-faint)}
.cbs .go{color:var(--fg-faint);margin-left:2px}
.hl{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}
/* one-away list */
.oa{display:flex;flex-direction:column;gap:6px;padding:10px 12px 12px}
.oa h5{margin:8px 0 2px 2px;font:600 13px 'IBM Plex Sans';display:flex;gap:8px;align-items:baseline;color:var(--fg)}
.oa h5:first-child{margin-top:0}
.oa h5 em{font:normal 10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.or{display:flex;align-items:flex-start;gap:10px;padding:10px 4px 10px 11px;border-radius:9px;background:var(--surface-rail);position:relative}
.or .gl{flex:none;display:flex;flex-direction:column;gap:5px;padding-top:2px}
.or .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.or .n{font-size:14px;font-weight:600;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.or .w{font-size:12.5px;line-height:1.4;color:var(--fg-body)}
.or .w b{font-weight:500;color:var(--fg)}
.or .w .cz{font:10px 'IBM Plex Mono';color:var(--fg-faint);margin-left:4px}
.or .s{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font:10.5px 'IBM Plex Mono';color:var(--fg-body);margin-top:2px}
.or .pr{font:9px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint)}
.or .cv{flex:none;align-self:center;width:28px;text-align:center;color:var(--fg-faint);font-size:15px}
.or.press{outline:2px solid var(--accent);outline-offset:1px}
.od{width:8px;height:8px;border-radius:50%;background:var(--success);flex:none;display:inline-block}
.od.no{background:transparent;border:1.5px dashed var(--fg-locked)}
.dlk{color:var(--fg-body);text-decoration:underline;text-decoration-color:var(--border-strong);text-underline-offset:2px;padding:12px 0;margin:-12px 0}
.dlk.hit{outline:2px solid var(--accent);outline-offset:2px;border-radius:3px;padding:0;margin:0}
.btag{font:10px 'IBM Plex Mono';color:var(--warning);border:1px solid var(--accent-shadow);border-radius:4px;padding:0 5px;line-height:15px}
.oa .qf{font:10.5px/1.5 'IBM Plex Mono';color:var(--fg-faint);padding:4px 4px 0}
/* desktop rows: one line */
.md2 .or{align-items:center;padding:0 6px 0 14px;min-height:44px;gap:12px}
.md2 .or .gl{flex-direction:row;padding:0;width:38px}
.md2 .or .tx{flex-direction:row;align-items:baseline;gap:12px}
.md2 .or .n{flex:none;font-size:13.5px}
.md2 .or .w{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12.5px}
.md2 .or .s{margin:0;flex:none;flex-wrap:nowrap}
.md2 .or .s .wh{width:190px;display:inline-flex;align-items:center;gap:7px}
.md2 .or .pr{width:190px;text-align:right;white-space:nowrap}
.md2 .or .w{min-width:200px}
.md2{width:900px!important}
/* empty sheet */
.emp{margin:18px 14px 6px;border:1px dashed var(--border-dashed);border-radius:10px;padding:18px 16px;text-align:center;font-size:13px;line-height:1.55;color:var(--fg-muted)}
.emp b{display:block;color:var(--fg);font-weight:600;font-size:14px;margin-bottom:4px}
/* the combo detail (ComboBody, shipped) pushed inside the sheet */
.bk2{display:flex;align-items:center;gap:8px;min-height:52px;padding:0 8px 0 16px;border-bottom:1px solid var(--border);font:500 13.5px 'IBM Plex Sans';color:var(--fg)}
.bk2 .ar{font-size:16px;color:var(--fg-muted)}
.bk2 .x{margin-left:auto;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted)}
.cbd{display:flex;flex-direction:column;gap:14px;padding:14px 16px}
.cbd .pls{display:flex;gap:7px}
.pl{width:96px;display:flex;flex-direction:column;gap:5px}
.pl img{width:96px;height:134px;border-radius:6px;border:1px solid var(--border-strong);display:block;object-fit:cover}
.pl .pn{font-size:11px;line-height:1.3;color:var(--fg-body)}
.pl .ps{display:flex;align-items:center;gap:6px;font:10px 'IBM Plex Mono';color:var(--fg-body);flex-wrap:wrap}
.pl.miss img{outline:1.5px dashed var(--accent);outline-offset:2px}
.cbd .bd{display:flex;flex-direction:column;gap:11px;min-width:0;flex:1}
.cbd h3{margin:0;font:700 16px/1.25 Cinzel,serif;color:var(--fg);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cbd h3 .pl2{color:var(--fg-faint);font-weight:400}
.chp{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}
.chp li{font:9.5px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;border-radius:5px;border:1px solid var(--border-strong);padding:4px 9px;color:var(--fg-body)}
.fld{display:flex;flex-direction:column;gap:5px}
.fld>span:first-child{font:9px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.fld p,.fld li{font-size:12.5px;line-height:1.5;color:var(--fg-muted)}
.fld ol{margin:0;padding-left:17px;display:flex;flex-direction:column;gap:5px}
.fld .mv{font:12px 'IBM Plex Mono';color:var(--fg-body)}
.cft{display:flex;align-items:center;gap:12px;border-top:1px solid var(--border);padding:10px 16px 12px;flex-wrap:wrap}
.cft .a{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.cft .sb{margin-left:auto;display:inline-flex;align-items:center;min-height:44px;font:10.5px 'IBM Plex Mono';color:var(--accent);text-decoration:underline;text-decoration-color:var(--accent);text-underline-offset:3px}
.addb{display:flex;align-items:center;justify-content:center;height:44px;border-radius:9px;border:1px solid var(--border-strong);color:var(--fg);font:600 13.5px 'IBM Plex Sans'}
.md .cbd{flex-direction:row;gap:18px;padding:16px 18px}
.md .cbd .pls{flex:none;align-self:flex-start}
/* phone card details, full sheet (shipped CardModal at snap=full) */
.cdf{position:absolute;left:0;right:0;top:40px;bottom:0;z-index:40;background:var(--surface);border-radius:18px 18px 0 0;border-top:1px solid var(--border-strong);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -14px 40px rgba(0,0,0,.6)}
.cdf .gr{width:40px;height:4px;border-radius:9px;background:var(--border-strong);margin:8px auto 4px;flex:none}
.cdf .in{padding:6px 20px 0;display:flex;flex-direction:column}
.nm2{display:flex;align-items:flex-start;gap:10px}
.nm2 h3{flex:1;margin:0;font:700 22px/1.2 Cinzel,serif;color:var(--fg)}
.cpip{display:inline-flex;gap:4px}
.cpip i{width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font:600 12px 'IBM Plex Mono';font-style:normal;color:#14110E}
.tl2{font-size:13.5px;color:var(--fg-muted);margin-top:4px}
.mt2{display:flex;align-items:center;gap:12px;margin-top:12px;font:12px 'IBM Plex Mono';color:var(--fg-muted)}
.ptag2{font:11.5px 'IBM Plex Mono';color:var(--warning);border:1px solid var(--accent-shadow);border-radius:6px;padding:3px 8px}
.blk2{margin-top:16px;border-radius:10px;background:var(--bg);border:1px solid var(--border);padding:14px 16px}
.blk2 .h{font:10px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint)}
.blk2 .ot{font-size:13.5px;line-height:1.6;color:var(--fg-body)}
.blk2 .ot b{color:var(--fg)}
.cbk .hr{display:flex;align-items:center;gap:10px;min-height:40px}
.cbk .hr .sc{font:10px 'IBM Plex Mono';color:var(--fg-locked);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cbk .hr .st{font:11px 'IBM Plex Mono';color:var(--accent);width:28px;text-align:center}
.cbk .hr .ch{color:var(--fg-faint);font-size:12px}
.cbk .sum{font:10.5px 'IBM Plex Mono';color:var(--fg-muted);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cbk ul{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column}
.cbk li{display:flex;align-items:center;gap:10px;min-height:44px;border-top:1px solid var(--border)}
.cbk li .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.cbk li .t .p1{font-size:13px;color:var(--fg-body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cbk li .t .p1 b{font-weight:600;color:var(--fg)}
.cbk li .t .p2{display:flex;align-items:center;gap:7px;font:10px 'IBM Plex Mono';color:var(--fg-body)}
.cbk li .t .p2 .ok{color:var(--success)}
.cbk li .cv{color:var(--fg-faint);width:20px;text-align:center}
.cbk li.press{outline:2px solid var(--accent);outline-offset:2px;border-radius:6px}
.cbk .gh{font:9px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);padding:10px 0 4px}
.cbk .gh+li{border-top:0}
/* desktop card modal (shipped 2-column) */
.cmx{position:absolute;z-index:41;left:50%;top:40px;transform:translateX(-50%);width:1000px;background:var(--surface);border:1px solid var(--border-strong);border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.65);display:flex;overflow:hidden}
.cmx .lc{width:340px;flex:none;background:color-mix(in srgb,var(--bg) 55%,var(--surface));display:flex;flex-direction:column;align-items:center;gap:12px;padding:56px 0 30px;border-right:1px solid var(--border)}
.cmx .lc img{width:260px;height:363px;border-radius:12px;display:block;box-shadow:0 14px 30px rgba(0,0,0,.5)}
.cmx .lc small{font:11.5px 'IBM Plex Mono';color:var(--fg-faint)}
.cmx .rc3{flex:1;min-width:0;padding:30px 30px 22px;display:flex;flex-direction:column}
.cmx .x2{width:40px;height:40px;border-radius:50%;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;color:var(--fg-muted);flex:none}
.cmx .nm2 h3{font-size:30px}
.cmx .blk2{margin-top:20px;padding:18px 20px}
.cmx .blk2 .ot{font-size:15px}
.cmx .ftl{margin-top:auto;padding-top:18px;display:flex;align-items:center;gap:18px;font-size:14px}
.cmx .ftl a{color:var(--accent);text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--accent-shadow)}
.cmx .ftl .pn{margin-left:auto;font:12px 'IBM Plex Mono';color:var(--fg-faint)}
.scrimd{position:absolute;inset:0;background:rgba(8,6,5,.86);z-index:39}
/* small helpers */
.tagnew{font:600 9px 'IBM Plex Mono';letter-spacing:.06em;color:#14110E;background:var(--accent);border-radius:4px;padding:2px 5px;margin-left:8px;vertical-align:2px}
.cmp2{display:grid;grid-template-columns:repeat(3,390px) minmax(0,1fr);gap:36px;align-items:start}
.tbl{width:100%;border-collapse:collapse;font-size:12.5px;color:var(--fg-body)}
.tbl th{text-align:left;font:500 10px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint);padding:6px 10px;border-bottom:1px solid var(--border-strong)}
.tbl td{padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:top;line-height:1.5}
.tbl td b{color:var(--fg)}
.callg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.pk{display:inline-block;font:600 10px 'IBM Plex Mono';letter-spacing:.06em;border-radius:4px;padding:2px 6px;margin-right:6px;background:var(--accent);color:#14110E}
.pk.o{background:#3a3229;color:var(--fg-body)}
"""

# ------------------------------------------------------------------------------------------------ fixtures
DECK = dict(name="HD - Avatar Aang", cmd="Avatar Aang // Aang, Master of Elements", color="5-color", pips=["w", "u", "b", "r", "g"],
            art="aang", status="Complete", built=99, bracket=("b3", "Upgraded", "var(--bracket-3)"))
DECK_BLD = dict(DECK, status="Building", built=95)

# (missing piece, partners in deck, commander?, where, where detail, produces, loop?)
COMBOS = [
    ("Exquisite Blood", "Sanguine Bond", False, "spare", None, "Infinite lifeloss", False),
    ("Heliod, Sun-Crowned", "Walking Ballista", False, "deck", "HD - Gods", "Infinite damage", False),
    ("Searing Touch", "Avatar Aang", True, "buy", "$1.49", "Infinite damage", False),
    ("Kiki-Jiki, Mirror Breaker", "Zealous Conscripts", False, "buy", "$34.80", "Infinite creature tokens", False),
    ("Time Vault", "Voltaic Key", False, "buy", "$1,150", "Infinite turns", True),
]
ONE = [COMBOS[2]]


def where(kind, det, hit=False):
    if kind == "spare":
        return '<span class="od"></span><span>spare in your collection</span>'
    if kind == "deck":
        return f'<span class="od"></span><span>in <span class="dlk{" hit" if hit else ""}">{det}</span></span>'
    return f'<span class="od no"></span><span class="btag">{det}</span>'


def orow(c, press=False, hit=False):
    name, partner, cmdr, kind, det, prod, loop = c
    gl = lem() + (turn() if loop else "")
    cz = '<span class="cz">commander</span>' if cmdr else ""
    return (f'<div class="or{" press" if press else ""}"><span class="gl">{gl}</span><div class="tx"><span class="n">{name}</span>'
            f'<span class="w">with <b>{partner}</b>{cz}</span>'
            f'<span class="s"><span class="wh" style="display:inline-flex;align-items:center;gap:7px">{where(kind, det, hit)}</span><span class="pr">{prod}</span></span>'
            f'</div><span class="cv">›</span></div>')


def olist(combos, press=None, hit=None):
    own = [c for c in combos if c[3] != "buy"]
    buy = [c for c in combos if c[3] == "buy"]
    out = []
    if own:
        out.append(f'<h5>You own it<em>{len(own)}</em></h5>' + "".join(orow(c, c[0] == press, c[0] == hit) for c in own))
    if buy:
        out.append(f'<h5>To buy<em>{len(buy)}</em></h5>' + "".join(orow(c, c[0] == press, c[0] == hit) for c in buy))
    return '<div class="oa">' + "".join(out) + '<p class="qf">From Commander Spellbook. Two-card combos legal in this deck’s colors.</p></div>'


def seg(n, hl=False):
    word = "combo" if n == 1 else "combos"
    return (f'<span class="ds cbs{" hl" if hl else ""}" style="border-bottom:1px dotted var(--fg-faint)">{lem(13)}{n} {word} one piece away<span class="go">›</span></span>')


def quiet(n=5, hl=False, desk=False):
    segs = '<span>v2 · committed 16 Sep 2026</span>'
    if n:
        segs += f'<span class="sep">·</span>{seg(n, hl)}'
    return f'<div class="sl"><div>{segs}</div></div>'


def todo(n=5, hl=False, desk=False):
    r = a2.row("a", "±", f"4 changes since v2 {a2.PM(3, 1)}", "Commit them as v3 in Review.", "Review", True)
    sep = '<span class="sep">·</span>'
    ft = '<span>v2</span>' + (f'{sep}{seg(n, hl)}' if n else "")
    return (f'<div class="t2"><div class="th"><span class="e">Before HD - Avatar Aang is ready</span><span class="n">1 to do</span></div>'
            f'{r}<div class="ft">{ft}</div></div>')


AROWS = [("Appa, Steadfast Guardian", ["c2", "w", "w"], True), ("Momo, Playful Pet", ["w"], True),
         ("Walking Ballista", ["c0"], True), ("Zealous Conscripts", ["c4", "r"], True), ("Sokka, Tenacious Tactician", ["c1", "u", "r", "w"], True)]


def alist(desk=False):
    rows = "".join(f'<div class="row"><span class="ow{"" if own else " no"}"></span><span class="nm">{n}</span>{P.mana(ps)}<span class="x">✕</span></div>'
                   for n, ps, own in (AROWS if desk else AROWS[:4]))
    if desk:
        return ('<div class="dtool"><span class="sg"><span class="on">All<em>99</em></span><span style="color:var(--accent)">Shopping<em>0</em></span>'
                f'<span>Stats</span><span>Notes<em>2</em></span></span></div><div class="dgrp"><h4>Creatures<em>28</em></h4>{rows}</div>')
    return ('<div class="seg"><span class="on">All<em>99</em></span><span class="sh">Shopping<em>0</em></span><span>Stats</span><span>Notes<em>2</em></span></div>'
            f'<div class="grp"><h4>Creatures<em>28</em></h4>{rows}</div>')


CELLS = [("Ramp", 12, 10, None), ("Draw", 11, 10, None), ("Removal", 9, 8, None), ("Wipes", 2, 2, None), ("Land", 36, 36, None)]


def page_phone(block, h=None):
    d = DECK
    inner = P.phone_header(d) + block + P.mix(cells=CELLS, phone_parity=True) + P.tabs(built=99) + alist()
    ph = P.phone(inner, None)
    if h:
        ph = ph.replace('<div class="ph">', f'<div class="ph" style="height:{h}px">', 1)
    return ph


def page_desk(block, h=None):
    inner = P.desk_header(DECK) + block + P.mix(desk=True, cells=CELLS) + P.dtabs(built=99) + alist(True)
    dk = P.desk(inner, None)
    if h:
        dk = dk.replace('<div class="dk">', f'<div class="dk" style="height:{h}px">', 1)
    return dk


def overlay_phone(base, ov):
    return f'<div class="scr">{base[:-6]}{ov}</div></div>'


HD_MANY = ('<div class="hd2"><div class="tt"><div class="ey">One piece away</div><h3>5 combos</h3>'
           '<p>Each needs one more card in HD - Avatar Aang. Here’s where that card is.</p></div><span class="x">✕</span></div>')
HD_ONE = ('<div class="hd2"><div class="tt"><div class="ey">One piece away</div><h3>1 combo</h3>'
          '<p>It needs one more card in HD - Avatar Aang. Here’s where that card is.</p></div><span class="x">✕</span></div>')
HD_ZERO = ('<div class="hd2"><div class="tt"><div class="ey">One piece away</div><h3>No combos</h3>'
           '<p>HD - Avatar Aang has none one piece away now.</p></div><span class="x">✕</span></div>')


def sheet_phone(combos=COMBOS, press=None, hit=None, head=None, body=None, top=None, base_block=None):
    head = head or (HD_ONE if len(combos) == 1 else HD_MANY)
    body = body or olist(combos, press, hit)
    base = page_phone(base_block or quiet(len(combos) or 1), 844)
    tp = f' style="top:{top}px"' if top else ""
    ov = (f'<div class="scrim"></div><div class="bs"{tp}><span class="gr"></span>{head}{body}'
          f'<div class="sf"><span class="p">Done</span></div></div>')
    return overlay_phone(base, ov)


def sheet_empty():
    body = ('<div class="emp"><b>Nothing one piece away now</b>Adding Searing Touch made the last one whole. '
            'Its ∞ is on the row in Your deck.</div>')
    return sheet_phone([], head=HD_ZERO, body=body, base_block=quiet(0))


# ------------------------------------------------------------------------------------------------ combo detail
STEPS_AANG = ["With Aang, Master of Elements on the battlefield, cast Searing Touch with buyback. Aang makes it cost {W}{U}{B}{R}{G} less, so it costs nothing.",
              "Searing Touch deals 1 damage to any target and goes back to your hand.",
              "Repeat as many times as you like."]


def plate(img_key, name, state, miss=False):
    return (f'<div class="pl{" miss" if miss else ""}"><img alt="{name}" src="{kit.img(img_key)}"><span class="pn">{name}</span>'
            f'<span class="ps">{state}</span></div>')


def combo_body(desk=False, own=False):
    p1 = plate("c-aang", "Avatar Aang", '<span class="od"></span><span style="color:var(--success)">in this deck</span>')
    st2 = ('<span class="od"></span><span>spare</span>' if own else '<span class="od no"></span><span class="btag">$1.49</span>')
    p2 = plate("c-searing", "Searing Touch", st2, miss=True)
    steps = "".join(f"<li>{s}</li>" for s in STEPS_AANG)
    return (f'<div class="cbd"><div class="pls">{p1}{p2}</div><div class="bd">'
            f'<h3>{lem()}Avatar Aang<span class="pl2"> + </span>Searing Touch</h3>'
            '<ul class="chp"><li>Infinite damage</li><li>Infinite storm count</li></ul>'
            '<div class="fld"><span>Mana needed</span><span class="mv">No mana needed</span></div>'
            f'<div class="fld"><span>Steps</span><ol>{steps}</ol></div>'
            '<div class="fld"><span>Needs</span><p>Avatar Aang transformed into Aang, Master of Elements.</p></div>'
            '</div></div>')


def combo_foot(own=False, desk=False):
    add = "Add Searing Touch" if own else "Add Searing Touch · to buy"
    return (f'<div class="cft"><span class="a">one piece away · Searing Touch is the missing piece</span>'
            '<span class="sb">Commander Spellbook ↗</span></div>'
            f'<div style="padding:0 16px 22px"><span class="addb">{add}</span></div>')


def detail_phone(own=False):
    base = page_phone(quiet(5), 844)
    ov = ('<div class="scrim"></div><div class="bs"><span class="gr"></span>'
          '<div class="bk2"><span class="ar">←</span>5 combos<span class="x">✕</span></div>'
          f'{combo_body(own=own)}{combo_foot(own)}</div>')
    return overlay_phone(base, ov)


def card_over_detail():
    """A plate pressed: the shipped card details, stacked on the sheet (registerSheet), close reads ← the combo."""
    base = page_phone(quiet(5), 844)
    ov = ('<div class="scrim"></div><div class="bs" style="top:44px"><span class="gr"></span>'
          '<div class="bk2"><span class="ar">←</span>5 combos<span class="x">✕</span></div>'
          f'{combo_body()}</div>'
          '<div class="cs"><div class="bk"><span class="ar">←</span>Avatar Aang + Searing Touch</div>'
          f'<div class="art"><img alt="Searing Touch" src="{kit.img("c-searing")}" style="width:220px;height:307px"><span class="ptag">$1.49</span></div>'
          '<div class="nmb"><h3>Searing Touch</h3><span class="tl">Instant · R</span></div>'
          '<div class="sec2"><b>Rules text</b>Buyback {4}. Searing Touch deals 1 damage to any target.</div></div>')
    return overlay_phone(base, ov)


def page_desk_ov(block, ov, h=900):
    dk = page_desk(block, h)
    return dk[:-6] + ov + "</div>"


def modal_list(combos=COMBOS, hit=None):
    hd = HD_ONE if len(combos) == 1 else HD_MANY
    return page_desk_ov(quiet(len(combos)), f'<div class="scrim"></div><div class="md md2">{hd}{olist(combos, hit=hit)}'
                        '<div class="sf"><span class="sp"></span><span class="p">Done</span></div></div>')


def modal_detail():
    ov = ('<div class="scrim"></div><div class="md" style="width:760px"><div class="bk2"><span class="ar">←</span>5 combos<span class="x">✕</span></div>'
          f'{combo_body(True)}<div class="cft"><span class="a">one piece away · Searing Touch is the missing piece</span>'
          '<span class="addb" style="height:36px;padding:0 16px;margin-left:12px">Add Searing Touch · to buy</span>'
          '<span class="sb">Commander Spellbook ↗</span></div></div>')
    return page_desk_ov(quiet(5), ov)


# ------------------------------------------------------------------------------------------------ card details
POLY = [("in", "Marauding Raptor", None), ("in", "Forerunner of the Empire", None),
        ("spare", "Where Ancients Tread", None), ("deck", "Warstorm Surge", "HD - Tovolar"),
        ("buy", "Terror of the Peaks", "$34.20"), ("buy", "Pandemonium", "$3.10")]


def pstate(kind, det):
    if kind == "in":
        return '<span class="od"></span><span class="ok">in this deck</span>'
    return where(kind, det)


def combos_block(open_=True, press=None, desk=False):
    if not open_:
        return ('<div class="blk2 cbk"><div class="hr">' + lem() +
                '<span style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:0"><span class="h">Two-card combos</span>'
                '<span class="sum"><span style="color:var(--success)">2 in this deck</span> · 2 you own · 2 you don’t</span></span>'
                '<span class="ch">▾</span></div></div>')
    groups = [("Whole in this deck", [p for p in POLY if p[0] == "in"]),
              ("One piece away · you hold the rest", [p for p in POLY if p[0] != "in"])]
    lis = ""
    for gh, ps in groups:
        lis += f'<li class="gh" style="min-height:0;border-top:1px solid var(--border)">{gh}</li>'
        for k, n, det in ps:
            lis += (f'<li class="{"press" if n == press else ""}">{lem()}<span class="t"><span class="p1">with <b>{n}</b></span>'
                    f'<span class="p2">{pstate(k, det)}</span></span><span class="cv">›</span></li>')
    return ('<div class="blk2 cbk"><div class="hr">' + lem() + '<span style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:0"><span class="h">Two-card combos</span>'
            '<span class="sc">against HD - Gishath</span></span><span class="st">*</span><span class="ch">▴</span></div>'
            f'<ul>{lis}</ul></div>')


POLY_TEXT = '<b>Enrage</b> — Whenever Polyraptor is dealt damage, create a token that’s a copy of Polyraptor.'
PIPS_POLY = '<span class="cpip"><i style="background:#C9C1B0">6</i><i style="background:var(--g)"></i><i style="background:var(--g)"></i></span>'


def card_phone(open_=True, press=None):
    base = P.phone(P.phone_header(dict(DECK, name="HD - Gishath", cmd="Gishath, Sun’s Avatar", color="Naya", pips=["r", "g", "w"], status="To buy")), None)
    base = base.replace('<div class="ph">', '<div class="ph" style="height:844px">', 1)
    ov = ('<div class="scrim"></div><div class="cdf"><span class="gr"></span><div class="in">'
          f'<div class="nm2"><h3>Polyraptor</h3>{PIPS_POLY}</div><span class="tl2">Creature — Dinosaur</span>'
          '<div class="mt2"><span class="ptag2">$9.89</span><span>RIX · 144</span><span style="color:var(--accent)">×0</span></div>'
          f'<div class="blk2"><p class="ot">{POLY_TEXT}</p></div>'
          f'{combos_block(open_, press)}'
          '<div class="blk2"><span class="h">In this deck</span><p class="ot" style="margin-top:8px;font-size:13px">☐ Run a proxy in HD - Gishath</p></div>'
          '</div></div>')
    return overlay_phone(base, ov)


def card_desk(open_=True):
    base = page_desk(quiet(0), 900)
    ov = ('<div class="scrimd"></div><div class="cmx"><div class="lc">'
          f'<img alt="Polyraptor" src="{kit.img("c-poly")}"><small>Click to zoom</small><span class="ptag2">$9.89</span></div>'
          f'<div class="rc3"><div class="nm2"><h3>Polyraptor</h3>{PIPS_POLY}<span class="x2">✕</span></div>'
          '<span class="tl2" style="font-size:15px">Creature — Dinosaur</span>'
          f'<div class="blk2"><p class="ot">{POLY_TEXT}</p></div>{combos_block(open_, desk=True)}'
          '<div class="ftl"><a>Buy any printing at Mana Pool ↗</a><a>Find a deck for it →</a><span class="pn">‹ Prev  2 of 77  Next ›</span></div>'
          '</div></div>')
    return base[:-6] + ov + "</div>"


# ------------------------------------------------------------------------------------------------ boards
W_PH = 390 * 4 + 44 * 3 + 112


def deck_board():
    body = (board_head("Combos one piece away · the deck page", "Where one-away sits: the status line, under the to-do card",
                       "One segment on the line every deck page already has: <b>“∞ 5 combos one piece away ›”</b>. It is the to-do card’s foot when the deck has something to do, "
                       "and the quiet status strip when it doesn’t (deck messages ruling 3: the foot stands alone). It is a fact about the deck, not a job, so it never becomes a row "
                       "or the next step, and it costs the page no height. The press opens a sheet (390) or modal (1300), the same chrome as Show these. "
                       "Fixture: your HD - Avatar Aang (Complete, Upgraded). Copy is placeholder.")
            + '<div class="frames">'
            + frame("<b>Many</b> · quiet deck · 390", page_phone(quiet(5)), "Complete deck, nothing to do: the strip is v2 and the segment.")
            + frame("<b>Many</b> · with a to-do · 390", page_phone(todo(5)), "Pending changes are the next step; the segment sits in the card’s foot after the version.")
            + frame("<b>One</b> · 390", page_phone(quiet(1)), "“1 combo one piece away”. Same press, the sheet holds one row.")
            + frame("<b>Empty</b> · 390", page_phone(quiet(0)), "None one piece away: no segment. Absence isn’t drawn (combo awareness’s rule), the strip is the version alone.")
            + "</div><div class=\"frames\">"
            + frame("<b>Many</b> · 1300", page_desk(quiet(5)), "The strip runs the page’s width; the segment follows the version.")
            + "</div>")
    return doc("Combos one piece away · deck page", body, max(W_PH, 1300 + 112))


def sheet_board():
    body = (board_head("Combos one piece away · the list", "Each combo says where its missing card is",
                       "The sheet groups by what it takes: <b>You own it</b> (a spare first, then a copy in another deck) and <b>To buy</b> (cheapest first). "
                       "A row: the ∞ (a loop of extra turns also gets the extra-turns mark, as today), the missing card, <b>with</b> the piece already in the deck (‘commander’ when it leads), "
                       "where the card is, and what the combo does. The whole row opens how it works. The other deck’s name is a link to that deck, as in card details’ In your decks.")
            + '<div class="frames">'
            + frame("<b>Many</b> · 390", sheet_phone(), "5 combos: 1 spare, 1 in HD - Gods, 3 to buy. Time Vault + Voltaic Key carries the loop mark.")
            + frame("<b>A piece in another deck</b> · 390", sheet_phone(hit="Heliod, Sun-Crowned"),
                    "‘HD - Gods’ is a link: it opens that deck’s page, where Heliod’s row is. A 44px hit area; the row’s other 300px open the combo. Adding it here would make Heliod spoken for twice, which the to-do card already says.")
            + frame("<b>A piece to buy</b> · 390", sheet_phone(press="Searing Touch"),
                    "The shipped BuyTag with its price, on a hollow dot. Searing Touch completes with the commander. Pressed: opens how it works (next board).")
            + frame("<b>One</b> · 390", sheet_phone(ONE), "The sheet sizes to its rows.")
            + "</div><div class=\"frames\">"
            + frame("<b>Empty</b> · 390 · after adding the last piece", sheet_empty(),
                    "The only way to see an empty sheet: you added the last missing card from it. The row leaves; the sheet says so and the segment goes.")
            + frame("<b>Many</b> · 1300", modal_list(hit="Heliod, Sun-Crowned"), "One line per combo, columns line up: name, with, where (fixed 190), what it does, ›.")
            + "</div>")
    return doc("Combos one piece away · the list", body, max(W_PH, 390 + 1300 + 44 + 112))


def detail_board():
    body = (board_head("Combos one piece away · how it works", "The combo detail: Spellbook’s steps and the mana it needs",
                       "A row opens the shipped combo body (<code>ComboBody</code>, the Analysis receipt’s): the pieces as card plates, the pair’s name, what it produces, "
                       "<b>Mana needed</b>, <b>Steps</b> and <b>Needs</b>. It opens inside the same sheet, with ← 5 combos as its back, so depth stays at two. "
                       "Added for one-away: each plate says where that piece is, the missing one is outlined, and the foot adds the card from here, as Consider’s Add does. "
                       "A plate opens that card’s details, stacked, with ← the combo. Steps here are the fixture’s; the build draws Spellbook’s own words.")
            + '<div class="frames">'
            + frame("<b>To buy</b> · 390", detail_phone(), "Searing Touch to buy: $1.49 on its plate, and ‘Add Searing Touch · to buy’ (Consider’s wording).")
            + frame("<b>You own it</b> · 390", detail_phone(own=True), "The same combo if you had a spare: the plate says spare and the press is Add.")
            + frame("<b>A plate pressed</b> · 390", card_over_detail(), "The shipped card details, stacked, closing back to the combo.")
            + "</div><div class=\"frames\">"
            + frame("<b>To buy</b> · 1300", modal_detail(), "The shipped body at the modal’s width: plates left, words right. Add and the Spellbook link share the foot.")
            + "</div>")
    return doc("Combos one piece away · how it works", body, max(390 * 3 + 44 * 2 + 112, 1300 + 112))


def card_board():
    body = (board_head("Combos one piece away · card details", "The combos a card is part of, and which pieces you hold",
                       "The shipped <b>Two-card combos</b> block, closed by default with its counts, opened. Each line now says <b>where its other piece is</b> with the same words and marks as the deck’s list: "
                       "in this deck, spare, in another deck (linked), or its price. Opened from a deck, it splits into <b>Whole in this deck</b> and <b>One piece away</b>. "
                       "A line opens the combo’s how-it-works, stacked on the card (the partner’s own card is a plate there). Fixture: Polyraptor in HD - Gishath, whose shipped block reads 2 in this deck · 1 you own · 7 you don’t.")
            + '<div class="frames">'
            + frame("<b>Closed</b> · 390 · full sheet", card_phone(False), "As shipped: one row, counts by state.")
            + frame("<b>Open</b> · 390 · full sheet", card_phone(True), "Six partners: two whole here, four one piece away, each with where it is.")
            + frame("<b>A line pressed</b> · 390", card_phone(True, "Warstorm Surge"), "The whole line opens how Polyraptor + Warstorm Surge works. ‘HD - Tovolar’ alone opens that deck.")
            + "</div><div class=\"frames\">"
            + frame("<b>Open</b> · 1300", card_desk(True), "The shipped modal, block open, against HD - Gishath.")
            + "</div>")
    return doc("Combos one piece away · card details", body, max(390 * 3 + 44 * 2 + 112, 1300 + 112))


CALLS = [
    ("1", "Where one-away sits", "<b>A segment of the status line</b>: the to-do card’s foot, or the quiet strip when there’s nothing to do. "
     "Not a to-do row: a combo is optional, most decks are one piece from something, and a row would sit in the next-step order every visit. "
     "Not the Analysis tab: it waits behind Analyze. There is no Combos tab today, and a sixth tab overflows at 390."),
    ("2", "What the press opens", "<b>A sheet (390) / modal (1300)</b>, the pass sheet’s chrome. Grouped You own it (spare, then another deck) and To buy (cheapest first)."),
    ("3", "“In another deck” links", "<b>The deck’s name is a link to its page</b>, styled and worded as card details’ In your decks. A 44px hit area inside the row; the rest of the row opens the combo. "
     "Several decks: name the first and say ‘+1’ in the combo detail only (open, G4)."),
    ("4", "How it works", "<b>The shipped ComboBody</b>, pushed inside the sheet (← 5 combos), plus where each piece is on its plate and an Add in the foot. Depth stays two: list or combo, then a card."),
    ("5", "Card details", "<b>The shipped block, extended</b>: each partner line gets the where-line and opens the combo. Today the partner’s name opens the partner’s card; that moves to the plate in the combo (your call)."),
    ("6", "A count on the deck page", "Combo awareness refused any deck-level count. This round needs one: ‘5 combos one piece away’ describes the list the press opens, the same licence as the card block’s closed counts (your call)."),
]

GAPS = [
    "G1 · Steps and mana are already stored: <code>spellbook_variants</code> has <code>steps</code>, <code>mana_needed</code>, <code>mana_value_needed</code> and <code>notable_prerequisites</code>, and the deck profile reads them. "
    "What’s missing is the near-miss read (<code>pairsWithOnePiece</code>) selecting them. Engineering confirms; no new storage may be needed.",
    "G2 · Two-card only, as detection is today: a deck two pieces into a three-card combo isn’t listed. The sheet’s foot says so.",
    "G3 · ‘Spare’ = a copy no committed deck holds (availability’s free ≥ 1). ‘In another deck’ = every copy held elsewhere. Both true: spare wins.",
    "G4 · A piece held by several decks: the row names one (the first committed), the combo detail lists them all.",
    "G5 · §4.3b rule 2 holds: a piece that only works from the command zone is never offered as a card to add.",
    "G6 · Bracket: marks only, as today. Nothing here says adding a piece moves the deck’s bracket; the Analysis tab does that.",
    "G7 · The segment is computed on the deck page’s read, like the row combo mark; no profile or Analyze needed.",
    "G8 · About: the entry’s picture is drawn from this round’s deck page. Recapture <code>deck-your-deck</code> in all six themes with <code>COMBOS_CLOSE_ENABLED</code> on, on a complete deck with nothing to do and two or more combos one piece away, and add the segment’s locator.",
]


def main_board():
    calls = "".join(f'<div class="note"><span class="pk">CALL {n}</span><b>{t}</b><p style="margin:8px 0 0">{b}</p></div>' for n, t, b in CALLS)
    gaps = "<ul>" + "".join(f"<li>{g}</li>" for g in GAPS) + "</ul>"
    row_alt = page_phone(a2.card("Before HD - Avatar Aang is ready", "2 to do", [
        a2.row("a", "±", f"4 changes since v2 {a2.PM(3, 1)}", "Commit them as v3 in Review.", "Review", True),
        a2.row("a", lem(15), "5 combos one piece away", "Searing Touch, Exquisite Blood and 3 more.", "Show")], [("v2", False)]))
    body = (board_head("Combos one piece away · account 2 · 2026-10-22 · R1",
                       "One line on the deck page, one sheet, the shipped combo body",
                       "Your rulings: the deck page lists combos exactly one piece away, legal in its colors, each saying where the missing piece is (a spare, another deck, or to buy with its price); "
                       "card details list the card’s combos and which pieces you hold; how a combo works shows Spellbook’s steps and mana; marks as today, a loop keeps its mark. "
                       "Everything is drawn over the shipped deck page (deck messages A2), the shipped Two-card combos block and the shipped combo receipt. Boards: <b>Deck-Page</b>, <b>The-List</b>, <b>How-It-Works</b>, <b>Card-Details</b>, <b>About</b>.")
            + '<div class="sec"><h3>The open question: where it sits</h3><div class="cmp2">'
            + frame("<b>Picked</b> · a status-line segment", page_phone(todo(5, hl=True)), "Quiet, always there, no height. Present on every deck with a combo in reach.")
            + frame("Not picked · a row in the to-do card", row_alt, "It reads as a job, takes a 96px press column and a row every visit, and the deck can never be ‘nothing to do’.")
            + frame("<b>Picked</b> · quiet deck", page_phone(quiet(5, hl=True)), "With nothing to do, the strip is the version and the segment.")
            + '<div class="note" style="align-self:start"><b>Why not Analysis or a tab</b><ul><li>Analysis shows its reading only after Analyze, so the list would hide behind a press most decks haven’t made.</li>'
              '<li>There’s no Combos tab. A sixth tab (Your deck, Analysis, Consider, Games, Versions) runs off a 390 screen already at five.</li>'
              '<li>Consider already marks cards that complete a combo (the shipped clause), so the add path exists there too.</li></ul></div>'
            + "</div></div>"
            + '<div class="sec"><h3>The calls</h3><div class="callg">' + calls + "</div></div>"
            + f'<div class="note"><b>Gaps for engineering</b>{gaps}</div>')
    return doc("Combos one piece away · main", body, 390 * 3 + 36 * 3 + 520 + 112)


BOARDS = [("Main", main_board, "R1 · where it sits, the calls, gaps"),
          ("Deck-Page", deck_board, "The deck page · many, with a to-do, one, empty"),
          ("The-List", sheet_board, "The list · many, another deck, to buy, one, empty"),
          ("How-It-Works", detail_board, "How it works · steps and mana"),
          ("Card-Details", card_board, "Card details · combos and pieces held")]
