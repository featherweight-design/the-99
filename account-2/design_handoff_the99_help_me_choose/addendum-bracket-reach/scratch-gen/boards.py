from kit import *

SAI = dict(name="Sai, Master Thopterist", type="Legendary Creature — Human Artificer", key="sai")
NEW = ' class="new"'

# ---------------------------------------------------------------- C · the hand-off's Bracket row

def opt(title, line, on=False, over=False):
    tag = '<span class="over">over budget</span>' if over else ""
    return (f'<div class="opt{" on" if on else ""}" role="radio" aria-checked="{"true" if on else "false"}">'
            f'<span class="rd"></span><span class="tx"><b>{title}{tag}</b><span>{line}</span></span></div>')


RHYSTIC = '<span class="cn">Rhystic Study</span>'
REMORA = '<span class="cn">Mystic Remora</span>'
RIFT = '<span class="cn">Cyclonic Rift</span>'

STATES = {
    "reached": dict(lead=f"The fill places {RIFT}, a Game Changer you own, so the deck is bracket 3.", opts=None),
    "within": dict(lead="From your cards this deck is bracket 1-2. Choose how to build it:",
                   opts=[("From my collection", "Builds from your cards: bracket 1-2.", False),
                         ("Hit bracket 3", f"Adds {RHYSTIC}, about $32, to buy. It joins the deck’s Shopping list.", False)]),
    "picked": dict(lead="From your cards this deck is bracket 1-2. Choose how to build it:",
                   opts=[("From my collection", "Builds from your cards: bracket 1-2.", False),
                         ("Hit bracket 3", f"Adds {RHYSTIC}, about $32, to buy. It joins the deck’s Shopping list.", True)]),
    "over": dict(lead="From your cards this deck is bracket 1-2. Choose how to build it:",
                 opts=[("From my collection", "Builds from your cards: bracket 1-2.", False),
                       ("Hit bracket 3", f"Adds {RHYSTIC} and {REMORA}, about $58, to buy: $8 over your $50 budget. Picking it raises the budget to $58.", False, True)]),
    "own": dict(lead="From your cards this deck is bracket 1-2. Choose how to build it:",
                opts=[("From my collection", "Builds from your cards only: bracket 1-2.", False),
                      ("Hit bracket 3", f"Adds {RHYSTIC}, about $32, to buy: the one card from outside your collection.", False)]),
    "none": dict(lead="No Game Changer or two-card combo the fill can place fits this commander, so the deck is bracket 1-2.", opts=None),
}


def bracket_row(state):
    s = STATES[state]
    ch = ""
    if s["opts"]:
        ch = '<div class="ch" role="radiogroup">' + "".join(opt(o[0], o[1], o[2], len(o) > 3 and o[3]) for o in s["opts"]) + "</div>"
    return (f'<div class="hr"><span class="hk">Bracket</span><div class="hv"><b>3 · Upgraded</b>'
            f'<div{NEW}><p style="margin:0;font-size:12px;line-height:1.5;color:var(--fg-muted)">{s["lead"]}</p>{ch}</div></div></div>')


def handoff_block(state):
    budget = {"over": "$50"}.get(state, "$150")
    bline = "The fill buys in its own order while the price fits, and finishes with basics."
    if state == "picked":
        bline = f'<span{NEW}>Rhystic Study takes $32 of it first.</span> The fill buys the rest in its own order while the price fits, and finishes with basics.'
    rows = [('Theme', '<b>Artifacts</b>', '82% of its decks are Artifacts.')]
    if state == "own":
        rows.append(('The 99', '<b>From cards you own</b>', 'It takes only cards with a copy free, and finishes with basics.'))
        bline = "The fill buys nothing for the 99."
    rows.append(('Budget', f'<b class="m" style="font-weight:600">{budget}</b>', bline))
    out = "".join(f'<div class="hr"><span class="hk">{k}</span><div class="hv">{v}<p>{l}</p></div></div>' for k, v, l in rows)
    return (f'<section class="ho"><div class="ho-h"><h4>Built from your answers</h4><a href="#">Change</a></div>'
            f'{out}{bracket_row(state)}</section>')


def waiting(state):
    return STATES[state]["opts"] is not None and state != "picked"


