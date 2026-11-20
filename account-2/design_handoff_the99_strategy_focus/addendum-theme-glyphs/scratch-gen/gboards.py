"""Strategy focus glyphs addendum R1–R2 boards (account 2, 2026-11-20).

The strategy block is redrawn from the shipped src/components/decks/strategy-block.tsx and strategy-ring.ts (RING sizes,
arc geometry, RANK_MIX inks, the Medallion, the Legend), so every glyph sits at the exact size it ships at:
legend 16px, precon upgrade rows 14px and 18px, ring centre 60px (phone, medallion 92) and 77px (desktop, medallion 118).
Theme tokens are read from src/app/globals.css.
"""
import json, math, os
import kit
import parts as P
from kit import doc, board_head, frame
from glyphs import NEW, ALT, STANDIN, NAMES

HERE = os.path.dirname(os.path.abspath(__file__))
SHIPPED = json.load(open(os.path.join(HERE, "shipped.json")))
ALLG = {**SHIPPED, **{k: v[1] for k, v in NEW.items()}, **{k: v[1] for k, v in ALT.items()}}
NAME = {**NAMES, **{k: v[0] for k, v in NEW.items()}, **{k: v[0] for k, v in ALT.items()}}

THEMES = [  # key, name, plane; tokens from globals.css
    ("amonkhet", "Low Sun", "Amonkhet", dict(bg="#14110E", surface="#1E1A15", rail="#1A1611", fg="#EDE6D8", body="#C0B8A6", muted="#A59C89", faint="#948B78", accent="#CF8745", atext="#CF8745", ahover="#DE9757", border="#2B241B", strong="#3A3229", dashed="#494037")),
    ("kamigawa", "Neon Rain", "Kamigawa", dict(bg="#0E0F14", surface="#16181F", rail="#12141B", fg="#E6E8F0", body="#B1B6C7", muted="#959AAD", faint="#84899B", accent="#FF4D9A", atext="#FF4D9A", ahover="#FF62A9", border="#181C26", strong="#262A35", dashed="#343843")),
    ("ixalan", "Canopy", "Ixalan", dict(bg="#0E1310", surface="#171E19", rail="#121814", fg="#E0E7DE", body="#B6C2B3", muted="#98A695", faint="#879383", accent="#A3C445", atext="#A3C445", ahover="#B2D257", border="#1D2620", strong="#2C3830", dashed="#3B4A3F")),
    ("phyrexia", "Oil Haze", "New Phyrexia", dict(bg="#0D0B0E", surface="#151317", rail="#110F13", fg="#E4E2E6", body="#B5B2BB", muted="#9A96A0", faint="#87838D", accent="#52827A", atext="#5D8E85", ahover="#6E9D95", border="#19161C", strong="#262329", dashed="#332F36")),
    ("eldraine", "Witching Hour", "Eldraine", dict(bg="#120E17", surface="#1B1821", rail="#15121B", fg="#E4DEEE", body="#B9B2C5", muted="#9C95A8", faint="#8F899B", accent="#AE88E6", atext="#AE88E6", ahover="#BC9BEE", border="#241D30", strong="#342C41", dashed="#443C52")),
    ("kaldheim", "First Frost", "Kaldheim", dict(bg="#121217", surface="#1E1F26", rail="#181920", fg="#C6D2D3", body="#B3C0C2", muted="#95A4A6", faint="#8A999B", accent="#6C97DB", atext="#6C97DB", ahover="#7CA6EA", border="#1A1F2B", strong="#2E3340", dashed="#424755")),
]


def tvars(t):
    return (f"--bg:{t['bg']};--surface:{t['surface']};--surface-rail:{t['rail']};--fg:{t['fg']};--fg-body:{t['body']};"
            f"--fg-muted:{t['muted']};--fg-faint:{t['faint']};--accent:{t['accent']};--accent-text:{t['atext']};"
            f"--accent-hover:{t['ahover']};--border:{t['border']};--border-strong:{t['strong']};--border-dashed:{t['dashed']}")


RING = {"desktop": dict(box=230, radius=101, stroke=20, focusRadius=105, focusStroke=24, centre=138, medallion=118),
        "phone": dict(box=200, radius=86, stroke=20, focusRadius=90, focusStroke=24, centre=108, medallion=92)}
