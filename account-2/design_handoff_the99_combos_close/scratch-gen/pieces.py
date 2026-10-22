"""Shipped page pieces (header, tabs, list) and the message system's blocks, at 390 and 1300."""
from kit import img

STATUS = {  # token, label ink, edge, dashed
    "To buy": ("var(--accent)", "var(--accent)", "var(--border-strong)", False),
    "Over": ("var(--danger)", "var(--fg)", "var(--danger)", False),
    "Complete": ("var(--success)", "var(--success)", "var(--border-strong)", False),
    "Building": ("var(--fg)", "var(--fg)", "var(--border-strong)", False),
    "Draft": ("var(--fg-body)", "var(--fg-body)", "var(--border-strong)", True),
}

DECKS = {
    "thopter": dict(name="Thopter Works", cmd="Sai, Master Thopterist", color="Blue", pips=["u"], art="sai",
                    status="To buy", built=99, bracket=("b3", "Upgraded", "var(--bracket-3)")),
    "stompy": dict(name="Big Stompy", cmd="Ghalta, Primal Hunger", color="Green", pips=["g"], art="ghalta",
                   status="Over", built=100, bracket=("b4", "Optimized", "var(--bracket-4)")),
    "stompy-short": dict(name="Big Stompy", cmd="Ghalta, Primal Hunger", color="Green", pips=["g"], art="ghalta",
                         status="Building", built=87, bracket=("b4", "Optimized", "var(--bracket-4)")),
    "stompy-done": dict(name="Big Stompy", cmd="Ghalta, Primal Hunger", color="Green", pips=["g"], art="ghalta",
                        status="Complete", built=99, bracket=("b4", "Optimized", "var(--bracket-4)")),
    "thopter-draft": dict(name="Thopter Works", cmd="Sai, Master Thopterist", color="Blue", pips=["u"], art="sai",
                          status="Draft", built=99, bracket=("b3", "Upgraded", "var(--bracket-3)")),
    "first": dict(name="Thopter Works", cmd="Sai, Master Thopterist", color="Blue", pips=["u"], art="sai",
                  status="Draft", built=0, bracket=None),
}

WORD = {1: "One", 2: "Two", 3: "Three"}


def pill(status):
    tok, ink, edge, dashed = STATUS[status]
    return (f'<span class="pill" style="background:color-mix(in srgb,{tok} {"14%" if dashed else "18%"},var(--bg));'
            f'color:{ink};border:1px {"dashed" if dashed else "solid"} {edge}">{status}</span>')


def bchip(b):
    if not b:
        return ""
    k, name, ink = b
    return (f'<span class="bchip" style="background:color-mix(in srgb,{ink} 12%,var(--bg));border:1px solid '
            f'color-mix(in srgb,{ink} 55%,transparent);color:{ink}"><img alt="" src="{img(k)}">{name}</span>')


def pips(cs):
    return '<span class="pips">' + "".join(f'<i style="background:var(--{c})"></i>' for c in cs) + "</span>"


def bar(d):
    tok = STATUS[d["status"]][0]
    pct = min(100, round(d["built"] / 99 * 100))
    return f'<div class="bar"><i style="width:{pct}%;background:{tok}"></i></div>'


def count(d):
    over = d["built"] - 99
    ink = "var(--danger)" if over > 0 else "var(--fg)"
    dl = f'<span class="dl" style="color:var(--danger)">+{over}</span>' if over > 0 else ""
    return f'<div class="cnt"><span style="color:{ink}">{d["built"]}</span><span class="den">/99</span>{dl}</div>'


ICON_SWAP = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 8h14l-4-4M20 16H6l4 4"/></svg>'
ICON_FULL = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'
ICON_EXPORT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fg-faint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'


def app_header():
    return ('<div class="mhd"><div class="wm"><span class="the">THE</span><span class="mk"><span class="dia"><i></i><i></i><i></i></span>'
            '<span class="nn">99</span></span></div><span class="av">HH</span></div>')


