"""R2: the strategies graph in four forms, the focus pick, and Suggested changes aiming at it (two lists, as shipped)."""
import math
import kit
import parts as P
from kit import img

CSS = r"""
/* ---- R2: the block ---- */
.fb{display:flex;flex-direction:column;gap:12px}
.fb .bas{font:10.5px/1.5 'IBM Plex Mono';color:var(--fg-faint)}
.fb .fbh{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.fb .fbs{font-size:12.5px;line-height:1.5;color:var(--fg-muted)}
.fb .fbs b{color:var(--fg);font-weight:600}
.fb .fbs .lk{margin-left:6px}
.fbx{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface-rail);padding:18px 20px}
.ph .fbx{padding:14px 12px;border-radius:11px}
.ftag{display:inline-flex;align-items:center;font:9.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--accent);border:1px solid var(--accent-shadow);border-radius:999px;padding:1px 7px;white-space:nowrap}
/* piles */
.piles{display:flex;align-items:flex-end;justify-content:space-around;gap:10px;padding:6px 4px 0}
.pile{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0;flex:1;padding:8px 4px 6px;border-radius:10px}
.pile .stk{position:relative}
.pile .bk{position:absolute;left:0;border-radius:5px;background:#2E2822;border:1px solid #5C5246;box-sizing:border-box}
.pile .tp{position:absolute;left:0;border-radius:5px;object-fit:cover;display:block;border:1px solid var(--border-strong);box-sizing:border-box;box-shadow:0 6px 14px rgba(0,0,0,.35)}
.pile .nw{position:absolute;left:0;border-radius:5px;border:1.5px dashed var(--accent);background:color-mix(in oklab,var(--accent) 14%,var(--surface));box-sizing:border-box}
.pile .tp.nwi{border:1.5px dashed var(--accent);box-shadow:0 6px 14px rgba(0,0,0,.35)}
.pile .pn{font-size:13px;font-weight:600;color:var(--fg);text-align:center;line-height:1.25;min-height:16px}
.pile .pc{font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.pile .pc em{font-style:normal;color:var(--accent)}
.pile.on{background:color-mix(in oklab,var(--accent) 9%,transparent);box-shadow:inset 0 0 0 1px var(--accent-shadow)}
.pile.on .tp{border:2px solid var(--accent);box-shadow:0 0 0 4px rgba(207,135,69,.16),0 6px 14px rgba(0,0,0,.35)}
.pile.on .pn{color:var(--accent)}
.ph .piles{gap:2px;padding:2px 0 0}
.ph .pile{padding:6px 1px 4px;gap:6px}
.ph .pile .tp.nwi{border:1.5px dashed var(--accent);box-shadow:0 6px 14px rgba(0,0,0,.35)}
.pile .pn{font-size:11.5px}
.ph .pile .pc{font-size:10px}
/* ring */
.ring{display:grid;grid-template-columns:auto minmax(0,1fr);gap:28px;align-items:center}
.ph .ring{grid-template-columns:1fr;gap:14px;justify-items:center}
.rg{position:relative}
.rg .art{position:absolute;border-radius:50%;object-fit:cover;object-position:30% 30%;border:2px solid var(--border-strong);box-sizing:border-box}
.leg{display:flex;flex-direction:column;width:100%}
.leg div{display:flex;align-items:center;gap:10px;min-height:40px;border-top:1px solid var(--border);padding:0 6px;font-size:13px;color:var(--fg)}
.leg div:first-child{border-top:0}
.leg i{width:10px;height:10px;border-radius:3px;flex:none}
.leg span{margin-left:auto;font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.leg div.on{color:var(--accent);font-weight:600}
.ph .leg div{min-height:44px}
/* strip */
.strip{display:flex;gap:4px;height:46px}
.strip div{border-radius:7px;display:flex;flex-direction:column;justify-content:center;padding:0 10px;min-width:0;background:var(--elevated);border:1px solid var(--border-strong)}
.strip div b{font-size:12.5px;font-weight:600;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.strip div span{font:10px 'IBM Plex Mono';color:var(--fg-muted)}
.strip div.on{background:color-mix(in oklab,var(--accent) 22%,var(--surface));border-color:var(--accent)}
.strip div.on b{color:var(--accent)}
.ph .strip{height:30px}
.ph .strip div{padding:0}
/* bars, focus */
.sx.on{background:color-mix(in oklab,var(--accent) 9%,transparent);box-shadow:inset 3px 0 0 var(--accent)}
.sx.on .sn{color:var(--accent)}.sx.on .sb{background:var(--accent);opacity:1}
/* Suggested changes (shipped two lists) */
.scp{display:flex;flex-direction:column;gap:14px}
.scp h3{margin:0;font:400 19px 'Cinzel',serif;color:var(--fg);font-variant:small-caps}
.ph .scp h3{font-size:17px}
.scp .lead{font-size:13px;line-height:1.6;color:var(--fg-body);max-width:760px}
.mfr{display:flex;flex-direction:column;gap:6px}
.mfr div{display:flex;align-items:center;gap:10px;min-height:40px;border-radius:8px;background:var(--surface);border:1px solid var(--border);padding:0 12px;font-size:13px;color:var(--fg-body)}
.mfr div i{width:14px;height:14px;border-radius:4px;border:1px solid var(--border-strong);flex:none}
.mfr div span{margin-left:auto;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.mfr div.new{border:1px dashed var(--accent)}
.mfr div.new span{color:var(--accent)}
.sact{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px}
.ph .sact{flex-direction:column;align-items:stretch}
.sbt{display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 18px;border-radius:8px;border:1px solid var(--accent);color:var(--accent);font:600 13px 'IBM Plex Sans'}
.ph .sbt{height:44px}
.scl{font:10.5px/1.6 'IBM Plex Mono';color:var(--fg-faint)}
.ph .scl{text-align:center}
.lhd{display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.lhd .c{font:10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.lhd .ru{height:1px;min-width:16px;flex:1;background:var(--border)}
.lhd .t{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.lhd .ab{display:flex;align-items:center;min-height:32px;border-radius:7px;padding:0 13px;font-size:12.5px;font-weight:600;color:var(--accent);border:1px solid var(--accent)}
.ph .lhd .ab{min-height:44px}
.lst{display:flex;flex-direction:column;gap:6px}
.ph .lst{gap:10px}
.lst h4{margin:0;display:flex;align-items:baseline;gap:8px;padding:2px 2px 0;font-size:12.5px;font-weight:600;color:var(--fg)}
.lst h4 span{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);font-weight:400}
.ln{display:flex;flex-direction:column;gap:7px;border-radius:9px;padding:10px 12px;background:var(--surface);border:1px solid var(--border)}
.ph .ln{gap:10px;border-radius:10px;padding:12px}
.ln .l1{display:flex;flex-wrap:wrap;align-items:center;gap:9px}
.ln .sg1{width:12px;flex:none;text-align:center;font:600 14px 'IBM Plex Mono'}
.ln .nm{font-size:13px;border-bottom:1px dotted var(--accent);white-space:nowrap}
.ln .nm.a{font-weight:600;color:var(--fg)}
.ln .nm.c{color:var(--fg-body);text-decoration:line-through;text-decoration-color:var(--fg-locked)}
.ln .bt{margin-left:auto;display:flex;gap:7px}
.ln .ya,.ln .no{display:flex;align-items:center;justify-content:center;height:32px;border-radius:7px;padding:0 13px;font-size:12.5px}
.ln .ya{color:var(--accent);border:1px solid var(--accent);font-weight:600}
.ln .no{color:var(--fg-muted);border:1px solid var(--border-strong);font-weight:500;padding:0 12px}
.ph .ln .bt{margin:0;width:100%}
.ph .ln .ya,.ph .ln .no{height:44px;flex:1;border-radius:8px;font-size:13px}
.ln p{margin:0;font-size:12.5px;line-height:1.55;color:var(--fg-body);max-width:980px}
.ln .cts{display:flex;flex-wrap:wrap;gap:5px}
.ln .ct{display:flex;align-items:baseline;gap:5px;border-radius:5px;padding:3px 7px;font:9.5px 'IBM Plex Mono';background:var(--surface-sunken);border:1px solid var(--border)}
.ln .ct span:first-child{text-transform:uppercase;letter-spacing:.1em;color:var(--fg-locked)}
.ln .ct span+span{color:var(--fg-muted)}
.ln .ct.fo{border:1px dashed var(--accent)}
.ln .ct.fo span:first-child{color:var(--accent)}
.ln .ct.fo span+span{color:var(--fg)}
.ans2{display:flex;flex-wrap:wrap;align-items:center;gap:9px;border-radius:9px;padding:9px 12px;background:var(--surface);border:1px solid var(--success)}
.ans2 .al{display:flex;align-items:center;gap:6px;font:9.5px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--success)}
.ans2 .ck{width:15px;height:15px;border-radius:4px;border:1px solid var(--success);font-size:9px;display:flex;align-items:center;justify-content:center}
.ans2 .an{font-size:12.5px;color:var(--fg-body)}
.ans2 .ub{margin-left:auto;min-height:32px;border-radius:7px;padding:0 11px;font-size:12px;font-weight:500;color:var(--fg-muted);border:1px solid var(--border-strong);display:flex;align-items:center}
"""
kit.CSS += CSS

