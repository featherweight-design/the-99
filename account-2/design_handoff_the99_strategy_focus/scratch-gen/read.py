"""The strategy read (R1 after Hugh's same-day ruling): a paid read that the free strategies list summarises."""
import kit
import parts as P

CSS = r"""
/* ---- NEW: the strategy read, inside the What it's built around block ---- */
.rbx{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface-rail);padding:18px 20px;display:flex;flex-direction:column;gap:20px}
.ph .rbx{padding:14px 12px;gap:18px;border-radius:11px}
.rtop{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:26px;align-items:start}
.ph .rtop{grid-template-columns:1fr;gap:18px}
.rcol{display:flex;flex-direction:column;gap:14px}
.rmeta{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.rh{margin:0;font-size:13.5px;font-weight:600;color:var(--fg)}
.rh em{font:normal 11px 'IBM Plex Mono';color:var(--fg-faint);margin-left:6px}
.rp{font-size:13.5px;line-height:1.7;color:var(--fg-body);text-wrap:pretty;margin:0}
.rp b{color:var(--fg);font-weight:600;border-bottom:1px dotted var(--accent)}
.rl{font-size:13px;line-height:1.6;color:var(--fg-body);text-wrap:pretty;margin:0;max-width:760px}
.rblk{display:flex;flex-direction:column;gap:7px}
.fit{display:flex;flex-wrap:wrap;gap:6px}
.fit span{display:inline-flex;align-items:center;gap:7px;font:10.5px 'IBM Plex Mono';border:1px solid var(--border-strong);border-radius:999px;padding:3px 10px;color:var(--fg-body)}
.fit span i{font-style:normal;color:var(--fg-faint)}
.ract{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px}
.ph .ract{flex-direction:column;align-items:stretch;gap:8px}
.rbtn{display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 18px;border-radius:8px;border:1px solid var(--accent);color:var(--accent);font:600 13px 'IBM Plex Sans';white-space:nowrap}
.ph .rbtn{height:44px}
.rbtn.off{border-color:var(--border-strong);color:var(--fg-locked);font-weight:500}
.rbtn.gh2{border-color:var(--border-strong);color:var(--fg-muted);font-weight:500}
.rcl{font:10.5px/1.6 'IBM Plex Mono';color:var(--fg-faint)}
.ph .rcl{text-align:center}
.rcl .lk{font-size:10.5px}
.rsec{display:flex;flex-direction:column;gap:12px;border-top:1px solid var(--border);padding-top:16px}
.wl{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}
.ph .wl{grid-template-columns:1fr}
.wlc{border:1px solid var(--border);border-radius:10px;background:var(--surface);padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.wlc .wh{font:9.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.wlc .names{font-size:13px;line-height:1.9;color:var(--fg-body)}
.wlc .names b{font-weight:500;color:var(--fg);border-bottom:1px dotted var(--accent);white-space:nowrap}
.hole{display:flex;flex-direction:column;gap:3px;border-top:1px solid var(--border);padding-top:8px}
.hole:first-of-type{border-top:0;padding-top:0}
.hole .hn{font-size:13px;font-weight:600;color:var(--fg)}
.hole .hn span{font:11px 'IBM Plex Mono';color:var(--fg-muted);font-weight:400;margin-left:8px}
.hole .hx{font-size:12.5px;line-height:1.5;color:var(--fg-muted)}
.afoot{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;border-top:1px solid var(--border);padding-top:14px}
.ph .afoot{flex-direction:column;align-items:stretch;gap:8px}
.rfold{border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);padding:10px 14px;min-height:44px;display:flex;flex-direction:column;justify-content:center;gap:3px}
.rfold .fh{display:flex;align-items:center;font-size:13.5px;font-weight:600;color:var(--fg)}
.rfold .fh .fv{margin-left:auto;font:13px 'IBM Plex Mono';color:var(--fg-faint)}
.rfold .fs{font-size:12px;line-height:1.45;color:var(--fg-muted)}
.rfold.open{gap:10px}
.rseg{display:flex;border:1px solid var(--border-strong);border-radius:9px;overflow:hidden}
.rseg span{flex:1;height:42px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:500;color:var(--fg-muted)}
.rseg span.on{background:var(--elevated);color:var(--fg);font-weight:600}
.rseg span em{font:normal 11px 'IBM Plex Mono';color:var(--fg-faint)}
/* reading: the shipped card-fan and manifest */
.rdg{display:flex;flex-direction:column;gap:12px}
.rdg .rt1{display:flex;align-items:center;gap:16px}
.rdg .rt1 h4{margin:0;font:400 15px 'Cinzel',serif;color:var(--fg)}
.mf{display:flex;flex-direction:column;gap:6px}
.mf div{display:flex;align-items:center;gap:10px;min-height:40px;border-radius:8px;background:var(--surface);border:1px solid var(--border);padding:0 12px;font-size:13px;color:var(--fg-body)}
.mf div i{width:14px;height:14px;border-radius:4px;border:1px solid var(--border-strong);flex:none;font-style:normal;font-size:9px;display:flex;align-items:center;justify-content:center}
.mf div.dn i{border-color:var(--accent);color:var(--accent)}
.mf div span{margin-left:auto;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
/* failure: the shipped failure class shape */
.fail{display:flex;flex-direction:column;gap:9px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);padding:14px 16px}
.fail .ftag{align-self:flex-start;font:9.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--warning);background:color-mix(in oklab,var(--warning) 13%,transparent);border-radius:4px;padding:2px 7px}
.fail .fh{font-size:14px;font-weight:600;color:var(--fg)}
.fail .fb{font-size:13px;line-height:1.55;color:var(--fg-body)}
.fail .fk{font-size:12.5px;line-height:1.55;color:var(--fg-muted)}
/* picked-several option (not picked) */
.rcb{width:22px;height:22px;border-radius:6px;border:1.5px solid var(--border-strong);flex:none;display:flex;align-items:center;justify-content:center;font-size:12px;color:#14110E}
.rcb.on{background:var(--accent);border-color:var(--accent)}
.cbrow{display:flex;gap:12px;align-items:flex-start}
.cbrow>.sg{flex:1;min-width:0}
.cbrow>.rcb{margin-top:14px}
.dim{opacity:.5}
"""
kit.CSS += CSS

