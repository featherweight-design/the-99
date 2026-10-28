"""Suggested changes v2 R1 boards (account 2, 2026-10-28)."""
import kit
import parts as P
import graph  # noqa: F401  (shipped Suggested changes CSS)
import sc as S
from kit import doc, board_head, frame

kit.CSS += r"""
.ph .abar.pin,.dk .abar.pin{position:absolute;left:0;right:0;bottom:0;margin:0;border-radius:0;border-width:1px 0 0;z-index:12}
.dk .abar.pin{left:65px;padding:12px 30px}
.ph.vp,.dk.vp{overflow:hidden}
.ph.vp .at{padding-bottom:150px}
.dk.vp .at{padding-bottom:90px}
.mini{width:390px;flex:none;border-radius:16px;border:1px solid var(--border-strong);background:var(--bg);padding:16px;display:flex;flex-direction:column;gap:12px}
.mini.w{width:760px}
.mini .cap0{font:9.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:#0D0B09;background:#8FA6BE;padding:3px 8px;align-self:flex-start;border-radius:4px}
.sc .stp + .stp{padding-top:4px}
"""

CUT_SC = "Analysis tab · Tuning · Suggested changes"


def sec(title, sp, body):
    return f'<div class="sec"><h3>{title}</h3><p class="sp">{sp}</p>{body}</div>'


def frames(*fs, gap=44):
    return f'<div class="frames" style="gap:{gap}px">{"".join(fs)}</div>'


def tool_ph(panel, cut=CUT_SC, h=None, nav=False):
    hub = P.hub_open(panel, True, active="suggested")
    inner = P.phone(f'<div class="at">{hub}</div>', head=False, cut=cut, nav=nav)
    if h:
        inner = inner.replace('<div class="ph">', f'<div class="ph vp" style="height:{h}px">', 1)
    return inner


def tool_dk(panel, cut=CUT_SC, h=None):
    inner = P.desk(f'<div class="at">{P.hub_open(panel, active="suggested")}</div>', head=False, cut=cut)
    if h:
        inner = inner.replace('<div class="dk">', f'<div class="dk vp" style="height:{h}px">', 1)
    return inner


def land_ph(state, cut="Analysis tab · Tuning"):
    return P.phone(f'<div class="at">{S.tiles(state, True)}</div>', head=False, cut=cut, nav=False)


def land_dk(state, cut="Analysis tab · Tuning"):
    return P.desk(f'<div class="at">{S.tiles(state)}</div>', head=False, cut=cut)


def pin(html):
    return html.replace('<div class="abar', '<div class="abar pin', 1)


def lift_bar(panel):
    """Move the apply bar out of the panel so it can pin to the frame's bottom."""
    i = panel.find('<div class="abar')
    if i < 0:
        return panel, ""
    return panel[:i] + "</div>", pin(panel[i:-6])


def vp_ph(panel, h=844, cut=CUT_SC):
    body, bar = lift_bar(panel)
    f = tool_ph(body, cut=cut, h=h)
    return f[:-6] + (bar or '<div class="vfade"></div>') + "</div>"


def vp_dk(panel, h=900, cut=CUT_SC):
    body, bar = lift_bar(panel)
    f = tool_dk(body, cut=cut, h=h)
    return f[:-6] + (bar or '<div class="vfade"></div>') + "</div>"


A = S.ADDS
C = S.CUTS
K = lambda items: [it[0] for it in items]


