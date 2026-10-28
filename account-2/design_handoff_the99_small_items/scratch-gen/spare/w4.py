"""Item 4 (account 2, 2026-10-27): the dismiss ✕ on What's new rows, the lead story and Waiting on you (#2285), and
three eng rulings (#2284 time and press on one line, #2280 one folded mark shows itself, #2288 Ask opens the spares
sheet in place). Drawn with the spare-requests kit over the shipped Home B and /friends."""
import kit
import parts as P
import sr as S
from kit import doc, board_head, frame, frames, phone, desk
from parts import img

kit.CSS += r"""
/* ---- the ✕ as shipped (#2285): Your requests' 36px box at the row's top right ---- */
.d4s .fi .xx,.d4s .ld .xx{position:absolute;right:4px;top:6px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:13px;z-index:2}
.d4s.ph .fi .bd{padding-right:30px}
.d4s.ph .ld .lt{padding-right:28px}
.dk.d4s .ld .lt{padding-right:20px}
.dk.d4s .fi .kr small{display:none}
.dk.d4s .fi .ac{gap:12px;padding-right:34px;align-items:baseline}
.dk.d4s .fi .ac small,.dk.d4n .fi .ac small{font:10.5px 'IBM Plex Mono';color:var(--fg-locked)}
/* ---- redrawn: the ✕ ends the action line ---- */
.x4{flex:none;margin-left:auto;width:44px;height:44px;margin-right:-10px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:13px}
.dk .x4{width:32px;height:32px;margin:0 -6px 0 auto}
.d4n .fi .ac{flex-wrap:nowrap;align-items:center;margin-top:2px}
.d4n .fi .ac .yg{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0}
.d4n .fi .kr small,.d4n .ld .lk small{margin-left:0}
.d4n .fi .kr small::before,.d4n .ld .lk small::before{content:"·";margin-right:7px}
.d4n .ya .fi .kr small{margin-right:0}
/* Your requests: the card and owner preview centred on the row */
.ya .fi{align-items:center}
.dk.d4n .fi .ac{gap:12px;margin:0;align-items:center}
.d4n .ld .la{flex-wrap:nowrap;align-items:flex-start}
.d4n .ld .la .yg{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0}
.d4n.ph .ld .la .x4{margin-top:-2px}
.dk.d4n .ld .la{align-items:center}
.lit{box-shadow:0 0 0 2px var(--accent),0 0 18px rgba(207,135,69,.35);border-radius:10px}
.pin4{position:absolute;z-index:40;display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--danger);color:#fff;font:600 10.5px 'IBM Plex Mono';box-shadow:0 0 0 3px rgba(13,11,9,.8)}
.pin4.ok{background:#8FA6BE;color:#0D0B09}
.keyl4{display:flex;flex-direction:column;gap:9px}
.keyl4 div{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.55;color:var(--fg-body)}
.keyl4 div b{color:var(--fg)}
.keyl4 .pin4{position:static;flex:none;margin-top:1px}
.cmp4{border:1px solid var(--border-strong);border-radius:16px;overflow:hidden;background:var(--bg);padding:14px}
.cmp4.dk{display:block}
.fdc{border-radius:14px;background:var(--surface-inset);border:1px solid var(--border);overflow:hidden}
/* card rows (#2280) */
.fm{display:inline-flex;align-items:center;flex:none;color:var(--fact);filter:drop-shadow(0 0 3px color-mix(in srgb,var(--fact) 45%,transparent))}
.pn{flex:none;font:11px 'IBM Plex Mono';color:var(--fact)}
.cr .mks{display:flex;align-items:center;gap:6px;flex:none}
.rowbox{width:358px;display:flex;flex-direction:column;gap:4px;padding:12px;border:1px solid var(--border-strong);border-radius:14px;background:var(--bg)}
.rowbox h5{margin:0 0 6px;font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.rowbox .bt2{flex:none}
.ba .rq{display:inline-flex;align-items:center;gap:6px}
.ba .rq i{width:7px;height:7px;border-radius:50%;background:currentColor}
.lnk .rq{display:inline-flex;align-items:center;gap:6px}
.lnk .rq i{width:7px;height:7px;border-radius:50%;background:var(--accent)}
"""

