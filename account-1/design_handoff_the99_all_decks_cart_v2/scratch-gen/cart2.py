"""All-decks cart v2 R1 (account 1, 2026-10-27): the pieces.

Drawn over the shipped cart (src/components/decks/cart/*: cart-view.tsx, cart-line.tsx, cart-by-friend.tsx,
cart-deck-group.tsx, view-switch.tsx) in Low Sun (amonkhet) tokens, reusing account 2's spare-requests kit (kit.py,
parts.py, sr.py) for the shell, the cart header, deck selections, checkout, the buy tag, Ask and its statuses.
Sort, filters and search are the shipped filter chassis (src/components/ui/filter-chassis.tsx, handoff
design_handoff_the99_filter_chassis): three rows, sort past a hairline, a Filters sheet below 1000px.
Every string is shipped copy or a placeholder for /copy-review.
"""
import kit
import parts as P
import sr as S
from kit import ico

kit.CSS += r"""
/* ---------------- v2: the chassis over the list (filter-chassis.tsx) ---------------- */
.chs{display:flex;flex-direction:column;gap:8px}
.chs .r1{display:flex;align-items:center;gap:8px}
.fld{flex:1;min-width:0;height:34px;display:flex;align-items:center;gap:8px;padding:0 11px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface-sunken);font:13px 'IBM Plex Sans';color:var(--fg-faint);white-space:nowrap;overflow:hidden}
.fld.on{color:var(--fg);border-color:var(--accent)}
.fld .xx{margin-left:auto;color:var(--fg-muted);font-size:12px}
.trg{flex:none;height:34px;display:flex;align-items:center;gap:7px;padding:0 11px;border:1px solid var(--border-strong);border-radius:8px;font:500 12px 'IBM Plex Mono';color:var(--fg-body);white-space:nowrap}
.trg i{font-style:normal;color:var(--fg-faint);font-size:10px}
.trg.on{border-color:var(--accent);color:var(--accent-text)}
.trg.open{border-color:var(--accent);box-shadow:0 0 0 3px rgba(207,135,69,.18)}
.trg.wait{color:var(--fg-locked);border-style:dashed}
.trg .bd{min-width:18px;height:18px;border-radius:999px;background:var(--accent);color:#14110E;font:600 10px/18px 'IBM Plex Mono';text-align:center;padding:0 5px}
.hair{width:1px;height:22px;background:var(--border-strong);flex:none;margin:0 2px}
.ph .fld,.ph .trg{height:44px}
.ph .trg.ic{width:44px;justify-content:center;padding:0;color:var(--fg-body)}
.chips{min-height:22px;display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden}
.chips .none{font:10px/14px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border-strong);border-radius:7px;padding:3px 8px;font:11px/14px 'IBM Plex Mono';color:var(--fg-body);white-space:nowrap;background:var(--bg)}
.chip em{font-style:normal;color:var(--fg-muted)}
.chips .ca{font:12px 'IBM Plex Sans';color:var(--accent-text);margin-left:4px}
.rln{display:flex;align-items:center;justify-content:space-between;gap:10px;font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.rln .rd{display:inline-flex;align-items:center;gap:7px;color:var(--fg-faint)}
.rln .rd i{width:6px;height:6px;border-radius:50%;background:var(--fact);opacity:.8}
.vrow{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.vrow .key{display:flex;gap:6px 14px;padding:0}

/* ---------------- v2: the card row ---------------- */
.colh{display:grid;column-gap:18px;padding:0 14px 7px;border-bottom:1px solid var(--border-strong);font:9.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);white-space:nowrap}
.colh span:last-child{text-align:right}
.nrw{display:grid;column-gap:18px;align-items:center;padding:12px 14px;border-top:1px solid var(--border);min-height:64px}
.nrw:first-child{border-top:0}
.nrw .cn{min-width:0;display:flex;flex-direction:column;gap:3px}
.nm2{font:400 14px/1.4 'IBM Plex Sans';color:var(--fg);border-bottom:1px dotted var(--border-strong);align-self:flex-start;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cmd{font:9.5px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint)}
.fv{min-width:0;display:flex;align-items:baseline;gap:7px;font:11.5px/1.5 'IBM Plex Mono';color:var(--fg-body);white-space:nowrap}
.fv b{font:600 13px 'IBM Plex Mono';color:var(--fg);flex:none}
.fv .nms{min-width:0;overflow:hidden;text-overflow:ellipsis}
.fv.dim{color:var(--fg-muted)}
.fv.dim b{color:var(--fg-body);font-weight:500}
.mo{flex:none;display:inline-flex;align-items:center;height:19px;padding:0 6px;border-radius:5px;border:1px solid var(--border-strong);font:500 10.5px 'IBM Plex Mono';color:var(--fg-body)}
.mo.lt{color:var(--fg-muted)}
.act{display:flex;flex-direction:column;align-items:flex-end;gap:7px}
.act .ask{height:28px;min-width:64px;border-radius:7px;font-size:12.5px;padding:0 12px}
.act .fst{height:28px;font-size:12.5px}
.act .bt2{height:20px}
.ph .act{gap:10px}
.ph .act .ask{height:36px;min-width:72px;border-radius:9px;font-size:13px}
.ph .act .fst{height:36px;font-size:13px}
.ph .act .bt2{height:22px}
.spc{display:flex;align-items:center;gap:8px;min-width:0}
.spc .sgp{flex:none;width:30px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:6px;border:1px solid var(--border-strong)}
.ph .spc .sgp{width:26px;height:20px}
.fh2 .sk{background:var(--border-strong)}
.sk{display:inline-block;height:10px;border-radius:3px;background:var(--elevated);vertical-align:middle}
.sk.br{animation:none;opacity:.9}
.dl{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:14px;row-gap:3px;margin-top:4px;padding:8px 10px;border-radius:8px;background:var(--surface-sunken);font:11.5px/1.5 'IBM Plex Mono';color:var(--fg-body)}
.dl span:nth-child(even){color:var(--fg-muted);text-align:right}

/* phone row */
.prw{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-top:1px solid var(--border)}
.prw:first-child{border-top:0}
.prw .l{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.prw .f{display:grid;grid-template-columns:44px minmax(0,1fr);align-items:baseline}
.prw .f>em{font:normal 9.5px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint)}
.prw .f .dl{grid-column:2}
.prw.bare{padding-left:0;padding-right:0}

/* friend panel v2 */
.fpn{border:1px solid var(--border-strong);border-radius:12px;overflow:hidden;background:var(--bg)}
.fpn+.fpn{margin-top:12px}
.fpn .fh2{display:flex;align-items:center;gap:11px;padding:9px 8px 9px 14px;background:var(--elevated);border-bottom:1px solid var(--border-strong);min-height:52px}
.fpn.shut .fh2{border-bottom:0}
.fpn .fh2 .nm{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.fpn .fh2 b{font:600 15px 'IBM Plex Sans';color:var(--fg)}
.fpn .fh2 .nm span{font:11px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fpn .fh2 small{flex:none;font:11px 'IBM Plex Mono';color:var(--fg-muted);white-space:nowrap}
.chev{flex:none;width:36px;height:36px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted)}
.stk{position:relative;box-shadow:0 6px 10px -6px rgba(0,0,0,.6)}

/* deck group v2 (cart-deck-group.tsx) */
.dg{border-top:1px solid var(--border)}
.dg .dh{display:flex;align-items:center;gap:10px;min-height:52px}
.dg .dh .dn{flex:1;min-width:0;font:500 14px/1.35 'IBM Plex Sans';color:var(--fg)}
.dg .dh small{font:11px 'IBM Plex Mono';color:var(--fg-body)}
.dg .bd2{padding-left:28px;padding-bottom:6px}
.dg .bd2 .nrw,.dg .bd2 .colh{padding-left:0;padding-right:0}
.box{display:inline-flex;width:18px;height:18px;border-radius:5px;border:1.5px solid var(--border-dashed);flex:none}
.box.on{background:var(--accent);border-color:var(--accent);position:relative}
.box.on::after{content:'';position:absolute;left:5px;top:1.5px;width:5px;height:9px;border-right:2px solid #14110E;border-bottom:2px solid #14110E;transform:rotate(45deg)}

/* list scroller, fades */
.lbox{position:relative;overflow:hidden}
.fade{position:absolute;left:0;right:0;bottom:0;height:64px;background:linear-gradient(to bottom,transparent,var(--bg));pointer-events:none;display:flex;align-items:flex-end;justify-content:center;padding-bottom:8px}
.fade span{font:10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}

/* popover / sheet / menu */
.pop{position:absolute;z-index:30;width:248px;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface-raised);box-shadow:0 18px 40px rgba(0,0,0,.55);padding:8px}
.pop .ph2{font:10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);padding:6px 8px 8px}
.pop .it{display:flex;align-items:center;gap:10px;min-height:38px;padding:0 8px;border-radius:8px;font:13.5px 'IBM Plex Sans';color:var(--fg)}
.pop .it small{margin-left:auto;font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.pop .it.on{background:var(--elevated)}
.pop .it .rad{width:16px;height:16px;border-radius:50%;border:1.5px solid var(--border-dashed);flex:none}
.pop .it.on .rad{border:5px solid var(--accent)}
.pop .sep2{height:1px;background:var(--border);margin:6px 4px}
.scr{position:absolute;inset:0;background:rgba(8,6,4,.62);z-index:28}
.sht2{position:absolute;left:0;right:0;bottom:0;z-index:29;border-radius:18px 18px 0 0;border-top:1px solid var(--border-strong);background:var(--surface-raised);padding:10px 18px 26px;display:flex;flex-direction:column;gap:14px}
.sht2 .grab{width:38px;height:4px;border-radius:2px;background:var(--border-dashed);align-self:center}
.sht2 .hd{display:flex;align-items:baseline;justify-content:space-between}
.sht2 .hd b{font:700 18px 'Cinzel',serif;color:var(--fg)}
.sht2 .hd small{font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.sht2 .gh{font:10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);margin-bottom:-6px}
.pills{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.pills .pill{min-width:0}
.pills .pill.all{grid-column:1/-1;justify-content:center}
.pills .pill small{margin-left:auto}
.pill{height:44px;display:inline-flex;align-items:center;gap:8px;padding:0 14px 0 6px;border-radius:999px;border:1px solid var(--border-strong);font:14px 'IBM Plex Sans';color:var(--fg-body)}
.pill.np{padding-left:14px}
.pill small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.pill.on{border-color:var(--accent);color:var(--fg);background:rgba(207,135,69,.12)}
.pill .face{border-radius:50%}
.segx{display:flex;border:1px solid var(--border-strong);border-radius:10px;padding:3px;gap:2px}
.segx span{flex:1;height:38px;display:flex;align-items:center;justify-content:center;border-radius:7px;font:500 13.5px 'IBM Plex Sans';color:var(--fg-muted)}
.segx span.on{background:var(--elevated);color:var(--fg)}
.sht2 .bts{display:flex;align-items:center;gap:14px;margin-top:4px}
.sht2 .bts .bp{flex:1}

/* empty / no-match (empty-state.tsx shapes) */
.emp{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:26px 22px;border:1px dashed var(--border-dashed);border-radius:12px}
.emp h3{margin:0;font:600 15px 'IBM Plex Sans';color:var(--fg)}
.emp p{font-size:13px;line-height:1.55;color:var(--fg-body);max-width:440px}
.emp .bg{height:44px;margin-top:4px}
.emp .glyph{color:var(--fact);margin-bottom:2px}

/* board annotations */
.ann{font:11.5px/1.5 'IBM Plex Mono';color:var(--accent);display:flex;gap:8px;align-items:flex-start}
.ann b{flex:none;width:18px;height:18px;border-radius:50%;background:var(--accent);color:#14110E;font:600 10px/18px 'IBM Plex Mono';text-align:center}
.pin{position:absolute;z-index:40;width:20px;height:20px;border-radius:50%;background:var(--accent);color:#14110E;font:600 10.5px/20px 'IBM Plex Mono';text-align:center;box-shadow:0 0 0 3px #0D0B09}
.cmpw{display:flex;flex-direction:column;gap:10px}
.cmpw .tg{align-self:flex-start;font:600 9.5px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;padding:3px 7px;border-radius:4px}
.tg.old{background:#2B241B;color:var(--fg-muted)}
.tg.nw{background:var(--accent);color:#14110E}
.slab{border:1px solid var(--border-strong);border-radius:12px;background:var(--bg);overflow:hidden}
.legend{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 22px;max-width:1500px}
"""