RANK_MIX = [61, 48, 37, 28, 21]
JOINT_GAP = 2.2

CSS = r"""
/* ---- glyph addendum ---- */
.gi{flex:none;display:block}
.sb{display:flex;flex-direction:column;gap:12px}
.sb .sbh{margin:0;font:500 10.5px 'IBM Plex Mono';letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}
.sb .sbs{font:10.5px/1.5 'IBM Plex Mono';color:var(--fg-faint)}
.sbx{display:grid;grid-template-columns:auto minmax(0,380px);gap:40px;align-items:center;justify-content:center;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface-rail);padding:18px 20px}
.ph .sbx{grid-template-columns:1fr;justify-items:center;gap:14px;border-radius:11px;padding:14px 12px}
.sbl{font-size:12.5px;line-height:1.5;color:var(--fg-muted);text-align:center}
.ph .sbl{text-align:left}
.sbl b{color:var(--fg);font-weight:600}
.sbl .kb{margin-left:6px;font:11px 'IBM Plex Mono';color:var(--accent-text);text-decoration:underline;text-underline-offset:4px;text-decoration-color:color-mix(in oklab,var(--accent) 45%,transparent)}
.rgx{position:relative}
.rgx .cx{position:absolute;display:flex;align-items:center;justify-content:center}
.medl{position:relative;display:flex;align-items:center;justify-content:center;border-radius:50%;color:var(--accent-text);
 background:radial-gradient(circle,color-mix(in oklab,var(--accent) 22%,transparent) 0%,color-mix(in oklab,var(--accent) 6%,transparent) 62%,transparent 72%);
 border:1.5px solid color-mix(in oklab,var(--accent) 55%,transparent);box-shadow:inset 0 0 0 5px var(--surface),inset 0 0 0 6px color-mix(in oklab,var(--accent) 30%,transparent);box-sizing:border-box}
.medl i{position:absolute;left:50%;top:50%;width:7px;height:7px;background:var(--accent)}
.medl .gi{filter:drop-shadow(0 0 6px color-mix(in oklab,var(--accent) 45%,transparent))}
.lgd{display:flex;flex-direction:column;gap:6px;width:100%;max-width:440px}
.lgd .k{padding:0 6px;font:9.5px 'IBM Plex Mono';text-transform:uppercase;letter-spacing:.14em;color:var(--fg-faint)}
.lgd .r{display:flex;align-items:center;gap:10px;min-height:40px;padding:0 6px;font-size:13px;color:var(--fg);border-top:1px solid var(--border)}
.ph .lgd .r{min-height:44px}
.lgd .r:first-of-type{border-top-color:transparent}
.lgd .r .gi{color:var(--fg-muted)}
.lgd .r .nm{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lgd .r .n{margin-left:auto;flex:none;font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.lgd .r .rd{margin-left:12px;width:16px;height:16px;flex:none;box-sizing:border-box;border-radius:50%;border:1.5px solid var(--border-strong);display:flex;align-items:center;justify-content:center}
.lgd .r.on{border-radius:7px;background:color-mix(in oklab,var(--accent) 9%,transparent);font-weight:600;color:var(--accent-text);border-top-color:transparent}
.lgd .r.on+.r{border-top-color:transparent}
.lgd .r.on .gi{color:var(--accent-text)}
.lgd .r.on .rd{border-color:var(--accent)}
.lgd .r.on .rd:after{content:'';width:8px;height:8px;border-radius:50%;background:var(--accent)}
/* glyph sheets */
.gset{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}
.gc{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface-rail);padding:16px 16px 14px;display:flex;flex-direction:column;gap:12px}
.gc.shp{background:transparent;border-style:dashed;border-color:var(--border-dashed)}
.gc .hd{display:flex;align-items:baseline;gap:8px}
.gc .hd b{font-size:15px;font-weight:600;color:var(--fg)}
.gc .hd code{font-size:10.5px;color:var(--fg-faint)}
.gc .hd .tg{margin-left:auto;font:9.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);border:1px solid var(--border-strong);border-radius:999px;padding:1px 7px;white-space:nowrap}
.gc .hd .tg.ac{color:var(--accent);border-color:var(--accent-shadow)}
.gc .sz{display:flex;align-items:flex-end;gap:16px}
.gc .sz>span{display:flex;flex-direction:column;align-items:center;gap:6px;font:9.5px 'IBM Plex Mono';color:var(--fg-faint)}
.gc .sz .ink{color:var(--fg-muted)}
.gc .sz .pk{color:var(--accent-text);background:color-mix(in oklab,var(--accent) 9%,transparent);border-radius:6px;padding:5px}
.gc .meds{display:flex;align-items:flex-end;gap:18px;justify-content:flex-start}
.gc .meds>span{display:flex;flex-direction:column;align-items:center;gap:6px;font:9.5px 'IBM Plex Mono';color:var(--fg-faint)}
.gc p{font-size:12.5px;line-height:1.55;color:var(--fg-muted);text-wrap:pretty}
.gc p s{color:var(--fg-faint)}
.gc .was{display:flex;align-items:center;gap:8px;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.gc .was .gi{color:var(--fg-faint)}
.mbox{background:var(--surface-rail);border:1px solid var(--border-strong);border-radius:12px;padding:16px 18px}
/* themes */
.tb{display:grid;grid-template-columns:400px minmax(0,1fr);gap:28px;align-items:start;background:var(--bg);border:1px solid var(--border-strong);border-radius:14px;padding:22px 24px;color:var(--fg)}
.tb .th{grid-column:1/-1;display:flex;align-items:baseline;gap:12px}
.tb .th b{font:700 20px 'Cinzel',serif;color:var(--fg);white-space:nowrap}
.tb .th span{white-space:nowrap;font:10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.tb .th .sw{display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--accent);align-self:center}
.tb .lbx{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface-rail);padding:14px 12px}
.tb .mg{display:flex;flex-direction:column;gap:16px}
.tb .mrow{display:flex;flex-wrap:wrap;gap:14px 12px;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface-rail);padding:16px}
.tb .mrow>span{display:flex;flex-direction:column;align-items:center;gap:7px;font:9.5px 'IBM Plex Mono';color:var(--fg-faint);text-align:center}
.tb .ml{font:9.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.tb .chips{display:flex;flex-wrap:wrap;gap:8px}
.tb .chips span{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 9px;border-radius:999px;border:1px solid var(--border-strong);font-size:12px;color:var(--fg-body)}
.tb .chips span .gi{color:var(--fg-muted)}
/* pairs */
.pairs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
.pr{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface-rail);padding:18px 20px;display:flex;flex-direction:column;gap:14px}
.pr h4{margin:0;font-size:15px;font-weight:600;color:var(--fg)}
.pr .cmp{display:flex;gap:26px;align-items:flex-end;flex-wrap:wrap}
.pr .one{display:flex;flex-direction:column;align-items:center;gap:8px}
.pr .one .sm{display:flex;gap:10px;align-items:center;color:var(--fg-muted)}
.pr .one .nm{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.pr .one.nw .nm{color:var(--accent)}
.pr p{font-size:13px;line-height:1.6;color:var(--fg-body);text-wrap:pretty}
.pr p b{color:var(--fg)}
.pr .lgd{max-width:300px}
.wall{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:4px 14px}
.wall>span{display:flex;align-items:center;gap:9px;min-height:36px;padding:0 8px;border-radius:7px;font-size:12.5px;color:var(--fg-body);white-space:nowrap;overflow:hidden}
.wall>span .gi{color:var(--fg-muted)}
.wall>span.nw{outline:1.5px dashed rgba(207,135,69,.75);outline-offset:-2px;color:var(--fg)}
.wall14>span{font-size:11.5px;min-height:30px}
.tbl2{display:grid;grid-template-columns:40px 300px minmax(0,1fr);border:1px solid var(--border-strong);border-radius:12px;overflow:hidden}
.tbl2>div{padding:12px 16px;border-top:1px solid var(--border);font-size:13px;line-height:1.6;color:var(--fg-body)}
.tbl2>div:nth-child(-n+3){border-top:0}
.tbl2>div:nth-child(3n+1){font:600 13px 'IBM Plex Mono';color:var(--accent)}
.tbl2>div:nth-child(3n+2){color:var(--fg);font-weight:600}
"""
kit.CSS += CSS


