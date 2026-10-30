"""The R1 boards."""
from kit import doc, board_head, frame
import pieces as P
from pieces import DECKS

M3 = ("Proposed cuts", "counts where this deck runs long, free. A deeper look can name the 1.")
M1 = ("Top off", "ranks your own cards for the last 12 slots. Nothing is added until you say so.")


def rel(inner, bubble):
    return f'<div style="position:relative">{inner}{bubble}</div>'


def bub(m, top, nib=40, left=16, right=16):
    return P.moment(m[0], m[1], 0, left, right, nib).replace("top:0px", f"top:{top}")


EMPTY = ('<div style="padding:28px 24px 26px;text-align:center;display:flex;flex-direction:column;gap:8px;align-items:center">'
         '<p class="d" style="font:700 18px Cinzel,serif">A king with no army.</p>'
         '<p style="font-size:13px;line-height:1.55;color:var(--fg-body);max-width:330px">Ninety-nine slots, zero filled. Type a name below, or take the ones we’ve already picked out. Sai eats everything anyway.</p>'
         '<p class="m" style="font-size:10.5px;color:var(--fg-faint)">Try filling your ramp, draw, removal, and wipe slots first.</p></div>')


# ---------------------------------------------------------------- stacks

def stack_a(view):
    d = DECKS["thopter"]
    if view == "today":
        inner = (P.phone_header(d, P.today_proxy()) + P.t_over_band(2) + P.t_ledger() + P.pending_card("names")
                 + P.mix() + P.tabs() + P.phone_list(changed=True))
        return P.phone(inner, 704)
    if view == "r1":
        inner = (P.phone_header(d) + P.warn_block([P.warn_spoken(2)]) + P.pending_card("names")
                 + P.status_line([("1 of these is a proxy", False, False), ("Where these 31 cards came from", True, False)])
                 + P.mix(draft=True, phone_parity=True) + P.tabs() + P.phone_list(changed=True))
        return P.phone(inner, 704)
    inner = (P.desk_header(d) + P.warn_block([P.warn_spoken(2)], desk=True) + P.pending_card("names")
             + P.status_line([("1 of these is a proxy", False, False), ("Where these 31 cards came from", True, False)])
             + P.mix(desk=True, draft=True) + P.dtabs()
             + P.desk_list('<span class="nt">6 of these differ from v3</span>', changed=True))
    return P.desk(inner)


def stack_b(view):
    d = DECKS["stompy"]
    cells = [("Ramp", 14, 10, None), ("Draw", 8, 10, "consider →"), ("Removal", 9, 8, None), ("Wipes", 2, 2, None), ("Land", 35, 37, "balance →")]
    if view == "today":
        head = P.phone_header(d, P.today_over(1) + bub(M3, "calc(100% - 8px)", 180))
        # bubble sits under the Proposed cuts row, over the actions row
        inner = head + P.pending_card("counts") + P.mix(cells=cells) + P.tabs() + P.phone_list(changed=True, shopping="3", built=100)
        return P.phone(inner, 704)
    if view == "r1":
        inner = (P.phone_header(d) + rel(P.warn_block([P.warn_over(1, anchor=True)]), bub(M3, "calc(100% - 4px)", 36))
                 + P.pending_card("counts") + P.mix(cells=cells, draft=True, phone_parity=True) + P.tabs()
                 + P.phone_list(changed=True, shopping="3", built=100))
        return P.phone(inner, 704)
    inner = (P.desk_header(d) + rel(P.warn_block([P.warn_over(1, desk=True, anchor=True)], desk=True),
                                    bub(M3, "calc(100% - 10px)", 330, 860, 30))
             + P.pending_card("counts") + P.mix(desk=True, cells=cells, draft=True) + P.dtabs(built=100)
             + P.desk_list('<span class="nt">9 of these differ from v2</span>', changed=True))
    return P.desk(inner)


