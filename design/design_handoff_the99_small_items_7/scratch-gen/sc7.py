"""Small items 7, items 2 and 4 (account 2, 2026-10-30), over the Suggested changes v2 kit (scg).

2 · Suggested changes v2, the 2-credit cue: src/components/decks/suggested-changes-intake.tsx, lib/copy/credits.ts.
4 · Proposed cuts in the Tuning hub, shorter than a screen: #2310 (the hub holds innerHeight while a shortcut's tool is
    open), lib/copy/deck-cuts.ts. Every new string is a draft for /copy-review.
"""
import re
import kit
import parts as P
import graph  # noqa: F401
import sc as S
import boards as B
from kit import doc, board_head, frame

kit.CSS += r"""
.s7tag{display:inline-flex;align-items:center;height:20px;padding:0 8px;margin-left:6px;border-radius:999px;border:1px solid var(--accent-shadow);font:500 10.5px 'IBM Plex Mono';color:var(--accent-text);vertical-align:1px;white-space:nowrap}
.scl2 .s7f{color:var(--fg-body)}
.scl2 .s7a{color:var(--accent-text);text-decoration:underline;text-decoration-color:var(--accent-shadow);text-underline-offset:3px}
.s7stop{display:flex;flex-direction:column;gap:6px;font:10.5px/1.6 'IBM Plex Mono';color:var(--fg-faint)}
.s7stop b{font:500 12.5px/1.5 'IBM Plex Sans';color:var(--fg)}
.s7stop .row{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center}
.s7stop .lk{color:var(--accent-text);font:600 12.5px 'IBM Plex Sans';min-height:32px;display:inline-flex;align-items:center}
.ph .s7stop{text-align:left}
.ph .s7stop .lk{min-height:44px}
/* Proposed cuts, drawn from the shipped panel */
.pc{display:flex;flex-direction:column;gap:14px}
.pc .hd{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.pc .hd h3{margin:0;font:400 19px 'Cinzel',serif;font-variant:small-caps;color:var(--fg)}
.ph .pc .hd h3{font-size:17px}
.pc .hd small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.pc .ld{font-size:13px;line-height:1.6;color:var(--fg-body)}
.pc .ld b{color:var(--fg);font-weight:600}
.pc .done{border:1px solid color-mix(in oklab,var(--success) 55%,transparent);border-radius:10px;background:var(--surface);padding:14px 16px;display:flex;flex-direction:column;gap:4px}
.pc .done b{font-size:13.5px;color:var(--fg)}
.pc .done span{font-size:12.5px;color:var(--fg-body);text-wrap:pretty}
.pc .off{display:flex;align-items:center;gap:14px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);padding:14px 16px}
.ph .pc .off{flex-direction:column;align-items:stretch}
.pc .off .t{flex:1;display:flex;flex-direction:column;gap:4px}
.pc .off .t b{font-size:13.5px;color:var(--fg)}
.pc .off .t span{font-size:12.5px;line-height:1.55;color:var(--fg-body)}
.pc .off .t small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.pc .ldb{display:inline-flex;align-items:stretch;height:36px;border-radius:8px;overflow:hidden;background:var(--accent);color:#14110E;font:600 13px 'IBM Plex Sans';flex:none}
.ph .pc .ldb{height:44px}
.pc .ldb span{display:flex;align-items:center;padding:0 14px}
.pc .ldb span+span{border-left:1px solid rgba(0,0,0,.25);font:500 11px 'IBM Plex Mono'}
.pc .facts{display:flex;flex-direction:column;gap:6px}
.pc .facts .fh{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.pc .facts .fh b{font-size:13.5px;color:var(--fg)}
.pc .facts .fh small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.pc .fr2{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;padding:10px 0;border-top:1px solid var(--border);font-size:12.5px;color:var(--fg-body)}
.pc .fr2 i{font-style:normal;font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.pc .fr2 b{font:600 13px 'IBM Plex Mono';color:var(--fg)}
.pc .nv{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.s7gap{position:relative;flex:none;border:1.5px dashed color-mix(in oklab,var(--danger) 55%,transparent);border-radius:10px;display:flex;align-items:center;justify-content:center;font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.s7more{display:flex;flex-direction:column;gap:10px;padding-top:16px;border-top:1px solid var(--border)}
.s7more .mh{font:500 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.dkm .s7more .tiles{grid-template-columns:repeat(3,minmax(0,1fr))}
.dkm .s7more .tile{min-height:96px}
.s7foot{margin-top:auto;padding:22px 0 8px;font:10.5px/1.6 'IBM Plex Mono';color:var(--fg-faint);text-wrap:pretty}
.ph.vp .at.s7fill,.dk.vp .at.s7fill{display:flex;flex-direction:column}
"""

