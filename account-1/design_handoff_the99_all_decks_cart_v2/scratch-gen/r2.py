"""All-decks cart v2, R2 (account 1, 2026-10-28): the four answers engineering asked for.

Plan docs/superpowers/plans/2026-10-28-all-decks-cart-v2.md §For Design (B2, B3, B4) and the PR 8 gap report
(docs/superpowers/gap-report-all-decks-cart-v2-pr8.md). Every chassis here is the SHIPPED one, drawn from
src/components/ui/filter-chassis.tsx, decks/deck-sort-menu.tsx (OrderMenu), ui/filter-panel.tsx (trigger),
decks/deck-filter-column.tsx (DeckSearchField) and ui/text-field.tsx (SearchField). The toast is
collection/edit-toast.tsx ToastFrame through social/social-toast.tsx.
"""
import copy as _copy
import kit
import sr as S
import cart2 as X
from kit import doc, board_head, frame, frames, phone, desk, ico

kit.CSS += r"""
/* ---------------- the SHIPPED chassis (filter-chassis.tsx) ---------------- */
.sc{display:flex;flex-direction:column;gap:10px;background:var(--surface-sunken);border-bottom:1px solid var(--border);padding:12px 22px 10px}
.ph .sc{padding:12px 16px 10px}
.sc .r1{display:flex;align-items:center;gap:8px}
.sc .sld{display:flex;align-items:center;gap:8px;flex:1 1 auto;min-width:0}
.sc .hl{width:1px;height:20px;background:var(--border);flex:none}
.sf{flex:1;min-width:0;display:flex;align-items:center;gap:9px;height:34px;padding:0 11px;border-radius:8px;border:1px solid var(--border-strong);background:var(--surface-sunken);font:12.5px 'IBM Plex Sans';color:var(--fg-faint);white-space:nowrap;overflow:hidden}
.ph .sf{height:44px;border-radius:10px;padding:0 12px;font-size:16px}
.sf.on{border-color:var(--accent);color:var(--fg)}
.sf .sclr{margin-left:auto;width:24px;height:24px;border-radius:50%;background:var(--border);color:var(--fg-faint);font-size:12px;display:flex;align-items:center;justify-content:center;flex:none}
.ft{flex:none;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;border-radius:8px;font:500 13px 'IBM Plex Sans';padding:0 14px;height:34px;color:var(--fg);background:var(--elevated);border:1px solid var(--border-strong)}
.ft.on{border-color:var(--accent)}
.ft.open{background:var(--border-strong);border-color:var(--accent)}
.ft i{font-style:normal;color:var(--fg-muted);font-size:10px}
.ph .ft{height:36px;border-radius:999px;font-size:12.5px;padding:0 13px}
.ft .bd{border-radius:999px;padding:1px 7px;font:600 11px 'IBM Plex Mono';background:var(--accent);color:var(--bg)}
.st{flex:none;display:flex;align-items:center;justify-content:center;height:32px;padding:0 14px;border-radius:8px;border:1px solid var(--border-strong);font:500 12.5px 'IBM Plex Sans';color:var(--fg-body);white-space:nowrap}
.ph .st{width:44px;height:44px;padding:0;font-size:15px}
.sc .r2{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-height:22px}
.sc .r2 .none{font:11px/14px 'IBM Plex Mono';color:var(--fg-faint);padding:3px 0}
.sch{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;border-radius:7px;border:1px solid var(--border-strong);background:var(--bg);padding:3px 8px;font:11px/14px 'IBM Plex Mono';color:var(--fg-body)}
.sch b{font-weight:400;color:var(--fg-faint)}
.sc .ca{margin-left:auto;font:11px/14px 'IBM Plex Mono';text-decoration:underline;color:var(--fg-muted)}
.sc .ca.lk{color:var(--fg-locked)}
.sc .r3{display:flex;align-items:center;gap:10px;font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.sc .r3 .tr{margin-left:auto;display:flex;align-items:center;gap:8px;color:var(--fg-faint)}
.sc .r3 .tr i{width:6px;height:6px;border-radius:50%;background:var(--fact)}
.om{position:absolute;z-index:30;width:186px;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface);box-shadow:0 22px 50px rgba(0,0,0,.6);overflow:hidden}
.om span{display:flex;align-items:center;height:38px;padding:0 13px;font:13px 'IBM Plex Sans';color:var(--fg);border-top:1px solid var(--elevated)}
.om span:first-child{border-top:0}
.om span.on{background:var(--elevated)}
.ph .om span{height:44px;font-size:14px}
.vrow2{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.vrow2 .key{display:flex;gap:6px 14px;padding:0}
/* the pinned phone block, with the chassis as its own band (no second frame) */
.pin2{margin:0 -16px;background:var(--bg);border-top:1px solid var(--border)}
.pin2 .vrow2{padding:10px 16px}
/* the toast (edit-toast.tsx ToastFrame) */
.tst{position:absolute;z-index:45;left:50%;transform:translateX(-50%);width:calc(100% - 32px);max-width:420px;display:flex;align-items:center;gap:14px;border-radius:10px;border:1px solid var(--border-strong);background:var(--elevated);padding:4px 6px 4px 16px;box-shadow:0 12px 40px rgba(0,0,0,.5)}
.tst span{flex:1;min-width:0;padding:8px 0;font:13.5px 'IBM Plex Sans';color:var(--fg)}
.tst b{min-height:44px;display:flex;align-items:center;padding:0 12px;font:600 13.5px 'IBM Plex Sans';color:var(--accent-text)}
/* sticky */
.lbx{position:relative;overflow:hidden;border-top:1px solid var(--border)}
.edgeline{position:absolute;left:-8px;right:-8px;height:0;border-top:1.5px dashed rgba(143,166,190,.85);z-index:40}
.edgeline span{position:absolute;right:0;top:-19px;font:600 9.5px 'IBM Plex Mono';color:#0D0B09;background:#8FA6BE;border-radius:4px;padding:2px 6px;white-space:nowrap}
.fh2.stuck{border-radius:0;position:relative;z-index:3}
.under{opacity:.45}
/* long first name */
.cellbox{outline:1px dashed rgba(143,166,190,.6);outline-offset:2px}
.fv .nms.cut{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:0 1 auto}
.mo.word{padding:0 7px}
.spec{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font:12px/1.5 'IBM Plex Mono';color:var(--fg-body);max-width:640px}
.spec b{color:var(--fg);font-weight:600}
.vs2{display:grid;grid-template-columns:200px 1fr 1fr;gap:0;border:1px solid var(--border-strong);border-radius:12px;overflow:hidden;max-width:1500px;font-size:12.5px;color:var(--fg-body)}
.vs2>div{padding:10px 14px;border-top:1px solid var(--border);line-height:1.5}
.vs2>div.h{border-top:0;font:500 10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);background:#15120F}
.vs2>div.k{color:var(--fg);font-weight:600}
.vs2>div.w{background:rgba(111,163,104,.07)}
"""