# ---------------------------------------------------------------- icons
SEARCH = ico('<circle cx="8.6" cy="8.6" r="5.6"/><path d="M12.8 12.8 17 17"/>', 15, 1.6)
SORT = ico('<path d="M6.5 4v12M3.5 7l3-3 3 3"/><path d="M13.5 16V4M10.5 13l3 3 3-3"/>', 18, 1.5)
CHEV_D = ico('<path d="M5.5 8 10 12.5 14.5 8"/>', 18, 1.6)
CHEV_R = ico('<path d="M8 5.5 12.5 10 8 14.5"/>', 18, 1.6)
CHEV_U = ico('<path d="M5.5 12 10 7.5 14.5 12"/>', 18, 1.6)

# ---------------------------------------------------------------- fixtures
G, K, E, B, T, M = "HD - Gishath", "HD - Kratos", "HD - Elves", "HD - Goblins", "HD - Thorin", "HD Tune - Mutant Menace"
DECKS = [(G, 18, "$61.40"), (K, 11, "$38.15"), (E, 9, "$27.70"), (B, 6, "$22.05"), (T, 4, "$31.90"), (M, 2, "$9.60")]
FR = ["Chris", "Colin", "Peter", "Max"]
FACE = {"Colin": "face-sai.jpg", "Peter": "face-captain-america.jpg", "Max": "face-ghalta.jpg", "Chris": "face-giada.jpg"}
PODS = {"Chris": "The Bros", "Colin": "The Bros", "Peter": "The Bros, Thursday pod", "Max": "Thursday pod"}
# the whole list's figures per friend (cards, spare copies): illustrative, larger than the rows drawn
FTOT = {"Chris": (41, 130), "Colin": (17, 38), "Peter": (9, 14), "Max": (4, 6)}