def bh7(k, t, c):
    return board_head(k, t, c, tag="R1")


CUT_PC = "Analysis tab · Tuning · Proposed cuts"


def counter7(n, ph=False):
    """The stepper, as shipped, plus the cost tag above 10 (ruled: 1 credit for 1 to 10, 2 above)."""
    minus = "dis" if n <= 1 else ""
    plus = "dis" if n >= 20 else ""
    tag = '<span class="s7tag">2 credits</span>' if n > 10 else ""
    rng = ' <span class="mt">· 20 at most</span>' if n >= 20 else ' <span class="mt">· 1 to 20</span>'
    ex = f'<b>{n} in, {n} out.</b> You’ll pick from about {S.pool(n)} of each.{tag}{rng}'
    return f'<div class="cnt2"><div class="stpr"><span class="{minus}">−</span><b>{n}</b><span class="{plus}">+</span></div><span class="ex">{ex}</span></div>'


def with_counter(html, n, ph):
    old = S.counter(n, ph)
    assert old in html
    return html.replace(old, counter7(n, ph), 1)


def send(kind, n, ph=False):
    hint = S.WAIT_HINT.get(n, "usually under a minute")
    br = "<br>" if ph else " · "
    if kind == "one":
        line = "Uses a credit. 1 of 1 free · 15 welcome."
        btn = '<span class="sbt2">Suggest changes</span>'
        return f'<div class="send">{btn}<span class="scl2">{line}{br}{hint}</span></div>'
    if kind == "two":
        line = 'Uses 2 welcome credits. <span class="s7f">Your free run covers up to 10.</span> 1 of 1 free · 15 welcome.'
        return f'<div class="send"><span class="sbt2">Suggest changes</span><span class="scl2">{line}{br}{hint}</span></div>'
    if kind == "free2":
        line = 'Uses 2 free credits. <span class="s7f">A run above 10 counts 2.</span> 5 of 5 free left, 3 after this run · reset at 2:01 AM.'
        return f'<div class="send"><span class="sbt2">Suggest changes</span><span class="scl2">{line}{br}{hint}</span></div>'
    if kind == "paid":
        line = 'Uses 2 paid credits. <span class="s7f">Your free run covers up to 10.</span> 1 of 1 free · 8 paid.'
        return f'<div class="send"><span class="sbt2">Suggest changes</span><span class="scl2">{line}{br}{hint}</span></div>'
    # free run only, N above 10: the press is off and the line says why, with one way back to 10
    more = '<span class="lk">Get more credits</span>'
    return (f'<div class="send"><span class="sbt2 dis">Suggest changes</span>'
            f'<div class="s7stop"><b>A run of {n} uses 2 credits. Your free run covers up to 10.</b>'
            f'<div class="row"><span class="lk">Change to 10</span>{more}</div>'
            '<span>1 of 1 free · reset at 2:01 AM</span></div></div>')


def intake7(ph, n, kind, text=None, used=(), count=0):
    html = S.intake(ph, n, text, used=used, count=count, send=send(kind, n, ph))
    return with_counter(html, n, ph)


T12 = ('More removal: the deck runs 6 of a target 10. Lean into +1/+1 counters, the deck’s focus. '
       'And cut the legends that never attack.')


def tile_mini():
    t = S.tiles("ready", True)
    t = t.replace('<span class="cost">1 credit per run</span>', '<span class="cost">1 credit · 2 above 10</span>')
    m = re.search(r'<div class="tile">.*?</div>\s*<span class="tp">.*?</span><span class="tf">.*?</span></span></div>', t, re.S)
    return f'<div class="mini"><span class="cap0">the landing tile</span><section class="hub" style="border:0;padding:0"><div class="tiles">{m.group(0)}</div></section></div>'


def mini_counter(n, lab):
    return (f'<div class="mini"><span class="cap0">{lab}</span><div class="sc"><div class="stp">'
            f'{S.stp("1", "How many cards?", "cards in · the same number come out")}{counter7(n, True)}</div></div></div>')