def handoff_phone(state):
    off = waiting(state)
    wl = f'<p class="waitl new" style="margin:-12px 0 14px">Choose how to build it under Bracket to create the deck.</p>' if off else ""
    inner = (
        '<div style="display:flex;align-items:center;gap:10px;padding:20px 18px 14px;border-bottom:1px solid var(--border)">'
        '<span style="font-size:18px;color:var(--fg-faint)">‹</span><div><h1 class="dsp" style="margin:0;font-size:20px;font-weight:700">New deck</h1>'
        '<p class="m" style="margin:1px 0 0;font-size:10px;color:var(--fg-faint)">From your answers</p></div></div>'
        '<div style="padding:20px 18px;display:flex;flex-direction:column">'
        f'<div style="display:flex;gap:14px;border-radius:12px;padding:14px;margin-bottom:24px;background:var(--surface);border:1px solid var(--border)">'
        f'<img src="{img("sai")}" alt="" style="width:64px;height:89px;border-radius:6px;display:block;flex:none">'
        f'<div style="display:flex;flex-direction:column;justify-content:center;min-width:0"><p class="dsp" style="margin:0;font-size:16px;font-weight:600">{SAI["name"]}</p>'
        f'<p style="margin:3px 0 0;font-size:11.5px;color:var(--fg-muted)">{SAI["type"]}</p></div></div>'
        '<div style="display:flex;align-items:center;gap:9px;border-radius:8px;padding:10px 13px;margin-bottom:24px;background:rgba(111,163,104,.10);border:1px solid #3c5a3c">'
        '<span style="width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;background:rgba(111,163,104,.2);color:var(--success)">✓</span>'
        '<span style="font-size:12.5px;color:var(--fg-body)">Legal · validated</span></div>'
        f'<div style="margin-bottom:24px">{handoff_block(state)}</div>'
        '<label class="m" style="display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);margin-bottom:8px">Deck name</label>'
        '<div class="inp" style="margin-bottom:24px">Sai’s Workshop</div>'
        f'{wl}<div class="btns"><span class="cta{" off" if off else ""}">Create deck →</span><span class="ghost">Back to results</span></div>'
        '<p style="margin:20px 0 0;font-size:12.5px;line-height:1.55;color:var(--fg-faint)">Cards outside your commander’s color identity won’t be suggested.</p>'
        '</div>')
    return phone(inner, f"phone-{state}")


def handoff_desk(state):
    off = waiting(state)
    wl = f'<p class="waitl new">Choose how to build it under Bracket to create the deck.</p>' if off else ""
    inner = (
        '<div style="padding:34px 40px 0"><p class="m" style="margin:0 0 6px;font-size:11px;color:var(--fg-faint)">‹ Help me choose · results</p>'
        '<h1 class="dsp" style="margin:2px 0 4px;font-size:28px;font-weight:700">New deck</h1>'
        '<p style="margin:0;font-size:14px;color:var(--fg-muted)">Name your deck. It will be built from your answers.</p></div>'
        '<div style="display:flex;gap:48px;align-items:flex-start;padding:40px">'
        f'<div style="flex:none;width:220px"><img src="{img("sai")}" alt="" style="width:220px;aspect-ratio:63/88;border-radius:12px;display:block;box-shadow:0 20px 50px rgba(0,0,0,.5)">'
        f'<p class="dsp" style="margin:14px 0 0;font-size:17px;font-weight:600">{SAI["name"]}</p><p style="margin:4px 0 0;font-size:12.5px;color:var(--fg-muted)">{SAI["type"]}</p></div>'
        '<div style="flex:1;min-width:0;display:flex;flex-direction:column">'
        '<div style="display:flex;align-items:center;gap:11px;border-radius:10px;padding:13px 16px;margin-bottom:28px;background:rgba(111,163,104,.10);border:1px solid #3c5a3c">'
        '<span style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;background:rgba(111,163,104,.2);color:var(--success)">✓</span>'
        '<span style="font-size:13.5px;color:var(--fg-body)">Legal · validated</span></div>'
        '<div style="margin-bottom:24px"><p class="m" style="margin:0 0 9px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)">Color identity</p>'
        '<div style="display:flex;align-items:center;gap:8px"><span style="width:22px;height:22px;border-radius:50%;background:var(--u)"></span><span class="m" style="font-size:12px;color:var(--fg-muted);margin-left:4px">Blue</span></div></div>'
        f'<div style="margin-bottom:24px">{handoff_block(state)}</div>'
        '<label class="m" style="display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);margin-bottom:9px">Deck name</label>'
        '<div class="inp" style="margin-bottom:24px;padding:14px 16px;border-radius:9px">Sai’s Workshop</div>'
        f'{wl}<div class="btns"><span class="cta{" off" if off else ""}">Create deck →</span><span class="ghost">Back to results</span></div>'
        '<p style="margin:20px 0 0;padding-top:16px;border-top:1px solid var(--border);font-size:13px;line-height:1.6;color:var(--fg-faint)">Cards outside your commander’s color identity won’t be suggested.</p>'
        '</div></div>')
    return desk(inner, f"desk-{state}")