def phone_header(d, today_lines="", notice=False, commit_v1=False):
    """SpineMobile: the 288 band, the bar row (+ today's proxy and over lines), the actions row."""
    nt = '<span class="ntag"><i></i>3 notices</span>' if notice else ""
    acts = ""
    if d["built"] > 0:
        acts = ('<div class="acts"><span class="gb">Update from a list</span><span class="gb acc">' + ICON_EXPORT + '</span>'
                + ('<span class="pb">Commit as v1</span>' if commit_v1 else "") + '<span class="gb">⋯</span></div>')
    return (f'<div class="hero"><img alt="" src="{img(d["art"])}"><div class="wash"></div>'
            f'<div class="door"><span>{ICON_SWAP}</span><span>{ICON_FULL}</span></div>'
            f'<div class="blk"><h1>{d["name"]}<span class="pen">✎</span></h1>'
            f'<div class="meta">{pips(d["pips"])}<span>{d["cmd"]} · {d["color"]}</span></div>'
            f'<div class="chips">{pill(d["status"])}{bchip(d["bracket"])}{nt}</div></div></div>'
            f'<div class="sub"><div class="barrow">{bar(d)}{count(d)}</div>{today_lines}</div>{acts}')


def desk_header(d, today_lines="", notice=False, commit_v1=False):
    nt = '<span class="ntag"><i></i>3 notices</span>' if notice else ""
    btns = ('<span class="db">Update from a list</span>'
            + ('<span class="db g">Export</span><span class="db p">Commit as v1</span>' if commit_v1 else '<span class="db p">Export</span>')
            + '<span class="db g">⋯</span>') if d["built"] > 0 else '<span class="db g">⋯</span>'
    return (f'<div class="dhero"><div class="art"><img alt="" src="{img(d["art"])}"><div class="g"></div></div>'
            f'<div class="in"><div class="col"><div style="display:flex;align-items:center"><h1>{d["name"]}</h1>'
            f'<span style="margin-left:6px;font-size:14px;color:var(--fg-muted)">✎</span></div>'
            f'<div class="meta">{pips(d["pips"])}<span>{d["cmd"]} · {d["color"]}</span></div>'
            f'<div class="chips">{pill(d["status"])}{bchip(d["bracket"])}{nt}</div>'
            f'<div class="barrow">{bar(d)}{count(d)}</div>{today_lines}</div>'
            f'<div class="acol">{btns}</div></div></div>')


def today_proxy(n=1):
    return f'<p class="hline">{"1 of these is a proxy" if n == 1 else f"{n} of these are proxies"}</p>'


def today_over(n, cuts=True):
    w = WORD[n]
    return (f'<p class="oline"><b>{w} over the ninety-nine.</b> Cut {w.lower()} and it is legal.</p>'
            + ('<span class="cuts" data-anchor="cuts">Proposed cuts →</span>' if cuts else ""))


def today_over_desk(n):
    w = WORD[n]
    return (f'<p class="oline"><b>{w} over the ninety-nine.</b> Cut {w.lower()} and it is legal. '
            f'<span class="m" style="color:var(--accent);font-size:11.5px;border-bottom:1px solid var(--accent-shadow)">Proposed cuts →</span></p>')


TAB_SETS = {"std": [("Your deck", "99"), ("Analysis", ""), ("Consider", "88"), ("Games", "5"), ("Versions", "3")],
            "first": [("Your deck", "0"), ("Analysis", ""), ("Consider", "99"), ("Games", ""), ("Versions", "")]}


def tabs(kind="std", built=None):
    out = []
    for i, (t, n) in enumerate(TAB_SETS[kind]):
        if i == 0 and built is not None:
            n = str(built)
        out.append(f'<span class="{"on" if i == 0 else ""}">{t}{f"<em>{n}</em>" if n else ""}</span>')
    return '<div class="tabs">' + "".join(out) + "</div>"