# card: need [(deck, n)], price, spares {friend: n}, own n, in use [decks], commander, over $5
C = {
    "Gishath, Sun’s Avatar": ([(G, 1)], "$3.60", {}, 0, [], True, False),
    "Lightning Greaves": ([(G, 1), (K, 1), (E, 1), (B, 1)], "$9.60", {"Chris": 7, "Colin": 1}, 2, [T, M], False, True),
    "Swiftfoot Boots": ([(G, 1), (K, 1), (T, 1)], "$5.70", {"Chris": 2, "Peter": 1}, 1, [E], False, True),
    "Heroic Intervention": ([(E, 1), (G, 1), (M, 1)], "$8.40", {"Peter": 1}, 0, [], False, True),
    "Sol Ring": ([(E, 1), (B, 1)], "$3.00", {"Chris": 12, "Colin": 3, "Max": 2}, 4, [G, K, T, M], False, False),
    "Beast Within": ([(E, 1), (G, 1)], "$2.20", {"Chris": 4, "Colin": 1}, 1, [T], False, False),
    "Chaos Warp": ([(B, 1), (K, 1)], "$2.80", {"Colin": 2}, 0, [], False, False),
    "Arcane Signet": ([(K, 1), (T, 1)], "$1.20", {"Chris": 9}, 0, [], False, False),
    "Goblin Matron": ([(B, 1)], "$4.20", {"Max": 1}, 0, [], False, False),
    "Smothering Tithe": ([(T, 1)], "$14.20", {}, 0, [], False, True),
    "Cultivate": ([(G, 1)], "$0.50", {"Chris": 6}, 0, [], False, False),
    "Path to Exile": ([(T, 1)], "$3.10", {"Peter": 2}, 0, [], False, False),
    "Elvish Archdruid": ([(E, 1)], "$1.80", {}, 0, [], False, False),
}
ORDER_CARD = ["Gishath, Sun’s Avatar", "Lightning Greaves", "Heroic Intervention", "Swiftfoot Boots", "Arcane Signet",
              "Beast Within", "Chaos Warp", "Sol Ring", "Cultivate", "Elvish Archdruid", "Goblin Matron", "Path to Exile",
              "Smothering Tithe"]