# name, count, top card in the deck (a real card of that strategy)
AANG = [("Allies", 22, "aang-swift-savior"), ("Spells matter", 17, "counterspell"), ("Tokens", 11, "jasmine-tea-shop"),
        ("Evasion", 9, "appa-loyal"), ("+1/+1 counters", 6, "all-will-be-one")]
NEW_KEYS = ["avenger-of-zendikar", "bloodline-keeper"]
TONES = ["#6E6352", "#5A5144", "#4A4238", "#3D372F", "#332E28"]
SUB = "What this list runs more of than Commander cards at large, by card count. Press one to make it the deck’s focus."


def focus_line(focus):
    if not focus:
        return '<span class="fbs">No focus yet: Suggested changes keeps the deck balanced.</span>'
    return (f'<span class="fbs">Focus <b>{focus}</b>: Suggested changes aims at it. '
            '<span class="lk">Keep it balanced</span></span>')


def block(form="piles", ph=False, focus="Tokens", rows=AANG, added=0, state=None, sub=True):
    head = '<div class="fbh"><span class="lbl">What it’s built around</span></div>'
    s = f'<div class="bas">{SUB}</div>' if sub else ""
    if state:
        return f'<div class="fb new">{head}{s}<div class="fbx">{state}</div></div>'
    if form == "piles" and ph:
        form = "side"
    g = {"piles": piles, "ring": ring, "strip": strip, "bars": bars, "side": side, "piles5": piles, "scroll": scroll}[form](rows, focus, ph, added)
    return f'<div class="fb new">{head}{s}<div class="fbx">{g}</div>{focus_line(focus)}</div>'


