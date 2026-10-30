"""Welcome credits R2 boards (account 2, 2026-10-21), after Hugh's R1 feedback:
too large, a wall of text, below the fold on the phone, the right column leaves a hole on the dashboard, and the 0
state is drawn where it can't happen. R2: a one-line strip high on Home, the list in a sheet (phone) / modal (desktop)."""
import sys
from wkit import *
from welcome import H, tag, col, frames, ph_scrolled
import kit

R2CSS = r"""
/* ---------------- the strip (NEW, R2): one line high on Home, the About line's family ---------------- */
.ws{display:flex;align-items:center;gap:12px;min-height:52px;padding:7px 4px 7px 12px;border-radius:12px;border:1px solid var(--accent-dim);background:var(--surface);font-size:13.5px;line-height:1.45;color:var(--fg-body)}
.ws.warn{border-color:color-mix(in srgb,var(--warning) 60%,var(--border-strong))}
.ws .wsm{flex:none;width:30px;height:30px;display:flex;align-items:center;justify-content:center}
.ws .wsm i{width:22px;height:22px;transform:rotate(45deg);border:1.5px solid var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--surface));border-radius:3px;display:flex;align-items:center;justify-content:center;font-style:normal}
.ws .wsm i b{transform:rotate(-45deg);font:700 11px var(--disp);color:var(--accent)}
.ws.warn .wsm i{border-color:var(--warning);background:color-mix(in srgb,var(--warning) 12%,var(--surface))}
.ws.warn .wsm i b{color:var(--warning)}
.ws .wsm.dim{opacity:.45;filter:saturate(.3)}
.ws .wst{flex:1;min-width:0;text-wrap:pretty}
.ws .wst b{color:var(--fg);font-weight:600}
.ws.warn .wst b.w{color:var(--warning)}
.ws .wst u{color:var(--fg);text-decoration-color:color-mix(in srgb,var(--accent) 55%,transparent);text-underline-offset:3px;white-space:nowrap;position:relative}
.ws .wst u::after{content:'';position:absolute;left:-6px;right:-6px;top:-12px;bottom:-12px}
.ws .wsx{flex:none;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint);font-size:13px}
.dk .ws .wsx{width:32px;height:32px;margin-right:4px}
.frs{margin:8px 16px 0}
.dk .frs{margin:10px 28px 0}
/* the list, in the shipped SocialModal sheet / modal */
.wl{margin:0;padding:0;list-style:none;display:flex;flex-direction:column}
.wl li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 12px;padding:10px 0;border-top:1px solid var(--border)}
.wl li .nm{font-size:14px;font-weight:600;color:var(--fg);align-self:center}
.wl li .cp{align-self:center;white-space:nowrap;border-radius:999px;border:1px solid var(--accent-dim);padding:2px 9px;font:11px 'IBM Plex Mono',monospace;color:var(--accent-text)}
.wl li .wh{grid-column:1/-1;font:11px 'IBM Plex Mono',monospace;color:var(--fg-faint);display:flex;align-items:center;gap:6px}
.wl li .wh .try{margin-left:auto}
.wlr{margin:0;padding:9px 0 3px;border-top:1px solid var(--border);font:11px 'IBM Plex Mono',monospace;color:var(--fg-muted);display:flex;align-items:center;gap:8px}
.wlr i{width:6px;height:6px;transform:rotate(45deg);border:1px solid var(--fg-faint);display:block;flex:none}
.wlr .lock{color:var(--fg-locked)}
.wlf{border-top:1px solid var(--border);margin-top:2px}
.wlf .tz{min-height:44px;display:flex;align-items:center;justify-content:space-between;font:600 13.5px 'IBM Plex Sans',sans-serif;color:var(--accent-text)}
.wlf .tz i{font-style:normal}
.mbody p.gl b{color:var(--fg);font-weight:600}
.mbody p.gl.warn,.mbody p.gl.warn b{color:var(--warning)}
.mdl.wide{width:460px;margin-left:-230px;top:70px}
.cell .su u{color:var(--fg);text-decoration-color:color-mix(in srgb,var(--accent) 55%,transparent);text-underline-offset:3px}
.fold{position:absolute;left:0;right:0;border-top:1.5px dashed var(--accent);z-index:40}
.fold em{position:absolute;right:8px;top:-20px;font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.1em;color:var(--accent);font-style:normal;background:var(--bg);padding:1px 6px;border-radius:4px}
"""
kit.CSS = kit.CSS + R2CSS