# Ask states by (friend, card); anything not listed is "ask"
ASK = {("Chris", "Sol Ring"): "asked", ("Colin", "Sol Ring"): "instead", ("Max", "Sol Ring"): "instead",
       ("Chris", "Arcane Signet"): "yes", ("Chris", "Cultivate"): "no"}


def face(name, size=30, r=8):
    return P.face(FACE[name], size, r)


def buy(price, over=False):
    return S.buytag(price, over)


def status(state):
    if state == "ask":
        return '<span class="ask">Ask</span>'
    if state == "instead":
        return '<span class="ask alt">Ask instead</span>'
    if state == "again":
        return '<span class="ask">Ask again</span>'
    if state == "asked":
        return '<span class="fst"><i></i>Requested</span>'
    if state == "yes":
        return '<span class="fst ok"><i>✓</i>Accepted</span>'
    return '<span class="fst no"><i></i>Declined</span>'


def names(ds, shown):
    """A one-line deck list: the first `shown` names, then +N (the press that opens the rest)."""
    head = ", ".join(ds[:shown])
    rest = len(ds) - shown
    return f'<span class="nms">{head}</span>' + (f'<span class="mo">+{rest}</span>' if rest > 0 else "")


def need_val(card, shown, open_=False, deck=None):
    need, *_ = C[card]
    n = sum(q for _, q in need)
    ds = [d for d, _ in need]
    if deck:  # By deck: this deck's count, then the others that need it
        others = [d for d in ds if d != deck]
        own = dict(need)[deck]
        if not others:
            return f'<span class="fv"><b>{own}</b></span>'
        return f'<span class="fv"><b>{own}</b><span class="nms" style="color:var(--fg-muted)">also</span>{names(others, shown)}</span>'
    if open_:
        rows = "".join(f"<span>{d}</span><span>{q}</span>" for d, q in need)
        return (f'<span style="display:flex;flex-direction:column;min-width:0"><span class="fv"><b>{n}</b>'
                f'<span class="nms">for {len(ds)} decks</span><span class="mo lt">less</span></span>'
                f'<span class="dl">{rows}</span></span>')
    return f'<span class="fv"><b>{n}</b>{names(ds, shown)}</span>'