def dtabs(kind="std", built=None):
    out = []
    for i, (t, n) in enumerate(TAB_SETS[kind]):
        if i == 0 and built is not None:
            n = str(built)
        out.append(f'<span class="{"on" if i == 0 else ""}">{t}{f"<em>{n}</em>" if n else ""}</span>')
    return '<div class="dtabs">' + "".join(out) + "</div>"


ROWS = [("Arcbound Ravager", ["c3"], True, False), ("Etherium Sculptor", ["c1", "u"], True, True),
        ("Faerie Mastermind", ["c1", "u"], False, True), ("Glint-Nest Crane", ["c1", "u"], True, False)]


def mana(ps):
    o = []
    for p in ps:
        if p.startswith("c"):
            o.append(f'<span class="mnum">{p[1:]}</span>')
        else:
            o.append(f'<span class="mpip" style="background:var(--{p})"></span>')
    return '<span style="display:inline-flex;gap:3px;align-items:center">' + "".join(o) + "</span>"


def phone_list(changed=False, shopping="2", built=99):
    rows = "".join(
        f'<div class="row{" chg" if (changed and ch) else ""}"><span class="ow{"" if own else " no"}"></span><span class="nm">{n}</span>{mana(ps)}<span class="x">✕</span></div>'
        for n, ps, own, ch in ROWS)
    cap = ('<p class="m" style="font-size:10px;color:var(--fg-faint);padding:12px 16px 0">the brass rule marks the 6 rows you have changed</p>'
           if changed else "")
    return (f'<div class="seg"><span class="on">All<em>{built}</em></span><span class="sh">Shopping<em>{shopping}</em></span><span>Stats</span><span>Notes<em>2</em></span></div>'
            f'{cap}<div class="grp"><h4>Artifacts<em>24</em></h4>{rows}</div>')


def desk_list(note="", changed=False):
    rows = "".join(
        f'<div class="row{" chg" if (changed and ch) else ""}"><span class="ow{"" if own else " no"}"></span><span class="nm">{n}</span>{mana(ps)}<span class="x">✕</span></div>'
        for n, ps, own, ch in ROWS + [("Ornithopter", ["c0"], True, False), ("Sai's Thopter Kit", ["c2"], False, False)])
    return (f'<div class="dtool"><span class="sg"><span class="on">All<em>99</em></span><span style="color:var(--accent)">Shopping<em>2</em></span>'
            f'<span>Stats</span><span>Notes<em>2</em></span></span>{note}</div><div class="dgrp"><h4>Artifacts<em>24</em></h4>{rows}</div>')


def fold(top, label="first screen ends · above the dock and tab bar"):
    return f'<div class="fold" style="top:{top}px"><span>{label}</span></div>'


def phone(inner, fold_at=700, extra=""):
    return f'<div class="ph">{app_header()}{inner}{fold(fold_at) if fold_at else ""}{extra}</div>'


RAIL_ICONS = ["M3 11l9-7 9 7v9H3z", "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", "M3 18l3-10 6 5 6-5 3 10z",
              "M12 3l9 9-9 9-9-9z", "M7 3h10v18H7z"]


def desk(inner, fold_at=820, extra=""):
    sl = "".join(f'<span class="sl{" on" if i == 4 else ""}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="{p}"/></svg></span>'
                 for i, p in enumerate(RAIL_ICONS))
    return (f'<div class="dk"><div class="rail"><div class="lg"><span class="dia"><i></i><i></i><i></i></span>99</div>{sl}</div>'
            f'<div class="main dkm">{inner}</div>{fold(fold_at, "a 900px window ends here") if fold_at else ""}{extra}</div>')


# ---------------------------------------------------------------- today's blocks (shipped, for the before frames)