# ---------------------------------------------------------------- Main
CALLS = [
    ("1", "Intake is one panel with three numbered steps",
     "The steps stack on one screen, numbered 1 · 2 · 3, then <b>Suggest changes</b>. No Next presses: every answer stays in view and editable, "
     "and an empty request still sends. Step 3 is the shipped <i>Kept for this deck</i> box, unchanged, so the next run starts with the same limits."),
    ("2", "How many: the stepper, with its pool spelled out",
     "− N + (1 to 20, typed or stepped, 44px on a phone) and one line beside it: <i>3 in, 3 out. You’ll pick from about 5 of each.</i> "
     "The cut count is never a separate control."),
    ("3", "The request box is empty; what we noticed sits under it",
     "Never pre-filled. Under the box at both widths (R1b: beside it left a hole on desktop): <b>What we noticed</b>, up to four chips in the citation chips’ shape "
     "(kind, then words): a role short of its target, the focus, a recent game note, a second role gap. A tap appends its sentence to the end of the "
     "box, highlighted for a beat, and the chip turns dashed with a ✓. It comes back if its words leave the box. Nothing is assumed: an untapped chip sends nothing."),
    ("4", "Results: two lists, one Pick per row",
     "The shipped two-list line, with Add/Reject replaced by one toggle, <b>Pick</b> → <b>✓ Picked</b> (the row takes the brass edge). "
     "Desktop shows Additions and Cuts side by side; a phone switches between them with the shipped segmented control, each half carrying its "
     "<i>n of N</i>. A side at N greys its other Picks; unpick one to swap. No Reject: an unpicked row just stays in the run."),
    ("5", "Grouped above 5 per side, by type unless the player picks role",
     "At N=3 the five rows read in the run’s order. From N=4 (six or more a side) rows group, under the deck toolbar’s own <b>By type · By role</b> "
     "switch and the same stored choice (<code>the99:deck-grouping</code>, default By type). By type uses the deck page’s groups (Creatures, Instants, "
     "Sorceries, Artifacts, Enchantments, Planeswalkers, Lands) with the deck’s count; By role uses the shelf roles with the deck’s figure "
     "(<i>you have 6 of 10</i>). Either way a heading says where your picks take it (<i>8 with your picks</i>), and inside a group the run’s order holds."),
    ("6", "One Apply for the set, one Undo (to the spec’s Q1 proposal)",
     "A bar pinned under the lists keeps the tally: <i>+10 in · −7 out · the deck would go to 102</i>. Unequal: Apply stays off and the bar names the "
     "fix (<i>Pick 3 more cuts</i>). Equal: <b>Apply 10 + 10</b>, with the set’s bracket outcome. Fewer than N of each is fine. After applying: "
     "<i>Undo all 20</i>; the rest of the pool stays pickable for another equal set."),
    ("7", "The wait shows two calls as two steps, and the additions land early",
     "A clock with what is usual for that N, three rows that tick (read, add, cut), and a moving rule on the live row. When the additions call "
     "returns, its cards fan out and the Additions list appears below, pickable, while the cuts are still writing. A refill says so in words."),
    ("8", "History keeps the request",
     "Each run’s row quotes its request and says <i>asked · found · applied</i>. An old run opens as its lists with picks marked; once a newer "
     "version is committed it is read-only, with the shipped past-run note and <b>New run</b>."),
]

QUESTIONS = [
    ("Q1", "Applying (drawn to the proposal)", "One action for the picked set, one Undo. Per-card apply would let the deck leave 99 mid-pick."),
    ("Q7", "Bracket goal (drawn as an optional piece)", "<i>Move to a bracket</i>: the three other brackets as pills, none selected, under the chips. Dashed and tagged so it can ship later; nothing else depends on it."),
    ("Q", "Picks past N", "Drawn capped at N per side (the spec’s M ≤ N). If you’d rather let a player take 4 + 4 from a 3-card run, the cap goes and the bar’s rule (equal counts) still holds."),
]

R1B = [
    ("1", "What we noticed moves under the box on desktop",
     "The chips sat in a column beside the box, which left a tall empty gap under it. They now wrap in a row under the box, with the bracket piece below them, as on a phone. Board 1."),
    ("2", "Applied rows: a bigger ✓, and <b>Added</b> / <b>Cut</b>",
     "The applied mark is a 20px box (was 15) in the success tone with the word in sentence case, 13px, 32px tall (44 on a phone). Boards 3 and 8."),
    ("3", "Group by type, or role: the player’s choice",
     "Default <b>By type</b>, the deck page’s own groups. The deck toolbar’s By type · By role switch sits above the lists and keeps the same stored choice, so a player who reads their deck by role sees runs that way too. Boards 4, 5, 6 and 7."),
]