def g(key, px, cls=""):
    return (f'<svg class="gi {cls}" width="{px}" height="{px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ALLG[key]}</svg>')


def medallion(key, size):
    s = RING[size]
    m = s["medallion"]
    gems = "".join(f'<i style="transform:translate(-50%,-50%) rotate({k * 90}deg) translateY(-{m / 2:g}px) rotate(45deg)"></i>' for k in range(4))
    return f'<span class="medl" style="width:{m}px;height:{m}px">{gems}{g(key, round(s["centre"] * .56))}</span>'


def arcpath(box, r, a, b):
    c = box / 2
    pt = lambda d: f"{c + r * math.cos(math.radians(d - 90)):.2f} {c + r * math.sin(math.radians(d - 90)):.2f}"
    return f"M {pt(a)} A {r} {r} 0 {1 if b - a > 180 else 0} 1 {pt(b)}"


def ring(rows, focus, size):
    s = RING[size]
    total = sum(n for _, n in rows)
    at, arcs = 0, []
    for rank, (k, n) in enumerate(rows):
        span = n / total * 360
        a, b = at + JOINT_GAP / 2, at + span - JOINT_GAP / 2
        at += span
        on = k == focus
        ink = "var(--accent)" if on else f"color-mix(in oklab, var(--fg-muted) {RANK_MIX[min(rank, 4)]}%, var(--surface-rail))"
        arcs.append(f'<path d="{arcpath(s["box"], s["focusRadius"] if on else s["radius"], a, b)}" stroke="{ink}" '
                    f'stroke-width="{s["focusStroke"] if on else s["stroke"]}" stroke-linecap="butt"/>')
    inset = (s["box"] - s["centre"]) / 2
    return (f'<div class="rgx" style="width:{s["box"]}px;height:{s["box"]}px"><svg width="{s["box"]}" height="{s["box"]}" '
            f'viewBox="0 0 {s["box"]} {s["box"]}" fill="none" overflow="visible" aria-hidden="true">{"".join(arcs)}</svg>'
            f'<div class="cx" style="inset:{inset:g}px">{medallion(focus, size)}</div></div>')