def sc_cost():
    head = bh7("2 · Suggested changes v2 · the 2-credit cue", "Above 10 swaps, a run is 2 credits",
                      "Ruled: 1 credit for 1 to 10 swaps, 2 above 10; a player’s one free run a day covers up to 10. "
                      "The stepper says so the moment it passes 10: a <b>2 credits</b> tag joins its line (drawn in the tiles’ cost-tag shape). "
                      "The line beside <b>Suggest changes</b> names what the run will use, in the shipped credit line’s form. "
                      "A player whose only credit is the free run can still step past 10: the press goes off and the line says why, "
                      "with <b>Change to 10</b> one press away (they choose, never locked in).")
    steps = B.frames(mini_counter(10, "at 10 · 1 credit, as shipped"), mini_counter(11, "at 11 · the tag appears"),
                     mini_counter(20, "at 20 · still 2"), tile_mini(), gap=36)
    a = B.frames(frame("<b>390</b> · N = 12, welcome credits held", B.tool_ph(intake7(True, 12, "two", T12, ("removal", "focus"), 118))),
                 frame("<b>1300</b> · N = 12, welcome credits held", B.tool_dk(intake7(False, 12, "two", T12, ("removal", "focus"), 118))))
    b = B.frames(frame("<b>390</b> · N = 12, only the free run", B.tool_ph(intake7(True, 12, "free", T12, ("removal", "focus"), 118)),
                       "Suggest changes is off. <b>Change to 10</b> sets the stepper to 10, and the press comes back with the shipped one-credit line. "
                       "<b>Get more credits</b> shows only while payments are on, as shipped (L4)."),
                 frame("<b>1300</b> · N = 12, only the free run", B.tool_dk(intake7(False, 12, "free", T12, ("removal", "focus"), 118))))
    c = B.frames(frame("<b>1300</b> · N = 12, paid credits held", B.tool_dk(intake7(False, 12, "paid", T12, ("removal", "focus"), 118)),
                       "The same line with paid credits: <i>Uses 2 paid credits.</i> The free run stays for a run of 10 or fewer."))
    e = B.frames(frame("<b>390</b> · N = 12, 5 free credits a day", B.tool_ph(intake7(True, 12, "free2", T12, ("removal", "focus"), 118))),
                 frame("<b>1300</b> · N = 12, 5 free credits a day", B.tool_dk(intake7(False, 12, "free2", T12, ("removal", "focus"), 118))))
    return doc("Small items 7 · 2 · the 2-credit cue", head
               + B.sec("A · The stepper past 10", "The tag shows only above 10; at 10 and under the line is the shipped one. The landing tile’s cost tag says it too.", steps)
               + B.sec("B · A run of 12, with credits to cover it", "Welcome credits are spent before paid ones (shipped rank). The free run is not used: it covers up to 10.", a)
               + B.sec("C · Only the free run left", "Told before pressing, not after: the press is off and the line names the cost and the way back.", b)
               + B.sec("D · Paid credits", "", c)
               + B.sec("E · The left line, when the free allowance holds 2 (addendum 1)",
                       "The left line keeps counting credits, never runs. Above 10 it says what the run leaves: <i>5 of 5 free left, 3 after this run</i>. "
                       "At 10 and under it is the shipped line. B to D already read this way: the cost names its source and count, and the left line counts that source.", e), 2280)


# ---------------------------------------------------------------- 4 Proposed cuts, shorter than a screen
def cuts_count(ph=False):
    facts = [("Ramp", "role", "14 of a target 10", "+4"), ("Card draw", "role", "12 of a target 10", "+2"), ("Mana value 6+", "curve", "9 against 6 on average", "+3")]
    rows = "".join(f'<div class="fr2"><span>{a} <i>· {b}</i><br><i>{c}</i></span><b>{d}</b></div>' for a, b, c, d in facts)
    return ('<div class="pc"><div class="hd"><h3>Proposed cuts</h3><small>free count · look deeper 1 credit</small></div>'
            '<p class="ld"><b>Six over the ninety-nine.</b> Below is what we counted. To have the cards named, look deeper.</p>'
            '<div class="off"><div class="t"><b>Name the six cuts</b><span>A deeper look names six cards to cut, each with a reason.</span>'
            '<small>1 of 1 free · 15 welcome</small></div><span class="ldb"><span>Look deeper</span><span>◆ 1 credit</span></span></div>'
            '<div class="facts"><div class="fh"><b>What we counted</b><small>from 105 cards · EDHREC for Gishath, 12,404 decks · free</small></div>'
            f'{rows}</div><p class="nv">Never named: Gishath, the 4 cards you locked.</p></div>')