C_STATES = [
    ("reached", "1 · Reaches", "No choice. The ceiling sentence becomes a statement of the deck’s bracket, naming the owned card that gets it there (press opens it, as <b>Built around</b>’s card does)."),
    ("within", "2 · Short, buying reaches it, within budget", "Two radio rows inside the Bracket row, <b>neither selected</b>. <b>Create deck →</b> stays where it is, disabled, and the line in the error slot says why."),
    ("picked", "2b · The same, after a pick", "Picking enables <b>Create deck →</b>. With Hit picked, the Budget row’s line names the card the budget pays for first, as the shipped <code>budgetFirst</code> does for Built around."),
    ("over", "3 · Short, over the budget", "The buy row says what it costs against the budget and that picking it raises the budget. Neither is selected; one press is one decision."),
    ("own", "4 · Short, under “Only cards I own”", "Drawn, not ruled out: Hit names the card it buys from outside the collection, so the relaxation is the thing being chosen."),
    ("none", "5 · Nothing reaches it", "A statement only, with the why. No choice to make, so <b>Create deck →</b> is live."),
]


def choice_board(kind):
    fr = []
    for st, lab, cap in C_STATES:
        if kind == "phone":
            fr.append(frame(f"{lab} · 390 · full length", handoff_phone(st), cap))
        else:
            fr.append(frame(f"{lab} · desktop 1300", handoff_desk(st), cap))
    if kind == "phone":
        head = board_head("C · the hand-off · /decks/new from a result · 390",
                          "The choice, in the Bracket row (phone)",
                          "Drawn over <code>create-pre-filled.tsx</code> and <code>hand-off-answers.tsx</code> as shipped: the Bracket row keeps its key and value; its line becomes the reach statement, and when the collection is short, two radio rows sit under it. Fixture: Sai, Master Thopterist from a Help me choose result (theme Artifacts, budget $150, bracket 3). New pieces are outlined. All words are placeholders for <code>/copy-review</code>.")
        w = 3*390 + 2*44 + 112
        body = head + '<div class="frames" style="max-width:%dpx">' % (w - 112) + "".join(fr) + "</div>"
        return doc("Hand-off choice · 390", body, w)
    head = board_head("C · the hand-off · /decks/new from a result · desktop",
                      "The choice, in the Bracket row (desktop)",
                      "The same states at 1300. The Bracket row’s key column stays 104px; the radio rows fill the value column. Nothing moves below the block except the one waiting line above <b>Create deck →</b>.")
    w = 2*1300 + 44 + 112
    body = head + '<div class="frames" style="max-width:%dpx">' % (w - 112) + "".join(fr) + "</div>"
    return doc("Hand-off choice · desktop", body, w)


# ---------------------------------------------------------------- A · the intake form's heads-up

FORM = {
    "two": dict(b=2, cap="2 · Core", mut=False, new=False),
    "reached": dict(b=3, cap="3 · Upgraded. Your cards in these colors reach it.", mut=False, new=True),
    "within": dict(b=3, cap="3 · Upgraded. From your cards in these colors, a deck is bracket 1-2. Hitting 3 means buying Rhystic Study, about $32. You choose which on the new deck, after you pick a commander.", mut=True, new=True),
    "over": dict(b=3, budget="50", cap="3 · Upgraded. From your cards in these colors, a deck is bracket 1-2. Hitting 3 means buying about $58 of cards, over your $50 budget. You choose which on the new deck, after you pick a commander.", mut=True, new=True),
    "own": dict(b=3, own=True, cap="3 · Upgraded. From your cards in these colors, a deck is bracket 1-2. Hitting 3 means buying Rhystic Study, about $32, from outside your collection. You choose which on the new deck, after you pick a commander.", mut=True, new=True),
    "none": dict(b=3, cap="3 · Upgraded. From your cards in these colors, a deck is bracket 1-2, and no card the fill can place gets one to 3.", mut=True, new=True),
    "five": dict(b=5, cap="5 · cEDH. From your cards in these colors, a deck is bracket 3. Hitting 5 means buying three more Game Changers, about $140. You choose which on the new deck, after you pick a commander.", mut=True, new=True),
}


def form_fields(st, desk_=False):
    f = FORM[st]
    own = f.get("own", False)
    pool = (f'<div class="fld"><span class="flab">Cards for the 99</span><div class="seg"><span class="{"" if own else "on"}">Any cards</span><span class="{"on" if own else ""}">Only cards I own</span></div>'
            f'<p class="fcap">{"The 99 comes from your collection. The commander can still be one you’d buy, and it’s priced on its own." if own else "Owned or not. The budget caps what you’d buy."}</p></div>')
    budget = (f'<div class="fld"><span class="flab">Budget</span><div class="money"><i>$</i>{f.get("budget", "150")}</div>'
              f'<p class="fcap">{"With the 99 from your cards, this caps the commander and any card you ask for that you’d have to buy. It never ranks." if own else "The most you would spend on cards you don’t own. It caps the fill and never ranks."}</p></div>')
    segs = '<span class="wide">Any</span>' + "".join(f'<span class="mono{" on" if n == f["b"] else ""}">{n}</span>' for n in range(1, 6))
    capcls = "fcap mut" if f["mut"] else "fcap"
    cap = f'<p class="{capcls}{" new" if f["new"] else ""}">{f["cap"]}</p>'
    bracket = f'<div class="fld"><span class="flab">Bracket</span><div class="seg">{segs}</div>{cap}</div>'
    extra = ('<div class="fld"><div style="display:flex;align-items:center;gap:10px;min-height:28px"><span class="flab">Anything else?<span class="opt-tag">optional</span></span>'
             '<span style="width:18px;height:18px;border-radius:50%;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font:10px IBM Plex Mono,monospace;color:var(--fg-faint)">i</span>'
             '<span class="m" style="margin-left:auto;height:28px;display:flex;align-items:center;padding:0 8px;border-radius:6px;border:1px solid var(--border-strong);font-size:11px;color:var(--fg-muted)">[[ ]]</span></div>'
             '<div class="ta">something that builds an army of thopters and wins with it</div>'
             '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><p class="fcap mut">Read against every commander your answers allow, and your decks’ commanders and themes. It uses a credit when you press Find commanders.</p>'
             '<span class="m" style="flex:none;font-size:10px;color:var(--fg-faint)">56 / 800</span></div></div>')
    return pool + budget + bracket + '<hr style="margin:0;border:0;border-top:1px solid var(--border)">' + extra