BADGE = {"Home": 2, "Friends": 2}
DH = 980
LH = 600


def ph(inner, h=None, over=""):
    return phone(inner, "Decks", h=h, badges=BADGE, over=over)


def dk(inner, h=DH, over=""):
    return desk(inner, "Decks", badges=BADGE, over=over, h=h)


def note(t, b):
    return f'<div class="note"><h4>{t}</h4>{b}</div>'


def notes(*ns, cols=3):
    return f'<div class="notes" style="grid-template-columns:repeat({cols},minmax(0,1fr))">' + "".join(ns) + "</div>"


def sec(kicker, title, cap=""):
    return (f'<div class="bh" style="gap:6px;margin-top:10px"><div class="kick">{kicker}</div>'
            f'<h2 style="font-size:22px">{title}</h2>' + (f"<p>{cap}</p>" if cap else "") + "</div>")


SORTS = {"card": "Most decks", "deck": "Largest first", "friend": "Most spare"}


def shipped(view, desk=True, q="", friend=None, result="", reading=False, nofriend=False, sort_open=False, nfilters=0):
    """The shipped FilterChassis with the cart's slots filled."""
    srch = (f'<span class="sf on">{X.SEARCH}<span>{q}</span><span class="sclr">✕</span></span>' if q
            else f'<span class="sf">{X.SEARCH}Search cards<span class="sclr" style="visibility:hidden">✕</span></span>')
    if desk:
        fr = "" if nofriend else (
            f'<span class="ft" style="color:var(--fg-locked);background:var(--surface-raised);border-color:var(--border)">Friend <i>▾</i></span>' if reading
            else f'<span class="ft{" on" if friend else ""}">{"Friend: " + friend if friend else "Friend"} <i>▾</i></span>')
        lead = f'{srch}{fr}<span class="ft">Owned <i>▾</i></span>'
        sort = f'<span class="st"{" style=\"border-color:var(--accent)\"" if sort_open else ""}>Sort · {SORTS[view]}</span>'
    else:
        bd = f'<span class="bd">{nfilters}</span>' if nfilters else ""
        lead = f'{srch}<span class="ft{" on" if nfilters else ""}">Filters{bd}</span>'
        sort = '<span class="st">⇅</span>'
    chips = []
    if friend:
        chips.append(f'<span class="sch"><b>Friend</b>{friend} <b>×</b></span>')
    if q:
        chips.append(f'<span class="sch">“{q}” <b>×</b></span>')
    r2 = (''.join(chips) if chips else '<span class="none">No filters on</span>') + f'<span class="ca{"" if chips else " lk"}">Clear all</span>'
    tr = '<span class="tr"><i></i>reading friends’ spares</span>' if reading else ""
    return (f'<div class="sc"><div class="r1"><div class="sld">{lead}</div><span class="hl"></span>{sort}</div>'
            f'<div class="r2">{r2}</div><div class="r3"><span>{result}</span>{tr}</div></div>')


