"""Strategy focus R1 boards, redrawn around the strategy read (Hugh's ruling, 2026-10-22).
Fixture: HD - Avatar Aang (Hugh's deck, v2, 99/99, Upgraded), cards cut from his captures."""
import kit
import parts as P
import read as R
from kit import doc, board_head, frame

E = "Avatar Aang"


def row(label_p, ph, label_d, dk, cap_p="", cap_d=""):
    return f'<div class="frames">{frame(label_p, ph, cap_p)}{frame(label_d, dk, cap_d)}</div>'


def sec(title, sp, body):
    return f'<div class="sec"><h3>{title}</h3><p class="sp">{sp}</p>{body}</div>'


CUT = "Analysis tab · past How it plays"


def bph(block, cut=CUT, hub=True):
    return P.phone(f'<div class="at">{block}{P.hub_landing(True) if hub else ""}</div>', head=False, cut=cut, nav=False)


def bdk(block, cut=CUT, hub=True):
    return P.desk(f'<div class="at">{block}{P.hub_landing() if hub else ""}</div>', head=False, cut=cut)


def both(title, sp, ph_block, dk_block, hub=True, lp="<b>390</b>", ld="<b>1300</b>"):
    return sec(title, sp, row(lp, bph(ph_block, hub=hub), ld, bdk(dk_block, hub=hub)))


# ------------------------------------------------------------------ calls
CALLS = [
    ("A", "Radar above the read, or inside it", "<b>Inside.</b> One block, <i>What it’s built around</i>: the strategies list is the read’s summary and sits at its head, "
     "left of the read on desktop and on top on the phone. Before a read, the read’s side of the block holds the press and its credit line, so the reader sees "
     "what is free (the list) and what costs (the read) in one place. Above, as its own panel, is drawn on the Placement board: it repeats the deck’s strategies "
     "in two headed places and reads as two features."),
    ("B", "Read and swaps on the phone", "<b>One scroll, two folds.</b> How it wins stays open under the list; How its strategies fit and Weak links fold to "
     "one line each that already says the gist (“Allies and Tokens pull together. Spells matter pulls apart.”), then the swaps. A tab switch "
     "(<i>The read · Swaps</i>) is drawn and not picked: it hides the swaps behind a control on the screen where they get applied."),
    ("C", "How a swap is applied", "<b>The shipped add-and-cut flow, all three ways, no new control.</b> One at a time: Apply on a swap (or Reject). "
     "Several: reject the ones you don’t want, and the foot’s <i>Apply all 7</i> becomes <i>Apply the rest · 5</i>. All: Apply all. "
     "These are the shipped lists strings (<code>applyAll</code>, <code>applyRest</code>, <code>tally</code>). Checkboxes drawn and not picked: a second "
     "control on every swap for what Reject already does."),
    ("1", "Radar or bars (brief call 1)", "<b>Ranked bars.</b> Still drawn on the Form board: a spider’s filled area reads as a score, and two strategies draw a line. "
     "“Radar” stays the feature’s name in the brief; the reader sees a list."),
    ("2", "Credit and keeping", "One credit per read, the shipped credit line beside the press. The read is kept per version: with the deck unchanged there is "
     "no Read again, only the line <i>Kept for version 2</i>. A commit or edit makes it stale (state 4)."),
    ("3", "Names", "Press <i>Read my strategy</i> (Hugh’s words). Section <i>What it’s built around</i>; the read’s parts <i>How it wins</i>, "
     "<i>How its strategies fit</i>, <i>Weak links</i> (<i>Off the plan</i>, <i>Holes</i>), <i>Swaps</i>. Axis names as before (Form board). "
     "“Lean” is gone from every string."),
    ("4", "Landfall, broad themes, typal", "The list reads as the brief measures it: landfall as-is, broad themes shown, a type replaces tribal "
     "(Strategies board). The read is where a landfall plan gets named in words, so the list needs no extra line."),
    ("5", "The bracket", "A swap that would move the bracket carries the suggestion card’s shipped flag (none in this fixture)."),
]


