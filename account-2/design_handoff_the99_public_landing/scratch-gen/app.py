"""The dummy app (public landing R2): the shipped surfaces' drawing halves, fed the fictional fixture (Sam's binder).
Each piece is redrawn from the shipped component it stands for (commander row: commanders list row; card tile: collection
grid tile; one-line card row; deck tabs and sub-tabs; analysis verdict cells; shopping row with the stand-ins and buy
marks) in Low Sun tokens. No real account sits under any of it. AI results carry a small blue "stand-in words" tag:
the build replays the stored output the real tool wrote on the fixture.
"""
import kit

img = kit.img

kit.CSS += r"""
/* ======== the dummy app's drawing halves ======== */
.ap{font-family:'IBM Plex Sans',sans-serif;color:var(--fg);display:flex;flex-direction:column;gap:12px}
.ap .mono{font:400 10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.ap .cnt{font:12px 'IBM Plex Mono';color:var(--fg-muted)}
.srch{height:40px;border-radius:10px;border:1px solid var(--border-strong);display:flex;align-items:center;gap:8px;padding:0 12px;color:var(--fg-faint);font-size:14px;background:var(--surface-inset)}
/* commander row (For you) */
.crow{border-radius:14px;overflow:hidden;border:1px solid var(--border);background:var(--surface)}
.crow .band{position:relative;height:150px;overflow:hidden}
.crow .band img{width:100%;height:100%;object-fit:cover;object-position:50% 30%;display:block}
.crow .band::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(10,8,6,.85))}
.crow .nm{position:absolute;left:12px;bottom:10px;z-index:2;display:flex;align-items:center;gap:8px;font:700 14px 'Cinzel',serif;color:#F5EEDF;white-space:nowrap}
.crow .nm em{font:600 15px 'IBM Plex Sans';font-style:normal;color:var(--accent)}
.crow .fit{position:absolute;right:10px;bottom:10px;z-index:3;border:1px solid var(--border-strong);background:rgba(20,17,14,.85);border-radius:8px;padding:5px 10px;text-align:center}
.crow .fit b{display:block;font:600 20px/1 'IBM Plex Sans';color:var(--fg)}
.crow .fit span{font:9px 'IBM Plex Mono';letter-spacing:.08em;color:var(--fg-faint)}
.crow .bd{padding:12px 14px 14px;display:flex;flex-direction:column;gap:8px;font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.crow .bd b{color:var(--fg)}
.crow .tr{display:flex;align-items:center;gap:10px}
.crow .tr .cnt{white-space:nowrap}
.fitbar{flex:1;height:5px;border-radius:3px;background:var(--border-strong);overflow:hidden;display:flex}
.fitbar i{display:block;height:100%}
.pp{display:inline-flex;gap:3px}.pp i{width:7px;height:7px;border-radius:1px;display:block}
/* collection grid */
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.dk2 .grid{grid-template-columns:repeat(6,minmax(0,1fr));gap:14px}
.tile{display:flex;flex-direction:column;gap:5px;min-width:0}
.tile img{width:100%;aspect-ratio:63/88;object-fit:cover;border-radius:5%;display:block}
.tile b{font:500 11.5px 'IBM Plex Sans';color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tile span{font:10px 'IBM Plex Mono';color:var(--fg-faint)}
/* deck */
.dtabs{display:flex;gap:16px;border-bottom:1px solid var(--border);font-size:14px;color:var(--fg-muted);padding:0 2px}
.dtabs span{padding:8px 0;white-space:nowrap}
.dtabs span.on{color:var(--fg);border-bottom:2px solid var(--accent);font-weight:500}
.dtabs sup{font:10px 'IBM Plex Mono';color:var(--accent-text);vertical-align:0;margin-left:3px}
.seg{display:flex;border:1px solid var(--border-strong);border-radius:10px;padding:3px;gap:2px}
.seg span{flex:1;text-align:center;font-size:13px;color:var(--fg-muted);padding:7px 0;border-radius:8px;white-space:nowrap}
.seg span.on{background:var(--elevated);color:var(--fg)}
.seg span.acc{color:var(--accent-text);font-weight:600}
.dhead{display:flex;gap:12px;align-items:center}
.dhead img{width:64px;height:46px;object-fit:cover;border-radius:6px}
.dhead b{display:block;font:700 15px 'Cinzel',serif}
.dhead span{font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.rows{display:flex;flex-direction:column}
.rows .h{font:600 12px 'IBM Plex Sans';color:var(--fg);padding:6px 0}
.rows .h em{font:10px 'IBM Plex Mono';font-style:normal;color:var(--fg-faint);margin-left:4px}
.r1{display:flex;align-items:center;gap:9px;min-height:36px;border-top:1px solid var(--border);font-size:13.5px;color:var(--fg)}
.r1 .dot{width:7px;height:7px;border-radius:50%;background:var(--success);flex:none}
.r1 .dot.miss{background:transparent;border:1.5px solid var(--fg-faint)}
.r1 .n{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.r1 .mv{display:inline-flex;gap:2px}
.r1 .mv i{width:12px;height:12px;border-radius:50%;display:block;font:600 8px/12px 'IBM Plex Mono';text-align:center;color:#14110E;font-style:normal}
.buy{font:500 10px 'IBM Plex Mono';color:var(--accent-text);border:1px solid color-mix(in oklab,var(--accent) 60%,transparent);border-radius:4px;padding:1px 5px;white-space:nowrap}
.si{font:11px 'IBM Plex Mono';color:var(--fact);border:1px solid var(--border-strong);border-radius:4px;padding:0 4px}
/* verdict */
.vd{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.dk2 .vd{grid-template-columns:repeat(4,minmax(0,1fr))}
.vc{border:1px solid var(--border);border-radius:10px;padding:10px 12px;background:var(--surface);display:flex;flex-direction:column;gap:6px}
.vc .t{display:flex;justify-content:space-between;align-items:baseline;font:600 12.5px 'IBM Plex Sans'}
.vc .t b{font:700 12px 'Cinzel',serif;color:var(--fg)}
.vc .bars{display:flex;gap:3px}.vc .bars i{flex:1;height:5px;border-radius:2px;background:var(--border-strong);display:block}
.vc .bars i.on{background:var(--fact)}
.vc span{font-size:11.5px;color:var(--fg-muted)}
/* written output */
.wo{border:1px solid var(--border);border-radius:12px;background:var(--surface);padding:14px;display:flex;flex-direction:column;gap:8px;font-size:13.5px;line-height:1.6;color:var(--fg-body);position:relative}
.wo .k{font:400 10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.wo b,.wo .cn{color:var(--fg);font-weight:600}
.wo .cn{text-decoration:underline;text-decoration-color:var(--border-dashed);text-underline-offset:3px}
.wo .stg{display:grid;grid-template-columns:52px 1fr;gap:4px 10px}
.wo .stg em{font:500 10px 'IBM Plex Mono';font-style:normal;letter-spacing:.08em;text-transform:uppercase;color:var(--accent-text);padding-top:3px}
.sw2{position:absolute;top:10px;right:10px;font:600 8.5px 'IBM Plex Mono';letter-spacing:.06em;color:#0D0B09;background:#8FA6BE;border-radius:3px;padding:1px 5px}
.swp{display:flex;flex-direction:column;gap:0}
.swp .sr2{display:grid;grid-template-columns:22px minmax(0,38%) auto 1fr;gap:2px 10px;border-top:1px solid var(--border);padding:9px 0;align-items:start}
.swp .sr2:first-of-type{border-top:0}
.swp .sg{font:600 14px 'IBM Plex Mono';text-align:center}
.swp .in{color:var(--success)}.swp .out{color:#E07A66}
.swp b{font:500 13.5px 'IBM Plex Sans';color:var(--fg)}
.swp p{grid-column:2/4;font-size:12.5px;line-height:1.5;color:var(--fg-muted)}
.mb{display:flex;flex-direction:column;gap:6px}
.mb .l{display:grid;grid-template-columns:70px 1fr 54px;gap:8px;align-items:center;font-size:12px;color:var(--fg-muted)}
.mb .l i{display:block;height:7px;border-radius:3px}
.hmc{display:flex;flex-direction:column;gap:0}
.hr{display:grid;grid-template-columns:22px 70px 1fr auto;gap:10px;align-items:center;border-top:1px solid var(--border);padding:9px 0}
.hr:first-child{border-top:0}
.hr em{font:600 14px 'IBM Plex Sans';font-style:normal;color:var(--accent)}
.hr img{width:70px;height:48px;object-fit:cover;border-radius:6px}
.hr b{display:block;font:700 12.5px 'Cinzel',serif;color:var(--fg)}
.hr span{font-size:12px;color:var(--fg-muted);line-height:1.4}
.hr .f{font:600 15px 'IBM Plex Sans';color:var(--fg);text-align:right}
.hr .f small{display:block;font:9px 'IBM Plex Mono';color:var(--fg-faint)}
.ask{border:1px solid var(--border-strong);border-radius:10px;padding:10px 12px;background:var(--surface-inset);font-size:13.5px;color:var(--fg)}
.ask small{display:block;font:500 9.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);margin-bottom:4px}
.ask .ro2{float:right;font:9.5px 'IBM Plex Mono';color:var(--fg-faint);text-transform:none;letter-spacing:0}
.wd{display:flex;gap:12px;align-items:flex-start;border:1px solid var(--border);border-radius:12px;padding:12px;background:var(--surface);position:relative}
.wd img{width:74px;border-radius:5%;flex:none}
.wd .t{display:flex;flex-direction:column;gap:6px;font-size:13px;line-height:1.5;color:var(--fg-body)}
.wd .t b{color:var(--fg)}
.wd .t .best{display:flex;align-items:center;gap:8px}
.wd .t .best img{width:44px;height:32px;object-fit:cover;border-radius:4px}
.press{position:absolute;z-index:6;border:2px solid var(--accent);border-radius:10px;box-shadow:0 0 0 5px color-mix(in oklab,var(--accent) 22%,transparent);pointer-events:none}
.press b{position:absolute;right:-6px;top:-24px;white-space:nowrap;background:var(--accent);color:var(--bg);font:600 10.5px/18px 'IBM Plex Sans';border-radius:5px;padding:0 7px}
.rel{position:relative}
.mkey{display:flex;flex-wrap:wrap;gap:6px 12px;font:10px 'IBM Plex Mono';color:var(--fg-faint);padding:2px 0 4px}
.mkey>span{display:inline-flex;align-items:center;gap:5px}
.fx{display:inline-flex;color:var(--fact);filter:drop-shadow(0 0 3px color-mix(in srgb,var(--fact) 45%,transparent));margin-left:6px;vertical-align:-1px}
.mkey .fx{margin-left:0}
.px,.dl{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:4px;font:600 10px 'IBM Plex Mono';flex:none}
.px{color:var(--fg);outline:1px dashed var(--fg-locked);outline-offset:-1px;background:var(--surface-inset)}
.dl{color:var(--accent-text);background:color-mix(in oklab,var(--accent) 16%,transparent)}
.avm{display:inline-flex;align-items:center;gap:4px;font:500 10px 'IBM Plex Mono';color:var(--avail-hard-fg,#D9975C);white-space:nowrap;position:relative}
.avm .dm{width:6px;height:6px;transform:rotate(45deg);background:var(--accent);display:block}
.avm.ov{color:#C46857}
.avm.ov .dm{background:#C6533F}
.avm.ov .d2{margin-left:-7px;outline:1px solid var(--surface)}
.mnote{border-left:2px solid #C6533F;padding:6px 10px;font-size:12.5px;line-height:1.5;color:var(--fg-body);background:var(--surface-inset);border-radius:0 8px 8px 0}
.mnote b{color:var(--fg)}
"""