def page2(view, list_html, desk=True, chassis="", list_h=None, over="", fade=True, nofriend_key=False):
    """The cart page with the shipped chassis as its own band under the view row (no second frame)."""
    key = X.S.key_item("buy", "press to add", False)
    if view != "friend" and not nofriend_key:
        key = X.S.key_item("spare", "friend has a spare", False) + key
    vr = f'<div class="vrow2">{X.vswitch(view)}<span class="key">{key}</span></div>'
    fd = '<div class="fade"><span>scrolls on</span></div>' if fade else ""
    lst = f'<div class="lbox" style="height:{list_h}px">{list_html}{fd}</div>' if list_h else list_html
    if desk:
        return (X.head() + f'<div class="cg"><div style="display:flex;flex-direction:column;gap:14px">{X.dsel()}{X.ckout()}</div>'
                f'<section style="display:flex;flex-direction:column;gap:12px;min-width:0;position:relative">{vr}'
                f'<div style="margin:0 -22px 0 -12px">{chassis}</div>{lst}{over}</section></div>')
    return (X.head() + f'<div class="cg">{X.ckout()}{X.dsel(False)}<div class="pin2">{vr}{chassis}</div>{lst}</div>')


FRIEND_RESULT = "4 friends · 188 spares"
CARD_RESULT = "48 cards · 9 with a friend’s spare"


# ================================================================ R2 Main
def main_board():
    answers = [
        ("1 · A failed spares read", "Board <b>Failed-Read</b>",
         "<b>By card and By deck:</b> as you recommended. The shared toast (<code>SocialToast</code> over <code>ToastFrame</code>) with its <b>Try again</b> action, which the toast already supports. Spare cells empty with no bars, the Friend trigger gone, the spare key item gone, and the result line without its spare clause.<br><br>"
         "<b>By friend: one change.</b> The view has nothing in it but friend data, so once the toast leaves after a few seconds the list would be blank, and a blank list reads as broken. By friend draws a <b>block</b> in its list place instead: the dashed empty-state shape with <b>Try again</b>. It draws no toast as well, since the block says it. The segment still shows."),
        ("2 · The sticky panel header", "Board <b>Sticky</b>",
         "<b>Desktop: as you recommended, with one detail.</b> The stuck header keeps its <code>--elevated</code> fill and its existing 1px bottom rule. There's no shadow and no new edge. The rule is <code>--border-strong</code>, which the header already draws, so nothing changes when it sticks; a second <code>--border</code> line would sit right next to it. Rows pass under it, hidden by the opaque fill. When the next panel arrives, its header pushes the stuck one up and out.<br><br>"
         "<b>Phone: headers don’t stick.</b> Agreed. The pinned controls already take about 190px of 844, and a stuck header would take 52px more.<br><br>"
         "<b>For engineering:</b> the panel draws <code>overflow: hidden</code> for its rounded corners. That makes the panel its own scroll container and stops <code>position: sticky</code> from working. Use <code>overflow: clip</code>."),
        ("3 · A first deck name wider than its cell", "Board <b>Long-Name</b>",
         "<b>As you recommended:</b> an ellipsis on that one name, with +N always after it. It's the only place a name is cut.<br><br>"
         "<b>One case your rule doesn’t cover:</b> a single deck name that doesn’t fit, with nothing hidden after it. Ellipsis alone would leave no way to read the whole name on a phone. When a name is cut and nothing follows, the same pill reads <b>more</b> and opens the same inline list (one deck, its count), so a cut name can always be read in full. The word goes to /copy-review."),
        ("4 · Which chassis wins", "Board <b>Chassis</b>",
         "<b>Your call. I recommend the shipped chassis wins and the mock is updated.</b> The handoff promised “the same anatomy and sizes as /decks” and “no new tokens”, so where the mock disagrees with the shipped parts, the mock is what was wrong. Changing the shared parts would also move four other routes. Board Chassis lists every value side by side and redraws the cart’s controls with the shipped parts.<br><br>"
         "<b>That covers the phone sort too.</b> Gap report items 21 to 27 rebuilt the cart’s phone sort as the mock’s B2 sheet. /decks on a phone uses <code>OrderMenu</code>’s ⇅ button and its dropdown, so with this ruling the cart should too, and the B2 sheet is retired. The cart’s Filters sheet (A6) stays, since each route builds its own sheet."),
    ]
    cards = notes(*[note(f"{t} · <span style=\"color:var(--fg-faint);font-weight:400\">{w}</span>", f"<p>{b}</p>") for t, w, b in answers], cols=2)
    copy = ('<div class="note"><h4>For /copy-review</h4><ul>'
            '<li>The failed-read toast: <b>We couldn’t read your friends’ spares.</b>, with <b>Try again</b>.</li>'
            '<li>By friend’s failed block: <b>Couldn’t read your friends’ spares</b>, then <b>Your cards and prices are here. Friends’ spares didn’t load.</b>, then <b>Try again</b>.</li>'
            '<li>The pill for a cut name with nothing after it: <b>more</b>.</li>'
            '<li>R2 now writes <b>N spares</b> (inflected), matching the shipped copy, as the plan’s copy list asked.</li></ul></div>')
    body = (board_head("Shopping for all decks v2 · R2 · account 1 · 2026-10-28",
                       "Four answers engineering asked for",
                       "From the plan’s For Design section (#2321: B2, B3, B4) and the PR 8 gap report (#2330). Every artboard in this round draws the <b>shipped</b> chassis, as recommended in item 4. "
                       "If you rule the other way, only the controls in these frames change; the answers to 1 to 3 stand either way.", tag="R2")
            + cards + copy)
    return doc("All decks cart v2 · R2 answers", body, 1612)