def legend(rows, focus, kicker=True):
    out = '<span class="k">Pick a focus</span>' if kicker else ""
    for k, n in rows:
        out += (f'<div class="r{" on" if k == focus else ""}">{g(k, 16)}<span class="nm">{NAME[k]}</span>'
                f'<span class="n">{n} cards</span><span class="rd"></span></div>')
    return f'<div class="lgd">{out}</div>'


def block(rows, focus, size):
    return (f'<div class="sb new"><span class="sbh">The deck’s strategy</span>'
            f'<span class="sbs">The themes your deck is built around and how many cards support each strategy.</span>'
            f'<div class="sbx">{ring(rows, focus, size)}{legend(rows, focus)}</div>'
            f'<span class="sbl">Focus <b>{NAME[focus]}</b>: Suggested changes builds toward it.<span class="kb">Keep it balanced</span></span></div>')


def sec(title, sp, body):
    return f'<div class="sec"><h3>{title}</h3>' + (f'<p class="sp">{sp}</p>' if sp else "") + f'{body}</div>'


def card(key, shipped=False, tag=None):
    name, _, why = (NEW.get(key) or ALT.get(key) or (NAME[key], "", ""))
    was = ""
    if key in STANDIN:
        was = f'<span class="was">draws today, as a stand-in: {g(STANDIN[key], 16)} {NAME[STANDIN[key]]}</span>'
    t = tag or ("shipped" if shipped else "new")
    sizes = (f'<div class="sz"><span>{g(key, 14, "ink")}14</span><span>{g(key, 16, "ink")}16</span><span>{g(key, 18, "ink")}18</span>'
             f'<span><span class="pk">{g(key, 16)}</span>16 picked</span></div>')
    meds = (f'<div class="meds"><span>{medallion(key, "phone")}phone · 60 on 92</span>'
            f'<span>{medallion(key, "desktop")}desktop · 77 on 118</span></div>')
    return (f'<div class="gc{" shp" if shipped else " new"}"><div class="hd"><b>{name}</b><code>{key}</code>'
            f'<span class="tg{"" if shipped else " ac"}">{t}</span></div>{sizes}{meds}'
            + (f'<p>{why}</p>' if why else "") + was + '</div>')