GAPS = [
    ("G1", "Additions before cuts", "Save call 1’s kept additions as soon as they validate (a run state, say <code>adds_ready</code>), so the wait can show and pick them while call 2 runs. Without it, the wait keeps the ticking rows and the list appears at the end."),
    ("G2", "Type and role per suggestion", "Each line carries its card type group (<code>cardTypeGroup</code>) and its shelf role (the role counter’s, not the model’s). A line with no role goes in Threats & synergy."),
    ("G3", "The chips’ sources", "Short role: the role strip’s worst gap. Focus: the deck’s focus. Game: the newest game note (quoted, dated). A second role gap. Hidden when there is nothing to say; never more than four."),
    ("G4", "Same request", "The ‘same request’ check (spec §8) runs on press, before a credit is reserved: same N, same words, same limits, same list fingerprint."),
    ("G5", "Copy", "Every string is a placeholder for /copy-review. Retires: <i>Suggest again</i>, <i>Suggest again anyway</i>, the unchanged lead, <i>Additional notes</i>, Reject on v2 rows."),
]


def tbl(rows, q=False):
    return '<div class="tbl2">' + "".join(f'<div class="tr{" q" if q else ""}"><div>{a}</div><div>{b}</div><div>{c}</div></div>' for a, b, c in rows) + '</div>'


def main():
    body = (board_head("Suggested changes v2 · account 2 · 2026-10-28",
                       "Ask for N, pick N from more",
                       "The screens for spec v2 (PR #2295, §3, §4, §5.5, §7, §7a, §11), drawn over the shipped Tuning hub. A three-step intake, results as one "
                       "list per side of about 1.5N, a longer wait, and history. Fixture: <b>HD - Half Shell</b> (Heroes in a Half Shell, five colors, so every "
                       "card is legal), 99 + 1, Core, focus +1/+1 counters. Cards are real images from earlier rounds; reasons and figures are stand-ins. "
                       "Copy is placeholder for /copy-review.")
            + '<div class="sec"><h3>R1b · your feedback (Oct 28)</h3>' + tbl(R1B) + '</div>'
            + '<div class="sec"><h3>The calls</h3>' + tbl(CALLS) + '</div>'
            + '<div class="sec"><h3>Your open questions, as drawn</h3>' + tbl(QUESTIONS, True) + '</div>'
            + '<div class="sec"><h3>For engineering</h3>' + tbl(GAPS) + '</div>'
            + '<div class="note" style="max-width:1500px"><b>Boards:</b> 1 Intake · 2 Not at 99 · 3 Results at 3 · 4 Results at 10 · 5 Results at 20 · '
              '6 A short run · 7 The wait · 8 History · 9 About. Every frame is 390 and 1300.</div>')
    return doc("Suggested changes v2 · main", body, 1612)