# ================================================================ 1 · Failed read
def no_spares():
    c = _copy.deepcopy(X.C)
    for k in X.C:
        X.C[k] = (X.C[k][0], X.C[k][1], {}, *X.C[k][3:])
    c2 = (dict(X.COLS), {k: list(v) for k, v in X.HEADS.items()})
    X.COLS["card"] = "minmax(0,1.3fr) minmax(0,1.75fr) 0px minmax(0,1.3fr) 100px"
    X.HEADS["card"][2] = ""
    return c, c2


def failed_block():
    return ('<div class="emp"><h3>Couldn’t read your friends’ spares</h3>'
            '<p>Your cards and prices are here. Friends’ spares didn’t load.</p><span class="bg">Try again</span></div>')


def toast(bottom):
    return f'<div class="tst" style="bottom:{bottom}px"><span>We couldn’t read your friends’ spares.</span><b>Try again</b></div>'


def failed_board():
    saved = no_spares()
    try:
        ctl = shipped("card", True, result="48 cards", nofriend=True)
        d1 = dk(page2("card", X.by_card_list(True), True, ctl, LH, nofriend_key=True), over=toast(24))
        p1 = ph(page2("card", X.by_card_list(False), False, shipped("card", False, result="48 cards"), 470, nofriend_key=True), h=844,
                over=toast(74 + 16))
        ctlf = shipped("friend", True, result="Friends’ spares didn’t load", nofriend=True)
        d2 = dk(page2("friend", failed_block(), True, ctlf, nofriend_key=True), h=None)
        p2 = ph(page2("friend", failed_block(), False, shipped("friend", False, result="Friends’ spares didn’t load"), nofriend_key=True))
    finally:
        X.C.clear(); X.C.update(saved[0])
        X.COLS.clear(); X.COLS.update(saved[1][0]); X.HEADS.clear(); X.HEADS.update(saved[1][1])
    body = (board_head("1 · A failed spares read", "Say it failed, and keep everything else working",
                       "Today a failed read draws “None of your friends has one of these… right now”, which is false. A failure now leaves friend data out and says so once. "
                       "Cards, prices, buy, search, Owned, Sort and checkout all work as normal.", tag="R2")
            + frames(frame("<b>A</b> · By card, read failed · 1300", d1,
                           "<b>The shared toast</b> at the shipped desktop place (bottom 24, centred, max 420) with <b>Try again</b>, which re-runs the read and returns to the reading state (Loading A). "
                           "The spare column closes up (it comes back once Try again lands), and there’s no Friend trigger and no spare key item. The result line drops its “with a friend’s spare” clause. By deck is the same."),
                     frame("<b>B</b> · By card, read failed · 390", p1,
                           "The same toast above the tab bar (tab bar + 16). Rows lose their SPARE line, exactly as a row with no spare does today."))
            + frames(frame("<b>C</b> · By friend, read failed · 1300", d2,
                           "<b>The one change from your recommendation.</b> By friend has nothing in it but friend data, so once a toast left, the view would be blank. It draws the dashed empty-state shape with <b>Try again</b>, and no toast as well. "
                           "Switch to By card and the toast isn’t repeated: one failure, said once."),
                     frame("<b>D</b> · By friend, read failed · 390", p2,
                           "The same block at 390.")))
    return doc("All decks cart v2 · R2 failed read", body, 2000)