def calls_tbl():
    return '<div class="tbl">' + "".join(f'<div class="tr"><div>{n}</div><div>{t}</div><div>{b}</div></div>' for n, t, b in CALLS) + '</div>'


def main():
    ph = P.phone('<div class="at">' + P.overview() + P.vbox().replace('class="vbx"', 'class="vbx" style="padding:16px"') + P.climb_phone()
                 + P.findings_phone() + P.howplays_phone() + R.block("read", True) + P.hub_landing(True) + '</div>')
    dk_body = ('<div class="at"><div class="grid"><div style="grid-column:1;grid-row:1">' + P.overview() + '</div>'
               '<div style="grid-column:2;grid-row:1/3">' + P.vbox() + '</div><div style="grid-column:1;grid-row:2">' + P.climb() + '</div></div>'
               + P.findings() + P.howplays() + R.block("read") + P.hub_landing() + '</div>')
    body = (board_head("Strategy focus · R1 · 2026-10-22 · account 2", "What it’s built around, and the strategy read",
                       "Brief: <code>docs/superpowers/design-briefs/2026-10-22-strategy-focus.md</code> (#2207), with Hugh’s same-day ruling: the feature leads with "
                       "a <b>strategy read</b> (1 credit, one model call, kept per deck version) that says how the deck wins, whether its strategies pull together "
                       "or apart, its weak links, and 5 to 10 swaps built only from cards the app found. The strategies list stays free and is the read’s "
                       "summary, before and after. Swaps apply through the shipped add-and-cut flow. Drawn over the shipped Analysis tab on Hugh’s "
                       "<b>HD - Avatar Aang</b>, in Low Sun; every card thumb is cut from Hugh’s captures. Orange dashed outline = new. Read text, figures and "
                       "prices are fixtures until eng runs the read on staging.")
            + sec("The calls", "Hugh’s two open calls first (A, B), then how a swap applies (C), then the brief’s calls carried over.", calls_tbl())
            + sec("State 3 · read", "The whole Analysis tab after a read. The block sits last in the reading, under How it plays and above Tuning (unchanged, "
                  "four tools). Desktop: the list left, How it wins and How its strategies fit right, then Weak links and the Swaps, full width. "
                  "Phone: one scroll, the two middle parts folded (call B).",
                  row("<b>390</b> · Analysis tab, whole", ph, "<b>1300</b> · Analysis tab, whole", P.desk(dk_body))))
    return doc("Main", body, 1900)


def states():
    body = (board_head("Strategy focus · R1", "The read’s other states: 1, 2, 4, 5 and 6",
                       "Each frame is the Analysis tab scrolled past How it plays, Tuning under it. The list is drawn in every state: it is free and never "
                       "waits on the read. The press, the reading manifest and the failure are the shipped Suggested changes shapes.")
            + both("State 1 · not read yet", "The read’s side of the block says what a read gives and that it is kept for this version, then the press and the "
                   "shipped credit line (L1 form).", R.block("none", True), R.block("none"))
            + both("State 2 · reading", "The shipped card-fan mark and manifest: what the read takes in, ticked as each lands, with Reading… and Stop. "
                   "The list beside it does not move.", R.block("reading", True), R.block("reading"))
            + both("State 4 · the deck changed since the read", "The read stays on screen under the shipped dashed note, with Read again and the shipped "
                   "<i>again</i> credit line. Each swap is re-checked: Wizard’s Staff left the deck in version 3, so its swap is the shipped "
                   "<i>no longer applies</i> row. The list above is already re-counted (it is free), so it can differ from the read.",
                   R.block("read", True, stale=True, swaps_html=stale_swaps(True)), R.block("read", stale=True, swaps_html=stale_swaps(False)))
            + both("State 5 · out of credits", "The press disabled, the shipped spent line (L4) with <i>What uses credits?</i>, and <i>Get more credits</i> "
                   "under it while payments are on. The list is still there.", R.block("spent", True), R.block("spent"))
            + both("State 6 · failed, no charge", "The shipped failure class (here <i>timed out</i>): tag, heading, body, what was kept, Try again. "
                   "Every failed read is refunded, so it always says no credit was used.", R.block("failed", True), R.block("failed")))
    return doc("Read-States", body, 1900)