# ---------------------------------------------------------------- 1 Intake
def intake_board():
    t10 = ('More removal: the deck runs 6 of a target 10. <span class="add">Lean into +1/+1 counters, the deck’s focus.</span> '
           'And cut the legends that never attack.')
    t10p = ('More removal: the deck runs 6 of a target 10. Lean into +1/+1 counters, the deck’s focus. And cut the legends that never attack.')
    a = frames(frame("<b>390</b> · fresh, N = 3", S.intake(True, 3) and tool_ph(S.intake(True, 3))),
               frame("<b>1300</b> · fresh", tool_dk(S.intake(False, 3))))
    b = frames(frame("<b>390</b> · filled, N = 10", tool_ph(S.intake(True, 10, t10p, used=("removal", "focus"), count=118))),
               frame("<b>1300</b> · filled, a chip just tapped, the bracket piece on", tool_dk(S.intake(False, 10, t10, used=("removal", "focus"), focus=True, count=118, bon=3, hot="focus"))))
    # chip behaviour
    def mini(lab, txt, used, focus=False, hot=None, count=0):
        return f'<div class="mini"><span class="cap0">{lab}</span>{S.textarea(txt, focus, count, True)}{S.chips(used, hot, True)}</div>'
    c = frames(
        frame("<b>a</b> · nothing tapped", mini("step 2", None, ())),
        frame("<b>b</b> · tap “Short on removal”", mini("step 2", '<span class="add">More removal: the deck runs 6 of a target 10.</span>', ("removal",), True, "removal", 45),
              "Its sentence lands at the end of the box, highlighted for a moment; the cursor follows. The chip goes dashed with ✓."),
        frame("<b>c</b> · edited, then the words deleted", mini("step 2", 'Cut the legends that never attack.', (), True, None, 34),
              "The player deleted the removal sentence, so its chip is back to +. A chip only tracks its own words."),
        gap=36)
    d = frames(frame("<b>390</b> · same request as last time", tool_ph(S.intake(True, 3, S.REQ3, count=41, send=S.same_confirm(True), bracket=False))),
               frame("<b>1300</b> · same request", tool_dk(S.intake(False, 3, S.REQ3, count=41, send=S.same_confirm(), bracket=False))),
               frame("<b>390</b> · at 20, the top of the range", f'<div class="mini"><span class="cap0">step 1</span><div class="sc"><div class="stp">{S.stp("1", "How many cards?", "cards in · the same number come out")}{S.counter(20, True)}</div></div></div>'))
    body = (board_head("1 · intake · the three steps, then send", "Intake",
                       "How many, what to change, any restrictions, then <b>Suggest changes</b>. One panel, every step in view. The wait hint under the button "
                       "follows N (<i>usually under 20 seconds</i> at 3, <i>about a minute, now and then two</i> at 20). The line at the foot says what else the run reads, in the spec’s order, after the player’s words.")
            + sec("A · Fresh", "Nothing pre-filled, nothing selected. The request box shows a quiet placeholder only.", a)
            + sec("B · Filled", "N = 10, two chips tapped, a sentence typed. The chips wrap under the box at both widths (R1b). The bracket goal is the optional piece (Q7).", b)
            + sec("C · How a chip behaves", "A suggestion, never an assumption: it adds words the player can see and change.", c)
            + sec("D · Edges", "Identical inputs on an unchanged list ask once before spending (spec §8). The stepper stops at 20.", d))
    return doc("Suggested changes v2 · intake", body, 2280)


# ---------------------------------------------------------------- 2 Not at 99
def notat_board():
    a = frames(frame("<b>390</b> · 96 cards", land_ph("short")), frame("<b>1300</b> · 96 cards", land_dk("short")))
    b = frames(frame("<b>390</b> · 102 cards", land_ph("over")), frame("<b>1300</b> · 102 cards", land_dk("over")))
    drift_i = ('<div class="drift"><b>The deck is at 98 now.</b> Suggested changes keeps a deck at 99, so it waits until you’re back there.'
               ' <span class="lk">Top off on Your deck →</span></div>')
    send_i = drift_i + '<div class="send"><span class="sbt2 dis">Suggest changes</span><span class="scl2">' + S.CREDIT + '</span></div>'
    c1 = tool_ph(S.intake(True, 3, S.REQ3, count=41, send=send_i, bracket=False))
    pa, pc = K(A[:3]), K(C[:3])
    res = S.results(False, 3, A[:5], C[:5], pa, pc, req=S.REQ3)
    res = res.replace(S.abar(3, 3, 3), '<div class="abar"><div class="tl"><span class="a"><span class="g">+3 in</span><span class="r">−3 out</span><span class="q">the deck is at 98</span></span>'
                      '<span class="w warn"><b>The deck changed since this run.</b> It’s at 98 now; applying needs it at 99. <span class="lk">Top off →</span></span></div><span class="ab2 dis">Apply 3 + 3</span></div>')
    c2 = tool_dk(res)
    c = frames(frame("<b>390</b> · the deck moved off 99 with the intake open", c1), frame("<b>1300</b> · …or with picks made", c2))
    body = (board_head("2 · a deck not at 99", "Pointed to the right tool",
                       "Suggested changes runs on a deck at exactly 99 (100 with the commander) and keeps it there. Under or over, its tile goes inert in the shipped "
                       "way (dashed, faint, not a button) and its line says why, with one link to the tool that fixes it. The link is the tile’s only control.", tag="R1")
            + sec("A · Under: Top off", "Top off lives on Your deck, so the link switches tab and opens it. Proposed cuts keeps its shipped inert line.", a)
            + sec("B · Over: Proposed cuts", "Proposed cuts is live here, so the link opens it in place, as its own tile would.", b)
            + sec("C · Drifting off 99 mid-flow", "An edit elsewhere (another tab, Your deck) takes the deck off 99. Send and Apply stop, and say why, with the same link. Picks are kept.", c))
    return doc("Suggested changes v2 · not at 99", body, 2040)