# ================================================================ 2 · Sticky header
def sticky_desk(state):
    """The column header (fixed, above the box), then the list box scrolled. 'stuck' or 'push'."""
    hdr = X.colh("friend", "padding-left:15px;padding-right:15px")
    if state == "stuck":
        rows = "".join(X.drow(c, "friend", "Chris") for c in
                       ["Arcane Signet", "Beast Within", "Sol Ring", "Cultivate", "Lightning Greaves", "Swiftfoot Boots"])
        body = (f'<div class="fpn" style="position:absolute;left:0;right:0;top:-12px;border-radius:0 0 12px 12px;border-top:0">{rows}</div>'
                f'<div class="fpn" style="position:absolute;left:0;right:0;top:0;z-index:3;border-radius:0;border-top:0;border-bottom:0">{X.fhead("Chris")}</div>')
    else:
        colin = X.fpanel("Colin", ["Lightning Greaves", "Sol Ring", "Beast Within", "Chaos Warp"], True)
        body = (f'<div class="fpn" style="position:absolute;left:0;right:0;top:-22px;z-index:3;border-top:0;border-radius:0 0 12px 12px">{X.fhead("Chris")}</div>'
                f'<div style="position:absolute;left:0;right:0;top:43px">{colin}</div>')
    box = (f'<div style="position:relative;height:{LH - 40}px;overflow:hidden;margin-top:10px">{body}'
           '<div class="fade"><span>scrolls on</span></div></div>')
    return (f'{hdr}<div style="position:relative">{box}'
            '<div class="edgeline" style="top:10px"><span>list box top</span></div></div>')


def sticky_board():
    ctl = shipped("friend", True, result=FRIEND_RESULT)
    d1 = dk(page2("friend", sticky_desk("stuck"), True, ctl, LH))
    d2 = dk(page2("friend", sticky_desk("push"), True, ctl, LH))
    pctl = shipped("friend", False, result=FRIEND_RESULT)
    # phone scrolled: Chris's header gone up under the pinned block, rows continue
    prow = "".join(X.prow(c, "friend", "Chris") for c in ["Sol Ring", "Cultivate", "Lightning Greaves"])
    plist = (f'<div class="fpn" style="border-top:0;border-top-left-radius:0;border-top-right-radius:0">{prow}</div>'
             + X.fpanel("Colin", ["Lightning Greaves", "Sol Ring"], False))
    p1 = ph(page2("friend", plist, False, pctl, 520), h=844)
    spec = ('<div class="note" style="width:560px"><h4>The stuck header</h4><div class="spec">'
            '<span>position</span><b>sticky; top: 0 inside the list box (desktop only)</b>'
            '<span>fill</span><b>--elevated, opaque (as at rest)</b>'
            '<span>bottom</span><b>its own 1px --border-strong (as at rest)</b>'
            '<span>shadow / edge</span><b>none added</b>'
            '<span>corners</span><b>the panel’s rounded top scrolls away; the stuck header is square</b>'
            '<span>z</span><b>above its own rows</b>'
            '<span>hand-off</span><b>scoped to its panel: the next header pushes it up</b>'
            '<span>panel</span><b>overflow: clip, not hidden (hidden breaks sticky)</b>'
            '<span>phone</span><b>not sticky; only the controls block pins</b></div></div>')
    body = (board_head("2 · The sticky By friend panel header", "Stuck, it looks exactly as it does at rest",
                       "The header already draws an opaque fill and a bottom rule, which is everything a stuck header needs. Rows slide under it and are hidden by the fill. Nothing is added. The dashed blue line marks the top of the list box.", tag="R2")
            + frames(frame("<b>A</b> · Chris stuck, rows under it · 1300", d1,
                           "Scrolled into Chris’s 41 rows. The column header sits above the box and never scrolls; Chris’s header is stuck at the box top, and Arcane Signet is half under it, hidden by the fill."),
                     frame("<b>B</b> · Colin arriving · 1300", d2,
                           "Chris’s last row has passed, so his header rides up with his panel’s bottom edge and leaves the box; Colin’s scrolls up to replace it. Only one header is ever stuck, and sticky does this by itself, scoped to each panel."))
            + frames(frame("<b>C</b> · phone, scrolled · 390", p1,
                           "Headers don’t stick on a phone. Chris’s header scrolled away under the pinned controls; the rows and Colin’s panel follow as normal."),
                     frame("Spec", spec)))
    return doc("All decks cart v2 · R2 sticky header", body, 2860)