PIP = {"W": "#F4E9C4", "U": "#3A6AA5", "B": "#98748F", "R": "#C05A3E", "G": "#4B7A46"}


def pips(cs):
    return '<span class="pp">' + "".join(f'<i style="background:{PIP[c]}"></i>' for c in cs) + '</span>'


CMD = {
    "jace": dict(name="Jace, Multiverse Architect", c="WUBR", fit=84, decks="11,702",
                 prose="Jace decks run a wall of planeswalkers: tax every attack, draw ahead each turn, and turn removal into a fresh threat.",
                 styles=("Superfriends", "Control", "Card draw"), bar=(("#3A6AA5", 32), ("#98748F", 26), ("#DEAA29", 18))),
    "ashling": dict(name="Ashling, the Limitless", c="R", fit=79, decks="27,438",
                    prose="Ashling decks cast elementals for their evoke cost, sacrifice them, and get a hasty copy back every time.",
                    styles=("Elementals", "Sacrifice", "Tokens"), bar=(("#C05A3E", 34), ("#CF8745", 28), ("#DEAA29", 16))),
    "giada": dict(name="Giada, Font of Hope", c="W", fit=69, decks="38,296",
                  prose="Giada decks play angels that each enter bigger than the last, then swing with a flying team.",
                  styles=("Angels", "+1/+1 counters", "Flying"), bar=(("#C9B98A", 30), ("#CF8745", 24), ("#DEAA29", 15))),
}