PIN = lambda n, x, y, ok=False: f'<span class="pin4{" ok" if ok else ""}" style="left:{x}px;top:{y}px">{n}</span>'


# ------------------------------------------------------------------ rows
def items():
    I = S.items()
    I["match"].update(act='<span class="lnk">Ask Colin ›</span>')
    I["match2"].update(act='<span class="lnk">Ask Max ›</span>')
    return I


def row(it, desk_=False, mode="new", lit=False, pin=None):
    """One What's new / Waiting on you row. mode: shipped (✕ top right) | new (✕ ends the action line)."""
    un = '<span class="un"></span>' if it.get("unseen") else ""
    kd = f'<span class="kd{" w" if it.get("w") else ""}">{it["kick"]}</span>'
    kr = f'<div class="kr">{un}{kd}<small>{it["stamp"]}</small></div>'
    ask = 'class="yn' in it["act"]
    act = f'<span class="yg">{it["act"]}</span>' if ask else it["act"]
    tm = f'<small>{it["stamp"]}</small>' if (desk_ and not ask and mode == "shipped") else ""
    x = '<span class="x4">✕</span>' if mode == "new" else ""
    ac = f'<div class="ac">{tm}{act}{x}</div>'
    if mode == "new" and desk_ and ask:
        ac = f'<div class="ac"><span class="yg">{it["act"]}</span>{x}</div>'
    body = f'<div class="bd">{kr}<div class="tt">{it["title"]}</div><div class="dt">{it["detail"]}</div>{"" if desk_ else ac}</div>'
    xx = '<span class="xx">✕</span>' if mode == "shipped" else ""
    style = ' style="box-shadow:inset 3px 0 0 var(--accent)"' if lit else ""
    pn = f'<span class="pin4" style="right:42px;top:14px">{pin}</span>' if pin else ""
    return f'<div class="fi"{style}>{P.vis(it["vis"])}{body}{ac if desk_ else ""}{xx}{pn}</div>'


def feed(keys, desk_=False, mode="new", n=2, pin=None):
    I = items()
    rows = "".join(row(I[k], desk_, mode, pin=pin if i == 0 else None) for i, k in enumerate(keys))
    head = f'<h2 class="sh">What’s new{f" <em>· {n} new</em>" if n else ""}<span class="r">Choose what shows <i>›</i></span></h2>'
    return f'<section class="blk">{head}<div class="fd">{rows}</div></section>'


def lead(key="match", desk_=False, mode="new", press=None, pin=None):
    it = items()[key]
    v = it["vis"]
    fa = f'<span class="fa"><img src="{img(v[2])}" alt=""></span>' if v[2] else ""
    w, h = (120, 168) if desk_ else (96, 134)
    art = "art-ghalta.jpg" if key == "match" else "art-lathliss.jpg"
    if key == "match":
        act = f'<span class="ba">{press or "Ask Colin"}</span>'
    else:
        act = ('<span class="yg"><span class="ba">Yes</span><span class="bg" style="height:40px">No</span>'
               '<span class="m" style="font-size:10.5px;color:var(--fg-muted)">13 days left</span></span>')
    x = '<span class="x4">✕</span>' if mode == "new" else ""
    xx = '<span class="xx">✕</span>' if mode == "shipped" else ""
    return (f'<section class="ld"><div class="blur"><img src="{img(art)}" alt=""></div>'
            f'<span class="lc">{P.card(v[1], w, h)}{fa}</span><div class="lt"><span class="lk">{it["kick"]}<small>{it["stamp"]}</small></span>'
            f'<h3>{it["title"]}</h3><p>{it["detail"]}</p><div class="la">{act}{x}</div></div>{xx}'
            + (f'<span class="pin4" style="right:34px;top:10px">{pin}</span>' if pin else "") + '</section>')