# ---------------------------------------------------------------- piles: each strategy a stack of its cards, its top card face up
def piles(rows, focus, ph, added=0):
    cw, chh, step = (40, 56, 2.0) if ph else (58, 81, 3.6)
    top = max(n for _, n, _ in rows) + added
    H = chh + (top - 1) * step
    out = []
    for name, n, key in rows:
        extra = added if name == focus else 0
        tot = n + extra
        layers = []
        backs = min(n - 1, 40)
        for i in range(backs):
            y = H - chh - i * step
            dx = (0, 1.5, -1, 0.5, -1.5)[i % 5] if not ph else (0, 1, -1)[i % 3]
            layers.append(f'<span class="bk" style="top:{y:.1f}px;left:{dx}px;width:{cw}px;height:{chh}px"></span>')
        y_top = H - chh - backs * step
        layers.append(f'<img class="tp" src="{P.card(key)}" alt="" style="top:{y_top:.1f}px;width:{cw}px;height:{chh}px">')
        for j, nk in enumerate(NEW_KEYS[:extra]):
            y = y_top - (j + 1) * (step * 3)
            layers.append(f'<img class="tp nwi" src="{P.card(nk)}" alt="" style="top:{y:.1f}px;width:{cw}px;height:{chh}px">')
        rise = extra * step * 3
        cnt = f'{n} <em>+{extra}</em>' if extra else f'{tot}'
        out.append(f'<div class="pile{" on" if name == focus else ""}"><span class="stk" style="width:{cw}px;height:{H + rise:.0f}px;margin-top:{max(0, added*step*3 - rise):.0f}px">{"".join(layers)}</span>'
                   f'<span class="pn">{name}</span><span class="pc">{cnt} cards</span></div>')
    return f'<div class="piles">{"".join(out)}</div>'