E = "Avatar Aang"
CREDIT1 = "Uses a credit. 4 of 5 left · next one at 14:20."
AGAIN = "Replaces this read and uses a credit. 4 of 5 left · next one at 14:20."
SPENT = '0 of 5 left · next one at 14:20 · <span class="lk">What uses credits?</span>'
LEAD1 = ("How this deck wins, whether its strategies pull together or apart, its weak links, and 5 to 10 swaps to shore them up. "
         "The read is kept for this version of the deck.")

WINS = ("It goes wide. Cheap Allies come down early, <b>Appa, Steadfast Guardian</b> and <b>Jasmine Dragon Tea Shop</b> turn each one "
        "into more bodies, and once <b>Avatar Aang</b> transforms the board swings for the win over two turns. The instants hold the "
        "table off until then.")
FIT = ("Allies and Tokens pull together: the token makers make Allies, and every Ally trigger counts them. Spells matter pulls apart: "
       "17 spells pay off a plan the deck only half runs, and 9 of them never touch the board.")
FIT_TAGS = '<div class="fit"><span>Allies + Tokens <i>together</i></span><span>Spells matter <i>apart</i></span></div>'
OFFPLAN = ["Atreus, Impulsive Son", "Flickering Hound", "Assimilation Aegis", "Wizard’s Staff", "Cemetery Prowler",
           "Beorn the Fierce", "Bard, King of Dale"]
HOLES = [("Protection from a wipe", "2 cards", "A board this wide loses the most to one wipe, and only two cards stop it."),
         ("Cheap removal", "6 at two mana or less", "One blocker can stall a wide attack for a turn the deck can’t spare.")]


def sw(ck, cn, ak, an, owned, mark, price, why, plan, flag=False):
    return (ck, cn, ak, an, owned, mark, price, why, [("plan", plan), ("cut", "off-plan")], flag)


OWN = [
    sw("atreus", "Atreus, Impulsive Son", "sokka", "Sokka, Tenacious Tactician", True, None, None,
       "Atreus draws for a plan this deck doesn’t have. Sokka is a cheap Ally, and every Ally trigger wants one more.", "Allies"),
    sw("flickering-hound", "Flickering Hound", "hakoda", "Hakoda, Selfless Commander", True, None, None,
       "Nothing here is worth blinking. Hakoda is another Ally for Aang’s count.", "Allies"),
    sw("wizards-staff", "Wizard’s Staff", "avenger-of-zendikar", "Avenger of Zendikar", True, None, None,
       "Wizard’s Staff pays off two Wizards. Avenger fills the board the Ally triggers count.", "Tokens"),
    sw("assimilation-aegis", "Assimilation Aegis", "fire-lord-zuko", "Fire Lord Zuko", True, "draft", None,
       "Aegis wants artifacts the deck barely runs. Zuko is an Ally that ends games on the plan.", "Allies"),
    sw("cemetery-prowler", "Cemetery Prowler", "counterspell", "Counterspell", True, None, None,
       "Prowler feeds a graveyard plan that isn’t here. Counterspell stops the wipe a wide board fears.", "protection"),
]
BUY = [
    sw("beorn", "Beorn the Fierce", "swan-song", "Swan Song", True, "none", "$1.10",
       "Beorn is a big body with no plan behind it. Swan Song answers a wipe for one mana.", "protection"),
    sw("bard-king-of-dale", "Bard, King of Dale", "path", "Path to Exile", True, "none", "$2.79",
       "Bard pays off a plan the deck only touches. Path clears the blocker that stalls a wide attack.", "removal"),
]