# ================================================================ 3 · Long first name
LONG = "HD Tune - The Wise Mothman, Apocalypse Cult"


def need_cell(names, count, rest=0, cut=False, word=None):
    nm = f'<span class="nms{" cut" if cut else ""}">{names}</span>'
    pill = f'<span class="mo{" word" if word else ""}">{word or "+" + str(rest)}</span>' if (rest or word) else ""
    return f'<span class="fv"><b>{count}</b>{nm}{pill}</span>'


def lrow_desk(card, need_html, price, over=False, state="ask", spare=3, own=""):
    return (f'<div class="nrw" style="grid-template-columns:{X.COLS["friend"]}"><span class="cn"><span class="nm2">{card}</span></span>'
            f'<span class="cellbox" style="min-width:0;display:flex">{need_html}</span><span class="fv"><b>{spare}</b></span>'
            f'<span>{own}</span><span class="act">{X.status(state)}{X.buy(price, over)}</span></div>')


def lrow_phone(card, need_html, price, over=False, state="ask", spare=3):
    return (f'<div class="prw"><div class="l"><span class="nm2">{card}</span>'
            f'<div class="f"><em>need</em><span class="cellbox" style="min-width:0;display:flex">{need_html}</span></div>'
            f'<div class="f"><em>spare</em><span class="fv"><b>{spare}</b></span></div></div>'
            f'<span class="act">{X.status(state)}{X.buy(price, over)}</span></div>')


def opened_one(desk=True):
    lst = f'<span class="dl"><span>{LONG}</span><span>1</span></span>'
    head = '<span class="fv"><b>1</b><span class="nms">for 1 deck</span><span class="mo lt">less</span></span>'
    return f'<span style="display:flex;flex-direction:column;min-width:0">{head}{lst}</span>'


def long_board():
    cases_d = (
        lrow_desk("Lightning Greaves", need_cell("HD - Gishath, HD - Kratos", 4, rest=2), "$9.60", True)
        + lrow_desk("Swiftfoot Boots", need_cell(LONG, 3, rest=2, cut=True), "$5.70", True)
        + lrow_desk("Cultivate", need_cell(LONG, 1, cut=True, word="more"), "$0.50", spare=6)
        + '<div class="nrw" style="grid-template-columns:' + X.COLS["friend"] + ';align-items:start"><span class="cn"><span class="nm2">Cultivate</span></span>'
        f'<span class="cellbox" style="min-width:0;display:flex">{opened_one()}</span><span class="fv"><b>6</b></span><span></span>'
        f'<span class="act">{X.status("ask")}{X.buy("$0.50")}</span></div>'
        + lrow_desk("Elvish Archdruid", need_cell("HD - Elves", 1), "$1.80", spare=1)
    )
    dpanel = f'<div style="width:860px;display:flex;flex-direction:column;gap:8px">{X.colh("friend")}<div class="fpn">{X.fhead("Chris")}{cases_d}</div></div>'
    cases_p = (
        lrow_phone("Lightning Greaves", need_cell("HD - Gishath", 4, rest=3), "$9.60", True)
        + lrow_phone("Swiftfoot Boots", need_cell(LONG, 3, rest=2, cut=True), "$5.70", True)
        + lrow_phone("Cultivate", need_cell(LONG, 1, cut=True, word="more"), "$0.50", spare=6)
        + f'<div class="prw"><div class="l"><span class="nm2">Cultivate</span><div class="f"><em>need</em>{opened_one(False)}</div>'
        f'<div class="f"><em>spare</em><span class="fv"><b>6</b></span></div></div><span class="act">{X.status("ask")}{X.buy("$0.50")}</span></div>'
        + lrow_phone("Elvish Archdruid", need_cell("HD - Elves", 1), "$1.80", spare=1)
    )
    ppanel = f'<div class="fpn" style="width:358px">{X.fhead("Chris", ph=True)}{cases_p}</div>'
    rule = ('<div class="note" style="width:520px"><h4>The rule, in order</h4><ol>'
            '<li>Fit as many <b>whole</b> names as the cell holds, with room for the pill. Drop whole names from the end until it fits (G6).</li>'
            '<li>If even the <b>first</b> name doesn’t fit beside its pill, cut that one name with an ellipsis. It’s the only name ever cut.</li>'
            '<li>The pill always shows when anything is hidden: <b>+N</b> when names are left out, or <b>more</b> when the only thing hidden is the end of a cut name.</li>'
            '<li>The pill opens the same inline list, and <b>less</b> folds it. The opened list never truncates; long names wrap there.</li>'
            '<li>The own fact and By card’s friend names follow the same rule.</li>'
            '<li>The full names are always in the accessible name, so a screen reader never hears a cut.</li></ol>'
            '<p style="margin-top:8px">The blue dashed outline marks the need cell’s bounds in these frames only.</p></div>')
    body = (board_head("3 · A first deck name wider than its cell", "Cut one name, and always leave a way to read it",
                       "G6 drops whole names until +N fits. These frames cover what G6 couldn’t: a first name that is too long on its own. "
                       "The fixture deck name is deliberately long (43 characters), and the rows run from fits, to cut with more decks, to cut alone, to opened.", tag="R2")
            + frames(frame("<b>A</b> · the cases · 1300 list", dpanel,
                           "Row 1 fits (shipped G6). Row 2: the first name is cut, then <b>+2</b>. Row 3: one long name, cut, then <b>more</b>. Row 4: row 3 opened, with the full name wrapping in the list. Row 5: a short name with no pill."),
                     frame("<b>B</b> · the cases · 390", ppanel,
                           "At 390 the need cell is about 180px, so names are cut sooner, and a cut name with nothing after it is more common on a phone than on desktop."),
                     frame("Rule", rule)))
    return doc("All decks cart v2 · R2 long first name", body, 2160)