# ---------------------------------------------------------------- ring: the commander at the centre, the strategies around it
def ring(rows, focus, ph, added=0):
    size = 200 if ph else 230
    cx = cy = size / 2
    R = size / 2 - 14
    thick = 20
    total = sum(n for _, n, _ in rows)
    gap = 2.2
    a0 = -90
    segs = []
    for i, (name, n, _) in enumerate(rows):
        sweep = 360 * n / total
        s, e = a0 + gap / 2, a0 + sweep - gap / 2
        on = name == focus
        r = R + (4 if on else 0)
        large = 1 if (e - s) > 180 else 0
        p1 = (cx + r * math.cos(math.radians(s)), cy + r * math.sin(math.radians(s)))
        p2 = (cx + r * math.cos(math.radians(e)), cy + r * math.sin(math.radians(e)))
        col = "#CF8745" if on else TONES[i]
        segs.append(f'<path d="M{p1[0]:.1f},{p1[1]:.1f} A{r:.1f},{r:.1f} 0 {large} 1 {p2[0]:.1f},{p2[1]:.1f}" fill="none" stroke="{col}" stroke-width="{thick + (4 if on else 0)}"/>')
        a0 += sweep
    art = size - 2 * (thick + 26)
    svg = (f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" aria-hidden="true">{"".join(segs)}</svg>'
           f'<img class="art" src="{img("hero")}" alt="" style="width:{art}px;height:{art}px;left:{(size-art)/2}px;top:{(size-art)/2}px">')
    leg = "".join(f'<div class="{"on" if name == focus else ""}"><i style="background:{"#CF8745" if name == focus else TONES[i]}"></i>{name}<span>{n} cards</span></div>'
                  for i, (name, n, _) in enumerate(rows))
    return f'<div class="ring"><div class="rg" style="width:{size}px;height:{size}px">{svg}</div><div class="leg">{leg}</div></div>'


# ---------------------------------------------------------------- strip: one ribbon, each strategy its share
def strip(rows, focus, ph, added=0):
    segs = "".join(f'<div class="{"on" if name == focus else ""}" style="flex:{n} 1 0">{"" if ph else f"<b>{name}</b><span>{n}</span>"}</div>'
                   for name, n, _ in rows)
    if not ph:
        return f'<div class="strip">{segs}</div>'
    leg = "".join(f'<div class="{"on" if name == focus else ""}"><i style="background:{"#CF8745" if name == focus else TONES[i]}"></i>{name}<span>{n} cards</span></div>'
                  for i, (name, n, _) in enumerate(rows))
    segs = "".join(f'<div class="{"on" if name == focus else ""}" style="flex:{n} 1 0;background:{"color-mix(in oklab,var(--accent) 60%,var(--surface))" if name == focus else TONES[i]};border-color:transparent"></div>'
                   for i, (name, n, _) in enumerate(rows))
    return f'<div style="display:flex;flex-direction:column;gap:12px"><div class="strip">{segs}</div><div class="leg">{leg}</div></div>'


# ---------------------------------------------------------------- bars: R1's form, for comparison
def bars(rows, focus, ph, added=0):
    top = max(n for _, n, _ in rows)
    out = "".join(f'<div class="sx{" on" if name == focus else ""}"><span class="sn">{name}</span><span class="sb" style="width:{n/top*100:.0f}%"></span>'
                  f'<span class="sc">{n} cards</span><span class="sv"></span></div>' for name, n, _ in rows)
    return f'<div class="bal">{out}</div>'


# ---------------------------------------------------------------- Suggested changes, as shipped, aiming at the focus
CREDIT = "Uses a credit. 4 of 5 left · next one at 14:20."