def form_phone(st):
    inner = ('<div style="padding:18px;display:flex;flex-direction:column;gap:20px;padding-top:14px">' + form_fields(st) + "</div>")
    foot = ('<div class="dock"><span class="press"><span class="pill">1 credit</span>Find commanders</span>'
            '<p>Uses a credit. 4 of 5 left · reset at 2:01 AM.</p></div>')
    return phone(inner, f"form-phone-{st}", foot=foot)


def form_desk(st):
    inner = ('<div style="padding:0 40px;flex:1;overflow:hidden"><div style="width:680px;margin:0 auto;border:1px solid var(--border);border-top:0;border-radius:0 0 12px 12px;background:var(--surface-rail);padding:22px 26px 24px;display:flex;flex-direction:column;gap:22px">'
             + form_fields(st, True) +
             '<div style="display:flex;align-items:center;gap:18px;padding-top:20px;border-top:1px solid var(--border)"><span class="press" style="height:44px"><span class="pill" style="height:30px">1 credit</span>Find commanders</span>'
             '<p class="m" style="margin:0;max-width:380px;font-size:10.5px;line-height:1.5;color:var(--fg-faint)">Uses a credit. 4 of 5 left · reset at 2:01 AM. <a href="#">Get more credits</a></p></div>'
             '</div><div style="height:40px"></div></div>')
    return desk(inner, f"form-desk-{st}")


def form_board():
    ph = [
        ("within", "A2 · Short, buying reaches it", "The caption under the radios is the heads-up: one line, in <code>--fg-muted</code> rather than faint, so it reads as news. It names the bracket a collection-only deck is and the cheapest buy, and says the choice comes later. It sits above the credit press, the only screen before the credit."),
        ("reached", "A1 · Reaches", "Quiet: the caption gains one clause. No color change."),
        ("over", "A3 · Short, over the budget", "The total against the budget; card names drop out when the set is more than one card."),
        ("own", "A4 · Short, only cards I own", "Says the buy comes from outside the collection."),
        ("none", "A5 · Nothing reaches it", "Statement only. Nothing to choose later."),
        ("five", "A6 · Target 5, short (3 from your cards)", "Lines for 4 and 5 count the Game Changers to buy rather than naming them."),
        ("two", "A0 · Bracket 2: no line", "Any collection reaches 1-2, and an extra-turn card is never added to make a 2, so 1 and 2 keep today’s caption."),
    ]
    fr = [frame(f"{lab} · 390 · from Cards for the 99 down", form_phone(st), cap) for st, lab, cap in ph]
    dk = [frame(f"{lab} · desktop 1300 · scrolled to Bracket", form_desk(st), cap) for st, lab, cap in ph[:2]]
    head = board_head("A · the intake form · /decks/new/choose · BracketRadios · ON HOLD: Hugh is checking with engineering that the server can tell this before submit",
                      "The heads-up under the Bracket radios",
                      "Open call 1: <b>a caption change</b>, not a note beside Find or a new block. The Bracket field’s caption already restates the pick (<code>3 · Upgraded</code>); from 3 up it goes on to say what the server read across the colors picked (or all five). There is no commander yet, so it promises the choice on the new deck rather than asking for it here. It updates as colors, pool, budget or bracket change, with no motion.")
    w = 4*390 + 3*44 + 112
    body = (head + '<div class="sec"><h3>Phone · 390</h3><div class="frames" style="max-width:%dpx">' % (w - 112) + "".join(fr) + "</div></div>"
            '<div class="sec"><h3>Desktop</h3><div class="frames" style="flex-direction:column">' + "".join(dk) + "</div></div>")
    return doc("Intake heads-up", body, max(w, 1300 + 112))


# ---------------------------------------------------------------- B · the result row and the best fits