def crow(key, rank, press=None):
    c = CMD[key]
    styles = c["styles"]
    bar = "".join(f'<i style="width:{w}%;background:{col}"></i>' for col, w in c["bar"])
    pr = (f'<span class="press" style="right:4px;bottom:4px;width:78px;height:54px"><b>{press}</b></span>' if press else "")
    return (f'<div class="crow"><div class="band"><img src="{img("a-" + key + ".jpg")}" alt="">'
            f'<span class="nm"><em>{rank}</em>{c["name"]} {pips(c["c"])}</span>'
            f'<span class="fit"><b>{c["fit"]}</b><span>/100 FIT</span></span>{pr}</div>'
            f'<div class="bd"><p>{c["prose"]}</p><p>This commander’s top three play styles are <b>{styles[0]}</b>, <b>{styles[1]}</b> and <b>{styles[2]}</b>.</p>'
            f'<div class="tr"><span class="cnt">{c["decks"]} decks tracked</span><span class="fitbar">{bar}</span></div></div></div>')


TILES = [("jace", "Jace, Multiverse Architect"), ("ashling", "Ashling, the Limitless"), ("giada", "Giada, Font of Hope"),
         ("polyraptor", "Polyraptor"), ("doctor-doom", "Doctor Doom, King of Latveria"), ("miku", "Trostani, Selesnya’s Voice"),
         ("zimone", "Zimone, Infinite"), ("killian", "Killian, Decisive Mentor"), ("quintorius", "Quintorius, History Chaser"),
         ("rootha", "Rootha, Mercurial Artist"), ("sai", "Sai, Master Thopterist"), ("dina", "Dina, Soul Steeper")]