def ready(ph, focus="Tokens"):
    rows = [("Your games", "1 game"), ("Notes on your games", "on 1 of 1 game"), ("This list, against the recommended mix", "99 cards")]
    mf = "".join(f'<div><i></i>{a}<span>{b}</span></div>' for a, b in rows)
    mf += f'<div class="new"><i></i>This deck’s focus<span>{focus}</span></div>' if focus else ""
    mf += '<div><i></i>What you own, and what a card costs<span>your collection</span></div>'
    lead = ("One game logged, and none is marked for what worked or hurt. We will read the results, your notes, this list and what you own, "
            "and suggest up to five cards to add and five to cut.")
    if focus:
        lead += f" They aim at {focus}, the deck’s focus."
    return (f'<div class="scp"><h3>Suggested changes</h3><p class="lead">{lead}</p><div class="mfr">{mf}</div>'
            f'<div class="sact"><span class="sbt">Suggest changes</span><span class="scl">{CREDIT}</span></div></div>')


def line(side, key, name, why, cites, ph, mark=None):
    sg = '<span class="sg1" style="color:var(--accent)">+</span>' if side == "add" else '<span class="sg1" style="color:var(--fg-faint)">−</span>'
    th = P.thumb(key, "add" if side == "add" else "cut")
    nm = f'<span class="nm {"a" if side == "add" else "c"}">{name}</span>'
    mk = mark or ""
    ya = "Add" if side == "add" else "Cut"
    btn = f'<span class="bt"><span class="ya">{ya}</span><span class="no">Reject</span></span>'
    ct = "".join(f'<span class="ct{" fo" if k == "focus" else ""}"><span>{k}</span><span>{v}</span></span>' for k, v in cites)
    if ph:
        return (f'<div class="ln"><div class="l1">{sg}{th}{nm}</div>{f"<div class=l1>{mk}</div>" if mk else ""}<p>{why}</p>'
                f'<div class="cts">{ct}</div>{btn}</div>')
    return f'<div class="ln"><div class="l1">{sg}{th}{nm}{mk}{btn}</div><p>{why}</p><div class="cts">{ct}</div></div>'


OWN = '<span class="od"></span>'
ADDS = [("avenger-of-zendikar", "Avenger of Zendikar", "Seven mana for a board of tokens the Ally triggers count, and you own a free copy.",
         [("focus", "Tokens 11 → 12"), ("list", "11 make tokens")]),
        ("bloodline-keeper", "Bloodline Keeper", "A token every turn from turn four, on the plan the deck already runs.",
         [("focus", "Tokens 12 → 13"), ("games", "board wiped in 1 of 1")]),
        ("brudiclad", "Brudiclad, Telchor Engineer", "Makes a token each combat and turns the whole board into the best one.",
         [("focus", "Tokens 13 → 14")])]
CUTS = [("atreus", "Atreus, Impulsive Son", "Draws for a plan this deck doesn’t run, and does nothing for the board.", [("list", "on none of the top 5")]),
        ("wizards-staff", "Wizard’s Staff", "Pays off two Wizards in a deck of Allies.", [("list", "on none of the top 5")]),
        ("flickering-hound", "Flickering Hound", "Nothing here is worth blinking twice a turn.", [("note", "“never cast it”")])]


def results(ph, applied=0):
    adds = ""
    for i, (k, n, w, c) in enumerate(ADDS):
        if i < applied:
            adds += f'<div class="ans2"><span class="al"><span class="ck">✓</span>added</span><span class="an">{n}</span><span class="ub">Undo</span></div>'
        else:
            adds += line("add", k, n, w, c, ph, OWN)
    cuts = ""
    for i, (k, n, w, c) in enumerate(CUTS):
        if i < applied:
            cuts += f'<div class="ans2"><span class="al"><span class="ck">✓</span>cut</span><span class="an" style="text-decoration:line-through;text-decoration-color:var(--fg-locked)">{n}</span><span class="ub">Undo</span></div>'
        else:
            cuts += line("cut", k, n, w, c, ph)
    left = 3 - applied
    ab = ("Apply the rest" if applied else "Apply all")
    tally = f'+{left} in · −{left} out · stays at 99' if left else ""
    head = (f'<div class="lhd"><span class="c">3 in, 3 out</span><span class="ru"></span>'
            + (f'<span class="t">{tally}</span><span class="ab">{ab}</span>' if left else "") + '</div>')
    return (f'<div class="scp"><h3>Suggested changes</h3><span class="scl" style="text-align:left">read from 1 game · 1 game note · 99 cards · your collection · focus Tokens</span>'
            f'{head}<div class="lst"><h4>Additions<span>3</span></h4>{adds}</div><div class="lst"><h4>Cuts<span>3</span></h4>{cuts}</div></div>')