def t_over_band(n=2, soft=0, link=True):
    body = (f"{n} of these are on more committed decks than you have copies." if n > 1
            else "Sol Ring is on 3 committed decks and you own 2.")
    s = (f'<section style="margin-top:14px;border-bottom:1px solid var(--border)"><div class="t-over-band"><span style="margin-top:4px"><span class="og"><i></i><i></i></span></span>'
         f'<div style="flex:1"><div style="font-size:12.5px;font-weight:600;color:var(--avail-over-fg)">{n} card{"s" if n > 1 else ""} here {"are" if n > 1 else "is"} spoken for twice</div>'
         f'<div style="font-size:12px;margin-top:3px;color:var(--fg-muted);line-height:1.55">{body}</div>'
         + (f'<div style="margin-top:4px" class="m"><span style="font-size:11.5px;color:var(--accent)">See them in Shopping</span></div>' if link else "")
         + "</div></div>")
    if soft:
        s += (f'<div class="t-soft-band"><span style="margin-top:4px"><span class="sg-soft"></span></span><div style="flex:1"><div style="font-size:12.5px;font-weight:600;color:var(--fg-body)">{soft} more are in other drafts too</div>'
              f'<div style="font-size:12px;margin-top:3px;color:var(--fg-muted);line-height:1.55">Nothing to sort out yet. None of those is past a draft either.</div></div></div>')
    return s + "</section>"


def ledger_lines(desk=False, n=31):
    seed = ('<div class="ll"><div class="lt"><span class="lb">the seed</span>'
            + ('' if desk else '<span class="rv">Clear all auto reverses it</span>')
            + '</div><p class="se">22 cards: the roles and the mana base, 4 to buy.</p><div class="bt"><span>Show these 22</span></div>'
            + ('<span class="rv">Clear all auto reverses it</span>' if desk else '') + '</div>')
    top = ('<div class="ll nw"><div class="lt"><span class="lb">1st top-off</span></div>'
           '<p class="se">9 cards you chose from the last 12, 5 of them to buy.</p><div class="bt"><span>Show these 9</span><span>Undo these 9</span></div></div>')
    return seed + top


def t_ledger(n=31):
    return (f'<div class="t-ledger"><div style="display:flex;align-items:center;gap:9px;margin-bottom:9px"><span class="disc">i</span>'
            f'<span style="font-size:12px;color:var(--fg-body)">Where these {n} cards came from</span></div><div style="display:flex;flex-direction:column;gap:6px">{ledger_lines()}</div></div>')


def pending_names():
    lines = [("+", "var(--success)", "Thopter Spy Network", "", '<span class="pt">$4.10</span>'),
             ("+", "var(--success)", "Whirler Rogue", "or pull from Big Stompy", ""),
             ("+", "var(--success)", "Efficient Construction", "", ""),
             ("+", "var(--success)", "Hangarback Walker", "", '<span class="pt">$1.80</span>'),
             ("−", "var(--warning)", "Ornithopter", "back in the pool on commit", ""),
             ("−", "var(--warning)", "Sol Ring", "back in the pool on commit", "")]
    return '<ul class="nl">' + "".join(
        f'<li><span class="sg" style="color:{c}">{s}</span><span>{n}</span>{t}<span class="ht">{h}</span></li>' for s, c, n, h, t in lines) + "</ul>"


def pending_card(kind="names", wrap=True, extra=""):
    """PendingBanner. names = 6 inline lines (Commit leads); counts = 7+ (Review leads)."""
    if kind == "names":
        head = ('<div class="ey">Pending changes: not yet a version<span class="ct"><span style="color:var(--success)">+4</span>'
                '<span style="color:var(--border-strong)">/</span><span style="color:var(--warning)">−2</span></span></div>')
        body = pending_names()
        ctl = ('<div class="ctl"><span class="cta">Commit as v4</span><div class="r2"><span class="dsc">Discard</span>'
               '<span class="rvl">review changes</span></div></div>')
    else:
        head = ('<div class="ey">Pending changes: not yet a version<span class="ct"><span style="color:var(--success)">+5</span>'
                '<span style="color:var(--border-strong)">/</span><span style="color:var(--warning)">−4</span></span><span class="sn">9 changes since v2</span></div>')
        body = ('<p class="bd">3 of the 5 are short of spare copies, so this commit will ask for 3 to buy · '
                '<span class="m" style="color:var(--warning);font-size:12px">$11.40</span>.</p>')
        ctl = ('<div class="ctl"><span class="cta">Review 9 changes</span><div class="r2"><span class="cta2">Commit as v3</span>'
               '<span class="dsc">Discard</span></div></div>')
    card = f'<div class="ac">{head}{body}{ctl}{extra}</div>'
    return f'<div class="aw">{card}</div>' if wrap else card