def tiles(n):
    return '<div class="grid">' + "".join(
        f'<div class="tile"><img src="{img("c-" + k + ".jpg")}" alt="{nm}"><b>{nm}</b><span>×1</span></div>' for k, nm in TILES[:n]) + '</div>'


def collection(d):
    n = 12 if d else 9
    return (f'<div class="ap{" dk2" if d else ""}"><div class="dtabs"><span class="on">Cards</span><span>Sets</span><span>History</span><span>Wishlist</span></div>'
            f'<div style="display:flex;gap:10px;align-items:center"><span class="srch" style="flex:1">Search Sam’s cards…</span></div>'
            f'<span class="cnt">2,140 cards · 312 sets</span><div class="rel">{tiles(n)}'
            f'<span class="press" style="left:-4px;top:-4px;width:calc({"16.66%" if d else "33.33%"} - 2px);height:{"calc(100% / 2 + 6px)" if d else "calc(100% / 3 + 4px)"}"><b>Press a card</b></span></div></div>')


def commanders(d, n=2):
    keys = ["jace", "ashling", "giada"][:n]
    rows = "".join(crow(k, i + 1, "Why it fits" if i == 0 else None) for i, k in enumerate(keys))
    cols = "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px" if d else "display:flex;flex-direction:column;gap:12px"
    return (f'<div class="ap"><span class="cnt">58 commanders Sam owns and hasn’t built</span><div style="{cols}">{rows}</div></div>')