BEST = [
    dict(key="sai", art="art-sai", name="Sai, Master Thopterist", pips=["u"], fig=82, owned=44, buy=135, mark=("buy", "$4.20"),
         why="Makes a Thopter whenever you cast an artifact spell, the army you described, and wins wide with it.",
         br=[("1-2", True), ("3 adds $32", True)]),
    dict(key="zimone", art="art-zimone", name="Zimone, Infinite Analyst", pips=["u", "g"], fig=61, owned=52, buy=98, mark=("free", None),
         why="Grows a construct army off the extra counters you already run in two of your decks.",
         br=[("3", False)]),
    dict(key="rootha", art="art-rootha", name="Rootha, Mastering the Moment", pips=["u", "r"], fig=47, owned=38, buy=160, mark=("buy", "$0.65"),
         why="Copies the artifact spells that make tokens, so the army comes twice as fast.",
         br=[("1-2", True)]),
]
MORE = [dict(key="jace", name="Jace, Vryn’s Prodigy", pips=["u"], fig=12, owned=61, buy=72, mark=("free", None), why=None,
             br=[("1-2", True), ("3 adds $32", True)])]


def mark_html(m):
    if m[0] == "free":
        return '<span class="free"><span class="dot"></span>owned · free</span>'
    return f'<span class="buy">buy&nbsp;&nbsp;{m[1]}</span>'


def own_line(r, own_only=False):
    if own_only:
        segs = (f'<span class="sg"><span class="lk">commander</span>{mark_html(r["mark"])}</span>'
                f'<span class="sg">99 from your cards</span><span class="sg">{r["owned"]} of its usual 99 are yours</span>')
    else:
        segs = (f'<span class="sg">{mark_html(r["mark"])}</span>'
                f'<span class="sg">you own {r["owned"]} of its 99</span><span class="sg">about ${r["buy"]} to buy, inside $150</span>')
    for i, (t, short) in enumerate(r["br"]):
        lk = '<span class="lk">bracket</span>' if i == 0 else ""
        segs += f'<span class="sg new{" short" if short else ""}">{lk}{t}</span>'
    return f'<div class="own"><div>{segs}</div></div>'


def pips_html(r):
    return '<span class="pips">' + "".join(f'<i style="background:var(--{p})"></i>' for p in r["pips"]) + "</span>"


def best_card(r, n, own_only=False):
    return (f'<li class="bf"><div class="art"><img src="{img(r["art"])}" alt=""><span class="rk">{n}</span></div>'
            f'<div class="bd"><div class="bn"><span class="no">{n}</span><b>{r["name"]}</b>{pips_html(r)}</div>'
            f'<p class="why">{r["why"]}</p><div class="bfg"><b>{r["fig"]}%</b><span>of its decks are Artifacts</span></div><hr>'
            f'{own_line(r, own_only)}</div></li>')


def result_row(r, own_only=False):
    return (f'<li class="rr"><span class="th"><img src="{img(r["key"])}" alt=""></span>'
            f'<span class="nm"><b>{r["name"]}</b>{pips_html(r)}</span>'
            f'<span class="fg"><b>{r["fig"]}%</b><span>of its decks are Artifacts</span></span>'
            f'<div class="ow">{own_line(r, own_only)}</div><span class="chev">›</span></li>')


def results(own_only=False, desk_=False):
    grid = "display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px" if desk_ else "display:flex;flex-direction:column;gap:10px"
    return ('<div style="display:flex;flex-direction:column;gap:6px"><h2 class="dsp" style="margin:0;font-size:%dpx;font-weight:600">Ordered by what you wrote</h2>'
            '<p style="margin:0;font-size:%spx;line-height:1.5;color:var(--fg-muted)">The read’s three picks lead, closest first, each with a line on why. The rest follow in your answers’ order.</p></div>'
            % (22 if desk_ else 18, "14.5" if desk_ else "13")
            + '<p class="sech" style="color:var(--accent)">Best fits</p>'
            + f'<ul style="margin:0;padding:0;list-style:none;{grid}">' + "".join(best_card(r, i + 1, own_only) for i, r in enumerate(BEST)) + "</ul>"
            + '<p class="sech" style="color:var(--fg-faint);margin-top:8px">More commanders</p>'
            + '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px">' + "".join(result_row(r, own_only) for r in MORE) + "</ul>")


def rows_phone(own_only=False):
    inner = '<div style="padding:16px 14px 18px;display:flex;flex-direction:column;gap:12px">' + results(own_only) + "</div>"
    return phone(inner, "rows-phone" + ("-own" if own_only else ""))


def rows_desk():
    inner = '<div style="padding:30px 40px 40px;display:flex;flex-direction:column;gap:12px">' + results(desk_=True) + "</div>"
    return desk(inner, "rows-desk")