def mix(desk=False, cells=None, draft=False, phone_parity=False, moment_land=False):
    cells = cells or [("Ramp", 11, 10, None), ("Draw", 9, 10, None), ("Removal", 6, 8, "consider →"),
                      ("Wipes", 2, 2, None), ("Land", 36, 37, "balance →")]
    if desk:
        src = '<span class="ms">EDHREC averages</span>' + ('<span class="ms" style="color:var(--accent);letter-spacing:.06em">· reading pending changes</span>' if draft else "")
    elif phone_parity:
        src = '<span class="ms new">EDHREC averages' + (' <em>· reading pending changes</em>' if draft else "") + "</span>"
    else:
        src = ""
    out = []
    for lab, have, tgt, link in cells:
        met = have >= tgt
        ink = "var(--success)" if met else "var(--accent)"
        if desk:
            pct = min(100, round(have / tgt * 100))
            lk = f'<span class="ck">{link.replace("balance", "balance mana")}</span>' if link else '<span class="cd">—</span>'
            out.append(f'<div class="cell{"" if met else " sh"}"><p class="cl">{lab}</p><p class="cf" style="color:{ink}">{have}<span> / {tgt}</span></p>'
                       f'<div class="cb"><i style="width:{pct}%;background:{ink}"></i></div><div class="cx"><span class="cr">rec {tgt}</span>{lk}</div></div>')
        else:
            lk = f'<p class="ck">{link}</p>' if link else '<p class="cd">—</p>'
            out.append(f'<div class="cell{"" if met else " sh"}"><p class="cl">{lab}</p><p class="cf" style="color:{ink}">{have}</p>'
                       f'<p class="cr">rec {tgt}</p>{lk}</div>')
    return (f'<section class="mix"><div class="mh"><span class="ml">Recommended mix</span>{src}</div>'
            f'<div class="cells">{"".join(out)}</div><span class="why">Why these numbers?</span></section>')


def t_version(v="v3 · committed 2 Oct 2026"):
    return f'<div class="sl">{v}</div>'


def t_last(n=12, cands=151):
    return (f'<div class="t-last"><p class="e">The last {n}</p><p class="c">{n} slots open · {cands} candidates ranked by synergy for this commander</p>'
            f'<span class="b" data-anchor="door">Choose the last {n} ↓</span><p class="n">6 you can sleeve. Nothing is added until you say so.</p></div>')


def t_arrival_precon(desk=False):
    return ('<div class="rc"><span class="ok">✓</span><div class="tx"><span class="hd">Started from the Veloci-Ramp-Tor precon</span>'
            '<span class="bd">You own 71 of its 99. The 28 you don’t are in Shopping.</span>'
            '<span class="mt">Lost Caverns of Ixalan · printings: this precon’s copies <a>History</a></span></div><span class="x">✕</span></div>')


# ---------------------------------------------------------------- R1 blocks