# ---------------------------------------------------------------- fixtures (counts are fixtures, as in R2g)
STORM = [("storm", 14), ("spellslinger", 12), ("bigMana", 9), ("treasure", 7), ("burn", 6)]
FORT = [("enchantments", 18), ("pillowFort", 12), ("groupHug", 9), ("politics", 7), ("protection", 6)]
WITHER = [("minusCounters", 13), ("proliferate", 10), ("sagas", 7), ("planeswalkers", 6), ("deathTrigger", 5)]
TURNS = [("extraTurns", 11), ("extraCombats", 8), ("monarch", 7), ("draw", 7), ("voltron", 5)]

CALLS = [
    ("1", "Same family, same rules", "Every glyph is a 24-unit line drawing: no fill, a 1.6 stroke in <code>currentColor</code>, round caps and joins, one to "
     "four shapes. No new tokens or colours. Each takes <code>--fg-muted</code> in the legend, <code>--accent-text</code> when picked, and sits on the shipped medallion at 56% of the ring centre."),
    ("2", "Read at 14", "The smallest size any glyph ships at is the precon upgrade run row (14px); the focus picker’s legend is 16. Every glyph is drawn so "
     "its outline alone names it at 14: the Pairs board checks the risky neighbours at 14 and 16."),
    ("3", "One mark per mechanic", "Storm and Monarch already have shipped icons, as life tracker counters. They are reused here at this family’s 1.6 stroke, so "
     "the same mechanic wears the same mark on the tracker and on the ring. Monarch’s is a plain drawn crown, not the card frame’s (R2: the throne is dropped, Hugh)."),
    ("4", "Nothing from Wizards", "No mana symbols, set symbols, the planeswalker symbol, loyalty shields, Saga chapter numerals or the Monarch card’s crown. "
     "Big mana is a ramp; Planeswalkers is a figure with its spark; Sagas is a book."),
    ("5", "Three stand-ins retire", "Planeswalkers stops drawing the dashed fallback, Sagas stops borrowing Enchantments’ moon, Proliferate stops borrowing +1/+1 counters’ square."),
]


def calls_tbl():
    return '<div class="tbl2">' + "".join(f'<div>{n}</div><div>{t}</div><div>{b}</div>' for n, t, b in CALLS) + '</div>'


def bph(blk, cut):
    return P.phone(f'<div class="at">{blk}</div>', head=False, cut=cut, nav=False)


def bdk(blk, cut):
    return P.desk(f'<div class="at">{blk}{P.hub_landing()}</div>', head=False, cut=cut)


def main():
    shipped = "".join(card(k, True) for k in ("tokens", "spellslinger", "counters"))
    new = "".join(card(k) for k in NEW)
    cut = "Analysis tab · past How it plays"
    body = (board_head("Strategy focus · glyphs addendum · R2 · account 2 · 2026-11-20", "Thirteen glyphs for the theme set",
                       "The focus flow, ring and graph are locked (R2g, approved 2026-10-22). This round only adds glyphs: the three that draw a stand-in today "
                       "(Planeswalkers, Sagas, Proliferate) and ten for the new themes engineering is building (Storm, Monarch, Extra turns, Extra combats, "
                       "−1/−1 counters, Burn, Group hug, Pillow fort, Big mana, Politics). Drawn in the shipped family from "
                       "<code>strategy-icon.tsx</code>, at the sizes <code>strategy-block.tsx</code> ships. Low Sun here; every theme on the Themes board; "
                       "the risky neighbours on the Pairs board. Orange dashed outline = new.")
            + sec("The calls", "", calls_tbl())
            + sec("Shipped, for scale", "Three of the shipped set in the same frame: the new glyphs match their weight, size inside the grid and corner rounding.",
                  f'<div class="gset">{shipped}</div>')
            + sec("The thirteen", "Each at 14 (precon upgrade run row), 16 (focus picker legend), 18 (precon upgrade pick and result), 16 picked, and on the "
                  "ring centre’s medallion at both widths.", f'<div class="gset">{new}</div>')
            + sec("In place, on the shipped block", "Three fixture decks so every new glyph lands in a real legend and most on a real medallion. Counts are fixtures.",
                  '<div class="frames">'
                  + frame("<b>390</b> · a Storm deck", bph(block(STORM, "storm", "phone"), cut))
                  + frame("<b>390</b> · a −1/−1 counters deck", bph(block(WITHER, "minusCounters", "phone"), cut))
                  + frame("<b>390</b> · an extra turns deck", bph(block(TURNS, "extraTurns", "phone"), cut))
                  + '</div><div class="frames">'
                  + frame("<b>1300</b> · a pillow fort deck", bdk(block(FORT, "pillowFort", "desktop"), cut))
                  + '</div>'))
    return doc("Main", body, 1900)