S = {
    "held": "<b>15 welcome credits</b> to try the tools, until Nov 20.",
    "part": "<b>9 of your 15 welcome credits</b> are left, until Nov 20.",
    "expiring": '<b class="w">15 welcome credits</b> expire in 3 days, on Nov 20.',
    "expiringPart": '<b class="w">9 welcome credits</b> expire in 3 days, on Nov 20.',
    "usedUp": "You’ve used all 15 welcome credits.",
    "where": "Where they work",
    "more": "See packs and the monthly plan",
    "freeBack": "Your free credit comes back each day.",
}


def strip(state="held", left=15, payments=True, bought=False):
    """held | part | expiring | usedUp. Used up only once a collection is in (a run needs one)."""
    warn = state == "expiring"
    if state == "usedUp":
        tail = f' <u>{S["more"]}</u>' if (payments and not bought) else f' {S["freeBack"]}'
        txt, n = S["usedUp"] + tail, 0
    else:
        key = {"held": "held", "part": "part", "expiring": "expiring" if left == 15 else "expiringPart"}[state]
        txt, n = f'{S[key]} <u>{S["where"]}</u>', left
    return (f'<div class="ws{" warn" if warn else ""}" role="region" aria-label="Welcome credits">'
            f'<span class="wsm{" dim" if n == 0 else ""}" aria-hidden="true"><i><b>{n}</b></i></span>'
            f'<span class="wst">{txt}</span><span class="wsx" aria-label="Close">✕</span></div>')


# ---------------------------------------------------------------- Homes with the strip
def first_run2(st="", desk_=False):
    head = (f'<div class="frhd"><p class="frk">Step 1 of 3</p><h1 class="frh1">Welcome to The 99</h1>'
            + (f'<p class="frpl"><span style="color:var(--fg-locked)">{LOCK}</span>Commanders, Discover and Decks open once your cards are in.</p>' if desk_ else "")
            + '</div>')
    stack = (step1(desk_) + locked(2, "Pick a commander or import a deck", "Opens once your cards are in")
             + locked(3, "Build the 99", "Opens once you pick a commander") + friends_row())
    s = f'<div class="frs">{st}</div>' if st else ""
    return f'<div class="frp">{head}{about_line()}{s}<div class="frst">{stack}</div></div>'


def dashboard2(st="", desk_=False):
    html = dashboard("", desk_=desk_)
    if not st:
        return html
    if desk_:
        return html.replace('<div class="dbl">', f'<div class="dbl">{st}', 1)
    return html.replace('<div class="dbb">', f'<div class="dbb">{st}', 1)


def fold(y=844 - 84):
    return f'<div class="fold" style="top:{y}px"><em>FOLD · 844</em></div>'


# ---------------------------------------------------------------- the sheet / modal
def wl_rows(mode):
    """mode: first (no collection) | nodeck (cards in, no deck) | deck."""
    def li(r, try_):
        rid, name, where, what, cost, short = r
        t = f'<span class="try">{W["tryIt"]}<i>›</i></span>' if try_ else ""
        return f'<li><span class="nm">{name}</span><span class="cp">{short}</span><span class="wh"><span>{where}</span>{t}</span></li>'
    if mode == "first":
        return (f'<p class="wlr"><span class="lock">{LOCK}</span>Opens once your cards are in</p>'
                f'<ul class="wl">{"".join(li(r, False) for r in ROWS)}</ul>')
    if mode == "nodeck":
        first = [r for r in ROWS if r[0] not in NEEDS_DECK]
        rest = [r for r in ROWS if r[0] in NEEDS_DECK]
        return (f'<ul class="wl">{"".join(li(r, True) for r in first)}</ul>'
                f'<p class="wlr"><i></i>{NEEDS_A_DECK}</p>'
                f'<ul class="wl">{"".join(li(r, False) for r in rest)}</ul>')
    return f'<ul class="wl">{"".join(li(r, r[0] in LANDING) for r in ROWS)}</ul>'


def wsheet_body(mode="first", state="held", left=15, teaser=True):
    if state == "expiring":
        gl = f'<p class="gl warn"><b>{left} welcome credits</b> expire in 3 days, on November 20. Your free credit each day is spent first.</p>'
    elif left < 15:
        gl = f'<p class="gl"><b>{left} of your 15 welcome credits</b> are left, until November 20. Your free credit each day is spent first.</p>'
    else:
        gl = f'<p class="gl">You have <b>15 welcome credits</b> until November 20. Your free credit each day is spent first.</p>'
    foot = f'<div class="wlf"><span class="tz">{W["teaser"]}<i>›</i></span></div>' if teaser else ""
    return f'<p>{FREE_L6}</p>{gl}<div>{wl_rows(mode)}{foot}</div>'