def cuts_done():
    return ('<div class="pc"><div class="hd"><h3>Proposed cuts</h3><small>free count · look deeper 1 credit</small></div>'
            '<div class="done"><b>Back to 99 / 99. You cut six.</b><span>The deck isn’t over any more, so Proposed cuts closes here.</span></div></div>')


def others(ph=False, state="over"):
    t = S.tiles(state, ph)
    inner = t[t.index('<div class="tiles">') + len('<div class="tiles">'):t.rindex('</div></section>')]
    starts = [m.start() for m in re.finditer(r'<div class="tile[ "]', inner)] + [len(inner)]
    inner = inner.replace('<span class="cost">1 credit per run</span>', '<span class="cost">1 credit · 2 above 10</span>')
    keep = [inner[a:b] for a, b in zip(starts, starts[1:]) if P.tool_mark("cuts") not in inner[a:b]]
    return f'<div class="s7more"><span class="mh">Other tools</span><div class="tiles">{"".join(keep)}</div></div>'


def hub_ph(panel, h=844, fill=False, gap=0, more=False, foot=False):
    body = panel + (others(True, "ready") if more else "") + (f'<div class="s7gap" style="height:{gap}px">held space</div>' if gap else "")
    f = B.tool_ph(body, cut=CUT_PC, h=h).replace('active="suggested"', '')
    f = f.replace(P.phone_back("suggested", 1), P.phone_back("cuts", 3))
    if foot:
        f = f.replace(body, body + f'<div style="height:{foot}px"></div>' + FOOT, 1)
    return f


def hub_dk(panel, h=900, gap=0, more=False, foot=False):
    body = panel + (others(False) if more else "") + (f'<div class="s7gap" style="height:{gap}px">held space</div>' if gap else "")
    f = B.tool_dk(body, cut=CUT_PC, h=h)
    f = f.replace(P.utabs("suggested"), P.utabs("cuts"))
    if foot:
        f = f.replace(body, body + f'<div style="height:{foot}px"></div>' + FOOT, 1)
    return f


FOOT = '<p class="s7foot">The 99 is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards.</p>'


def cuts_short():
    head = bh7("4 · Tuning hub · Proposed cuts, shorter than a screen", "When the open tool is short",
                      "A shortcut (the over-99 notice’s Cuts) scrolls the hub to the top at once, so the hub holds a screen of height while the tool is open (#2310). "
                      "When the tool is shorter than that, the rest of the screen is empty: the count at 1300, and the closing <i>Back to 99 / 99</i> at both widths. "
                      "Releasing the hold would drop the hub down the screen once the content lands, the second scroll #2310 removed, so the space stays. "
                      "<b>Recommended (B): the space shows the other three tools</b>, the landing’s own tiles under an <i>Other tools</i> label, so the screen ends on a next step. "
                      "C keeps the page plain and puts its foot at the bottom.")
    now = B.frames(frame("<b>Now</b> · 1300, the count", hub_dk(cuts_count(), gap=210), "Dashed: the held height under the tool."),
                   frame("<b>Now</b> · 390, after the last cut", hub_ph(cuts_done(), gap=420)))
    rec = B.frames(frame("<b>B</b> · 1300, the count · recommended", hub_dk(cuts_count(), more=True)),
                   frame("<b>B</b> · 390, after the last cut · recommended", hub_ph(cuts_done(), more=True),
                         "On a phone the landing is the switcher, so the tiles are the same ones ‹ Tuning opens, one press closer."))
    alt = B.frames(frame("<b>C</b> · 1300, the count", hub_dk(cuts_count(), foot=170)),
                   frame("<b>C</b> · 390, after the last cut", hub_ph(cuts_done(), foot=380)))
    return doc("Small items 7 · 4 · Proposed cuts, short", head
               + B.sec("Now", "What #2310 leaves: the tool, then the held space.", now)
               + B.sec("B · Other tools fill the space (recommended)", "Only while the hold is on and the tool is shorter than the screen; a tile opens its tool in place, as on the landing. Shown with the tool open from a tile, nothing changes.", rec)
               + B.sec("C · Plain, with the page’s foot at the bottom", "No new parts: the shipped Fan Content line sits at the foot of the held space, so the screen reads as the page’s end.", alt), 2280)


W = {"SC-Cost": (sc_cost, "2 · Suggested changes: the 2-credit cue"), "Cuts-Short": (cuts_short, "4 · Proposed cuts, shorter than a screen")}