def own_val(card, shown):
    _, _, _, own, inuse, *_ = C[card]
    if not own:
        return '<span></span>'
    return f'<span class="fv dim"><b>{own}</b><span class="nms" style="flex:none">in</span>{names(inuse, shown)}</span>'


def spare_val(card, friend=None, loading=False, mark=None, shown=1):
    """By friend: this friend's spare copies. By card / By deck: the glyph press (opens the spares modal) and who."""
    _, _, sp, *_ = C[card]
    if loading:
        return '<span class="spc"><span class="sk" style="width:58px"></span></span>'
    if friend:
        return f'<span class="fv"><b>{sp[friend]}</b></span>'
    if not sp:
        return '<span></span>'
    who = sorted(sp, key=lambda f: -sp[f])
    tot = sum(sp.values())
    m = mark or "spare"
    return (f'<span class="spc"><span class="sgp">{S.sg(m, 15)}</span><span class="fv"><b>{tot}</b>{names(who, shown)}</span></span>')


# grid templates per view (desktop)
COLS = {
    "friend": "minmax(0,1.15fr) minmax(0,1.7fr) 64px minmax(0,1.25fr) 100px",
    "card": "minmax(0,1.15fr) minmax(0,1.55fr) minmax(0,1.1fr) minmax(0,1.15fr) 100px",
    "deck": "minmax(0,1.15fr) minmax(0,1.55fr) minmax(0,1.1fr) minmax(0,1.15fr) 100px",
}
HEADS = {
    "friend": ["Card", "You need · for", "Spare", "You own · in use in", ""],
    "card": ["Card", "You need · for", "Friends’ spares", "You own · in use in", ""],
    "deck": ["Card", "This deck · also", "Friends’ spares", "You own · in use in", ""],
}