def stack_c(view):
    d = DECKS["stompy-short"]
    cells = [("Ramp", 12, 10, None), ("Draw", 7, 10, "consider →"), ("Removal", 6, 8, "consider →"), ("Wipes", 1, 2, "consider →"), ("Land", 35, 37, "balance →")]
    if view == "today":
        inner = (P.phone_header(d) + P.t_over_band(1, soft=4) + P.t_ledger()
                 + rel(P.t_last(), bub(M1, "calc(100% - 40px)", 60))
                 + P.t_arrival_precon() + P.pending_card("counts") + P.mix(cells=cells) + P.tabs(built=87)
                 + P.phone_list(changed=True, shopping="9", built=87))
        return P.phone(inner, 704)
    if view == "r1":
        inner = (P.phone_header(d) + P.receipt("precon") + P.warn_block([P.warn_spoken(1)])
                 + P.act_last(anchor=True, also=P.also_pending())
                 + P.status_line([("Where these 31 cards came from", True, False), ("4 cards here are in other drafts too", True, False)])
                 + P.mix(cells=cells, draft=True, phone_parity=True) + P.tabs(built=87) + P.phone_list(changed=True, shopping="9", built=87))
        return P.phone(inner, 704)
    inner = (P.desk_header(d) + P.receipt("precon", desk=True) + P.warn_block([P.warn_spoken(1, desk=True)], desk=True)
             + P.act_last(anchor=True, also=P.also_pending(desk=True))
             + P.status_line([("Where these 31 cards came from", True, False), ("4 cards here are in other drafts too", True, False)])
             + P.mix(desk=True, cells=cells, draft=True) + P.dtabs(built=87)
             + P.desk_list('<span class="nt">9 of these differ from v2</span>', changed=True))
    return P.desk(inner)


QC = [("Ramp", 12, 10, None), ("Draw", 10, 10, None), ("Removal", 9, 8, None), ("Wipes", 2, 2, None), ("Land", 37, 37, "balance →")]


def quiet(view):
    d = DECKS["stompy-done"]
    if view == "today":
        return P.phone(P.phone_header(d) + P.t_version() + P.mix(cells=QC) + P.tabs() + P.phone_list(shopping="0"), 704)
    if view == "r1":
        return P.phone(P.phone_header(d) + P.status_line([("v3 · committed 2 Oct 2026", False, False)])
                       + P.mix(cells=QC, phone_parity=True) + P.tabs() + P.phone_list(shopping="0"), 704)
    return P.desk(P.desk_header(d) + P.status_line([("v3 · committed 2 Oct 2026", False, False)]) + P.mix(desk=True, cells=QC)
                  + P.dtabs() + P.desk_list())


def first(view):
    d = DECKS["first"]
    cells = [("Ramp", 0, 10, "consider →"), ("Draw", 0, 10, "consider →"), ("Removal", 0, 8, "consider →"), ("Wipes", 0, 2, "consider →"), ("Land", 0, 37, None)]
    if view == "today":
        inner = (P.phone_header(d) + P.t_last(99, 140).replace("6 you can sleeve", "52 you can sleeve") + P.mix(cells=cells)
                 + '<div class="t-guided" style="margin-bottom:16px"><p class="m" style="font-size:10px;letter-spacing:.14em;color:var(--accent)">STEP 3 OF 3</p>'
                 '<span class="crumb" style="margin:5px 0 0"><i></i><i></i><i class="a"></i></span>'
                 '<p class="d" style="font:600 15px Cinzel,serif;margin-top:7px">Build your first deck</p>'
                 '<p style="font-size:12.5px;line-height:1.5;color:var(--fg-body);margin-top:3px">Search cards or pick from your suggestions below.</p></div>'
                 + P.tabs("first") + EMPTY)
        return P.phone(inner, 704)
    if view == "r1":
        return P.phone(P.phone_header(d) + P.act_first() + P.mix(cells=cells, phone_parity=True) + P.tabs("first") + EMPTY, 704)
    return P.desk(P.desk_header(d) + P.act_first(desk=True) + P.mix(desk=True, cells=cells) + P.dtabs("first") + EMPTY, None)