def fan(size=44):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 44 44" aria-hidden="true" style="flex:none">'
            '<rect x="6" y="9" width="17" height="25" rx="2.5" transform="rotate(-14 14 22)" fill="none" stroke="#7A6E5E" stroke-width="1.5"/>'
            '<rect x="14" y="8" width="17" height="25" rx="2.5" fill="#2A241D" stroke="#A59C89" stroke-width="1.5"/>'
            '<rect x="21" y="9" width="17" height="25" rx="2.5" transform="rotate(14 30 22)" fill="#CF8745" stroke="#CF8745" stroke-width="1.5"/></svg>')


def call_block(state, ph):
    """Right column before a read: the press, its credit, and states 2, 5 and 6."""
    if state == "reading":
        rows = [("This list", "99 cards", True), ("What it’s built around", "5 strategies", True),
                ("What you own, and what a card costs", "your collection", False), ("Cards that fit the plan", "in its colors", False)]
        mf = "".join(f'<div class="{"dn" if d else ""}"><i>{"✓" if d else ""}</i>{a}<span>{b}</span></div>' for a, b, d in rows)
        return (f'<div class="rdg"><div class="rt1">{fan()}<div><h4>Reading your deck…</h4>'
                '<p class="rl" style="margin-top:4px">This takes a few seconds. The strategies stay on screen while it reads.</p></div></div>'
                f'<div class="mf">{mf}</div><div class="ract"><span class="rbtn off">Reading…</span><span class="rbtn gh2">Stop</span><span class="rcl">2 of 4 read</span></div></div>')
    if state == "failed":
        return ('<div class="fail"><span class="ftag">timed out</span><span class="fh">This one took too long</span>'
                '<span class="fb">We stopped it before it came back. Now and then a long list doesn’t finish.</span>'
                '<span class="fk">Nothing was read, nothing changed, and no credit was used.</span>'
                f'<div class="ract"><span class="rbtn">Try again</span><span class="rcl">trying again usually works · {CREDIT1}</span></div></div>')
    off = state == "spent"
    line = (f'<span class="rcl">{SPENT}</span><span class="rcl"><span class="lk">Get more credits</span></span>' if off else f'<span class="rcl">{CREDIT1}</span>')
    act = (f'<div class="ract"><span class="rbtn{" off" if off else ""}">Read my strategy</span>{line}</div>' if not ph
           else f'<div class="ract"><span class="rbtn{" off" if off else ""}">Read my strategy</span>{line}</div>')
    return f'<div class="rcol"><h4 class="rh">The read</h4><p class="rl">{LEAD1}</p>{act}</div>'


def wins_fit(meta=True, fit=True):
    m = '<span class="rmeta">read for version 2 · 22 Oct</span>' if meta else ""
    return (f'<div class="rcol">{m}<div class="rblk"><h4 class="rh">How it wins</h4><p class="rp">{WINS}</p></div>'
            + (f'<div class="rblk"><h4 class="rh">How its strategies fit</h4>{FIT_TAGS}<p class="rp">{FIT}</p></div>' if fit else '') + '</div>')


def weak_links():
    names = " · ".join(f'<b>{n}</b>' for n in OFFPLAN)
    holes = "".join(f'<div class="hole"><span class="hn">{a}<span>{b}</span></span><span class="hx">{c}</span></div>' for a, b, c in HOLES)
    return (f'<div class="rsec"><h4 class="rh">Weak links</h4><div class="wl">'
            f'<div class="wlc"><span class="wh">Off the plan · {len(OFFPLAN)} cards</span><div class="names">{names}</div>'
            '<span class="hx" style="font-size:12px;color:var(--fg-muted)">Each one is a cut in the swaps below.</span></div>'
            f'<div class="wlc"><span class="wh">Holes · {len(HOLES)}</span>{holes}</div></div></div>')