THEME_ROWS = [(k, n) for k, n in zip(list(NEW) + ["tokens", "spellslinger", "counters"], [14, 13, 12, 12, 11, 11, 10, 9, 9, 8, 8, 7, 7, 6, 6, 5])]


def themes():
    bands = ""
    for key, name, plane, t in THEMES:
        meds_ph = "".join(f'<span>{medallion(k, "phone")}{NEW[k][0]}</span>' for k in NEW)
        meds_ph += "".join(f'<span style="opacity:.9">{medallion(k, "phone")}{NAME[k]} · shipped</span>' for k in ("tokens", "spellslinger", "counters"))
        meds_dk = "".join(f'<span>{medallion(k, "desktop")}</span>' for k in NEW)
        bands += (f'<div class="tb" style="{tvars(t)}"><div class="th"><b>{name}</b><span>{plane} · data-theme="{key}"</span></div>'
                  f'<div class="lbx">{legend(THEME_ROWS, "storm")}</div>'
                  f'<div class="mg"><span class="ml">Ring centre · phone · 60 on 92 · the last three are shipped</span><div class="mrow">{meds_ph}</div>'
                  f'<span class="ml">Ring centre · desktop · 77 on 118</span><div class="mrow">{meds_dk}</div>'
                  f'</div></div>')
    body = (board_head("Strategy focus · glyphs addendum · R2", "Every theme",
                       "The six shipped themes, tokens from <code>globals.css</code>. Left: the focus picker’s legend at 16px with all thirteen and three shipped "
                       "glyphs for comparison, Storm picked. Right: every new glyph on the ring centre’s medallion at both widths. The glyphs carry no colour of "
                       "their own, so each theme only re-inks them; Oil Haze’s low-chroma accent is the faintest medallion and still reads.")
            + f'<div class="sec">{bands}</div>')
    return doc("Themes", body, 2000)