def tag():
    return '<span class="sw2">STAND-IN WORDS</span>'


def hmc(d):
    rs = [("ashling", "Ashling, the Limitless", "Fast, red, and every elemental comes back hasty. 38 of the 99 are in Sam’s binder.", 92),
          ("jace", "Jace, Multiverse Architect", "Red is one of its four colors; wins slower, through planeswalkers.", 71),
          ("giada", "Giada, Font of Hope", "No red, but a fast flying team that needs no combo.", 64)]
    rows = "".join(f'<div class="hr"><em>{i + 1}</em><img src="{img("a-" + k + ".jpg")}" alt=""><span><b>{n}</b>{w}</span>'
                   f'<span class="f">{f}<small>FIT</small></span></div>' for i, (k, n, w, f) in enumerate(rs))
    return ('<div class="ap"><div class="ask"><small>Anything else? <span class="ro2">read-only</span></small>Something red and fast that doesn’t need a combo to win.</div>'
            f'<div class="wo">{tag()}<span class="k">Ranked for Sam</span><div class="hmc">{rows}</div></div></div>')


def deck_head():
    return (f'<div class="dhead"><img src="{img("a-ashling.jpg")}" alt=""><div><b>Ashling, the Limitless</b>'
            '<span>99 / 99 · 97 owned · 2 to buy</span></div></div>')


# The shipped card marks (marks drawn from src: card-fact-mark.tsx, proxy-tag.tsx, availability-marker.tsx, mark-key.tsx)
GCP = '<svg width="11" height="11" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.4 1.5 L4.1 8.8 H7.3 L6.6 14.5 L11.9 7.0 H8.7 Z" fill="currentColor"/></svg>'
TUT = '<svg width="11" height="11" viewBox="0 0 16 16" aria-hidden="true"><path d="M1.8 12.2 H14.2 V14.4 H1.8 Z" fill="currentColor"/><path d="M8 1.3 L11.7 5.7 H9.2 V10.3 H6.8 V5.7 H4.3 Z" fill="currentColor"/></svg>'
MK = {
    "gc": f'<span class="fx" title="game changer">{GCP}</span>',
    "tutor": f'<span class="fx" title="tutor">{TUT}</span>',
    "proxy": '<span class="px">P</span>',
    "buy": '<span class="dl">$</span>',
    "short": '<span class="avm"><i class="dm"></i>short</span>',
    "over": '<span class="avm ov"><i class="dm"></i><i class="dm d2"></i>short</span>',
}
KEYWORD = {"buy": "to buy", "proxy": "proxy", "gc": "game changer", "tutor": "tutor", "short": "another deck holds it", "over": "two decks want one copy"}
KEYMK = {"buy": MK["buy"], "proxy": MK["proxy"], "gc": MK["gc"], "tutor": MK["tutor"], "short": '<span class="avm"><i class="dm"></i></span>',
         "over": '<span class="avm ov"><i class="dm"></i><i class="dm d2"></i></span>'}