# ---------------------------------------------------------------- 3 Results at 3
def r3_board():
    a5, c5 = A[:5], C[:5]
    p0 = S.results(True, 3, a5, c5, req=S.REQ3)
    p1 = S.results(True, 3, a5, c5, K(a5[:3]), K(c5[:2]), tab="cut", req=S.REQ3)
    d1 = S.results(False, 3, a5, c5, K(a5[:3]), K(c5[:2]), req=S.REQ3)
    d2 = S.results(False, 3, [a5[0], a5[2], a5[4], a5[1], a5[3]], c5, ["swords", "heartless-act", "searing-touch"] and K(a5[:3]), K(c5[:3]), req=S.REQ3)
    d2 = S.results(False, 3, a5, c5, K(a5[:3]), K([c5[0], c5[1], c5[3]]), req=S.REQ3)
    ap = K(a5[:3]) + K([c5[0], c5[1], c5[3]])
    d3 = S.results(False, 3, a5, c5, done=True, applied=ap, req=S.REQ3,
                   lead="<b>Applied 3 in, 3 out.</b> The deck is back at 99. The other 4 stay here.")
    p3 = S.results(True, 3, a5, c5, done=True, applied=ap, req=S.REQ3, tab="add",
                   lead="<b>Applied 3 in, 3 out.</b> The deck is back at 99. The other 4 stay here.")
    a = frames(frame("<b>390</b> · nothing picked yet", vp_ph(p0, 1180)),
               frame("<b>390</b> · 3 added, 2 cut: the Cuts half", vp_ph(p1, 1180)),
               frame("<b>390</b> · applied", vp_ph(p3, 1180)))
    b = frames(frame("<b>1300</b> · 3 in, 2 out: Apply waits", tool_dk(d1)))
    c = frames(frame("<b>1300</b> · 3 and 3: Apply 3 + 3", tool_dk(d2)))
    d = frames(frame("<b>1300</b> · applied, one Undo", tool_dk(d3)))
    body = (board_head("3 · results at N = 3 (5 a side)", "Five of each, pick three",
                       "Flat: five rows a side read in the run’s order. Each row is the shipped two-list line (sign, card, ownership dot, name, reason, citation chips) "
                       "with one Pick. The count chip on each side turns green at N. Apply is one press for the set.")
            + sec("A · Phone", "One half at a time, under the segmented control. The bar is pinned above the fold with the tally and Apply.", a)
            + sec("B · Unequal", "3 in and 2 out would take the deck to 100. Apply stays off, and the bar says what fixes it. Picks are never undone for you.", b)
            + sec("C · Equal", "Both at 3: Apply 3 + 3. The bar adds the set’s bracket outcome. 2 + 2 would apply too.", c)
            + sec("D · Applied", "One change, one Undo for all six. Applied rows read <b>✓ Added</b> / <b>✓ Cut</b> (R1b: a bigger mark, sentence case); the four unpicked stay pickable for another equal set.", d))
    return doc("Suggested changes v2 · results at 3", body, 3 * 390 + 2 * 44 + 112 + 0)


# ---------------------------------------------------------------- 4 Results at 10
def r10_board():
    a15 = [A[i] for i in (0, 1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 14, 19, 24)]
    c15 = C[:15]
    pa = K([a15[i] for i in (0, 1, 2, 3, 4, 5, 7, 9, 11, 13)])
    pc = K([c15[i] for i in (0, 1, 3, 5, 7, 11, 12)])
    d = S.results(False, 10, a15, c15, pa, pc, grouped=True)
    p = S.results(True, 10, a15, c15, pa, pc, grouped=True, tab="add")
    pcut = S.results(True, 10, a15, c15, pa, pc, grouped=True, tab="cut")
    body = (board_head("4 · results at N = 10 (15 a side)", "Fifteen of each, grouped",
                       "Above five a side the rows group, by type unless the player chose By role on the deck page’s switch (R1b). Each heading carries the deck’s own figure and where the picks take it. "
                       "Mid-pick: 10 additions chosen (that side is full, so its other Picks grey), 7 cuts. Apply waits for 3 more cuts.")
            + sec("A · Desktop, the whole run", "Two columns, each with its count chip. The bar pins to the window’s bottom while the lists scroll.",
                  frames(frame("<b>1300</b>", tool_dk(d))))
            + sec("B · Phone, both halves", "Additions is full (10 of 10, green in the control); Cuts shows 7 of 10.",
                  frames(frame("<b>390</b> · Additions", tool_ph(p)), frame("<b>390</b> · Cuts", tool_ph(pcut))))
            + sec("C · By role, the other choice", "The same run with By role pressed: the shelf roles, each with <i>you have X of Y</i>. The choice is the deck toolbar’s, kept for every deck, so it is set once.",
                  frames(frame("<b>1300</b> · By role", tool_dk(S.results(False, 10, a15, c15, pa, pc, grouped="role"))), frame("<b>390</b> · By role", tool_ph(S.results(True, 10, a15, c15, pa, pc, grouped="role", tab="add"))))))
    return doc("Suggested changes v2 · results at 10", body, 1300 + 112 + 400)