# ================================================================ 4 · Chassis ruling
ROWS = [
    ("Chassis frame", "the cart’s pinned wrapper and a padded block: no fill of its own, row gap 8", "<b>its own band</b>: <code>--surface-sunken</code>, 1px <code>--border</code> bottom, padding 12/10 and 22 (16 compact), row gap 10. The cart’s wrapper draws no second frame", "1–4"),
    ("Desktop list gap", "14", "12, as /decks", "5"),
    ("Hairline", "22px, <code>--border-strong</code>, desktop only", "20px, <code>--border</code>, <b>both forms</b>", "6, 7"),
    ("Search field", "34 / radius 8 desktop, 44 phone; ✕ as a bare glyph", "<code>DeckSearchField</code>: 34 / radius 8 / gap 9 / 12.5px desktop, 44 / radius 10 / 16px phone; ✕ a 24px round <code>--border</code> button, space held while empty; accent edge while a query is on (already added in #2330)", "8–13"),
    ("Filter triggers", "34px, mono 12, transparent", "<code>FilterPanel</code>’s: sans 13 medium, <code>--elevated</code> fill, radius 8, chevron; one picked reads <b>Friend: Chris</b> with an accent edge; phone 44 pill", "16"),
    ("Sort trigger", "34px, mono, “Sort · Most decks ▾”", "<code>OrderMenu</code>: 32px, sans 12.5 medium, no caret; a 44px <b>⇅</b> text glyph below 1000px", "14, 16"),
    ("Sort menu, desktop", "220px raised panel, SORT header, ring radios, 13.5px", "186px on <code>--surface</code>, no header, no radios; the current order on <code>--elevated</code>; 38px rows, 13px", "15–20"),
    ("Sort, phone", "a bottom sheet (B2)", "<b>the same OrderMenu dropdown</b> under the ⇅ button, 44px rows (B2 retired)", "21–27"),
    ("No filters on", "NO FILTERS ON, 10px caps, letter-spaced", "“No filters on”, mono 11, sentence case", "28"),
    ("Chip ✕", "<code>--fg-muted</code>", "<code>--fg-faint</code> ×", "29"),
    ("Clear all", "sans 12 accent, only with a chip", "mono 11 underlined, <b>always present</b>, pushed right; <code>--fg-locked</code> with no chip", "30"),
    ("Reading dot", "7px gap", "the <code>ResultLine</code> trailing slot, gap 8 (A7)", "31"),
]