# ---------------------------------------------------------------- phone: the piles on their side, one row each
kit.CSS += r"""
.side{display:flex;flex-direction:column}
.sd2{display:grid;grid-template-columns:150px minmax(0,1fr);align-items:center;gap:12px;min-height:66px;padding:6px 8px;border-top:1px solid var(--border);border-radius:8px}
.sd2:first-child{border-top:0}
.sd2 .lay{position:relative;height:56px}
.sd2 .lay .bk{position:absolute;top:0;width:40px;height:56px;border-radius:4px;background:#2E2822;border:1px solid #5C5246;box-sizing:border-box}
.sd2 .lay img{position:absolute;top:0;left:0;width:40px;height:56px;border-radius:4px;object-fit:cover;border:1px solid var(--border-strong);box-sizing:border-box;box-shadow:3px 0 8px rgba(0,0,0,.4)}
.sd2 .lay img.nwi{border:1.5px dashed var(--accent)}
.sd2 .n{font-size:13.5px;font-weight:600;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sd2 .c{font:11px 'IBM Plex Mono';color:var(--fg-muted);white-space:nowrap}
.sd2 .c em{font-style:normal;color:var(--accent)}
.sd2.on{background:color-mix(in oklab,var(--accent) 9%,transparent);box-shadow:inset 0 0 0 1px var(--accent-shadow);border-top-color:transparent}
.sd2.on .n{color:var(--accent)}
.sd2.on .lay img:not(.nwi){border:2px solid var(--accent)}
.scr{display:flex;gap:6px;overflow:hidden;margin-right:-12px;padding-right:12px}
.scr .pile{flex:0 0 104px}
.scrnote{font:10px 'IBM Plex Mono';color:var(--fg-faint);text-align:right;margin-top:6px}
"""


def side(rows, focus, ph, added=0):
    top = max(n for _, n, _ in rows) + added
    step = 104 / max(top - 1, 1)
    out = []
    for name, n, key in rows:
        extra = added if name == focus else 0
        backs = "".join(f'<span class="bk" style="left:{(n - 1 - i) * step:.1f}px"></span>' for i in range(n - 1))
        news = "".join(f'<img class="nwi" src="{P.card(k)}" alt="" style="left:0">' for k in NEW_KEYS[:extra])
        shift = extra * step * 2.2
        face = f'<img src="{P.card(key)}" alt="" style="left:{shift:.1f}px">' if extra else f'<img src="{P.card(key)}" alt="">'
        if extra:
            backs = "".join(f'<span class="bk" style="left:{shift + (n - 1 - i) * step:.1f}px"></span>' for i in range(n - 1))
            news = "".join(f'<img class="nwi" src="{P.card(k)}" alt="" style="left:{(extra - 1 - j) * step * 2.2:.1f}px">' for j, k in enumerate(NEW_KEYS[:extra]))
        cnt = f'{n} <em>+{extra}</em> cards' if extra else f'{n} cards'
        out.append(f'<div class="sd2{" on" if name == focus else ""}"><span class="lay">{backs}{face}{news}</span>'
                   f'<span style="display:flex;flex-direction:column;gap:3px;min-width:0"><span class="n">{name}</span><span class="c">{cnt}</span></span></div>')
    return f'<div class="side">{"".join(out)}</div>'


def scroll(rows, focus, ph, added=0):
    g = piles(rows, focus, False, added).replace('class="piles"', 'class="piles scr"')
    return g + '<div class="scrnote">swipe for 2 more ›</div>'