# ---------------------------------------------------------------- 5 Results at 20
def r20_board():
    adds, cuts = A, C
    pa = K(adds[:20]) if "mystical-tutor" in K(adds[:20]) else K(adds[:20])
    pc = K(cuts[:20])
    d = S.results(False, 20, adds, cuts, pa, pc, grouped=True, req=S.REQ20, bracket=True,
                  lead=f'<b>30 to add and 27 to cut.</b> Pick any 20 of each. Nothing moves until you apply.')
    p = S.results(True, 20, adds, cuts, pa, pc, grouped=True, req=S.REQ20, bracket=True, tab="cut",
                  lead=f'<b>30 to add and 27 to cut.</b> Pick any 20 of each.')
    body = (board_head("5 · results at N = 20 (30 a side)", "Thirty to add, twenty-seven to cut",
                       "The run asked for 30 of each. Three cuts failed the checks and the count still cleared 20, so no refill: the list says 27, never pads, and "
                       "nothing about it is short. All 20 + 20 picked; Mystical Tutor is a Game Changer, so its row carries the shipped bracket flag and the bar says the set moves the deck to Upgraded.")
            + sec("A · Desktop", "Every row drawn, by type. Groups keep a long list scannable: the player finds Instants, takes what they need, moves on.",
                  frames(frame("<b>1300</b>", tool_dk(d))))
            + sec("B · Phone, the Cuts half", "27 rows under one control; the bar stays pinned at the bottom of the screen in use.",
                  frames(frame("<b>390</b> · Cuts", tool_ph(p)))))
    return doc("Suggested changes v2 · results at 20", body, 1300 + 112 + 400)


# ---------------------------------------------------------------- 6 Short run
SHORT_ADDS = [a for a in A if a[0] in ("avabruck-caretaker", "arlinn", "avenger-of-zendikar", "searing-touch", "all-will-be-one", "captain-america",
                                       "polyraptor", "jace", "quintorius", "jasmine-tea-shop", "bard-king-of-dale", "brudiclad", "beorn", "miku")]