def stale_swaps(ph):
    own = "".join(P.pair_card(p, ph) for p in R.OWN[:2]) + P.answered("broken", "", "", "Wizard’s Staff has left the deck, so this swap can’t be applied.") + "".join(P.pair_card(p, ph) for p in R.OWN[3:])
    return R.swaps(ph, own_html=own, foot='<div class="afoot"><span class="rbtn">Apply the rest · 6</span><span class="rcl">+6 in · −6 out · stays at 99</span></div>')


def placement():
    body = (board_head("Strategy focus · R1", "Hugh’s open calls: where the list sits, and the phone",
                       "Call A: the list above the read as its own panel, or inside the read as its summary. Call B: how the read’s text and the swaps share "
                       "the phone. Both drawn at state 3, cut after the swaps begin.")
            + sec("Call A · inside (picked)", "One block. The list is the head of the read: left on desktop, on top on the phone. Before a read, the right side "
                  "holds the press (state 1), so free and paid sit together without a second heading.",
                  row("<b>390</b>", bph(R.block("read", True), hub=False), "<b>1300</b>", bdk(R.block("read"), hub=False)))
            + sec("Call A · above (not picked)", "The list as its own block, then <i>The read</i> as a panel under it. Each reads fine alone, but the deck’s "
                  "strategies now appear under two headings and the read looks like a second feature rather than the list’s explanation.",
                  row("<b>390</b>", bph(R.block("read", True, opt="above"), hub=False), "<b>1300</b>", bdk(R.block("read", opt="above"), hub=False)))
            + sec("Call B · the phone", "Left, picked: one scroll, with How its strategies fit and Weak links folded to a line that already says the gist; "
                  "pressing one opens it in place. Right, not picked: a two-way switch under the list. It keeps the screen short but puts the swaps, "
                  "where the reader acts, behind a control.",
                  f'<div class="frames">{frame("<b>P1 · picked</b> · one scroll, two folds", bph(R.block("read", True), hub=False))}'
                  f'{frame("<b>P2 · not picked</b> · The read / Swaps switch", bph(R.block("read", True, fold="P2"), hub=False))}'
                  f'{frame("<b>P1</b> · Weak links opened", bph(opened_fold(), hub=False))}</div>'))
    return doc("Placement", body, 1900)


def opened_fold():
    names = " · ".join(f'<b>{n}</b>' for n in R.OFFPLAN)
    holes = "".join(f'<div class="hole"><span class="hn">{a}<span>{b}</span></span><span class="hx">{c}</span></div>' for a, b, c in R.HOLES)
    f1 = ('<div class="rfold"><div class="fh">How its strategies fit<span class="fv">⌄</span></div>'
          '<div class="fs">Allies and Tokens pull together. Spells matter pulls apart.</div></div>')
    f2 = ('<div class="rfold open"><div class="fh">Weak links<span class="fv">⌃</span></div>'
          f'<div class="wlc" style="background:transparent;border:0;padding:0"><span class="wh">Off the plan · 7 cards</span><div class="names">{names}</div></div>'
          f'<div class="wlc" style="background:transparent;border:0;padding:0"><span class="wh">Holes · 2</span>{holes}</div></div>')
    head = f'<div class="bah"><span class="lbl">What it’s built around</span></div><div class="bas">{P.SEC_SUB}</div>'
    return f'<div class="ba new">{head}<div class="rbx">{P.strat_list()}{R.wins_fit(fit=False)}{f1}{f2}{R.swaps(True)}</div></div>'


