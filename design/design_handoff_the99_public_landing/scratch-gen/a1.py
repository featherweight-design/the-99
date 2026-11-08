"""Public landing addendum A1 (account 2, 2026-11-08): the four gaps from READINESS-audit findings 2, 3, 8 and 9.
Top off in demo step 7 (390 and desktop) with Mana Balance showing a real fix; Sam's three decks; the precon link for
visitors; the token ruling for four decorative colours. Nothing else on the R4 boards changes.
"""
import functools
import kit
from kit import doc, frame, frames
import lp as L
import app as A

img = kit.img
board_head = functools.partial(kit.board_head, tag="A1")
T = "Public landing · addendum A1"

kit.CSS += r"""
/* ======== A1: step 7's deck switch, Top off, Mana Balance with a fix ======== */
.dsw{display:flex;gap:8px}
.dsw>span{flex:1;min-width:0;display:flex;align-items:center;gap:8px;border:1px solid var(--border-strong);border-radius:10px;padding:6px 8px;font-size:12.5px;color:var(--fg-muted);background:var(--surface)}
.dsw>span.on{border-color:var(--accent);color:var(--fg);background:var(--elevated)}
.dsw img{width:34px;height:24px;object-fit:cover;border-radius:4px;flex:none}
.dsw b{display:block;font:600 12.5px 'IBM Plex Sans';color:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsw small{display:block;font:10px 'IBM Plex Mono';color:var(--fg-faint)}
.dsw small.ov{color:var(--avail-over-fg)}
.dhead .ovr{color:var(--avail-over-fg)}
.swp .out{color:var(--danger)}
/* Top off: the strip open, the list, the commit row (top-off-list.tsx) */
.to{border:1px solid var(--border);border-radius:12px;background:var(--surface);display:flex;flex-direction:column;text-align:left}
.to .tb{align-items:flex-start}
.to .th{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border)}
.to .th b{font:600 14px 'IBM Plex Sans';color:var(--fg)}
.to .th span{font-size:13px;color:var(--fg-muted)}
.to .tb{padding:10px 14px 0;display:flex;flex-direction:column;gap:8px}
.to .meta{font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.to .seed{display:flex;gap:8px;flex-wrap:wrap}
.to .seed span{border:1px solid var(--border-strong);border-radius:8px;padding:6px 10px;font-size:12.5px;color:var(--fg);white-space:nowrap}
.to .gap{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.to .ch{display:none}
.dk2 .to .ch{display:grid;grid-template-columns:22px 14px minmax(0,1fr) 90px 80px 64px 54px 70px;gap:10px;font:10px 'IBM Plex Mono';letter-spacing:.08em;text-transform:uppercase;color:var(--fg-faint);padding:8px 14px 4px}
.tr2{display:grid;grid-template-columns:22px 14px minmax(0,1fr) auto;gap:4px 10px;align-items:center;border-top:1px solid var(--border);padding:9px 14px}
.dk2 .tr2{grid-template-columns:22px 14px minmax(0,1fr) 90px 80px 64px 54px 70px;padding:8px 14px}
.tr2 .bx{width:18px;height:18px;border-radius:4px;border:1.5px solid var(--border-dashed);display:flex;align-items:center;justify-content:center}
.tr2 .bx.on{background:var(--accent);border-color:var(--accent);color:var(--bg)}
.tr2 .od{width:7px;height:7px;border-radius:50%;background:var(--success)}
.tr2 .od.no{background:transparent;border:1.5px solid var(--fg-faint)}
.tr2 .nm2{font-size:13.5px;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tr2 .tw{display:none;font-size:12px;color:var(--fg-muted)}
.dk2 .tr2 .tw{display:block}
.tr2 .l2{grid-column:3/5;display:flex;gap:10px;align-items:center;font:11px 'IBM Plex Mono';color:var(--fg-muted);flex-wrap:wrap}
.dk2 .tr2 .l2{display:contents}
.tr2 .syn{color:var(--success)}
.tr2 .rt2{justify-self:end}
.cp{display:inline-flex;gap:2px;align-items:center}
.cp i{width:13px;height:13px;border-radius:50%;display:block;font:600 8.5px/13px 'IBM Plex Mono';text-align:center;color:var(--pip-ink-dark,#14110E);font-style:normal}
.to .cm{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-top:1px solid var(--border);background:var(--surface-raised);border-radius:0 0 12px 12px;flex-wrap:wrap}
.to .cm .btn-a2{background:var(--accent);color:var(--bg);font:600 13.5px 'IBM Plex Sans';border-radius:9px;padding:9px 16px;white-space:nowrap}
.to .cm .q{font-size:13px;color:var(--fg-muted)}
.to .cm .cq{font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.to .rest{padding:8px 14px;font:11px 'IBM Plex Mono';color:var(--fg-faint);border-top:1px solid var(--border)}
/* Mana Balance (mana-balance-panel.tsx) with a fix */
.mbp{border:1px solid var(--border);border-radius:12px;background:var(--surface);padding:14px;display:flex;flex-direction:column;gap:10px}
.mbp .hh{display:flex;flex-wrap:wrap;gap:3px 10px;align-items:baseline}
.mbp .hh b{font:600 14px 'IBM Plex Sans'}
.mbp .hh span{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.mbt{display:grid;grid-template-columns:minmax(0,1fr) 50px 60px 64px;gap:0 8px;font-size:12.5px;color:var(--fg-body)}
.mbt>span{padding:7px 0;border-top:1px solid var(--border);display:flex;align-items:center;gap:6px}
.mbt>span.h{font:10px 'IBM Plex Mono';letter-spacing:.08em;text-transform:uppercase;color:var(--fg-faint);border-top:0}
.mbt .lo{color:var(--avail-over-fg);font-weight:600}
.mbt .ok{color:var(--success)}
.mbt i.p{width:11px;height:11px;border-radius:50%;display:block}
.hlp{border:1px solid color-mix(in oklab,var(--accent) 45%,var(--border-strong));border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;background:var(--surface-raised)}
.hlp .hd2{font:600 13px 'IBM Plex Sans';color:var(--fg)}
.hlp .sw3{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px;color:var(--fg)}
.hlp .sw3 em{font:11px 'IBM Plex Mono';font-style:normal;color:var(--success)}
.hlp .bt{border:1px solid var(--border-strong);border-radius:8px;padding:6px 10px;font-size:12.5px;white-space:nowrap}
.hlp .k2{font:10px 'IBM Plex Mono';letter-spacing:.08em;text-transform:uppercase;color:var(--fg-faint);margin-top:2px}
.hlp .st2{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:8px;font-size:13px}
.hlp .st2 small{display:block;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
/* rulings */
.tok{display:grid;grid-template-columns:110px 1fr;gap:0;border:1px solid var(--border-strong);border-radius:12px;overflow:hidden;background:var(--surface)}
.tok>div{padding:12px 14px;border-top:1px solid var(--border);font-size:13px;line-height:1.55;color:var(--fg-body)}
.tok>div:nth-child(-n+2){border-top:0}
.tok .sx{display:flex;flex-direction:column;gap:6px;font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.tok .sx i{display:block;width:40px;height:22px;border-radius:5px;border:1px solid var(--border-strong)}
.tok .sx .arr{font-size:13px;color:var(--fg-faint)}
.tok b{color:var(--fg)}
.tok code,.dtab code{font:11.5px 'IBM Plex Mono';color:var(--accent-text)}
.dtab{width:100%;border-collapse:collapse;font-size:13px;color:var(--fg-body);background:var(--surface);border:1px solid var(--border-strong);border-radius:12px;overflow:hidden}
.dtab th{text-align:left;font:10px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint);padding:10px 12px;border-bottom:1px solid var(--border-strong)}
.dtab td{padding:10px 12px;border-top:1px solid var(--border);vertical-align:top;line-height:1.5}
.dtab td b{color:var(--fg)}
.dtab img{width:64px;height:46px;object-fit:cover;border-radius:6px;display:block}
.pick{display:inline-block;font:600 10px 'IBM Plex Mono';letter-spacing:.08em;color:var(--bg);background:var(--accent);border-radius:4px;padding:2px 6px;margin-left:6px;vertical-align:2px}
"""