def stack_board(key, fn, title, cap, today_cap, r1_cap, desk_cap):
    body = (board_head(f"Deck page messages · {key}", title, cap)
            + '<div class="frames">'
            + frame("Today · 390 · as shipped", fn("today"), today_cap)
            + frame("<b>R1</b> · 390", fn("r1"), r1_cap)
            + frame("<b>R1</b> · 1300", fn("desk"), desk_cap)
            + "</div>")
    return doc(f"Deck messages · {key}", body, 390 * 2 + 1300 + 44 * 2 + 112)


def board_stack_a():
    return stack_board(
        "Stack 1", stack_a, "Spoken for twice, provenance, pending changes, the mix",
        "The stack in your screenshot: four blocks before the tabs, each drawn differently, and the cards pushed off the first screen. "
        "R1 keeps every word and every press. The bands become the <b>warning</b> block, the pending card is the deck’s one <b>action</b> card, "
        "and the proxy line and the provenance ledger fold into one <b>status</b> line (the ledger opens from it, see Status open). Fixture: Thopter Works, committed v3, 6 changes.",
        "Four treatments: red band, accent-ruled ledger with a disc, accent-ruled card, labelled strip. The proxy line sits in the header. First card group is below the fold.",
        "<b>Warning</b> (red rule) → <b>action</b> (accent rule, one primary press) → <b>status</b> (one quiet line) → mix. The tabs arrive 241px sooner (at 1,114px, from 1,355). The mix’s source line and draft note now show on the phone (dashed outline).",
        "Same order and the same four skins at 1300. The toolbar’s draft note is unchanged.")


def board_stack_b():
    return stack_board(
        "Stack 2", stack_b, "Over the 99, the Proposed cuts moment, pending changes, the mix",
        "The other common stack (Mutant Menace’s shape; fixture Big Stompy, v2, 9 changes). The over line leaves the header and becomes the warning block’s row, "
        "led by the +1 the count already shows. Proposed cuts → moves with it, and the moment anchors there. The pending card is unchanged.",
        "The over line and Proposed cuts sit in the header’s middle; the moment covers the actions row.",
        "The header ends at the bar and count. The remedy reads as the warning it is, in the same block a spoken-for card would join. The moment anchors to the same press, now in the block. Height is a wash (tabs 18px later): the gain here is one voice for the problem, not space.",
        "Desktop: the warning row is one line with the press trailing, like the shipped commitments band.")


def board_stack_c():
    return stack_board(
        "Stack 3 · the worst case", stack_c, "Arrival, spoken for twice, provenance, the last N, pending, the mix, a moment",
        "The heaviest stack the code allows (brief §2): a committed deck just built from a precon, cut short, with auto cards, a spoken-for card and drafts claiming four more. "
        "Today that is seven blocks in DOM order, with the arrival band sixth. R1: the receipt first (what just happened), then the warning, then <b>one</b> action card led by the last N, "
        "with pending changes as its second row, then one status line holding the ledger and the soft claim.",
        "Seven blocks; the arrival band arrives after the ledger and the top-off strip; the soft band shares the red block’s wall.",
        "Receipt → warning → action (lead + one ‘also’ row with every pending press) → status (two disclosures) → mix. The tabs arrive 415px sooner (1,196px, from 1,611). M1 anchors to the lead press (drawn in Every element 2; left off here so the ‘also’ row shows).",
        "One column at 1300; the ‘also’ row is one line with its presses trailing.")