def rows_board():
    head = board_head("B · the results · choose-row.tsx · the ownership line, on Best fits and More commanders",
                      "The reach: one more segment on the ownership line",
                      "Open call 3: <b>a segment, not a third figure and not a mark.</b> It goes on <b>every</b> result: the three Best fits cards under their rule, and each More commanders row. The ownership line already wraps by unbreakable segments; reach joins as one or two more, led by a locked <code>BRACKET</code> label the way own-only rows lead with <code>COMMANDER</code>, then just the number: <code>BRACKET 1-2 · 3 adds $32</code>, <code>BRACKET 3</code>. Short readings draw in <code>--fg-body</code>, a step brighter than the line; a reached one stays the line’s own color. Drawn only when a bracket of 3 or more was asked. Each result stays one press to the hand-off, where the choice is made. New segments are underlined dashed.")
    fr = [frame("B · desktop 1300 · the read’s results", rows_desk(), "Sai is short but buying reaches 3; Zimone reaches it from your cards; Rootha is short with nothing to buy. The card’s own figure and reason are untouched."),
          frame("B · 390 · the same results", rows_phone(), "Phone: the best fit is a row with the art down its left edge, and the segment wraps onto the ownership line’s next line as the line already does."),
          frame("B · own-only · 390", rows_phone(True), "Under “Only cards I own” the segment follows the usual-99 figure. The buy amount still shows: the hand-off offers it.")]
    body = head + '<div class="frames">' + "".join(fr) + "</div>"
    return doc("Result reach", body, 1300 + 2*390 + 2*44 + 112)


# ---------------------------------------------------------------- About · Help me choose and credits

HMC_P1 = "Know the deck you want, but not who should lead it? Tell “Help me choose” what you’re after, and it finds commanders that fit, whether you own them or not."
HMC_P2 = "Colors, themes, sets, a budget and a bracket narrow the list for free. Or describe the deck in your own words: how it should feel, or how it should differ from your decks. That uses a credit, and up to ten picks come first, each with a line on why."
HMC_P3a = "Pick a commander and your answers carry over to a new deck, ready to fill from your Collection."
HMC_NEW = "If your Collection can’t reach the bracket you asked for, you’ll hear before you spend a credit, and choose on the new deck: build from your cards at a lower bracket, or add the cards that get there to buy."
HMC_P3b = "Every run that reads your words is kept under History, and opening one again is free."
HMC_KEYS = ["Words in the “Anything else?” box are read against every commander your answers allow. Tag a card there with [[ and it is required: only commanders whose decks run it are suggested.",
            "Your answers always hold, so no pick falls outside them.",
            "Ask for something unlike your decks, and it compares their commanders and themes.",
            "The rest of your results follow the picks, in the usual order."]

NEWDECK_ROWS = [("Starting a new deck", "Pick a commander you own, give the deck a name, and that’s it."),
                ("Help me choose a commander", None),
                ("Starting from a precon", "Every Commander precon, from the first boxes in 2011 to the newest…"),
                ("Commander sets on the way", "When a Commander set is announced, Commander precons lists it…"),
                ("Importing a deck, or updating one", "Built a deck somewhere else?"),
                ("Building with two commanders", "“Partner,” “Partner with” and “Friends forever” all let two command…")]


def keys_html(keys):
    return '<ol class="keys">' + "".join(f"<li><i>{i+1}</i><span>{k}</span></li>" for i, k in enumerate(keys)) + "</ol>"


def hmc_caption(edited):
    p3 = HMC_P3a + (f' <span class="new">{HMC_NEW}</span> ' if edited else " ") + HMC_P3b
    return f'<div class="cp"><p>{HMC_P1}</p><p>{HMC_P2}</p><p>{p3}</p></div>'


def shot_frame(w, phone_=False):
    # the shipped new-deck capture (780x1688), its Help me choose box haloed, as EntryFrame windows it
    scale = w / 780
    top = -150 if phone_ else -132
    hx, hy, hw, hh = 37*scale, 355*scale + top, 706*scale, 292*scale
    return (f'<div class="frm" style="width:{w}px"><img src="{img("shot")}" alt="" style="top:{top}px">'
            f'<span class="halo" style="left:{hx:.0f}px;top:{hy:.0f}px;width:{hw:.0f}px;height:{hh:.0f}px"></span></div>')


def about_shell(content, idx_on, extra_idx=None):
    screens = [("Home", 3), ("Collection · Cards", 8), ("Card details", 4), ("Upload a file", 4), ("Commanders", 4), ("Discover", 1),
               ("New deck and precons", 6), ("Decks", 4), ("A deck · Your deck", 13), ("A deck · Shopping", 5), ("A deck · Analysis", 6 if extra_idx is None else 5),
               ("A deck · Games", 3), ("Friends", 1), ("Account menu", 1)]
    if extra_idx:
        screens.append((extra_idx, 1))
    idx = "".join(f'<a href="#" class="{"on" if s == idx_on else ""}"><span>{s}</span><small>{n}</small></a>' for s, n in screens)
    idx = f'<nav class="idx"><span class="h">Screens</span>{idx}<a href="#" style="margin-top:8px;border-top:1px solid var(--border);border-radius:0;padding-top:8px"><span>How it works</span><small>9</small></a></nav>'
    return ('<div class="ab-head"><h1>About The 99</h1><p>Every entry, by the screen it lives on.</p>'
            '<div class="abtabs"><span>Tools<small>14</small></span><span class="on">Reference<small>71</small></span></div></div>'
            f'<div class="ref"><div class="refl">{content}</div>{idx}</div>')