def receipt(kind="precon", desk=False):
    if kind == "precon":
        return t_arrival_precon(desk)
    if kind == "import":
        return ('<div class="rc"><span class="ok">✓</span><div class="tx"><span class="hd">All 100 lines came over clean.</span>'
                '<span class="mt">Imported from your list a moment ago</span></div><span class="x">✕</span></div>')
    if kind == "import-owned":
        return ('<div class="rc"><span class="ok">✓</span><div class="tx"><span class="hd">98 cards added to your collection.</span>'
                '<span class="bd">The lines we couldn’t put a card to added nothing.</span>'
                '<span class="mt">Imported from your list a moment ago <a>History</a></span></div><span class="x">✕</span></div>')
    if kind == "update":
        return ('<div class="rc"><span class="ok">✓</span><div class="tx"><span class="hd">Updated from your list: 6 in, 4 out, 2 you kept.</span>'
                '</div><span class="x">✕</span></div>')
    if kind == "suggest":
        return ('<div class="rc"><span class="ok" style="color:var(--fg-faint)">?</span><div class="tx"><span class="hd">Looks like this started as Veloci-Ramp-Tor, with a different commander.</span>'
                '<span class="mt">74 of its 99 cards are in this deck · led by Pantlaza</span></div><span class="lk">Link it</span><span class="x">✕</span></div>')


def warn_spoken(n=2, desk=False, card=None):
    body = (f"{n} of these are on more committed decks than you have copies." if n > 1
            else f"{card or 'Sol Ring'} is on 3 committed decks and you own 2.")
    return (f'<div class="wr"><span class="mk"><span class="og"><i></i><i></i></span></span><div class="tx">'
            f'<span class="hd">{n} card{"s" if n > 1 else ""} here {"are" if n > 1 else "is"} spoken for twice</span>'
            f'<p class="bd">{body}</p><span class="lk">See them in Shopping</span></div></div>')


def warn_over(n=1, desk=False, cuts=True, anchor=False):
    w = WORD[n]
    a = ' data-anchor="cuts"' if anchor else ""
    return (f'<div class="wr"><span class="mk fig">+{n}</span><div class="tx">'
            f'<span class="hd">{w} over the ninety-nine.</span><p class="bd">Cut {w.lower()} and it is legal.</p>'
            + (f'<span class="lk"{a}>Proposed cuts →</span>' if cuts else "") + '</div></div>')


def warn_block(rows, desk=False):
    inner = f'<div class="wb">{"".join(rows)}</div>'
    return f'<div class="wbw">{inner}</div>' if desk else inner


def status_line(segs, open_detail=""):
    """segs: list of (text, disclosure?, open?)."""
    out = []
    for i, (t, ds, op) in enumerate(segs):
        if i:
            out.append('<span class="sep">·</span>')
        if ds:
            out.append(f'<span class="tap"><span class="ds">{t}<span class="car">{"▴" if op else "▾"}</span></span></span>')
        else:
            out.append(f"<span>{t}</span>")
    return f'<div class="sl"><div>{"".join(out)}</div>{open_detail}</div>'


def ledger_detail(desk=False, n=31):
    meta = '<span class="mm">2 passes · 9 to buy</span>' if desk else ""
    return (f'<div class="sld"><div class="lh"><span class="disc">i</span>Where these {n} cards came from{meta}</div>{ledger_lines(desk)}</div>')


def soft_detail(n=4):
    return (f'<div class="sldp"><span class="sg-soft"></span><span><b style="color:var(--fg-body);font-weight:600">{n} cards here are in other drafts too.</b> '
            'Nothing to sort out yet. None of those is past a draft either. Whichever you sleeve first gets them.</span></div>')


def act_last(n=12, cands=151, note=True, anchor=False, also=""):
    a = ' data-anchor="door"' if anchor else ""
    return (f'<div class="aw"><div class="ac"><div class="ey">The last {n}</div>'
            f'<p class="bd">{n} slots open · {cands} candidates ranked by synergy for this commander</p>'
            f'<div class="ctl"><span class="cta"{a}>Choose the last {n} ↓</span></div>'
            + ('<p class="note2">6 you can sleeve. Nothing is added until you say so.</p>' if note else "") + f'{also}</div></div>')