def wsheet(mode="first", state="held", left=15, teaser=True, desk_=False):
    body = wsheet_body(mode, state, left, teaser)
    s = sheet(W["title"], body, desk_=desk_).replace(' new"', '"')
    if desk_:
        s = s.replace('class="mdl', 'class="mdl wide')
    return s


def ph_home(inner, over="", tabs=None, h=844):
    return ph_fr(inner, h=h, over=over, tabs=tabs)


# ================================================================ boards
CHANGES = [
    ("Too large, a wall of text", "The Home card is now <b>one line</b>: the count and the date, <u>Where they work</u>, and a bare ✕. Everything else moved into the sheet, which drops the tools’ descriptions (name, where, cost) and the intro."),
    ("Below the fold on the phone", "The strip sits <b>under the About line</b> on the first-run Home and <b>under the page head</b> on the dashboard: both above the fold at 390 × 844."),
    ("The right column leaves a hole", "On the dashboard it heads the <b>main column</b>, over Ready to build. The right column is Friends alone, as shipped."),
    ("The 0 state can’t happen before a collection", "Right: every tool needs cards in (New deck and Commanders are locked at 0 cards). Used up, partly spent, the paid limit and also bought are now drawn <b>on the dashboard only</b>. "
     "It also means no <code>Try it</code> before a collection: the first-run sheet shows the shipped lock line, <code>Opens once your cards are in</code>, once over all five."),
    ("A reference that isn’t clunky", "The same sheet opens from the strip and from the <b>Welcome cell on <code>/credits</code></b> (<u>Where they work</u> on its own line under the date), so the list is one press away for as long as the lot lasts, after the strip is closed."),
]

KEPT = ("Kept from R1: welcome as its own segment on the credit line, the chip as one number, the Welcome cell’s <code>expire Nov 20</code>, <code>--warning</code> at 3 days, "
        "the teaser (now the sheet’s foot) absent with payments off and gone once bought, ✕ closes for good per account, expired leaves nothing, switch off with a lot held still draws. "
        "The Line-and-Chip and Credits-Page boards stand as drawn.")


def r2_main():
    rows = "".join(f'<tr><td style="width:280px"><b>{a}</b></td><td>{b}</td></tr>' for a, b in CHANGES)
    phone = frame("First-run Home · 390 · the fold", ph_home(first_run2(strip())),
                  "The strip under the About line, above the fold; step 1 starts right under it.")
    sh = frame("Where they work · 390 · the sheet", ph_home(first_run2(strip()), over=wsheet("first")),
               "The list. Before a collection, no <code>Try it</code>: the lock line once.")
    dash = frame("Dashboard · desktop", desk(dashboard2(strip("part", 9), desk_=True), h=None, active="Home"),
                 "Heads the main column. The right column is Friends alone.", width=1300)
    body = (board_head("Welcome credits R2 · after Hugh’s feedback", "One line on Home, the list one press away",
                       "R1 put the whole list on Home. R2 keeps Home to one line and moves the list into the shipped sheet (phone) and modal (desktop).")
            + f'<div class="note" style="max-width:1900px"><table class="t" style="width:100%">{rows}</table><p style="margin:12px 0 0">{KEPT}</p></div>'
            + frames(phone, sh, dash))
    return doc("Welcome credits R2 · what changed", body, 2300, 2400)


def r2_home():
    fr = [frame("First-run Home · 390 · the fold", ph_home(first_run2(strip())),
                "Under the About line: the two lines read as the page’s notes, and step 1 still leads the stack."),
          frame("First-run Home · 390 · full length", ph_fr(first_run2(strip())), "Nothing else on the page moves."),
          frame("First-run Home · desktop", dk_fr(first_run2(strip(), desk_=True)),
                "Desktop: the same place, the width of the page’s content.", width=1300)]
    db = [frame("Dashboard · 390 · the fold", ph_home(dashboard2(strip("part", 9)), tabs=tabbar("Home")),
                "Once the cards are in: under the page head, over Ready to build."),
          frame("Dashboard · 390 · full length", ph_fr(dashboard2(strip("part", 9)), tabs=tabbar("Home")), ""),
          frame("Dashboard · desktop", desk(dashboard2(strip("part", 9), desk_=True), h=None, active="Home"),
                "Heads the main column. The right column keeps Friends alone, so nothing hangs under it.", width=1300)]
    body = (board_head("Welcome credits R2 · placement", "The strip, high on both Homes",
                       "Still the brief’s B, a card on Home, now one line. It is in the page, so it never arrives over an open surface or on the tour’s visit.")
            + '<div class="sec"><h3>The first-run Home (no collection)</h3>' + frames(*fr) + '</div>'
            + '<div class="sec"><h3>The dashboard (cards in)</h3>' + frames(*db) + '</div>')
    return doc("Welcome credits R2 · placement", body, 2300, 4200)