PIPC = {"W": "var(--w)", "U": "var(--u)", "B": "var(--b)", "R": "var(--r)", "G": "var(--g)"}
CHECKS = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5 6.5 11.5 12.5 4.5"/></svg>'


def cost(c):
    out = ""
    for ch in c:
        if ch.isdigit():
            out += f'<i style="background:var(--elevated);color:var(--fg);outline:1px solid var(--border-strong)">{ch}</i>'
        else:
            out += f'<i style="background:{PIPC[ch]}"></i>'
    return f'<span class="cp">{out}</span>'


# ------------------------------------------------------------ Sam's three decks
DECKS = {
    "ashling": dict(name="Ashling, the Limitless", size="99 / 99 · 97 owned · 2 to buy", short="99 / 99"),
    "giada": dict(name="Giada, Font of Hope", size='103 / 99 · <span class="ovr">4 over</span>', short="103 / 99 · 4 over"),
    "zimone": dict(name="Zimone, Mystery Unraveler", size="93 / 99 · 6 open", short="93 / 99 · 6 open"),
}


def dhead(k):
    return (f'<div class="dhead"><img src="{img("a-" + k + ".jpg")}" alt=""><div><b>{DECKS[k]["name"]}</b>'
            f'<span>{DECKS[k]["size"]}</span></div></div>')