def colh(view, extra=""):
    return f'<div class="colh" style="grid-template-columns:{COLS[view]};{extra}">' + "".join(f"<span>{h}</span>" for h in HEADS[view]) + "</div>"


def card_cell(card):
    cmd = C[card][5]
    return f'<span class="cn"><span class="nm2">{card}</span>' + ('<span class="cmd">commander</span>' if cmd else "") + "</span>"


def drow(card, view="friend", friend=None, state=None, open_=False, loading=False, deck=None, mark=None, shown=2, oshown=1, hl=""):
    """One desktop row: card, need, spare, own, then the action stack (Ask or its status ABOVE the buy tag)."""
    need, price, sp, own, inuse, cmd, over = C[card]
    st = state or ASK.get((friend, card), "ask")
    act = (status(st) if view == "friend" else "") + buy(price, over)
    style = f"grid-template-columns:{COLS[view]}" + (";align-items:start" if open_ else "") + hl
    return (f'<div class="nrw" style="{style}">{card_cell(card)}{need_val(card, shown, open_, deck)}'
            f'{spare_val(card, friend if view == "friend" else None, loading, mark)}{own_val(card, oshown)}'
            f'<span class="act">{act}</span></div>')


def prow(card, view="friend", friend=None, state=None, open_=False, loading=False, deck=None, mark=None, shown=1, bare=False, hl=""):
    """One phone row: the name, then one labelled fact a line (need, spare, own), the action stack on the right."""
    need, price, sp, own, inuse, cmd, over = C[card]
    st = state or ASK.get((friend, card), "ask")
    act = (status(st) if view == "friend" else "") + buy(price, over)
    nm = f'<span class="nm2">{card}</span>' + ('<span class="cmd">commander</span>' if cmd else "")
    if open_:
        rows = "".join(f"<span>{d}</span><span>{q}</span>" for d, q in need)
        n = sum(q for _, q in need)
        nd = (f'<div class="f"><em>need</em><span class="fv"><b>{n}</b><span class="nms">for {len(need)} decks</span><span class="mo lt">less</span></span>'
              f'<span class="dl">{rows}</span></div>')
    else:
        nv = need_val(card, shown, False, deck)
        nd = f'<div class="f"><em>{"deck" if deck else "need"}</em>{nv}</div>'
    if view == "friend":
        spl = f'<div class="f"><em>spare</em><span class="fv"><b>{sp[friend]}</b></span></div>'
    elif loading:
        spl = '<div class="f"><em>spare</em><span><span class="sk" style="width:74px"></span></span></div>'
    elif sp:
        spl = f'<div class="f"><em>spare</em>{spare_val(card, None, False, mark, 1)}</div>'
    else:
        spl = ""
    owl = f'<div class="f"><em>own</em>{own_val(card, 1)}</div>' if own else ""
    return (f'<div class="prw{" bare" if bare else ""}" style="{hl}"><div class="l">{nm}{nd}{spl}{owl}</div>'
            f'<span class="act">{act}</span></div>')


# ---------------------------------------------------------------- the friend panel
def fhead(friend, open_=True, sticky=False, ph=False):
    cards, spares = FTOT[friend]
    fig = f"{cards} card{'' if cards == 1 else 's'} · {spares} spare{'' if spares == 1 else 's'}"
    chev = CHEV_D if open_ else CHEV_R
    return (f'<div class="fh2{" stk" if sticky else ""}">{face(friend, 30, 8)}<span class="nm"><b>{friend}</b>'
            f'<span>shares with {PODS[friend]}</span></span><small>{fig}</small><span class="chev">{chev}</span></div>')