def board_quiet():
    body = (board_head("Deck page messages · Quiet and first run", "The deck with nothing to say, and the first deck",
                       "<b>Quiet</b> (11 of 21 decks): the version strip already is the status line, so R1 leaves it alone; the mix gains its source line on the phone. "
                       "<b>First run</b> (brief §4.10): three ‘start here’ messages become one action card in the action slot, above the mix. "
                       "The guided banner’s step, crumbs and title head the card and the top-off door is its press; the empty state in Your deck stays.")
            + '<div class="sec"><h3>Quiet · Complete, v3, nothing pending</h3><div class="frames">'
            + frame("Today · 390", quiet("today"), "The version strip, then the mix.")
            + frame("<b>R1</b> · 390", quiet("r1"), "The same line, now the status line. The mix names its source on the phone.")
            + frame("<b>R1</b> · 1300", quiet("desk"), "Unchanged.")
            + '</div></div><div class="sec"><h3>First run · the only deck, no cards</h3><div class="frames">'
            + frame("Today · 390", first("today"), "The last 99, the mix, then the guided banner below it, then the empty state.")
            + frame("<b>R1</b> · 390", first("r1"), "One card: Step 3 of 3, the title, the door. The tabs arrive 101px sooner. The guided banner’s copy moves into lib/copy (brief §4.6).")
            + frame("<b>R1</b> · 1300", first("desk"), "Desktop keeps the guided banner’s card fan and 0/99 in the card’s right column.")
            + "</div></div>")
    return doc("Deck messages · quiet and first run", body, 390 * 2 + 1300 + 44 * 2 + 112)


# ---------------------------------------------------------------- every element, by level

def col(w, inner, pad=False):
    cls = "dkm" if w > 400 else ""
    return (f'<div class="{cls}" style="width:{w}px;background:var(--bg);border:1px solid var(--border-strong);border-radius:12px;overflow:hidden;position:relative">'
            f'{inner}</div>')


def spec(label, phone_html, desk_html, cap=""):
    return (f'<div style="display:grid;grid-template-columns:220px 390px 1236px;gap:28px;align-items:start">'
            f'<div style="display:flex;flex-direction:column;gap:6px"><div class="lab m" style="font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)">{label}</div>'
            f'<p style="font-size:12.5px;line-height:1.55;color:var(--fg-muted)">{cap}</p></div>'
            f'{col(390, phone_html)}{col(1236, desk_html)}</div>')


def level(title, intro, specs):
    return f'<div class="sec"><h3>{title}</h3><p class="sp">{intro}</p>{"".join(specs)}</div>'