def hmc_desk(edited):
    rows = ""
    for t, f in NEWDECK_ROWS:
        if f is None:
            rows += (f'<div class="eo"><div class="er"><span class="t">{t}</span><span class="f"></span><span class="mk">in Tools</span><span class="cv">⌃</span></div>'
                     f'<div class="eob">{shot_frame(330)}<div class="etx">{hmc_caption(edited)}{keys_html(HMC_KEYS)}</div></div></div>')
        else:
            rows += f'<div class="er"><span class="t">{t}</span><span class="f">{f}</span><span class="mk">{"in Tools" if "precon" in t else ""}</span><span class="cv">⌄</span></div>'
    content = '<div class="scr"><h2>New deck and precons</h2><span>/decks/new · 6 entries</span></div>' + rows
    return desk(about_shell(content, "New deck and precons"), "about-hmc-" + ("edit" if edited else "today"), active=None)


def hmc_phone(edited):
    inner = ('<div style="padding:16px 16px 10px"><h1 class="dsp" style="margin:0;font-size:22px">About The 99</h1>'
             '<div class="abtabs" style="margin-top:14px"><span>Tools<small>14</small></span><span class="on">Reference<small>71</small></span></div></div>'
             '<div style="padding:0 16px 18px"><div class="pr"><b>New deck and precons</b><span>6 ⌃</span></div>'
             '<div class="pe"><span class="t">Starting a new deck</span><span class="f">Pick a commander you own, give the deck a name, and that’s it.</span></div>'
             '<div class="pe" style="gap:12px"><span class="t">Help me choose a commander <span class="m" style="font-size:10.5px;font-weight:400;color:var(--accent)">in Tools</span></span>'
             f'{shot_frame(358, True)}<div class="etx">{hmc_caption(edited)}{keys_html(HMC_KEYS)}</div></div>'
             '<div class="pe"><span class="t">Starting from a precon</span><span class="f">Every Commander precon, from the first boxes in 2011 to the newest…</span></div></div>')
    return phone(inner, "about-hmc-phone", active=None)


CR_CAPTION = ('<div class="cp new"><p>Browsing is always free. Anything we write just for you uses a credit.</p>'
              '<p>The following use a credit:</p><ul><li>Running a deck’s Analysis</li><li>Writing a deck’s Overview</li><li>Each “Suggested changes” run</li>'
              '<li>Each new “Help me choose” search where you fill in “Anything else?”</li><li>Each “Which deck needs it most?” read</li><li>Each “Look deeper” in Proposed cuts</li></ul>'
              '<p>Every card, deck and collection view is free, and so is reading a deck’s bracket. Opening a past “Help me choose” run from History is free.</p>'
              '<p>Credits come from these, and are spent in this order:</p><ul><li>Your free credits: 5 a day, each back 24 hours after you use it</li>'
              '<li>15 welcome credits when you join</li><li>A monthly plan: 60 credits a month</li><li>A gift from us, now and then</li><li>Packs: 40 credits for $5</li></ul></div>')
CR_KEYS = ["Welcome credits expire 30 days after you join. Plan credits roll over while you’re subscribed, and end with the period after you cancel. Gift and pack credits never expire.",
           "A run that fails gives its credit back on its own. A refunded payment takes back the credits it bought that you haven’t spent; a disputed one holds them until it’s decided.",
           "Welcome, plan, gift and pack credits share one daily limit on how many you can spend. Your free credits have their own.",
           "Next to each button that uses a credit, you’ll see how many you have left and when the next one comes back."]


def credits_mini():
    # /credits as shipped (R4 head line B), drawn at 780x520 and scaled into the entry's 3:2 window
    cell = lambda k, n, sm, sub, first=False: (
        f'<div style="flex:1;padding:16px 18px;display:flex;flex-direction:column;gap:4px;{"" if first else "border-left:1px solid var(--border)"}">'
        f'<span class="m" style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)">{k}</span>'
        f'<span class="m" style="font-size:30px;font-weight:600;line-height:1.05">{n}<small style="font-size:12px;font-weight:400;color:var(--fg-faint);margin-left:4px">{sm}</small></span>'
        f'<span class="m" style="font-size:10.5px;color:var(--fg-muted)">{sub}</span></div>')
    return ('<div><h1 class="dsp" style="margin:0;font-size:28px">Credits</h1><p class="m" style="margin:4px 0 0;font-size:12px;color:var(--fg-muted)">1 credit is 1 run of any tool</p>'
            '<p style="margin:6px 0 0;font-size:14px;color:var(--fg-body)">Browsing is always free. Anything we write just for you uses a credit.</p></div>'
            '<div style="display:flex;flex-direction:column;gap:12px;position:relative">'
            '<div style="display:flex;align-items:baseline;gap:10px"><b class="dsp" style="font-size:44px;line-height:44px">74</b><span class="m" style="font-size:12px;color:var(--fg-muted)">credits to spend</span></div>'
            '<div class="m" style="font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)">Spent in this order →</div>'
            '<div style="display:flex;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface)">'
            + cell("Free", 3, "of 5", "reset at 2:01 AM", True) + cell("Plan", 31, "", "roll over") + cell("Packs", 40, "", "never expire") +
            '</div><span class="halo" style="left:-6px;top:-6px;right:-6px;bottom:-6px"></span></div>')