def dswitch(on):
    def chip(k, label, ov=False):
        return (f'<span class="{"on" if k == on else ""}"><img src="{img("a-" + k + ".jpg")}" alt=""><span style="min-width:0">'
                f'<b>{DECKS[k]["name"].split(",")[0]}</b><small class="{"ov" if ov else ""}">{label}</small></span></span>')
    return f'<div class="dsw" role="tablist" aria-label="Sam’s decks">{chip("giada", "Over 99 · 103", True)}{chip("zimone", "Under 99 · 93")}</div>'


def over_view(d):
    rs = [("Healer’s Hawk", "Not an Angel, so Giada never grows it, and lifelink is already on six cards."),
          ("Serra Angel", "The plainest of eleven Angels: no ability Giada’s counters build on."),
          ("Thran Dynamo", "A fourth mana rock the curve doesn’t need."),
          ("Dawn of Hope", "Slow card draw that asks for mana the deck spends on Angels.")]
    rows = "".join(f'<div class="sr2"><span class="sg out">−</span><b>{n}</b><span></span><p>{w}</p></div>' for n, w in rs)
    return (f'<div class="ap{" dk2" if d else ""}"><div class="rel">{dswitch("giada")}<span class="press" style="left:calc(50% + 0px);right:-4px;top:-4px;bottom:-4px"><b>Press for the deck under 99</b></span></div>{dhead("giada")}'
            f'<div class="dtabs"><span class="on">Your deck<sup>103</sup></span><span>Analysis</span><span>Consider</span><span>Games</span></div>'
            f'<span class="cnt">This deck is 4 over · Proposed cuts</span>'
            f'<div class="wo">{A.tag()}<span class="k">Look deeper · the named cuts</span><div class="swp">{rows}</div></div></div>')


# name, cost, type word, synergy, inclusion, owned qty (0 = buy), price, ticked
TOPOFF = [
    ("Tatyova, Benthic Druid", "3GU", "Creature", 38, 41, 1, None, True),
    ("Aesi, Tyrant of Gyre Strait", "4GU", "Creature", 31, 35, 0, "$3.40", True),
    ("Retreat to Coralhelm", "2U", "Enchantment", 34, 37, 1, None, True),
    ("Exploration", "G", "Enchantment", 27, 44, 1, None, True),
    ("Growth Spiral", "GU", "Instant", 22, 52, 1, None, True),
    ("Scute Swarm", "2G", "Creature", 29, 33, 0, "$1.10", True),
    ("Lotus Cobra", "1G", "Creature", 25, 30, -1, None, False),
    ("Avenger of Zendikar", "5GG", "Creature", 20, 28, 0, "$2.90", False),
]