def home(desk_=False, mode="new", lead_key="match", keys=("price", "match2", "combo"), press=None, pins=None):
    head = P.home_head(desk_)
    pins = pins or {}
    ld = lead(lead_key, desk_, mode, press, pins.get("lead"))
    fd = feed(keys, desk_, mode, pin=pins.get("row"))
    if desk_:
        return head + (f'<div class="hb"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:11px">{ld}{P.resume(2)}{fd}</div>'
                       f'<div style="width:316px;flex:none;display:flex;flex-direction:column;gap:11px">{P.commitments()}{P.friends_home()}</div></div>')
    return head + '<div class="hb">' + ld + P.resume(1) + fd + "</div>"


def waiting(desk_=False, mode="new"):
    I = items()
    rows = "".join(row(I[k], desk_, mode) for k in ("ask", "ask2", "match"))
    return f'<section class="sec"><div class="sech w">Waiting on you · 3</div><div class="fd">{rows}</div></section>'


ACC_OLD = "The handover is between you. When it’s yours, press buy on the row to add it."
ACC_NEW = "The handover is between you. Once it’s yours, press buy on it in Shopping or add it to your collection."


def friends(desk_=False, mode="new"):
    ya = S.your_asks(desk_, ("asked", "yes")).replace("sec ya new", "sec ya").replace(ACC_OLD, ACC_NEW)
    return f'<div class="fp">{S.fhead(desk_)}{waiting(desk_, mode)}{ya}</div>'


def ph(inner, active="Home", mode="new", over="", h=None):
    return phone(inner, active, h=h, badges={"Friends": 3}, over=over).replace('class="ph"', f'class="ph d4{mode[0]}"', 1)


def dk(inner, active="Home", mode="new", over="", h=None):
    return desk(inner, active, badges={"Friends": 3}, over=over, h=h).replace('class="dk"', f'class="dk d4{mode[0]}"', 1)


# ------------------------------------------------------------------ board 1: the ✕
SHIPPED_KEY = [
    ("1", "<b>Phone rows</b>: the ✕ sits on the kicker line beside the time, and the whole text column gives up 30px to it, so titles wrap early."),
    ("2", "<b>Lead story</b>: the ✕ crowds the time in the band’s corner, off the accent border by 4px."),
    ("3", "<b>Desktop rows</b>: the ✕ is pinned to the row’s top while the time and press (#2284) sit on the row’s centre line. Two right-hand lines again, the stagger #2284 removed."),
]