def r2_sheet():
    modes = [("first", "Before a collection", "No tool can run yet, so no <code>Try it</code>: the shipped lock line once, over all five."),
             ("nodeck", "Cards in, no deck", "Help me choose leads with <code>Try it ›</code>; the shipped reason line once over the four that need a deck."),
             ("deck", "With a deck", "About’s order; <code>Try it ›</code> on the three tools with a landing of their own.")]
    secs = []
    for m, t, cap in modes:
        home_ph = first_run2(strip()) if m == "first" else dashboard2(strip("part", 9) if m != "first" else strip())
        home_dk = first_run2(strip(), desk_=True) if m == "first" else dashboard2(strip("part", 9), desk_=True)
        left = 15 if m == "first" else 9
        tabs = None if m == "first" else tabbar("Home")
        ph = frame(f"{t} · 390 · the sheet", ph_home(home_ph, over=wsheet(m, left=left), tabs=tabs), cap)
        dkh = (dk_fr(home_dk, h=820, over=wsheet(m, left=left, desk_=True)) if m == "first"
               else desk(home_dk, h=820, active="Home", over=wsheet(m, left=left, desk_=True)))
        dk = frame(f"{t} · desktop · the modal", dkh, "", width=1300)
        secs.append(f'<div class="sec"><h3>{t}</h3>' + frames(ph, dk) + '</div>')
    # the Welcome cell on /credits opens the same sheet
    bal = bal_w(welcome=9, new=False).replace(CELL["welcomeSub"], f'{CELL["welcomeSub"]}<br><u>{S["where"]}</u>')
    cr = frame("/credits · the Welcome cell · 390", ph_fr(credits_page(bal, hist_rows=None), h=844, tabs=tabbar("none")),
               "<u>Where they work</u> on its own line under the date opens the same sheet, while the cell shows (a credit held).")
    cr2 = frame("…the sheet over /credits · 390", ph_fr(credits_page(bal, hist_rows=None), h=844, tabs=tabbar("none"), over=wsheet("deck", left=9, teaser=False)),
                "Opened from <code>/credits</code> the foot’s teaser is absent: the reader is already there.")
    spec = ('<div class="callout" style="max-width:1900px"><b>The sheet</b>'
            '<span>The shipped SocialModal: a sheet at 390, a 460 modal on desktop, bare ✕, the scrim closes it. Title <code>Where credits work</code>. '
            'Then R4’s line (L6, identical to <code>/credits</code>), the grant line with its date (the free credit goes first), the five rows reused from '
            '<code>writtenForYouCopy.rows</code> as name, where and cost (no description), and the teaser at the foot while payments are on and nothing is bought. '
            'At 3 days the grant line turns <code>--warning</code>.</span></div>')
    body = (board_head("Welcome credits R2 · where they work", "The list, in the shipped sheet",
                       "Opened from the strip’s <u>Where they work</u>, and from the Welcome cell on <code>/credits</code>.")
            + spec + "".join(secs)
            + '<div class="sec"><h3>The reference that stays: the Welcome cell</h3>' + frames(cr, cr2) + '</div>')
    return doc("Welcome credits R2 · the sheet", body, 2300, 4200)


def crop_ph(inner, h, tabs=None):
    return f'<div class="cropped" style="width:390px;height:{h}px;position:relative">{ph_fr(inner, h=h + 120, tabs=tabs)}</div>'


def strip_crop(st, desk_=False, w=1238):
    if desk_:
        return f'<div class="dk" style="height:auto;width:{w}px;display:block"><div style="padding:16px 28px">{st}</div></div>'
    return f'<div class="cropped" style="width:390px;padding:16px;background:var(--bg)">{st}</div>'