def short_board():
    sh = ('<div class="shrt"><span class="h">Found 14 additions under your $2 cap.</span>'
          '<p>You asked for 20. The run named 19 more that cost over $2 a card, so you can apply up to 14 of each.</p>'
          '<span class="m"><span>1 credit used: your cap set the count</span><span class="lk">Raise the cap in a new run ›</span></span></div>')
    pa = K(SHORT_ADDS[:9])
    pc = K(C[:9])
    d = S.results(False, 20, SHORT_ADDS, C[:21], pa, pc, grouped=True, req=S.REQ20, cap=2, short=sh, maxn=14,
                  lead="<b>14 to add and 21 to cut.</b> Pick up to 14 of each.")
    p = S.results(True, 20, SHORT_ADDS, C[:21], pa, pc, grouped=True, req=S.REQ20, cap=2, short=sh, maxn=14,
                  lead="<b>14 to add and 21 to cut.</b> Pick up to 14 of each.")
    sh2 = ('<div class="shrt"><span class="h">Found 8 additions.</span>'
           '<p>You asked for 10. Nothing you set explains the gap: the run fell short on its own, so the credit is back.</p>'
           '<span class="m"><span>Credit returned · 5 of 5 left</span></span></div>')
    a8 = [A[i] for i in (0, 2, 4, 6, 9, 10, 14, 16)]
    d2 = S.results(False, 10, a8, C[:12], req=None, short=sh2, maxn=8, grouped=True, bar=False,
                   lead="<b>8 to add and 12 to cut.</b> Pick up to 8 of each.")
    d2 = d2.split('<div class="cols">')[0] + '</div>'
    p2 = S.results(True, 10, a8, C[:12], req=None, short=sh2, maxn=8, grouped=True, bar=False,
                   lead="<b>8 to add and 12 to cut.</b> Pick up to 8 of each.")
    p2 = p2.split('<div class="seg2">')[0] + '</div>'
    body = (board_head("6 · a short run", "Found 14 under your $2 cap",
                       "Nothing is held back and nothing is padded. A list that can’t reach N says how many it found and which of the player’s restrictions bound it, "
                       "from the drops the run recorded (overCap, offSet, notOwned). Every count downstream follows the shorter list: the cut call asked for 21 (1.5 × 14), "
                       "the chips read <i>of 14</i>, and Apply takes up to 14 + 14.")
            + sec("A · Bound by the cap, charged", "The player’s own restriction set the count, so the run keeps its credit (spec §9) and says so. The link opens a fresh intake; the cap is kept for the deck, the request box is empty as always.",
                  frames(frame("<b>390</b>", vp_ph(p, 1300)), frame("<b>1300</b>", tool_dk(d))))
            + sec("B · Short for no stated reason, refunded", "No restriction explains the gap (under-production after the refill), so the credit comes back. Only the head changes.",
                  frames(frame("<b>390</b> · head", tool_ph(p2)), frame("<b>1300</b> · head", tool_dk(d2)))))
    return doc("Suggested changes v2 · short run", body, 390 + 1300 + 44 + 112)


# ---------------------------------------------------------------- 7 The wait
def wait_board():
    a15 = [A[i] for i in (0, 1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 14, 19, 24)]
    w1p, w1d = S.wait(True, 1), S.wait(False, 1)
    w2p, w2d = S.wait(True, 2, adds=a15, pa=K(a15[:2])), S.wait(False, 2, adds=a15, pa=K(a15[:2]))
    w3p = S.wait(True, 3, adds=a15, pa=K(a15[:6]))
    w3d = S.wait(False, 3, adds=a15, pa=K(a15[:6]))
    body = (board_head("7 · the wait", "Two calls, shown as two steps",
                       "15 to 60 seconds usually, up to about two and a half minutes. Alive across that range by being specific: a running clock and what’s usual for this N, "
                       "rows that tick as each call returns, a moving rule under the live row, and the additions shown (and pickable) the moment they land. "
                       "The shipped tile shows the run on the landing (accent edge, dot, words, time), and the run outlives the page.")
            + sec("A · 0:09 · choosing cards to add", "The first call is out. Nothing to show yet but honest progress.",
                  frames(frame("<b>390</b>", tool_ph(w1p)), frame("<b>1300</b>", tool_dk(w1d)), frame("<b>390</b> · the landing meanwhile", land_ph("running")), gap=44))
            + sec("B · 0:41 · additions in, cuts writing", "Call 1’s 15 kept additions fan out and their list opens below, pickable. The cuts column holds quiet placeholders until call 2 returns (G1).",
                  frames(frame("<b>390</b>", vp_ph(w2p, 1400)), frame("<b>1300</b>", tool_dk(w2d))))
            + sec("C · 1:52 · a refill, taking longer than usual", "Two cuts failed the checks, so the run asks again with the reasons. The row says that in words, and the clock line swaps to the shipped ‘taking longer than usual’.",
                  frames(frame("<b>390</b>", vp_ph(w3p, 1400)), frame("<b>1300</b>", tool_dk(w3d)))))
    return doc("Suggested changes v2 · the wait", body, 390 * 2 + 1300 + 88 + 112)