def apply_():
    def a_partial(ph):
        own = (P.answered("ok", "Atreus, Impulsive Son", "Sokka, Tenacious Tactician") + P.answered("rej", "Flickering Hound", "Hakoda, Selfless Commander")
               + "".join(P.pair_card(p, ph) for p in R.OWN[2:]))
        return R.swaps(ph, own_html=own, foot='<div class="afoot"><span class="rbtn">Apply the rest · 5</span><span class="rcl">1 of 7 applied · 1 rejected · +5 in · −5 out · stays at 99</span></div>')

    def a_all(ph):
        own = "".join(P.answered("ok", p[1], p[3]) for p in R.OWN)
        buy = "".join(P.answered("ok", p[1], p[3]) for p in R.BUY)
        return R.swaps(ph, own_html=own, buy_html=buy, foot='<div class="afoot"><span class="rcl">7 of 7 applied · the deck stays at 99 · Undo swap on any row puts both cards back</span></div>')

    def b_pick(ph):
        def cbr(p, on):
            return f'<div class="cbrow"><span class="rcb{" on" if on else ""}">{"✓" if on else ""}</span>{P.pair_card(p, ph).replace("<div class=\"btns\"><span class=\"ap\">Apply</span><span class=\"rj\">Reject</span></div>", "")}</div>'
        own = "".join(cbr(p, i in (0, 2, 4)) for i, p in enumerate(R.OWN))
        buy = "".join(cbr(p, False) for p in R.BUY)
        return R.swaps(ph, own_html=own, buy_html=buy, foot='<div class="afoot"><span class="rbtn">Apply 3 picked</span><span class="rcl">+3 in · −3 out · stays at 99</span></div>')

    def blk(ph, sw):
        head = f'<div class="bah"><span class="lbl">What it’s built around</span></div>'
        return f'<div class="ba new">{head}<div class="rbx">{sw}</div></div>'

    cut = "the read · scrolled to Swaps"
    body = (board_head("Strategy focus · R1", "Call C: applying swaps, one, several or all",
                       "Every swap is the shipped suggestion card (<code>suggestion-card.tsx</code>) and every answer the shipped answered row, through the "
                       "shipped add-and-cut flow: Apply puts the add in and takes the cut out, so the deck stays at 99; Undo swap puts both back. The foot "
                       "is the shipped lists’ Apply all and tally.")
            + sec("One at a time", "Apply (or Reject) on any swap. State 3 on the Main board is this, untouched: seven swaps and Apply all 7.",
                  row("<b>390</b>", bph(blk(True, R.swaps(True)), cut=cut, hub=False), "<b>1300</b>", bdk(blk(False, R.swaps(False)), cut=cut, hub=False)))
            + sec("Several: reject what you don’t want, then apply the rest", "Sokka applied, Hakoda rejected. The foot now reads Apply the rest · 5, with the "
                  "shipped tally. No extra control: Reject is how a reader leaves one out.",
                  row("<b>390</b>", bph(blk(True, a_partial(True)), cut=cut, hub=False), "<b>1300</b>", bdk(blk(False, a_partial(False)), cut=cut, hub=False)))
            + sec("All: Apply all 7", "Every swap becomes the shipped applied row with Undo swap. The read stays; it was read for version 2, so once the "
                  "applied swaps are committed it shows state 4 with Read again.",
                  row("<b>390</b>", bph(blk(True, a_all(True)), cut=cut, hub=False), "<b>1300</b>", bdk(blk(False, a_all(False)), cut=cut, hub=False)))
            + sec("Not picked · checkboxes", "A box on every swap and one Apply N picked. It works, but each swap then carries two controls (the box and Apply), "
                  "and Reject loses its job.",
                  row("<b>390</b>", f'<div class="dim">{bph(blk(True, b_pick(True)), cut=cut, hub=False)}</div>', "<b>1300</b>",
                      f'<div class="dim">{bdk(blk(False, b_pick(False)), cut=cut, hub=False)}</div>')))
    return doc("Apply", body, 1900)


def lst_block(rows=None, state=None, ph=False, read=True):
    """The block before a read, with the list (or a statement in its place) and, when the read is offered, its press."""
    head = f'<div class="bah"><span class="lbl">What it’s built around</span></div><div class="bas">{P.SEC_SUB}</div>'
    left = state if state else P.strat_list(rows)
    right = R.call_block("none", ph) if read else ""
    inner = f'<div class="rtop">{left}{right}</div>' if read else left
    return f'<div class="ba new">{head}<div class="rbx">{inner}</div></div>'