def topoff(d):
    head = "6 of 6 slots selected · 24 candidates, 18 untouched" if d else "6 of 6 selected"
    rows = ""
    for name, c, tw, syn, inc, own, price, on in TOPOFF:
        if own > 0:
            right = '<span class="cnt" style="font-size:11px">×1</span>'
        elif own < 0:
            right = '<span class="avm"><i class="dm"></i>×1</span>'
        else:
            right = f'<span class="buy">{price}</span>'
        rows += (f'<div class="tr2"><span class="bx{" on" if on else ""}">{CHECKS if on else ""}</span>'
                 f'<span class="od{"" if own != 0 else " no"}"></span><span class="nm2">{name}</span>'
                 + (f'<span class="rt2">{right}</span>' if not d else "")
                 + f'<span class="l2"><span class="tw">{tw}</span>{cost(c)}<span class="syn">+{syn}</span><span>{inc}%</span>'
                 + (f'<span class="rt2">{right}</span>' if d else "") + '</span></div>')
    return (f'<div class="to rel"><div class="th"><b>Choose the last 6</b><span>Close</span></div>'
            f'<div class="tb"><span class="meta">{head}</span>'
            f'<div class="seed"><span>Select 4 from my collection</span><span>Select the 6 this deck needs</span></div>'
            f'<span class="gap">2 creatures short of recommendations</span></div>'
            f'<div class="ch"><span></span><span></span><span>Card</span><span>Type</span><span>Cost</span><span>Synergy</span><span>Decks</span><span></span></div>'
            f'<div class="rel" style="margin-top:22px">{rows}<span class="press" style="left:-2px;right:-2px;top:-2px;height:{40 if d else 56}px"><b>Press a row to tick it</b></span></div><div class="rest">ranked · synergy, then inclusion, then name · 16 more</div>'
            f'<div class="cm"><span class="cq">99 of 99 when added · 2 to buy $4.50</span><span style="display:flex;gap:14px;align-items:center">'
            f'<span class="q">Cancel</span><span class="btn-a2">Add 6 cards</span></span></div>'
            f'</div>')


def mana(d):
    pip = lambda c: f'<i class="p" style="background:{PIPC[c]}"></i>'
    tbl = ('<div class="mbt"><span class="h">Color</span><span class="h">Pips</span><span class="h">Sources</span><span class="h">Needed</span>'
           f'<span>{pip("G")}Green</span><span>41</span><span class="ok">23</span><span>19</span>'
           f'<span>{pip("U")}Blue</span><span>28</span><span class="lo">15</span><span>17</span></div>')
    hlp = ('<div class="hlp"><span class="hd2">Help adding blue</span>'
           '<div class="sw3"><span>Up to 2 Forests → Islands <em>blue 15 → 17</em></span><span class="bt">Swap basics</span></div>'
           '<span class="k2">Staples Zimone decks run · owned first</span>'
           '<div class="st2"><span>Yavimaya Coast<small>owned · 1 free · in 64% of Zimone decks</small></span><span class="bt">Trade 1 Forest for it</span></div></div>')
    return (f'<div class="mbp"><div class="hh"><b>Mana Balance</b><span>free · counted just now · 69 pips · 38 sources, as on Deck stats</span></div>'
            f'{tbl}<p style="font-size:12.5px;line-height:1.55;color:var(--fg-body)">Blue is 2 sources short of what its hardest costs need.</p>{hlp}</div>')


def under_view(d):
    return (f'<div class="ap{" dk2" if d else ""}">{dswitch("zimone")}{dhead("zimone")}'
            f'<div class="dtabs"><span class="on">Your deck<sup>93</sup></span><span>Analysis</span><span>Consider</span><span>Games</span></div>'
            f'{topoff(d)}{mana(d)}</div>')


def stage_with(i, view, d):
    keep = A.SCREENS[i]
    A.SCREENS[i] = view
    try:
        return L.stage2(i, d)
    finally:
        A.SCREENS[i] = keep


def stage7(view, d):
    return stage_with(6, view, d)


def hmc97(d):
    return A.hmc(d).replace("38 of the 99", "97 of the 99")


# ------------------------------------------------------------ boards
def col(*xs, w=440, gap=14):
    return f'<div style="display:flex;flex-direction:column;gap:{gap}px;width:{w}px;flex:none">' + "".join(xs) + "</div>"


def gapv(h=40):
    return f'<div style="height:{h}px"></div>'