def swaps(ph, own_html=None, buy_html=None, foot=None, n=7):
    own = own_html if own_html is not None else "".join(P.pair_card(p, ph) for p in OWN)
    buy = buy_html if buy_html is not None else "".join(P.pair_card(p, ph) for p in BUY)
    ft = foot if foot is not None else (f'<div class="afoot"><span class="rbtn">Apply all {n}</span><span class="rcl">+{n} in · −{n} out · stays at 99</span></div>')
    return (f'<div class="rsec"><h4 class="rh">Swaps<em>{n}</em></h4>'
            '<p class="rl">Each is a card in and a card out, so the deck stays at 99. Every add is a card we found in its colors, yours first. '
            'Nothing moves until you apply one.</p>'
            f'<div class="gh">From your collection <em>5</em></div><div class="pairs">{own}</div>'
            f'<div class="gh">To buy <em>2</em></div><div class="pairs">{buy}</div>{ft}</div>')


KEPT = '<p class="dfoot">Kept for version 2. It reads again only when the deck changes.</p>'


def folds(open_=None):
    f1 = ('<div class="rfold"><div class="fh">How its strategies fit<span class="fv">⌄</span></div>'
          '<div class="fs">Allies and Tokens pull together. Spells matter pulls apart.</div></div>')
    f2 = ('<div class="rfold"><div class="fh">Weak links<span class="fv">⌄</span></div>'
          f'<div class="fs">{len(OFFPLAN)} cards off the plan · {len(HOLES)} holes: protection from a wipe, cheap removal</div></div>')
    return f1 + f2


def block(state="read", ph=False, opt="inside", fold="P1", stale=False, swaps_html=None, rows=P.AANG):
    """The new block on the Analysis tab. opt inside = the list is the read's summary (picked); above = list, then the read's own panel."""
    head = (f'<div class="bah"><span class="lbl">What it’s built around</span></div>'
            f'<div class="bas">{P.SEC_SUB}</div>')
    lst = P.strat_list(rows)
    if state != "read":
        right = call_block(state, ph)
        return f'<div class="ba new">{head}<div class="rbx"><div class="rtop">{lst}{right}</div></div></div>'
    note = ""
    if stale:
        note = ('<div class="note-dash" style="display:flex;flex-direction:column;gap:10px">'
                '<span>This read is for version 2. Version 3 changed 4 cards since, so parts of it may not hold. Each swap is checked against the deck as it is now.</span>'
                f'<div class="ract"><span class="rbtn">Read again</span><span class="rcl">{AGAIN}</span></div></div>')
    sws = swaps_html if swaps_html is not None else swaps(ph)
    foot = "" if stale else KEPT
    if opt == "above":
        top = f'<div class="ba new">{head}<div class="rbx" style="padding:0;border:0;background:transparent">{lst}</div></div>'
        if ph:
            inner = f'{wins_fit(fit=False)}{folds()}'
        else:
            inner = (f'<div class="rtop" style="grid-template-columns:1fr 1fr"><div class="rcol"><span class="rmeta">read for version 2 · 22 Oct</span>'
                     f'<div class="rblk"><h4 class="rh">How it wins</h4><p class="rp">{WINS}</p></div></div>'
                     f'<div class="rcol" style="padding-top:22px"><div class="rblk"><h4 class="rh">How its strategies fit</h4>{FIT_TAGS}<p class="rp">{FIT}</p></div></div></div>'
                     + weak_links())
        panel = (f'<div class="rbx new"><div class="dh" style="display:flex;align-items:baseline;gap:10px"><h3 style="margin:0;font:400 19px Cinzel,serif">The read</h3></div>'
                 f'{note}{inner}{sws}{foot}</div>')
        return top + panel
    if ph:
        if fold == "P2":
            seg = '<div class="rseg"><span class="on">The read</span><span>Swaps <em>7</em></span></div>'
            body = f'{lst}{note}{seg}{wins_fit()}{weak_links()}'
            return f'<div class="ba new">{head}<div class="rbx">{body}</div></div>'
        body = f'{lst}{note}{wins_fit(fit=False)}{folds()}{sws}{foot}'
        return f'<div class="ba new">{head}<div class="rbx">{body}</div></div>'
    body = f'<div class="rtop">{lst}{wins_fit()}</div>{note}{weak_links()}{sws}{foot}'
    return f'<div class="ba new">{head}<div class="rbx">{body}</div></div>'