# name, pip colors, after-name marks, right-side marks
DECKROWS = [
    ("Creatures", 31, [("Fury", "RR", [], ["proxy"]), ("Flamekin Harbinger", "R", ["tutor"], []),
                       ("Soulbright Flamekin", "R", [], ["buy"]), ("Smokebraider", "R", [], [])]),
    ("Spells", 12, [("Jeska’s Will", "R", ["gc"], ["buy"]), ("Gamble", "R", ["tutor"], [])]),
    ("Artifacts", 9, [("Sol Ring", "", [], ["over"]), ("Arcane Signet", "", [], ["short"])]),
]


def markkey(ids):
    return '<div class="mkey">' + "".join(f'<span>{KEYMK[i]}{KEYWORD[i]}</span>' for i in ids) + '</div>'


def deckrows(d, note=True):
    out = markkey(["buy", "proxy", "gc", "tutor", "short", "over"])
    for grp, n, rows in DECKROWS:
        out += f'<div class="rows"><span class="h">{grp}<em>{n}</em></span>'
        for name, cs, after, right in rows:
            miss = "buy" in right
            pipz = "".join(f'<i style="background:#C05A3E"></i>' for _ in cs) or '<i style="background:#9C9384"></i>'
            out += (f'<div class="r1"><span class="dot{" miss" if miss else ""}"></span><span class="n">{name}{"".join(MK[a] for a in after)}</span>'
                    + "".join(MK[r] for r in right) + f'<span class="mv">{pipz}</span></div>')
        out += "</div>"
    return out


def deck(d):
    note = ('<div class="mnote"><b>Sol Ring</b> is short: Sam’s one copy is in two decks. The first deck to commit keeps it; '
            'the other shows it to buy.</div>')
    return (f'<div class="ap">{deck_head()}<div class="dtabs"><span class="on">Your deck<sup>99</sup></span><span>Analysis</span><span>Consider</span><span>Games</span></div>'
            f'<div class="rel"><div class="seg"><span class="on">All 99</span><span class="acc">Shopping 2</span><span>Stats</span><span>Notes</span></div></div>'
            f'<div class="rel">{deckrows(d)}<span class="press" style="left:-4px;right:-4px;bottom:-4px;height:84px"><b>Press a mark</b></span></div>{note}</div>')


def analysis(d):
    vc = [("Mana velocity", "Top", 5, "Early ramp 15 · average spell 2.9"), ("Card flow", "Modest", 2, "4 engines, 6 one-time draws"),
          ("Interaction", "Low", 1, "5 answers, 2 at instant speed"), ("Wincons", "Strong", 4, "Hasty copies, Jeska’s Will")]
    cells = "".join(f'<div class="vc"><span class="t">{a}<b>{b}</b></span><span class="bars">' + "".join(
        f'<i class="{"on" if k < n else ""}"></i>' for k in range(5)) + f'</span><span>{c}</span></div>' for a, b, n, c in vc)
    ov = (f'<div class="wo">{tag()}<span class="k">Overview</span><p><span class="cn">Ashling, the Limitless</span> leads a mono-red elemental deck: '
          'cast elementals for their evoke cost, sacrifice them, and take a hasty copy back each time.</p>'
          '<div class="stg"><em>Early</em><span>Rocks and cheap elementals set up evoke from turn two.</span><em>Mid</em><span>Every sacrifice is a second cast: '
          '<span class="cn">Fury</span>’s copy clears the board and swings.</span><em>Close</em><span><span class="cn">Jeska’s Will</span> turns a board of copies into one big turn.</span></div></div>')
    return f'<div class="ap{" dk2" if d else ""}"><div class="dtabs"><span>Your deck</span><span class="on">Analysis</span><span>Consider</span></div><div class="vd">{cells}</div>{ov}</div>'