def step7():
    n = L.note
    notes = col(
        n("What changed in step 7",
          "<ul><li>Step 7 now runs on <b>two of Sam’s other decks</b>, with a switch at the top of the app: "
          "<b>Giada</b> is 103 cards, 4 over, so Proposed cuts and Look deeper show; <b>Zimone</b> is 93 cards, 6 open, so Top off and Mana Balance show. "
          "Look deeper is the default view.</li>"
          "<li>The switch is two tabs, read-only like every other press in the demo. Its words are the deck names and their counts, nothing new to review.</li>"
          "<li><b>Top off</b> is the shipped list open (<code>top-off-list.tsx</code>): <i>Choose the last 6</i>, the two select presses, the ranked rows "
          "(tick, ownership dot, name, cost, synergy, decks, price or held mark), and the commit row <i>Add 6 cards</i> with <i>99 of 99 when added</i>. "
          "Desktop adds the column header and the type column, as shipped. Ticking works; Add is inert.</li>"
          "<li><b>Mana Balance</b> now has a real fix: Blue is 15 of the 17 sources its costs need, so <i>Improve my mana</i> offers <i>Up to 2 Forests → Islands</i> (Swap basics) "
          "and a staple the deck runs, Yavimaya Coast, owned and free, with <i>Trade 1 Forest for it</i>. Both presses are inert.</li>"
          "<li>The step’s caption is unchanged: <i>Over 99, a deeper look names the cuts. Under 99, Top off fills it from Sam’s cards. Mana Balance checks the lands.</i></li>"
          "<li>Step 4 keeps Ashling at 99 / 99. Step 3’s Help me choose line for Ashling now reads <i>97 of the 99 are in Sam’s binder</i>, matching step 4.</li></ul>"),
        n("Strings that are new", "<ul><li>None the copy table doesn’t already hold: every Top off and Mana Balance string is the shipped one "
          "(<code>top-off.ts</code>, <code>mana-balance.ts</code>). The cut reasons are stand-in words, as in R4; the build replays the stored Look deeper output.</li></ul>"),
        w=520)
    p = frames(frame("<b>Step 7 · 390</b> · Giada, over (default)", L.lp(stage7(over_view, False), False)),
               frame("<b>Step 7 · 390</b> · Zimone, under: Top off and Mana Balance", L.lp(stage7(under_view, False), False)),
               notes, gap=40)
    dk = frames(frame("<b>Step 7 · desktop</b> · Giada, over (default)", L.lp(stage7(over_view, True), True)),
                frame("<b>Step 7 · desktop</b> · Zimone, under: Top off and Mana Balance", L.lp(stage7(under_view, True), True)), gap=60)
    body = (board_head(T, "Step 7: Top off, and a Mana Balance with something to fix",
                       "Audit findings 2 and 3. Step 7 switches between two of Sam’s decks so each tool shows a real result. Nothing else in the demo changes.")
            + p + gapv(50) + dk)
    return doc("Landing A1 · step 7", body, 2780)


def precon(variant):
    html = L.written(False)
    go = f'<span class="go">Open the precon’s list {L.CHEV}</span>'
    if variant == "none":
        html = html.replace(go, "")
    else:
        html = html.replace(go, f'<span class="go">Sign in to open its list {L.CHEV}</span>')
    return L.lp(html, False)