def fpanel(friend, cards, desk=True, open_=True, sticky=False, states=None, opened=None):
    states = states or {}
    if not open_:
        return f'<div class="fpn shut">{fhead(friend, False, False, not desk)}</div>'
    if desk:
        rows = "".join(drow(c, "friend", friend, states.get(c), open_=(c == opened)) for c in cards)
    else:
        rows = "".join(prow(c, "friend", friend, states.get(c), open_=(c == opened)) for c in cards)
    return f'<div class="fpn">{fhead(friend, True, sticky, not desk)}{rows}</div>'


# ---------------------------------------------------------------- the chassis
FRIEND_ICON = ('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
               'stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/>'
               '<circle cx="16.5" cy="9.5" r="2.6"/><path d="M15.5 14.2c2.6-.3 4.6 1.3 5.1 4.3"/></svg>')

SORTS = {"card": "Most decks", "deck": "Largest first", "friend": "Most spare"}


def chassis(view, desk=True, q="", friend=None, owned=None, sort=None, result="", loading=False, open_=None, nfilters=0, nofriend=False):
    """The shipped chassis: row 1 search + filter triggers | sort; row 2 chips or NO FILTERS ON; row 3 the result line."""
    sort = sort or SORTS[view]
    fld = (f'<span class="fld on">{SEARCH}<span style="color:var(--fg)">{q}</span><span class="xx">✕</span></span>' if q
           else f'<span class="fld">{SEARCH}Search cards</span>')
    if desk:
        if loading:
            ft = '<span class="trg wait">Friend<i>reading…</i></span>'
        else:
            lab = f"Friend · {friend}" if friend else "Friend"
            cls = "trg" + (" on" if friend else "") + (" open" if open_ == "friend" else "")
            ft = f'<span class="{cls}">{lab}<i>▾</i></span>'
        if nofriend:
            ft = ""
        olab = f"Owned · {owned}" if owned else "Owned"
        ot = f'<span class="trg{" on" if owned else ""}">{olab}<i>▾</i></span>'
        st = f'<span class="trg{" open" if open_ == "sort" else ""}">Sort · {sort}<i>▾</i></span>'
        r1 = f'<div class="r1" style="max-width:100%">{fld}{ft}{ot}<span class="hair"></span>{st}</div>'
    else:
        bd = f'<span class="bd">{nfilters}</span>' if nfilters else ""
        fcls = "trg" + (" on" if nfilters else "") + (" open" if open_ == "filters" else "")
        r1 = (f'<div class="r1">{fld}<span class="trg ic{" open" if open_ == "sort" else ""}">{SORT}</span>'
              f'<span class="{fcls}" style="font-family:\'IBM Plex Sans\';font-size:14px">Filters{bd}</span></div>')
    chips = []
    if friend:
        chips.append(f'<span class="chip"><em>Friend</em>{friend}<span style="color:var(--fg-muted)">✕</span></span>')
    if owned:
        chips.append(f'<span class="chip"><em>Owned</em>{owned}<span style="color:var(--fg-muted)">✕</span></span>')
    if q:
        chips.append(f'<span class="chip">“{q}”<span style="color:var(--fg-muted)">✕</span></span>')
    r2 = ('<div class="chips">' + ("".join(chips) + '<span class="ca">Clear all</span>' if chips else '<span class="none">No filters on</span>') + "</div>")
    rd = '<span class="rd"><i></i>reading friends’ spares</span>' if loading and not result.startswith("Reading") else ""
    r3 = f'<div class="rln"><span>{result}</span>{rd}</div>'
    return f'<div class="chs">{r1}{r2}{r3}</div>'


def vswitch(on):
    segs = [("card", "By card"), ("deck", "By deck"), ("friend", "By friend")]
    return '<span class="vs">' + "".join(f'<span class="{"on" if v == on else ""}">{t}</span>' for v, t in segs) + "</span>"


def keyrow(view):
    items = S.key_item("buy", "press to add", False)
    if view != "friend":
        items = S.key_item("spare", "friend has a spare", False) + items
    return f'<span class="key">{items}</span>'