# ---------------------------------------------------------------- 8 History
def history_board():
    hl_p = tool_ph(S.history_list(True), cut="Analysis tab · Tuning · History").replace('active="suggested"', "")
    hl_p = P.phone(f'<div class="at">{P.hub_open(S.history_list(True), True, active="history")}</div>', head=False, cut="Analysis tab · Tuning · History", nav=False)
    hl_d = P.desk(f'<div class="at">{P.hub_open(S.history_list(False), active="history")}</div>', head=False, cut="Analysis tab · Tuning · History")
    a5, c5 = A[:5], C[:5]
    ap = K(a5[:3]) + K([c5[0], c5[1], c5[3]])
    back = ('<div class="pastm"><span class="b">‹ History</span><span class="m">Oct 26 · version 4 · 1 credit</span></div>'
            '<div class="hrow2"><h3>Suggested changes</h3><span class="nb">New run</span></div>')
    rev = '<p class="lead" style="margin-top:-6px">From a run on Oct 26. Each change is checked against the deck as it is now.</p>'
    old_d = S.results(False, 3, a5, c5, done=True, applied=ap, req=S.REQ3, head=back + rev, newrun=False,
                      lead="<b>Applied 3 in, 3 out on Oct 26.</b> The other 4 are still pickable while the deck is on version 4.")
    old_p = S.results(True, 3, a5, c5, done=True, applied=ap, req=S.REQ3, head=back + rev, newrun=False, tab="cut",
                      lead="<b>Applied 3 in, 3 out on Oct 26.</b> The other 4 are still pickable.")
    stale_note = ('<div class="stale"><span>A past run, read-only. The list has changed by 7 cards since; nothing here can be applied now.</span></div>')
    back2 = ('<div class="pastm"><span class="b">‹ History</span><span class="m">Oct 19 · version 3 · 1 credit</span></div>'
             '<div class="hrow2"><h3>Suggested changes</h3><span class="nb">New run</span></div>')
    st_d = S.results(False, 3, a5, c5, applied=K(a5[:2]) + K(c5[:2]), req="Fewer clunky legends, more cheap removal.", head=back2 + stale_note, readonly=True, newrun=False,
                     lead="<b>5 to add and 5 to cut</b> · 2 + 2 applied on Oct 19.")
    st_p = S.results(True, 3, a5, c5, applied=K(a5[:2]) + K(c5[:2]), req="Fewer clunky legends, more cheap removal.", head=back2 + stale_note, readonly=True, newrun=False,
                     lead="<b>5 to add and 5 to cut</b> · 2 + 2 applied on Oct 19.")
    body = (board_head("8 · history", "Every run, with what was asked",
                       "The shipped History tool, its rows carrying v2’s shape: the request quoted (cut to one line), then <i>asked · found · applied</i>. A v10 run "
                       "(Sep 30) keeps its old summary, as stored. Short and refunded runs say so in the outcome pill; the refunded tier is struck.")
            + sec("A · The run list", "Opening a row opens the run.", frames(frame("<b>390</b>", hl_p), frame("<b>1300</b>", hl_d)))
            + sec("B · An old run, still live", "Same version of the list: the applied six read Added / Cut, the set’s one Undo stays in the bar until the next commit, and the unpicked four can still form another equal set.",
                  frames(frame("<b>390</b> · the Cuts half", vp_ph(old_p, 1150)), frame("<b>1300</b>", tool_dk(old_d))))
            + sec("C · A stale run", "A newer version is committed: the shipped past-run note, no Picks, no bar. Each row reads Added, Cut or Not picked. New run starts a fresh intake.",
                  frames(frame("<b>390</b>", tool_ph(st_p)), frame("<b>1300</b>", tool_dk(st_d)))))
    return doc("Suggested changes v2 · history", body, 390 + 1300 + 44 + 112)


BOARDS = [
    ("Main", main, "Suggested changes v2 · the calls"),
    ("Intake", intake_board, "1 · Intake · three steps, then send"),
    ("Not-At-99", notat_board, "2 · A deck not at 99"),
    ("Results-3", r3_board, "3 · Results at N = 3"),
    ("Results-10", r10_board, "4 · Results at N = 10"),
    ("Results-20", r20_board, "5 · Results at N = 20"),
    ("Short-Run", short_board, "6 · A short run"),
    ("Wait", wait_board, "7 · The wait"),
    ("History", history_board, "8 · History"),
]