def chassis_board():
    tbl = ('<div class="vs2"><div class="h">Part</div><div class="h">The v2 mock</div><div class="h">Shipped (recommended)</div>'
           + "".join(f'<div class="k">{p}<br><span style="font:400 10.5px \'IBM Plex Mono\';color:var(--fg-faint)">gaps {g}</span></div><div>{m}</div><div class="w">{s}</div>' for p, m, s, g in ROWS)
           + "</div>")
    mock_d = X.chassis("card", True, result=CARD_RESULT, open_="sort")
    mock_d = f'<div class="slab" style="width:880px;padding:14px;position:relative;height:330px">{mock_d}' + X.S.__dict__.get("dummy", "") + \
        '<div class="pop" style="position:absolute;right:14px;top:58px;width:220px"><div class="ph2">Sort</div>' + \
        "".join(f'<div class="it{" on" if i == 0 else ""}"><span class="rad"></span>{o}</div>' for i, o in enumerate(["Most decks", "Price, high first", "Price, low first", "Most spare", "Name"])) + "</div></div>"
    ship_d = shipped("card", True, result=CARD_RESULT, sort_open=True)
    menu = '<div class="om" style="right:22px;top:52px">' + "".join(
        f'<span class="{"on" if i == 0 else ""}">{o}</span>' for i, o in enumerate(["Most decks", "Price, high first", "Price, low first", "Most spare", "Name"])) + "</div>"
    ship_d = f'<div class="slab" style="width:880px;position:relative;height:330px">{ship_d}{menu}</div>'
    # filtered, both
    mock_f = f'<div class="slab" style="width:880px;padding:14px">{X.chassis("card", True, q="boots", friend="Chris", result="1 of 48 cards")}</div>'
    ship_f = f'<div class="slab" style="width:880px">{shipped("card", True, q="boots", friend="Chris", result="1 of 48 cards")}</div>'
    mock_p = f'<div class="slab ph" style="width:390px;padding:12px 16px;border-radius:12px">{X.chassis("card", False, result=CARD_RESULT)}</div>'
    ship_p = f'<div class="slab ph" style="width:390px;border-radius:12px">{shipped("card", False, result=CARD_RESULT)}</div>'
    # the cart, redrawn with the shipped parts
    d1 = dk(page2("card", X.by_card_list(True), True, shipped("card", True, result=CARD_RESULT), 600))
    pmenu = '<div class="om" style="right:16px;top:521px;width:200px">' + "".join(
        f'<span class="{"on" if i == 0 else ""}">{o}</span>' for i, o in enumerate(["Most decks", "Price, high first", "Price, low first", "Most spare", "Name"])) + "</div>"
    p1 = ph(page2("card", X.by_card_list(False), False, shipped("card", False, result=CARD_RESULT), 400), over=pmenu)
    body = (board_head("4 · Which chassis wins", "Recommended: the shipped one, and the mock is updated",
                       "The handoff said the cart uses the shipped <code>FilterChassis</code> (“same anatomy and sizes as /decks”, “no new tokens”), and its mock drew several parts differently. "
                       "Going with the mock would restyle /decks, /collection, the commanders rack and the precon list to match one route. Going with shipped changes only the cart. "
                       "<b>Your call</b>; every R2 frame is drawn with the shipped parts. The gap numbers are #2330’s.", tag="R2")
            + tbl
            + sec("Side by side", "Desktop, Sort open")
            + frames(frame("<b>A1</b> · the v2 mock", mock_d), frame("<b>A2</b> · shipped", ship_d))
            + sec("Side by side", "Desktop, a filter and a search on")
            + frames(frame("<b>B1</b> · the v2 mock", mock_f), frame("<b>B2</b> · shipped", ship_f,
                     "The chip row keeps <b>Clear all</b> pushed right, as on /decks. The picked trigger reads <b>Friend: Chris</b>."))
            + sec("Side by side", "Phone")
            + frames(frame("<b>C1</b> · the v2 mock", mock_p), frame("<b>C2</b> · shipped", ship_p,
                     "The shipped compact form: search, Filters, then the ⇅ text glyph past the hairline."))
            + sec("The cart, with the shipped parts", "What engineering builds if shipped wins")
            + frames(frame("<b>D1</b> · By card · 1300", d1,
                           "The chassis is its own sunken band under the view row, as on /decks, and the cart adds no frame around it."),
                     frame("<b>D2</b> · By card, sort open · 390", p1,
                           "The pinned block is the view row and the chassis band. ⇅ opens <code>OrDerMenu</code>’s dropdown, not a sheet.".replace("OrDerMenu", "OrderMenu"))))
    return doc("All decks cart v2 · R2 chassis", body, 2040)


BOARDS = [("R2-Main", main_board, "R2 · four answers"),
          ("R2-Failed-Read", failed_board, "R2 · 1 · A failed spares read"),
          ("R2-Sticky", sticky_board, "R2 · 2 · The sticky panel header"),
          ("R2-Long-Name", long_board, "R2 · 3 · A first deck name wider than its cell"),
          ("R2-Chassis", chassis_board, "R2 · 4 · Which chassis wins")]