def board_elements_1():
    body = board_head("Deck page messages · Every element, 1 of 2", "Receipt, warning and action, element by element",
                      "Each element of the brief’s §1 drawn in its level, at 390 and in the 1236 main column. Copy is shipped or placeholder; nothing new is said. "
                      "<b>One skin per level</b>: the receipt is the arrival band, the warning is the commitments band, the action is the pending card.")
    body += level("Receipt · one at a time, top of the column, bare ✕",
                  "The arrival band, unchanged in look. ✓ in <code>--success</code> for something done; the precon suggestion is an offer, so it has no ✓. "
                  "Newest wins: a deck arriving with two receipts shows the one for the action just taken.", [
                      spec("A10 · precon arrival", P.receipt("precon"), P.receipt("precon", True), "History link and ✕ as shipped."),
                      spec("A12 · import arrival", P.receipt("import"), P.receipt("import", True), "Plain form. Phone takes the desktop sentence, which fits."),
                      spec("A12 · import, owned", P.receipt("import-owned"), P.receipt("import-owned", True), "Draws with A15 (the only receipt that can)."),
                      spec("A13 · update", P.receipt("update"), P.receipt("update", True), "Now drawn on the shared band shell."),
                      spec("A11 · precon suggestion", P.receipt("suggest"), P.receipt("suggest", True), "An offer, not a receipt: remembered differently (Dismissal)."),
                  ])
    body += level("Warning · never folded, never behind a press",
                  "One block under the header, the commitments band’s skin: <code>--elevated-hover</code>, 3px <code>--danger</code> rule, heading in <code>--avail-over-fg</code>. "
                  "Each row leads with its own mark: the over glyph for spoken-for cards (the row marker’s decoder), the +N figure for over the 99. Two warnings share the block, hairline between.", [
                      spec("A6 · spoken for twice, one card", P.warn_block([P.warn_spoken(1)]), P.warn_block([P.warn_spoken(1, True)], True), "Body names the card, as shipped."),
                      spec("A4 · over the 99", P.warn_block([P.warn_over(1)]), P.warn_block([P.warn_over(1, True)], True), "Moved out of the header. Proposed cuts → is its press; without the switch the row has no press."),
                      spec("A4 + A6 · both", P.warn_block([P.warn_over(2), P.warn_spoken(15)]), P.warn_block([P.warn_over(2, True), P.warn_spoken(15, True)], True), "Over the 99 first: it is the one that blocks legal play."),
                  ])
    body += level("Action · one card, one primary press",
                  "The pending card’s skin: <code>--surface-rail</code>, <code>--border-strong</code>, 3px <code>--accent</code> rule, mono eyebrow, the <code>--fg</code> primary. "
                  "Fill failed and unresolved lose the <code>--warning</code> rule; the top-off door takes the primary press in place of its accent outline. "
                  "When several are waiting, the first in this order leads and the rest become rows at the card’s foot, each keeping its presses: "
                  "<b>fill failed › unresolved › the last N › pending changes</b>.", [
                      spec("A14 · pending, 6 or fewer", P.pending_card("names"), P.pending_card("names"), "Unchanged."),
                      spec("A14 · pending, 7 or more", P.pending_card("counts"), P.pending_card("counts"), "Unchanged."),
                      spec("A8 · the last N", P.act_last(), P.act_last(), "Was its own rail card with an outlined press. M1 anchors to the press."),
                      spec("A8 · ran out (exhausted plate)", P.act_exhausted(), P.act_exhausted(), "No press, as shipped; the hand-drawn ‘i’ goes."),
                      spec("A9 · fill failed", P.act_failed(), P.act_failed(), "Was the <code>--warning</code> rule and ⚠."),
                      spec("A15 · unresolved", P.act_unresolved(), P.act_unresolved(), "Was the <code>--warning</code> rule and ⚠. Copy fix for ‘either tab below’ goes to /copy-review."),
                      spec("Lead + ‘also’ rows", P.act_unresolved(P.also_pending()), P.act_unresolved(P.also_pending(True)), "Unresolved leads; pending keeps Review, Commit and Discard in its row."),
                      spec("A17 · first run", P.act_first(), P.act_first(True), "The guided banner and the top-off door, one card."),
                  ])
    return doc("Deck messages · every element 1", body, 220 + 390 + 1236 + 56 + 112)