def board_x():
    sp = ph(home(False, "shipped", pins={"lead": 2, "row": 1}), mode="shipped")
    sd = dk(home(True, "shipped", pins={"row": 3}), mode="shipped", h=900)
    np_ = ph(home(False, "new"))
    nd = dk(home(True, "new"), h=900)
    fp = ph(friends(False, "new"), "Friends")
    fd = dk(friends(True, "new"), "Friends", h=980)
    lp = '<div class="ph d4n" style="padding:14px 16px;height:auto">' + lead("ask", False, "new") + "</div>"
    ld = '<div class="dk d4n" style="display:block;padding:20px 26px;width:1000px">' + lead("ask", True, "new") + "</div>"
    key = '<div class="keyl4">' + "".join(f'<div><span class="pin4">{n}</span><span>{t}</span></div>' for n, t in SHIPPED_KEY) + "</div>"
    body = (board_head("Item 4 · the dismiss ✕ on Home and /friends · addendum to #2285",
                       "The ✕ ends the action line",
                       "#2285 reused Your requests’ ✕ (36px, the row’s top right) on What’s new rows, the lead story and Waiting on you. "
                       "<b>Redrawn: on every item the ✕ is the last thing on the action line, at the item’s right edge.</b> It never sits on the title line "
                       "and the text column gets its full width back. On a phone it is a 44px box ending the press’s line; from "
                       "desktop a 32px box after the press. <b>R1b:</b> the time moves into the kicker, after the kind, at both widths (it was squeezed into the corner on a phone and sat before the press on desktop). Behaviour is as shipped: it hides the item "
                       "for good, answers nothing, focus moves to the next ✕, and a failed write puts the item back with the toast.", tag="R1b")
            + frames(frame("<b>As shipped</b> · Home 390 · for reference", sp, ""),
                     frame("<b>As shipped</b> · Home 1300 · for reference", sd, ""),
                     '<div style="width:380px;flex:none;display:flex;flex-direction:column;gap:14px;padding-top:28px">'
                     '<div class="note"><b>What reads wrong today</b>' + key + "</div></div>")
            + frames(frame("<b>Redrawn</b> · Home 390", np_,
                           "Each row ends in its press, left, and the ✕, right, on one 44px line. The time follows the kind on the kicker line (<i>Trade match · 6h ago</i>), out of the corner. "
                           "The lead’s ✕ ends its button line, inside the band."),
                     frame("<b>Redrawn</b> · Home 1300", nd,
                           "The right-hand line is the press and the ✕ only; the time follows the kind, as on a phone. The lead’s ✕ sits at the band’s right "
                           "edge, on its button’s line."))
            + frames(frame("<b>Redrawn</b> · /friends 390 · Waiting on you", fp,
                           "Ask rows: Yes, No and the days left, then the ✕ at the far end. The presses wrap inside their own group, so the ✕ "
                           "keeps its place. Your requests keeps its own ✕; its card preview is centred on the row (R1b)."),
                     frame("<b>Redrawn</b> · /friends 1300", fd,
                           "Yes, No, the days left, then the ✕. A trade match reads Ask Colin ›, ✕; times sit after the kind. Your requests’ previews centred."))
            + frames(frame("<b>Lead story with an ask</b> · 390", lp,
                           "Yes and No stay together. The days left wraps under them and the ✕ holds the first line’s end."),
                     frame("<b>Lead story with an ask</b> · 1300", ld,
                           "One line: Yes, No, the days left, and the ✕ at the band’s right edge."),
                     '<div style="width:420px;flex:none;display:flex;flex-direction:column;gap:14px">'
                     '<div class="note"><b>The rule</b><ul>'
                     '<li>The ✕ is the action line’s last item, right-aligned, vertically centred on the press (Yes and No on an ask).</li>'
                     '<li>Phone: 44 × 44, its glyph 13px in --fg-muted. Desktop: 32 × 32, with a coarse pointer’s 44px hit drawn past it, as shipped.</li>'
                     '<li>A row with no press (an incoming spare request item on Home) keeps the action line for the ✕ alone.</li>'
                     '<li>No reserve on the text column: titles run the full width.</li>'
                     '<li>While an answer is out the ✕ is disabled (rows) or absent (the lead), as shipped. A receipt has none.</li></ul></div>'
                     '<div class="note"><b>For engineering</b><ul>'
                     '<li><code>DismissButton</code> loses <code>absolute top-[6px] right-[4px]</code> and renders in the flow of the action line; '
                     'drop the <code>pr-[30px]</code>/<code>md:pr-[34px]</code> reserves in <code>FeedItemRow</code>, <code>TradeRow</code>, '
                     '<code>AskRow</code> and the lead’s <code>pr-[28px]</code>/<code>md:pr-[20px]</code>.</li>'
                     '<li>Phone action line becomes <code>flex items-center</code> with the press (or AnswerPresses) and the ✕ at <code>ml-auto</code>; '
                     'AnswerPresses wraps in its own box.</li>'
                     '<li>Unchanged: <code>useFeedDismiss</code>, <code>nextDismiss</code>, aria name, toast.</li></ul></div></div>'))
    return doc("The dismiss ✕", body, 1300 + 44 + 1300 + 112)