def strategies():
    two = [("Allies", 22, 1.0, True), ("Spells matter", 9, .28, True)]
    elves = [("Elves", 44, 1.0, True), ("Tokens", 13, .38, True), ("Pump", 8, .21, False)]
    s3 = ('<div class="bstate">Nothing in this list runs past what Commander cards run at large, so there is no list to show. '
          'It comes back once five or more cards share something the card pool runs less of.</div>')
    s4 = ('<div class="bstate">This list has <b>18 cards besides lands</b>. What it’s built around, and the read, show from 30.</div>')
    world = [("Insects", 9, 1.0, True), ("Landfall", 11, .82, True), ("Tokens", 8, .55, True), ("Creatures costing 6+", 6, .4, True)]
    body = (board_head("Strategy focus · R1", "The list’s own states, and how a few decks read",
                       "The free list as the brief measures it, each in state 1 (the read not yet run). The list describes and never judges: no state says "
                       "focused or spread thin.")
            + sec("One to four strategies", "Only the rows that score. Not padded to five; two rows read as complete. The read is offered as usual.",
                  row("<b>390</b>", bph(lst_block(two, ph=True)), "<b>1300</b>", bdk(lst_block(two))))
            + sec("Nothing over the floor", "No list, a statement in its place (placeholder for /copy-review). The read is still offered: a deck with no "
                  "standout still has a way to win, and the read says it in words.",
                  row("<b>390</b>", bph(lst_block(state=s3, ph=True)), "<b>1300</b>", bdk(lst_block(state=s3))))
            + sec("Too small to read", "Under 30 nonland cards (a fresh brew). The list and the read both wait, so there is no press to spend a credit on "
                  "a list that can’t be read yet.",
                  row("<b>390</b>", bph(lst_block(state=s4, ph=True, read=False)), "<b>1300</b>", bdk(lst_block(state=s4, read=False))))
            + sec("A creature type and the tribal theme on the same cards",
                  "<b>The type replaces tribal.</b> HD - Elves reads one row, <i>Elves</i>; its count holds Elves, changelings and the payoffs that name "
                  "Elves. No separate Tribal row, ever, once a type is drawn (right: not drawn).",
                  f'<div class="frames">{frame("<b>390</b> · HD - Elves", bph(lst_block(elves, ph=True)))}'
                  f'{frame("<b>not drawn</b> · two rows for one plan", "<div class=xmark style=width:520px>" + P.strat_list([("Elves", 44, 1.0, True), ("Tribal", 31, .7, True), ("Tokens", 13, .38, True)]) + "</div>", "The same cards counted twice would push a real second strategy off the list.")}</div>')
            + sec("A landfall deck, as-is", "World Shaper reads Insects first and Landfall second: lands are left out of every count, so landfall "
                  "under-reads. The list draws it as the score sees it; the read is where the landfall plan is named in words.",
                  f'<div class="frames">{frame("<b>390</b> · World Shaper", bph(lst_block(world, ph=True)))}</div>'))
    return doc("Strategies", body, 1900)


def radar_svg(vals, labels, size=220):
    import math
    n = len(vals); cx = cy = size / 2; R = size / 2 - 34
    pts = lambda r: [(cx + r * math.sin(2 * math.pi * i / n), cy - r * math.cos(2 * math.pi * i / n)) for i in range(n)]
    rings = "".join(f'<polygon points="{" ".join(f"{x:.1f},{y:.1f}" for x, y in pts(R * k))}" fill="none" stroke="#3A3229"/>' for k in (.33, .66, 1))
    spokes = "".join(f'<line x1="{cx}" y1="{cy}" x2="{x:.1f}" y2="{y:.1f}" stroke="#3A3229"/>' for x, y in pts(R))
    poly = " ".join(f"{cx + R*v*math.sin(2*math.pi*i/n):.1f},{cy - R*v*math.cos(2*math.pi*i/n):.1f}" for i, v in enumerate(vals))
    lab = "".join(f'<text x="{x:.1f}" y="{y:.1f}" fill="#A59C89" font-size="10" font-family="IBM Plex Mono" text-anchor="middle">{l}</text>'
                  for (x, y), l in zip(pts(R + 18), labels))
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}">{rings}{spokes}'
            f'<polygon points="{poly}" fill="rgba(207,135,69,.25)" stroke="#CF8745" stroke-width="1.5"/>{lab}</svg>')