def rulings():
    n = L.note
    rows = [
        ("ashling", "Ashling, the Limitless", "99 / 99 · 97 owned, 2 to buy",
         "3 Help me choose (ranks first, <i>97 of the 99</i>) · 4 the deck and its marks · 5 Analysis and Overview · 6 Suggested changes · 8 Shopping"),
        ("giada", "Giada, Font of Hope", "103 / 99 · 4 over",
         "7 Proposed cuts and Look deeper (the default view) · 8 Which deck needs it most? (Swords to Plowshares goes here) · 3 Help me choose (third)"),
        ("zimone", "Zimone, Mystery Unraveler", "93 / 99 · 6 open",
         "7 Top off and Mana Balance"),
    ]
    tbl = ('<table class="dtab"><tr><th></th><th>Deck</th><th>Size</th><th>Steps</th></tr>'
           + "".join(f'<tr><td><img src="{img("a-" + k + ".jpg")}" alt=""></td><td><b>{nm}</b></td><td>{sz}</td><td>{st}</td></tr>'
                     for k, nm, sz, st in rows) + '</table>')
    cards = n("The cards the fixture must hold (so the boards come true)",
              "<ul><li><b>Ashling</b> (mono-red elementals): as R4. Fury as a proxy, Flamekin Harbinger and Gamble (tutors), Jeska’s Will (Game Changer, to buy), "
              "Soulbright Flamekin (to buy), Arcane Signet (another deck holds it), Sol Ring (one copy, two decks want it: Ashling and Giada).</li>"
              "<li><b>Giada</b> (mono-white Angels), 103 cards: includes Healer’s Hawk, Serra Angel, Thran Dynamo and Dawn of Hope, the four Look deeper names; "
              "three answers only, so Swords to Plowshares lands here; holds Sol Ring.</li>"
              "<li><b>Zimone</b> (Simic lands), 93 cards: 23 Green and 15 Blue sources (Forests heavy), Yavimaya Coast owned and free in the binder. "
              "Top off candidates Sam owns with a free copy: Tatyova, Benthic Druid; Retreat to Coralhelm; Exploration; Growth Spiral. Lotus Cobra owned but sleeved in another deck. "
              "Not owned: Aesi, Tyrant of Gyre Strait; Scute Swarm; Avenger of Zendikar.</li>"
              "<li>The figures (fits, synergy, inclusion, prices, pips) are what the fixture produces; the layout holds any. Deck names in the fixture can stay as they are; "
              "the demo shows the commander.</li></ul>")
    why = n("Why three decks, not two",
            "The tools need three states, and one deck can hold only one size: a full deck (Ashling, steps 4 to 6 and 8), one over 99 (Giada, Look deeper) "
            "and one under (Zimone, Top off). Giada was already Sam’s deck in step 8, so the true addition is one deck: Zimone. The fixture already carries five decks.")
    pre = n("Call: the precon card gets no link (recommended)",
            "<b>A, no link.</b> The card ends after the Overview. Signed-out visitors can’t open <code>/decks/precons/[fileName]</code>, and while The 99 is invite-only "
            "almost none of them can sign in, so a sign-in link is a dead end for nearly everyone who presses it. The two commander cards keep <i>Open its page ›</i> "
            "because those pages are public. Removing a string, adding none.<br><br><b>B, send it to sign-in</b> (drawn for comparison): <i>Sign in to open its list ›</i>, "
            "to <code>/sign-in?redirect_url=/decks/precons/[fileName]</code>. It would need one new string. Revisit when sign-up opens.")
    swatch = lambda hx, tok: (f'<div class="sx"><i style="background:{hx}"></i>{hx}<span class="arr">↓</span>'
                              + (f'<i style="background:var({tok})"></i>{tok}' if tok else "no token") + '</div>')
    tok = ('<div class="tok">'
           f'{swatch("#C9B98A", "--accent-dim")}<div><b>Fit bar segment</b> on the dummy Commanders row (hero and step 2). Map to the shipped <code>FitBar</code> '
           '(<code>fit-bar.tsx</code>): pool <code>--accent-dim</code>, roles <code>--accent-mid</code>, synergy <code>--accent</code>. The other segment colours drawn on those bars go the same way. No new token.</div>'
           f'{swatch("#9C9384", None)}<div><b>Generic mana pip</b> on the deck’s one-line rows (step 4). The build draws <code>CostPips</code>, which is mana symbol art, so the colour has no token and needs none. '
           'Where a board needs a flat stand-in, <code>--fg-faint</code>.</div>'
           f'{swatch("#F5EEDF", "--fg")}<div><b>Commander name over art</b> (dummy Commanders row, Written for real cards). Map to <code>--fg</code> with the row’s shipped <code>INK_SHADOW</code>, '
           'as <code>commander-row.tsx</code> draws it. No new token.</div>'
           f'{swatch("#B9C7D6", None)}<div><b>Dead rule.</b> It is the text colour of R1’s blue “capture owed” slot (<code>.slot</code>), a board annotation. No R4 board draws one, so nothing ships it. No token.</div>'
           f'{swatch("#E07A66", "--danger")}<div><b>Also (finding 8):</b> the launch error, the first run’s errors and the minus sign on cuts all use the shipped <code>--danger</code>, as <code>join-flow.tsx</code> does.</div>'
           '</div>')
    hmc = frame("<b>Step 3 · 390</b> · the one line that changes", L.lp(stage_with(2, hmc97, False), False))
    body = (board_head(T, "Sam’s decks, the precon link, and the token ruling",
                       "Audit findings 3, 9 and 8. Name the decks the demo account is rebuilt with, decide the precon link for visitors, and map four decorative colours.")
            + frames(col(tbl, why, cards, w=900), hmc, gap=50) + gapv(50)
            + frames(frame("<b>A · recommended</b> · no link on the precon card · 390", precon("none")),
                     frame("<b>B</b> · link to sign-in · 390", precon("signin")), col(pre, w=460), gap=40) + gapv(50)
            + frames(col(n("Token ruling", "Each colour maps to a shipped token or to none. Nothing new joins <code>globals.css</code>."), tok, w=900), gap=40))
    return doc("Landing A1 · decks, precon, tokens", body, 2200)


BOARDS = [
    ("A1-Step-7", step7, "A1 · Step 7: Top off and Mana Balance"),
    ("A1-Decks-Precon-Tokens", rulings, "A1 · Sam’s decks, the precon link, tokens"),
]