# ---------------------------------------------------------------- the page
def head():
    return ('<div class="ch"><span class="bk">‹ Decks</span><h1>Shopping for all decks</h1>'
            '<small>6 of 21 decks are missing cards · brews included</small></div>')


def dsel(desk=True):
    if not desk:
        return '<div class="dsel"><div class="h" style="padding:6px 0">Decks · 6 of 6 selected<u>▾</u></div></div>'
    rows = "".join(f'<div class="d"><span class="box on"></span><span class="dn">{d}</span><small>{n} · {c}</small></div>' for d, n, c in DECKS)
    return f'<div class="dsel"><div class="h">Decks · 6 of 6<u>Unselect all</u></div>{rows}</div>'


def ckout():
    return S.checkout("$190.80")


def page(view, list_html, desk=True, ctl=None, list_h=None, over="", fade=True):
    """The shipped page: header; desktop decks + checkout left, the list right (its own scroll box); phone checkout,
    decks fold, then the pinned controls and the list."""
    ctl = ctl or ""
    vr = f'<div class="vrow">{vswitch(view)}{keyrow(view)}</div>'
    controls = f'<div style="display:flex;flex-direction:column;gap:12px">{vr}{ctl}</div>'
    fd = '<div class="fade"><span>scrolls on</span></div>' if fade else ""
    if desk:
        lst = f'<div class="lbox" style="height:{list_h}px">{list_html}{fd}</div>' if list_h else list_html
        return (head() + f'<div class="cg"><div style="display:flex;flex-direction:column;gap:14px">{dsel()}{ckout()}</div>'
                f'<section style="display:flex;flex-direction:column;gap:14px;min-width:0;position:relative">{controls}{lst}{over}</section></div>')
    pinned = (f'<div style="margin:0 -16px;padding:10px 16px 12px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);'
              f'background:var(--bg)">{controls}</div>')
    lst = f'<div class="lbox" style="height:{list_h}px">{list_html}{fd}</div>' if list_h else list_html
    return head() + f'<div class="cg">{ckout()}{dsel(False)}{pinned}{lst}</div>'


def by_friend_list(desk=True, friends=None, opened=None, folded=(), sticky_first=False, cards=None, states=None, colhead=True):
    friends = friends or FR
    cards = cards or {}
    out = []
    for i, f in enumerate(friends):
        cs = cards.get(f) or [c for c in ORDER_CARD if f in C[c][2]]
        out.append(fpanel(f, cs, desk, f not in folded, sticky_first and i == 0, states, opened))
    body = "".join(out)
    if desk and colhead:
        return colh("friend", "padding-left:15px;padding-right:15px") + f'<div style="margin-top:10px">{body}</div>'
    return body


def by_card_list(desk=True, cards=None, loading=False, marks=None, deck=None):
    cards = cards or ORDER_CARD
    marks = marks or {}
    if desk:
        return colh("card") + "".join(drow(c, "card", loading=loading, mark=marks.get(c)) for c in cards)
    return "".join(prow(c, "card", loading=loading, mark=marks.get(c), bare=True) for c in cards)


def by_deck_list(desk=True, open_deck=G):
    out = []
    for d, n, cost in DECKS:
        o = d == open_deck
        chev = CHEV_D if o else CHEV_R
        hd = (f'<div class="dh"><span class="box on"></span><span class="dn">{d}</span><small>{n} · {cost}</small>'
              f'<span class="chev">{chev}</span></div>')
        body = ""
        if o:
            cs = [c for c in ORDER_CARD if d in dict(C[c][0])]
            if desk:
                body = '<div class="bd2">' + colh("deck") + "".join(drow(c, "deck", deck=d, shown=1) for c in cs) + "</div>"
            else:
                body = '<div class="bd2" style="padding-left:0">' + "".join(prow(c, "deck", deck=d, bare=True) for c in cs) + "</div>"
        out.append(f'<div class="dg">{hd}{body}</div>')
    return "".join(out)