def form():
    a = f'<div style="width:520px">{P.strat_list()}</div>'
    b = radar_svg([1, .74, .47, .31, .19], ["Allies", "Spells", "Tokens", "Evasion", "+1/+1"])
    c = radar_svg([1, .28], ["Allies", "Spells"]) if False else (
        '<svg width="220" height="220" viewBox="0 0 220 220"><line x1="110" y1="110" x2="110" y2="34" stroke="#3A3229"/><line x1="110" y1="110" x2="110" y2="186" stroke="#3A3229"/>'
        '<line x1="110" y1="34" x2="110" y2="164" stroke="#CF8745" stroke-width="2"/><text x="110" y="24" fill="#A59C89" font-size="10" font-family="IBM Plex Mono" text-anchor="middle">Allies</text>'
        '<text x="110" y="204" fill="#A59C89" font-size="10" font-family="IBM Plex Mono" text-anchor="middle">Spells</text></svg>')
    names = ('<div class="tbl" style="max-width:900px">' + "".join(f'<div class="tr" style="grid-template-columns:44px 260px 1fr"><div>{k}</div><div>{v}</div><div>{n}</div></div>' for k, v, n in [
        ("type", "Artifacts", "front face is an artifact"), ("type", "Enchantments", "front face is an enchantment"),
        ("type", "Equipment and Auras", "the brief’s voltron axis; “voltron” is jargon"), ("type", "Vehicles", ""),
        ("type", "Creatures costing 6+", "mana value 6 or more; never “big”, which promises power"),
        ("typal", "Allies · Elves · Dinosaurs", "the type’s plural; changelings count toward each"),
        ("theme", "Spells matter · Tokens · +1/+1 counters · Death triggers …", "the swap tools’ job names, first letter capitalised"),
        ("broad", "Evasion · Protection · Pump · Haste · Draw", "shown like any other")]) + '</div>')
    body = (board_head("Strategy focus · R1", "The list’s form (bars, not a spider) and the names",
                       "Bars win on every state the brief names: five rows, one row, none. A spider chart needs three spokes to be a shape, and its filled "
                       "area is read as a score, which is the verdict the measurement ruled out.")
            + f'<div class="frames">{frame("<b>A · picked</b> · ranked bars", a, "Name, bar, count. The bar is against the top row only: no track, no ticks, no score figure.")}'
            + f'{frame("<b>B · rejected</b> · spider, five spokes", b, "The orange area reads as a grade; a fuller shape looks better than a sharp one.")}'
            + f'{frame("<b>C · rejected</b> · spider, two spokes", c, "Two strategies draw a line, not a chart (state 2).")}</div>'
            + sec("Names", "How each axis family reads. Placeholders for /copy-review.", names))
    return doc("Form", body, 1900)


def history_about():
    rows = (P.hist_row("Oct 22, 4:10 PM", "read", "Read", "Allies · Tokens · Spells matter · 7 swaps · 2 applied", "1 credit", new=True)
            + P.hist_row("Oct 12, 9:02 AM", "mana", "Mana", "W 14 · U 16 · B 9 · R 13 · G 12 pips against sources", "free")
            + P.hist_row("Oct 3, 7:45 PM", "suggested", "Suggested", "5 in, 5 out · 3 added, 3 cut", "1 credit"))
    chips = '<div class="hchips"><span class="on">All</span><span>Suggested</span><span>Mana</span><span>Cuts</span><span class="new">Read</span></div>'
    hist = (f'<div class="hist"><div class="hh"><h3>History</h3><span>every run of every tool · newest first</span></div>{chips}'
            f'<div class="hmon">October 2026</div><div style="display:flex;flex-direction:column;gap:6px">{rows}</div>'
            '<p class="dfoot">Kept for as long as the deck is.</p></div>')
    body = (board_head("Strategy focus · R1", "History and the About entry",
                       "A read costs a credit like Suggested changes, so it lands in History the same way: one row per read, the summary its top strategies and "
                       "how many swaps were applied. Reopening it shows the read with each swap re-checked. Chip and mark are new (proposal). The About entry "
                       "follows the per-entry template.")
            + sec("History · a read", "New chip <i>Read</i>; the row’s mark is a new geometric mark in the tools’ family (a card outline, then two filled "
                  "cards stepping up).",
                  row("<b>390</b>", P.phone(f'<div class="at"><section class="hub"><h2>Tuning</h2>{P.phone_back("history", 4)}{hist}</section></div>', head=False, cut="Analysis tab · Tuning · History", nav=False),
                      "<b>1300</b>", P.desk(f'<div class="at">{P.hub_open(hist, active="history")}</div>', head=False, cut="Analysis tab · Tuning · History")))
            + sec("About · new entry", "Drawn as the entry reads on /about. Caption and keys are placeholders for /copy-review; its picture is the phone "
                  "Analysis tab with the shipped locator halo on the block.", about_entry()))
    return doc("History-And-About", body, 1900)