# ------------------------------------------------------------------ board 2: three eng rulings
def wn_rows(desk_shipped_before=False):
    """Desktop What's new rows at the main column's width (760)."""
    I = items()
    if desk_shipped_before:
        # before #2284: the time at the kicker line's right, the press alone in its column
        rows = "".join(P.fitem_d(I[k]) for k in ("price", "combo"))
        return f'<div class="dk d4n" style="display:block;width:760px;padding:0;border:0;background:none"><div class="fdc">{rows}</div></div>'
    rows = "".join(row(I[k], True, "new") for k in ("price", "combo"))
    return f'<div class="dk d4n" style="display:block;width:760px;padding:0;border:0;background:none"><div class="fdc">{rows}</div></div>'


BOLT = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M9.4 1.5 L4.1 8.8 H7.3 L6.6 14.5 L11.9 7.0 H8.7 Z" fill="currentColor"/></svg>'
TUTOR = ('<svg width="16" height="16" viewBox="0 0 16 16"><path d="M1.8 12.2 H14.2 V14.4 H1.8 Z" fill="currentColor"/>'
         '<path d="M8 1.3 L11.7 5.7 H9.2 V10.3 H6.8 V5.7 H4.3 Z" fill="currentColor"/></svg>')
COMBO = '<span style="color:var(--fact);display:inline-flex">' + P.LEMNISCATE.replace('width="26" height="14"', 'width="22" height="12"') + "</span>"
MK = {"gc": f'<span class="fm">{BOLT}</span>', "tu": f'<span class="fm">{TUTOR}</span>', "co": f'<span class="fm">{COMBO}</span>'}


def crow(name, cost, owned, marks, shown, shop=None):
    """A one-line card row; `shown` marks drawn, the rest folded into +N (or nothing)."""
    vis = "".join(MK[m] for m in marks[:shown])
    rest = len(marks) - shown
    plus = f'<span class="pn">+{rest}</span>' if rest else ""
    mk = f'<span class="mks">{vis}{plus}</span>' if (vis or plus) else ""
    if shop:
        return (f'<div class="cr"><span class="ow no"></span><span class="nm">{name}</span>{mk}{S.buytag(shop)}<span class="x">✕</span></div>')
    tag = "" if owned else S.buytag("", glyph=True)
    return (f'<div class="cr"><span class="ow{"" if owned else " no"}"></span><span class="nm">{name}</span>{mk}'
            f'<span class="pt">{S.mana(cost)}</span>{tag}<span class="x">✕</span></div>')


ALL = [("Arcbound Ravager", ["c2"], True, []), ("Enlightened Tutor", ["w"], True, ["gc", "tu"]),
       ("Thopter Foundry", ["w", "b", "u"], True, ["co"]), ("Whir of Invention", ["c1", "u"], False, ["tu"])]


def rows_box(title, after, shop=False):
    if shop:
        r = [crow("Thopter Foundry", None, False, ["co"], 1 if after else 0, shop="$1.80"),
             crow("Killian, Decisive Mentor", None, False, [], 0, shop="$3.10")]
    else:
        r = [crow(n, c, o, m, (len(m) if after else min(len(m), 1)) if len(m) != 1 else 1) for n, c, o, m in ALL]
    return f'<div class="rowbox"><h5>{title}</h5>{"".join(r)}</div>'


def sheet(desk_=False, top=120):
    rep = S.replacing("Ghalta, Primal Hunger", "ghalta.jpg", "$7.90").replace(">Replacing<", ">On your wishlist<")
    sec = S.fsection([("Colin", 2, "ask", "", False), ("Max", 1, "ask", "", False)], new=False)
    inner = f'<div class="mh"><b>Friends with a spare</b><span class="x">✕</span></div><div class="mb">{rep}{sec}</div>'
    if desk_:
        return f'<div class="scrim"></div><div class="mdl" style="top:{top}px">{inner}</div>'
    return f'<div class="scrim"></div><div class="sht" style="top:auto">{inner}</div>'