PAIRS = [
    ("Storm, Burn and Spells matter", ["storm", "burn", "spellslinger"], [0, 1],
     "The three spell themes. <b>Spells matter</b> keeps the bolt (a zigzag). <b>Storm</b> is open horizontal strokes with a curl, no closed shape. "
     "<b>Burn</b> is one closed teardrop flame. Three different outlines, so they part at 14 without reading the strokes inside."),
    ("Extra turns and Extra combats", ["extraTurns", "extraCombats", "voltron"], [0, 1],
     "Different ideas and different axes: <b>Extra turns</b> is time (an hourglass, upright, mirrored top to bottom), <b>Extra combats</b> is a fight "
     "(two swords crossed, an X, mirrored left to right). The single sword stays <b>Equipment and Auras</b>; Extra combats always has two."),
    ("Burn and Drain", ["burn", "drain"], [0],
     "Both are tall rounded shapes. <b>Drain</b>’s drop is symmetric with a bar inside; <b>Burn</b>’s flame is lopsided with a second tongue and nothing inside."),
    ("−1/−1 counters, +1/+1 counters and Proliferate", ["minusCounters", "counters", "proliferate"], [0, 2],
     "<b>−1/−1</b> is drawn as +1/+1’s sibling (R2, Hugh: the R1 circle’s minus was too big and didn’t read): the same rounded square and 1, a minus "
     "exactly as wide as the plus’s arm. They share a frame on purpose, so the sign is the difference; at 14 the plus’s cross still shows. "
     "<b>Proliferate</b> drops the frame and repeats the plus three times."),
    ("Monarch and Landfall", ["monarch", "landfall"], [0],
     "Both zigzag on top. The <b>crown</b> has three even points over a separate base bar; <b>Landfall</b>’s mountains are two uneven peaks on their own "
     "baseline, no bar."),
    ("Pillow fort, Protection and Stax", ["pillowFort", "protection", "stax"], [0],
     "Three ways of keeping things out. <b>Pillow fort</b> is a flat-topped wall with crenellations and a gate; <b>Protection</b>’s shield comes to a point; "
     "<b>Stax</b>’s padlock is an arch over a box. Square, pointed, arched."),
    ("Group hug, Treasure and Life gain", ["groupHug", "treasure", "lifegain"], [0],
     "Gifts, gems and hearts. <b>Group hug</b> is a box with a bow, square-sided; <b>Treasure</b> is a faceted gem coming to a point; <b>Life gain</b> is the heart."),
    ("Planeswalkers and Blink", ["planeswalkers", "blink"], [0],
     "Both have rays. <b>Blink</b> is eight rays around nothing; <b>Planeswalkers</b> is a figure (head and shoulders) with three rays above."),
    ("Sagas and Card draw", ["sagas", "draw", "etbDraw"], [0],
     "Pages against cards. <b>Sagas</b> is a book open flat, wider than tall; the draw glyphs are upright cards with rounded corners."),
    ("Big mana, Pump and Landfall", ["bigMana", "pump", "landfall"], [0],
     "Mana without mana symbols. <b>Big mana</b> is a ramp, a wedge with an arrow climbing it on the diagonal (R2, Hugh: the R1 stacked rocks read as a pile). "
     "<b>Pump</b>’s arrow goes straight up off a line; <b>Landfall</b> is mountains with no arrow."),
]


def pairs():
    cards = ""
    for title, keys, new, txt in PAIRS:
        ones = "".join(
            f'<div class="one{" nw" if i in new else ""}"><div class="sm">{g(k, 14)}{g(k, 16)}{g(k, 24)}</div>'
            f'<span class="mbox" style="padding:10px">{medallion(k, "phone")}</span><span class="nm">{NAME[k]}</span></div>'
            for i, k in enumerate(keys))
        leg = legend([(k, 9 - i) for i, k in enumerate(keys)], keys[0], kicker=False)
        cards += f'<div class="pr"><h4>{title}</h4><div class="cmp">{ones}</div>{leg}<p>{txt}</p></div>'
    order = list(SHIPPED)
    order.remove("fallback")
    allk = order + list(NEW)
    wall16 = "".join(f'<span class="{"nw" if k in NEW else ""}">{g(k, 16)}{NAME[k]}</span>' for k in allk)
    wall14 = "".join(f'<span class="{"nw" if k in NEW else ""}">{g(k, 14)}{NAME[k]}</span>' for k in allk)
    body = (board_head("Strategy focus · glyphs addendum · R2", "Pairs at risk, and the whole set",
                       "Each pair at 14, 16 and 24, on the phone medallion, and as two legend rows, new glyphs named in accent. Then the whole set, 35 shipped and "
                       "13 new, at 16 and at 14, to check the family holds together and no two outlines collide.")
            + sec("Pairs at risk of confusion", "", f'<div class="pairs">{cards}</div>')
            + sec("The whole set at 16 (the focus picker)", "Shipped order, the thirteen last, dashed.", f'<div class="mbox"><div class="wall">{wall16}</div></div>')
            + sec("The whole set at 14 (precon upgrade run row)", "", f'<div class="mbox"><div class="wall wall14">{wall14}</div></div>'))
    return doc("Pairs", body, 1900)


BOARDS = [("Main", main, "Main · R2 · thirteen glyphs, the calls, in place"),
          ("Themes", themes, "Themes · every theme, picker and ring centre"),
          ("Pairs", pairs, "Pairs · risky neighbours, the whole set at 16 and 14")]