def credits_frame(w):
    s = w / 780
    return f'<div class="frm" style="width:{w}px"><div class="mini" style="transform:scale({s:.4f})">{credits_mini()}</div></div>'


def credits_desk():
    content = ('<div class="scr"><h2>Account menu</h2><span>everywhere · 1 entry</span></div>'
               '<div class="er"><span class="t">Picking a color theme</span><span class="f">Six themes live in the account menu under “Theme”, from Low Sun t…</span><span class="mk"></span><span class="cv">⌄</span></div>'
               '<div class="scr new" style="margin-top:22px"><h2>Credits</h2><span>/credits · 1 entry</span></div>'
               '<div class="eo"><div class="er"><span class="t">How credits work</span><span class="f"></span><span class="mk"></span><span class="cv">⌃</span></div>'
               f'<div class="eob">{credits_frame(330)}<div class="etx">{CR_CAPTION}{keys_html(CR_KEYS)}</div></div></div>')
    return desk(about_shell(content, "Credits", extra_idx="Credits"), "about-credits", active=None)


def credits_phone():
    inner = ('<div style="padding:16px 16px 10px"><h1 class="dsp" style="margin:0;font-size:22px">About The 99</h1>'
             '<div class="abtabs" style="margin-top:14px"><span>Tools<small>14</small></span><span class="on">Reference<small>71</small></span></div></div>'
             '<div style="padding:0 16px 18px"><div class="pr"><b>Account menu</b><span>1 ⌄</span></div>'
             '<div class="pr new"><b>Credits</b><span>1 ⌃</span></div>'
             '<div class="pe" style="gap:12px"><span class="t">How credits work</span>'
             f'{credits_frame(358)}<div class="etx">{CR_CAPTION}{keys_html(CR_KEYS)}</div></div></div>')
    return phone(inner, "about-credits-phone", active=None)


def about_hmc_board():
    head = board_head("About · Help me choose a commander (help-me-choose) · New deck and precons",
                      "Help me choose’s entry: the edit, drawn so you can rule on it",
                      "Drawn on the shipped Reference tab (opened entry, its new-deck frame with the Help me choose box haloed). The entry already carries four keys, so the edit is <b>one sentence in the caption’s third paragraph</b>, outlined. Your call: it is owed as a feature (new line, NEW mark, <code>ABOUT_VERSION</code> bump), owed as an ordinary edit (no bump), or not owed (the right-hand frame, today’s entry, stays). If it ships it follows <code>BRACKET_REACH_ENABLED</code> through <code>captionLineSwitches</code>.")
    fr = [frame("With the edit · desktop 1300", hmc_desk(True)),
          frame("With the edit · 390", hmc_phone(True)),
          frame("Today, unchanged · desktop 1300", hmc_desk(False))]
    body = head + '<div class="frames" style="max-width:%dpx">' % (1300 + 390 + 44) + "".join(fr) + "</div>"
    return doc("About · Help me choose edit", body, 1300 + 390 + 44 + 112)


def about_credits_board():
    head = board_head("About · How credits work (credits) · redrawn for buying credits",
                      "How credits work, redrawn",
                      "Every fact is from the brief, which carries them from <code>terms.ts</code> and <code>payments.md</code>. The caption opens with the approved <code>/credits</code> line, lists what spends one, says what stays free, then lists where credits come from <b>in spend order</b> so one list does both jobs. Expiry, refunds, the daily limit and the button line are the four keys. Screen call: the entry moves from <i>A deck · Analysis</i> to a new <b>Credits</b> screen (<code>/credits</code>) after Account menu, its frame the balance strip haloed (engineering captures <code>credits.webp</code> per theme; drawn here from the shipped <code>balance.tsx</code>). The whole entry is new text, so all of it is outlined.")
    fr = [frame("How credits work · desktop 1300", credits_desk()),
          frame("How credits work · 390", credits_phone())]
    body = head + '<div class="frames">' + "".join(fr) + "</div>"
    return doc("About · How credits work", body, 1300 + 390 + 44 + 112)