def board_r():
    before = wn_rows(True)
    after = wn_rows(False)
    pa = ph(home(False, "new"), over=sheet(False))
    pr = ph(home(False, "new", press='<span class="rq"><i></i>Requested</span>'))
    da = dk(home(True, "new"), over=sheet(True, 150), h=900)
    body = (board_head("Item 4 · three changes that shipped on rulings, not boards", "Ratified, one amended",
                       "Each change is drawn over the page it changed. <b>#2284</b> and <b>#2288</b> are ratified as built; <b>#2280</b> is ratified, with "
                       "one note on the name’s width. <b>#2284 is amended (R1b, your call):</b> the press keeps its one right-hand line with the ✕, and the time moves into the kicker, after the kind.", tag="R1b")
            + '<h3 style="margin:0;font:600 18px Cinzel,serif">#2284 · one right-hand line, amended: the time goes to the kicker</h3>'
            + frames(frame("<b>Before #2284</b> · What’s new rows at 1300", before,
                           "The time ended the kicker line; the press sat centred in its own column. Two right-hand edges."),
                     frame("<b>Amended</b> · R1b", after,
                           "Press and ✕ on one line at the right; the time after the kind (<i>Price drop · yesterday</i>), the same at both widths. "
                           "Ask rows keep Yes, No and the days left. The lead story’s time moves the same way."))
            + '<h3 style="margin:8px 0 0;font:600 18px Cinzel,serif">#2280 · one folded mark shows itself instead of +1</h3>'
            + frames(frame("<b>Before</b> · phone All rows (tight tier)", rows_box("All · Artifacts", False),
                           "Enlightened Tutor showed its first mark and <i>+1</i>: one tap to learn about one glyph that fits."),
                     frame("<b>Ratified</b> · phone All rows", rows_box("All · Artifacts", True),
                           "Both marks show. A +N now always counts two or more, so it means “several”, never a stand-in for one."),
                     frame("<b>Before</b> · phone Shopping", rows_box("Shopping", False, True),
                           "Shopping folds every mark on a phone: one combo mark read +1."),
                     frame("<b>Ratified</b> · phone Shopping", rows_box("Shopping", True, True),
                           "The mark itself. It is 16px where +1 was about 13, and the difference comes out of the name, which already truncates; "
                           "the buy tag and ✕ columns never move."), gap=30)
            + '<h3 style="margin:8px 0 0;font:600 18px Cinzel,serif">#2288 · a trade match’s Ask opens the spares sheet over the page</h3>'
            + frames(frame("<b>Ratified</b> · 390 · Ask Colin pressed", pa,
                           "The shipped spares sheet (Friends with a spare) over Home: <i>on your wishlist</i> in the box, Colin first, then the "
                           "friend’s-tab order. No navigation, so Home stays where it was."),
                     frame("<b>Ratified</b> · 390 · after Ask", pr,
                           "The press reads <b>● Requested</b> with no reload (Accepted once Colin says yes) and still opens the sheet."),
                     frame("<b>Ratified</b> · 1300", da,
                           "The 640 modal, as the deck page opens it. Same from /friends’ Waiting on you."))
            + '<div class="note" style="max-width:1300px"><b>Notes</b><ul>'
              '<li>#2284: amended. Time beside the press read as part of the call to action; in the kicker it reads as when, at both widths.</li>'
              '<li>#2280: in line with the one-line row’s rule that the auto tag, lock and ownership slot never fold; the about figures that draw a row follow.</li>'
              '<li>#2288: one place to ask, one sheet. Spare requests off, the press stays the link to the friend’s Spares tab, as shipped.</li></ul></div>')
    return doc("Three rulings", body, 1300 + 44 + 390 + 44 + 390 + 112)


BOARDS = [("Dismiss-X", board_x, "Item 4 · the dismiss ✕"), ("Eng-Rulings", board_r, "Item 4 · three eng rulings")]