def about_entry():
    cap = ("What is this deck built around? Under Analysis, <i>What it’s built around</i> lists the five things the deck runs most, counted from the "
           "list against every Commander card: a creature type, a theme like Spells matter or Tokens, or a card type. That list is free.</p>"
           "<p>Press <i>Read my strategy</i> and we read the deck for you: how it wins, whether its strategies pull together or apart, the cards off "
           "its plan and the holes in it, and 5 to 10 swaps, each a card in and a card out with its reason. Apply one, reject the ones you don’t want "
           "and apply the rest, or apply them all.")
    keys = ["A read uses a credit, and it’s kept for that version of the deck. It reads again only when the deck changes.",
            "Every card in a swap is one we found: in the deck’s colors, legal, and not already in it. Yours come first.",
            "Each swap is an add and a cut, so the deck stays at 99. Undo swap puts both back.",
            "If a read fails, no credit is used."]
    kl = "".join(f'<li>{k}</li>' for k in keys)
    pic = P.phone('<div class="at">' + R.block("none", True).replace('class="ba new"', 'class="ba halo"') + P.hub_landing(True) + '</div>', head=False, cut="the entry’s picture · halo on the block", nav=False)
    entry = (f'<div style="width:760px;display:flex;flex-direction:column;gap:12px;border-top:2px solid var(--accent);padding-top:16px">'
             '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span class="pill" style="background:var(--accent);color:#14110E;height:18px;font-size:9.5px">NEW</span>'
             '<b style="font-size:18px">Reading a deck’s strategy</b><span class="mt" style="color:var(--accent);font-size:11px">/decks</span>'
             '<span class="mt" style="color:var(--fg-faint);font-size:10.5px">opens a deck’s Analysis tab</span></div>'
             f'<div style="display:flex;flex-direction:column;gap:10px;font-size:14px;line-height:1.65;color:var(--fg-body)"><p>{cap}</p></div>'
             f'<ul class="mt" style="margin:0;padding-left:16px;font-size:11px;line-height:1.8;color:var(--fg-muted)">{kl}</ul>'
             '<div class="tbl" style="margin-top:10px"><div class="tr"><div>id</div><div>strategy-read · 04</div><div>after mana-balance · plate · screen deck, view analysis</div></div>'
             '<div class="tr"><div>sw</div><div>the feature’s switch</div><div>eng names it with the backend; announced when it flips, since 16, no ABOUT_VERSION bump, marksPending</div></div>'
             '<div class="tr"><div>pic</div><div>locator halo</div><div>the block in state 1 on the phone Analysis capture; a recapture with the switch on is owed</div></div></div></div>')
    return f'<div class="frames">{entry}<div style="position:relative">{pic}</div></div>'


BOARDS = [
    ("Main", main, "R1 · the calls, state 3 on the whole Analysis tab"),
    ("Read-States", states, "States 1, 2, 4, 5, 6"),
    ("Placement", placement, "Calls A and B: list inside or above, the phone"),
    ("Apply", apply_, "Call C: one, several, all"),
    ("Strategies", strategies, "The list’s own states, typal, landfall"),
    ("Form", form, "Bars vs spider, names"),
    ("History-And-About", history_about, "History row and the About entry"),
]