def board_elements_2():
    body = board_head("Deck page messages · Every element, 2 of 2", "Status, the mix, moments, the header’s own, and the remove failure",
                      "Status says how the deck stands and asks nothing, so it is one quiet line; anything longer opens from it. The mix and the moments keep their shipped look.")
    pl = ("1 of these is a proxy", False, False)
    v = ("v3 · committed 2 Oct 2026", False, False)
    body += level("Status · one line, the version strip’s skin",
                  "Full-bleed <code>--surface-rail</code>, mono <code>--fg-faint</code>, segments joined by a dot, in this order: version, proxies, provenance, other drafts. "
                  "A segment with more to say is a disclosure (<code>--fg-body</code>, dotted, ▾) and opens below the line, one at a time. On the phone the line wraps; each disclosure keeps a 44px row.", [
                      spec("A14 quiet · version", P.status_line([v]), P.status_line([v]), "Unchanged: it already is this line."),
                      spec("A3 · proxies", P.status_line([v, pl]), P.status_line([v, pl]), "Moved out of the header."),
                      spec("A7 · provenance, closed", P.status_line([v, pl, ("Where these 31 cards came from", True, False)]),
                           P.status_line([v, pl, ("Where these 31 cards came from", True, False)]), "The ledger’s header is the segment."),
                      spec("A7 · provenance, open", P.status_line([v, ("Where these 31 cards came from", True, True)], P.ledger_detail()),
                           P.status_line([v, ("Where these 31 cards came from", True, True)], P.ledger_detail(True)),
                           "The shipped ledger inside the line, minus its accent rule. Show these and Undo these as shipped; the meta keeps to desktop."),
                      spec("A6 soft · other drafts, open", P.status_line([("4 cards here are in other drafts too", True, True)], P.soft_detail()),
                           P.status_line([("4 cards here are in other drafts too", True, True)], P.soft_detail()),
                           "Nothing to sort out yet, so it is status, not a warning. Its hollow glyph comes with it."),
                      spec("A2 · notice tag", P.phone_header(DECKS["thopter"], notice=True), P.desk_header(DECKS["thopter"], notice=True),
                           "Stays a chip in the header’s chips row (deck notices handoff): it qualifies the bracket beside it. Drawn for the record."),
                  ])
    body += level("The mix · its own instrument, last before the tabs",
                  "Unchanged except phone parity (dashed): the source line and the draft note join the label row at 390, in the desktop’s inks.", [
                      spec("A16 · phone parity", P.mix(draft=True, phone_parity=True), P.mix(desk=True, draft=True), "Under 360 the right-hand text wraps under the label."),
                  ])
    head = P.phone_header(DECKS["thopter-draft"], commit_v1=True)
    dhead = P.desk_header(DECKS["thopter-draft"], commit_v1=True)
    body += level("Header actions and moments",
                  "Commit as v1 stays the header’s primary button: it is the one action with no sentence to carry, and it never meets another action (it needs no version, a full deck and nothing unresolved). "
                  "Moments keep the bubble and anchor to the press they name, wherever that press now sits.", [
                      spec("A5 · Commit as v1", head, dhead, "Unchanged. Ruling for you: card it instead (needs a sentence from /copy-review)."),
                      spec("A18 · M1 on the last N", '<div style="position:relative;padding-bottom:96px">' + P.act_last(anchor=True) + bub(M1, "150px", 60) + "</div>",
                           '<div style="position:relative;padding-bottom:70px">' + P.act_last(anchor=True) + bub(M1, "112px", 60, 40, 700) + "</div>",
                           "Below its press, as shipped. It covers what sits under the card until spent; one per visit."),
                  ])
    body = body.replace("{MOMENTS}", "")
    t = P.toast("We couldn’t remove that. It’s still in the deck.", "Sol Ring", 84)
    lst = P.phone_list()
    dock = ('<div style="height:66px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;padding:0 16px">'
            '<span style="flex:1;height:44px;border:1px solid var(--border-strong);border-radius:8px;display:flex;align-items:center;padding:0 12px;color:var(--fg-faint);font-size:14px">Add a card by name</span>'
            '<span style="font-size:13px;color:var(--fg-body)">Owned only</span></div>'
            '<div style="height:74px;border-top:1px solid var(--border);background:var(--surface-rail)"></div>')
    ph = f'<div style="position:relative">{lst}{dock}{t}</div>'
    dt = P.toast("We couldn’t remove that. It’s still in the deck.", "Sol Ring", 16).replace('style="bottom:16px"', 'style="bottom:16px;right:auto;width:440px"')
    dk = f'<div style="position:relative;min-height:330px">{P.desk_list()}{dt}</div>'
    body += level("A1 · the remove failure leaves the column",
                  "Today a bare <code>--warning</code> line above the header, far from the row. R1: the deck toast the token refusal already uses "
                  "(ToastFrame, deck slot, <code>role=\"alert\"</code>, eight seconds, held on hover or focus): the shipped sentence as its title, the card as its detail, no press. "
                  "The row stays in the list, so its ✕ is the retry.", [
                      spec("A1 · deck toast", ph, dk, "One per failure; a newer one replaces it. Above a got-it receipt, it lifts like the token refusal."),
                  ])
    return doc("Deck messages · every element 2", body, 220 + 390 + 1236 + 56 + 112)