def suggested(d):
    rs = [("in", "+", "Abrade", "An instant answer to an artifact or a creature; the deck has two."),
          ("in", "+", "Chaos Warp", "Removes anything, at instant speed."),
          ("out", "−", "Smokebraider", "Its mana only casts elementals, and the curve is low without it."),
          ("out", "−", "Incandescent Soulstoke", "Its haste overlaps Ashling’s copies.")]
    rows = "".join(f'<div class="sr2"><span class="sg {c}">{s}</span><b>{n}</b><span class="buy" style="visibility:{"visible" if c == "in" and n == "Chaos Warp" else "hidden"}">buy</span><p>{w}</p></div>' for c, s, n, w in rs)
    return ('<div class="ap"><div class="ask"><small>What Sam asked <span class="ro2">read-only</span></small>More interaction, and fewer cards that only work with the commander.</div>'
            f'<div class="wo">{tag()}<span class="k">2 in · 2 out · why these cards</span><div class="swp">{rows}</div></div></div>')


def to99(d):
    rs = [("out", "−", "Inferno Titan", "The weakest of five six-drops, and not an elemental."),
          ("out", "−", "Mind Stone", "A fourth rock the curve doesn’t need."),
          ("out", "−", "Rolling Thunder", "Slow removal; Fury does the job sooner.")]
    rows = "".join(f'<div class="sr2"><span class="sg {c}">{s}</span><b>{n}</b><span></span><p>{w}</p></div>' for c, s, n, w in rs)
    mb = ('<div class="mb"><div class="l"><span>Red asks</span><i style="background:#C05A3E;width:88%"></i><span>54 pips</span></div>'
          '<div class="l"><span>Red sources</span><i style="background:#C05A3E;width:100%;opacity:.7"></i><span>37 of 37</span></div></div>')
    return (f'<div class="ap"><span class="cnt">This deck is 3 over · Proposed cuts</span>'
            f'<div class="wo">{tag()}<span class="k">Look deeper · the named cuts</span><div class="swp">{rows}</div></div>'
            f'<div class="wo"><span class="k">Mana Balance · free</span>{mb}<p style="font-size:12.5px;color:var(--fg-muted)">Mono-red: every source makes red. Nothing to fix.</p></div></div>')


def shopping(d):
    rows = (f'<div class="r1"><span class="dot miss"></span><span class="n">Soulbright Flamekin</span><span class="si">⇄</span><span class="buy">buy $2.60</span></div>'
            f'<div class="r1"><span class="dot miss"></span><span class="n">Jeska’s Will{MK["gc"]}</span><span class="buy">buy $6.80</span></div>')
    wd = (f'<div class="wd">{tag()}<img src="{img("c-swords.jpg")}" alt="Swords to Plowshares"><div class="t"><b>Which deck needs it most?</b>'
          f'<span>Sam just got a Swords to Plowshares.</span><span class="best"><img src="{img("a-giada.jpg")}" alt=""><span><b>Giada, Font of Hope</b><br>White, and the deck has only three answers.</span></span>'
          '<span>Jace could play it too, as a cheap answer.</span></div></div>')
    return (f'<div class="ap"><div class="seg"><span>All 99</span><span class="on acc">Shopping 2</span><span>Stats</span><span>Notes</span></div>'
            f'<span class="cnt">$9.40 · 2 cards · cheaper stand-ins first</span><div class="rows">{rows}</div>{wd}</div>')


SCREENS = [collection, commanders, hmc, deck, analysis, suggested, to99, shopping]


def hero_phone():
    """The hero's screen: the drawn Commanders For you, inside a phone shell (no real account)."""
    inner = ('<div class="ap" style="padding:16px 14px 0;gap:10px">'
             '<div class="dtabs"><span class="on">For you</span><span>Discover</span><span>Help me choose</span></div>'
             '<b style="font:700 19px Cinzel,serif;margin-top:4px">Commanders</b><span class="cnt">58 you own and haven’t built</span>'
             + crow("jace", 1) + crow("ashling", 2) + '</div>')
    return inner