STATES = [
    ("Held, unused", "first", "lot exists, not expired, welcome = 15", "The count and the date, <u>Where they work</u>, ✕.", dict(state="held")),
    ("Expiring", "first", "welcome > 0, expiry within 3 days", "Border, mark and count in <code>--warning</code>, never <code>--danger</code>. A player can reach it with no collection (all 15 left).", dict(state="expiring")),
    ("Expired", "first", "expiresAt <= now", "Nothing: no strip, no cell, no segment.", None),
    ("No lot", "first", "no welcome row", "Nothing new, as shipped.", None),
    ("Switch off, lot held", "first", "welcomeCreditsEnabled false, lot exists", "Draws as held: the lot still spends, so its facts are true.", dict(state="held")),
    ("Payments off, lot held", "first", "paymentsEnabled false, welcome > 0", "The strip as held; the sheet has no teaser (absent, never disabled).", dict(state="held")),
    ("Partly spent", "dash", "0 < welcome < 15 (cards in)", "What is left: <code>9 of your 15 welcome credits are left</code>.", dict(state="part", left=9)),
    ("Expiring, partly spent", "dash", "welcome > 0, within 3 days", "As expiring, with what is left.", dict(state="expiring", left=9)),
    ("Used up", "dash", "welcome = 0, not expired (cards in)", "Says so, with the teaser as its link, <u>See packs and the monthly plan</u> (payments on, nothing bought). Leaves on Nov 20 or ✕. No <u>Where they work</u>: nothing left to spend there.", dict(state="usedUp")),
    ("Used up, payments off", "dash", "welcome = 0, paymentsEnabled false", "No link: <code>Your free credit comes back each day.</code>", dict(state="usedUp", payments=False)),
    ("Paid limit reached", "dash", "paidAtLimit (needs a purchase)", "The strip adds nothing: as partly spent. The press and the line carry the limit (Line-and-Chip, W6).", dict(state="part", left=9)),
    ("Also bought", "dash", "everBought", "The strip as held; the sheet’s teaser goes. Used up after a purchase reads like payments off.", dict(state="held")),
]


def r2_states():
    rows = []
    for name, home, trig, cap, kw in STATES:
        where = "first-run Home" if home == "first" else "dashboard"
        wdk = 1238 if home == "first" else 838
        if kw is None:
            none = '<div class="cropped" style="width:390px;padding:22px 16px;background:var(--bg);font:12px \'IBM Plex Mono\',monospace;color:var(--fg-faint)">Nothing drawn: Home as shipped.</div>'
            ph, dk = frame(f"{name} · 390", none, ""), ""
        else:
            ph = frame(f"{name} · {where} · 390", strip_crop(strip(**kw)), "")
            dk = frame(f"{name} · {where} · desktop ({'page' if home == 'first' else 'main column'} width)", strip_crop(strip(**kw), desk_=True, w=wdk + 56), "", width=wdk + 56)
        rows.append(f'<div class="sec"><div class="rowh">{tag(name)}<span class="cap" style="margin:0"><code>{trig}</code> · {cap}</span></div>' + frames(ph, dk) + '</div>')
    body = (board_head("Welcome credits R2 · every state", "Each state on the Home it can happen on",
                       "Before a collection nothing can be spent, so held, expiring, switch off and payments off are drawn on the first-run Home, "
                       "and every state after a run (partly spent, used up, the paid limit, also bought) on the dashboard. The chip, the credit line and the Welcome cell are as drawn in R1 (Line-and-Chip, Credits-Page).")
            + "".join(rows))
    return doc("Welcome credits R2 · states", body, 1900, 4000)


def r2_themes():
    secs = []
    for key, name, disp, toks in [t for t in THEMES if t[0] in ("amonkhet", "kaldheim")]:
        secs.append(f'<div class="sec th th-{key}"><div class="th-head"><b>{name}</b></div>'
                    + frames(frame("held · first-run · 390", ph_home(first_run2(strip())), ""),
                             frame("expiring · the sheet · 390", ph_home(first_run2(strip("expiring")), over=wsheet("first", state="expiring")), ""),
                             frame("used up · dashboard · 390", strip_crop(strip("usedUp")), ""),
                             frame("expiring · desktop", dk_fr(first_run2(strip("expiring"), desk_=True), h=820, over=wsheet("first", state="expiring", desk_=True)), "", width=1300),
                             gap=36) + '</div>')
    body = (board_head("Welcome credits R2 · themes", "Low Sun and First Frost",
                       "In Low Sun <code>--warning</code> sits close to the accent, so the expiring state is carried by its words.") + "".join(secs))
    return doc("Welcome credits R2 · themes", body, 2700, 2400)


BOARDS = {"R2-Main": r2_main, "R2-Placement": r2_home, "R2-Sheet": r2_sheet, "R2-States": r2_states, "R2-Themes": r2_themes}

if __name__ == "__main__":
    only = sys.argv[1:]
    for n, f in BOARDS.items():
        if only and n not in only:
            continue
        open(f"out/{n}.dc.html", "w").write(f())
        print("wrote", n)