# ---------------------------------------------------------------- dismissal and the rules

def board_main():
    levels = [
        ("Receipt", "A10 precon arrival · A12 import arrival · A13 update · A11 precon suggestion",
         "The arrival band (full-bleed rail, ✓, ✕).", "Top of the column", "Yes: ✕"),
        ("Warning", "A6 spoken for twice · A4 over the 99",
         "The commitments band (red rule, <code>--avail-over-fg</code> heading, its own mark).", "Under the receipt", "Never"),
        ("Action", "A14 pending · A8 the last N · A9 fill failed · A15 unresolved · A17 first run",
         "The pending card (accent rule, mono eyebrow, one <code>--fg</code> primary).", "Under the warnings", "Never; leaves when done"),
        ("Status", "A14 quiet version · A3 proxies · A7 provenance · A6 soft claim",
         "The version strip (full-bleed rail, mono faint); long ones open from it.", "Under the action", "Never; disclosures close"),
        ("Mix", "A16 recommended mix", "Unchanged.", "Last before the tabs", "Never"),
        ("Moments", "A18 M1 to M4", "Unchanged bubble, anchored to its press.", "Over the page", "Yes: ✕ (account)"),
        ("Header (unchanged)", "A2 notice tag · A5 Commit as v1", "Chip / primary button in the header.", "In the header", "Never"),
        ("Toast", "A1 remove failure", "ToastFrame, deck slot, alert.", "Bottom of the window", "Times out"),
    ]
    rows = "".join(f'<tr><td><b>{a}</b></td><td>{b}</td><td>{c}</td><td>{d}</td><td>{e}</td></tr>' for a, b, c, d, e in levels)
    tbl = ('<table style="border-collapse:collapse;width:100%;font-size:12.5px;line-height:1.5;color:var(--fg-body)">'
           '<tr style="text-align:left;color:var(--fg-faint);font:10px \'IBM Plex Mono\';letter-spacing:.1em;text-transform:uppercase">'
           '<th style="padding:0 10px 8px 0">Level</th><th style="padding:0 10px 8px 0">Elements</th><th style="padding:0 10px 8px 0">One treatment</th><th style="padding:0 10px 8px 0">Place</th><th style="padding:0 0 8px">Dismiss</th></tr>'
           + rows.replace("<td>", '<td style="padding:8px 10px 8px 0;border-top:1px solid var(--border);vertical-align:top">') + "</table>")
    rules = [
        "<b>Order, top to bottom:</b> header · receipt · warning · action · status · mix · tabs. What just happened, what is wrong, what to do, how it stands. Same order at both widths.",
        "<b>At most one block per level.</b> Two warnings share one block. Two or more actions share one card: the first of <i>fill failed › unresolved › the last N › pending</i> leads, the rest are rows at its foot with every press they have today. Status is always one line.",
        "<b>Folding:</b> only status folds (provenance and the soft claim open from their segment). Warnings are never folded, collapsed or put behind a press. No action loses a press.",
        "<b>Worst case:</b> seven blocks become receipt, warning, one action card, one status line, the mix (Stack 3). Your two common stacks: warning, action, status, mix (Stack 1) and warning, action, mix (Stack 2). Measured at 390, the tabs arrive 241px sooner on Stack 1, 415px on Stack 3, 101px on first run; Stack 2 is 18px longer.",
        "<b>Left rules:</b> two colours, two meanings. <code>--danger</code> = warning; <code>--accent</code> = action. <code>--warning</code> rules, the dashed rule and the ⓘ shell rule go.",
        "<b>Out of the header:</b> the proxy line (status) and the over line with Proposed cuts → (warning). The header ends at the bar and count, plus its actions row.",
        "<b>The guided banner</b> moves above the mix and merges with the top-off door (first run). <b>The remove failure</b> becomes the deck toast.",
        "<b>Phone parity:</b> the mix’s source line and draft note show at 390. The toolbar’s draft note stays desktop: the brass-rule caption already says it on the phone, above the list.",
    ]
    dismiss = [
        "<b>Receipts last the visit they arrived with.</b> The page reads the URL flag and strips it, as <code>StripAddedParam</code> does for <code>added</code>; ✕ hides it for the visit. Nothing is stored, so A10 and A12 no longer share a key and A13’s rule becomes everyone’s.",
        "<b>The precon suggestion</b> is an offer that stands until linked: ✕ is remembered on the account (<code>user_prefs</code>, like <code>moments_spent</code>), per deck and precon, so it does not return on another device. Today: localStorage. <i>Your call; keeping localStorage is fine.</i>",
        "<b>Moments:</b> unchanged (account, append-only).",
        "<b>Warnings, actions, status, the mix:</b> no ✕. They leave when the thing is resolved. Status disclosures and Why these numbers? close, and stay closed only for the visit.",
    ]
    asks = [
        "Commit as v1: keep it as the header’s primary (drawn) or give it an action card (needs a sentence).",
        "Precon suggestion ✕: account (drawn) or keep localStorage.",
        "Receipt above the warning (drawn) or below it.",
        "The last N leads pending changes when both wait (drawn: finish the deck, then commit).",
    ]
    gaps = [
        "G1 · Receipts on the visit: <code>?from=precon</code>, <code>?imported=1</code>, <code>?updated=</code> must be stripped after the first read; check nothing else reads them later (History links, the review page).",
        "G2 · M3 registers in both spines today (brief b.12). Moving Proposed cuts → into the warning row gives it one anchor at both widths.",
        "G3 · Copy: unresolved’s ‘either tab below’, partner ‘99’ strings, the guided banner and mix source into lib/copy, and every eyebrow drawn here go to /copy-review.",
        "G4 · Fixtures: Thopter Works (Sai) and Big Stompy (Ghalta) stand in for your decks; art from the design folder.",
    ]
    li = lambda xs: "<ul>" + "".join(f"<li>{x}</li>" for x in xs) + "</ul>"
    body = (board_head("Deck page messages · brief 2026-10-21 (#2166) · account 2", "One message system for the deck page",
                       "Today the deck page draws its messages in five families with three left-rule colours, and up to seven blocks stand between the header and the cards. "
                       "R1 sorts every element into a level, gives each level <b>one</b> shipped skin, fixes the order, and lets only status fold. "
                       "Nothing new is said and no press is lost. Boards: the three stacks you see most, quiet and first run, then every element. "
                       "<span class=\"new\" style=\"padding:0 4px\">Dashed accent</span> marks a phone-parity addition. Copy is placeholder for /copy-review.")
            + '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px">'
            + f'<div class="note" style="grid-column:1/-1"><b>The levels</b><div style="margin-top:10px">{tbl}</div></div>'
            + f'<div class="note"><b>Placement and folding</b>{li(rules)}</div>'
            + f'<div style="display:flex;flex-direction:column;gap:22px"><div class="note"><b>Dismissal and memory</b>{li(dismiss)}</div>'
            + f'<div class="note"><b>Your calls</b>{li(asks)}</div><div class="note"><b>Gaps</b>{li(gaps)}</div></div></div>')
    return doc("Deck messages · the system", body, 1700)


BOARDS = [
    ("Main", board_main, "R1 · the system: levels, order, folding, dismissal"),
    ("Stack-1", board_stack_a, "Stack 1 · spoken for twice + provenance + pending + mix"),
    ("Stack-2", board_stack_b, "Stack 2 · over the 99 + moment + pending + mix"),
    ("Stack-3", board_stack_c, "Stack 3 · the worst case (seven blocks)"),
    ("Quiet-and-First-Run", board_quiet, "Quiet deck and first run"),
    ("Elements-1", board_elements_1, "Every element · receipt, warning, action"),
    ("Elements-2", board_elements_2, "Every element · status, mix, header, moments, remove failure"),
]