def also_pending(desk=False):
    return ('<div class="also"><span class="al">Pending changes: not yet a version</span>'
            '<span class="as"><span class="ct"><span style="color:var(--success)">+5</span> / <span style="color:var(--warning)">−4</span></span>9 changes since v2</span>'
            '<span class="ln"><a>Review 9 changes</a><a>Commit as v3</a><a style="color:var(--fg-muted)">Discard</a></span></div>')


def also_unresolved(desk=False):
    return ('<div class="also"><span class="al">2 lines unresolved</span>'
            '<span class="as">2 lines came over that we couldn’t put a card to. They’ll keep the deck off <b style="color:var(--fg)">Complete</b> until you sort them out.</span>'
            '<span class="ln"><a>Take a look →</a></span></div>')


def act_unresolved(also=""):
    return ('<div class="aw"><div class="ac"><div class="ey">2 lines unresolved</div>'
            '<p class="bd">2 lines came over that we couldn’t put a card to. They’re at the bottom of the list, not counted in the mix, and they’ll keep the deck off <b>Complete</b> until you sort them out.</p>'
            f'<div class="ctl"><span class="cta">Take a look →</span></div>{also}</div></div>')


def act_failed():
    return ('<div class="aw"><div class="ac"><p class="hd">The deck is here, the cards aren’t.</p>'
            '<p class="bd">We made the deck but couldn’t fill it. Nothing is lost.</p>'
            '<div class="ctl"><span class="cta">Try filling again</span></div></div></div>')


def act_exhausted():
    return ('<div class="aw"><div class="ac"><div class="ey">The last 12</div>'
            '<p class="bd">87 of 99. Your collection ran out 12 short: there was nothing left in it that EDHREC ranks for this commander.</p></div></div>')


def act_first(desk=False, cmd="Sai, Master Thopterist"):
    fan = ""
    if desk:
        fan = ('<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:none;margin-left:auto">'
               '<span style="position:relative;width:52px;height:52px;display:block">'
               '<i style="position:absolute;left:8px;top:6px;width:26px;height:36px;border-radius:4px;border:1.5px solid var(--border-dashed);background:var(--surface);transform:rotate(-12deg)"></i>'
               '<i style="position:absolute;left:18px;top:4px;width:26px;height:36px;border-radius:4px;border:1.5px solid var(--accent-shadow);background:var(--surface-raised);transform:rotate(8deg)"></i></span>'
               f'<span class="m" style="font:600 30px \'IBM Plex Mono\';color:var(--fg)">0/99</span><span class="m" style="font-size:10px;color:var(--fg-faint)">+ {cmd.split(",")[0]}</span></div>')
    return ('<div class="aw"><div class="ac" style="display:flex;align-items:center;gap:24px"><div style="flex:1;min-width:0">'
            '<div class="ey">Step 3 of 3<span class="crumb"><i></i><i></i><i class="a"></i></span></div>'
            f'<p class="d" style="font:700 {"23" if desk else "16"}px \'Cinzel\',serif;margin-top:7px">Build your first deck</p>'
            '<p class="bd" style="margin-top:4px">Search cards or pick from your suggestions below.</p>'
            '<div class="ctl"><span class="cta" data-anchor="door">Choose the last 99 ↓</span></div>'
            '<p class="note2">99 slots open · 140 candidates ranked by synergy for this commander. Nothing is added until you say so.</p></div>'
            f'{fan}</div></div>')


def moment(tool, line, top, left=16, right=16, nib_left=40):
    return (f'<div class="mo" style="top:{top}px;left:{left}px;right:{right}px"><span class="nib" style="left:{nib_left}px"></span>'
            f'<span class="dm"></span><p><b>{tool}</b> {line}</p><span class="mx">✕</span></div>')


def toast(title, detail, bottom):
    return (f'<div class="toast" role="alert" style="bottom:{bottom}px"><span class="tt"><span class="t1">{title}</span>'
            f'<span class="t2">{detail}</span></span></div>')
