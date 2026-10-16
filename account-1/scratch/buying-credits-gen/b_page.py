from ck import *

H_PLAN = [("Oct 16", C["hist.planFirst"], "$5.00", "60 credits")]
H_PACKS = [("Oct 2", C["hist.pack"], "$5.00", "40 credits"), ("Sep 18", C["hist.pack"], "$5.00", "40 credits")]

STATES = [
    ("P1", "Plan and packs", dict(bal=balance((3, 5), plan=74, packs=40), plan="active"),
     "The hero. Total first, then the three sources in the order they’re spent. The plan, being something you have, sits under <b>Your plan</b>; packs under <b>Get more credits</b>.", 1930, 1330),
    ("P2", "Never bought anything", dict(bal=balance((2, 5)), plan="none", hist_empty=True),
     "Free only: one cell, no order strip. Both offers state, before the press, what expires and what’s forfeited. History’s empty state.", 1790, 1180),
    ("P3", "Plan only", dict(bal=balance((0, 5), plan=60), plan="active", hist=H_PLAN, n=60),
     "Plan cell, no packs cell (no pack credits). Packs still on sale.", 1560, 1180),
    ("P4", "Packs only", dict(bal=balance((1, 5), packs=72), plan="none", hist=H_PACKS),
     "Packs cell, no plan cell. The plan offered, as in P2.", 1890, 1230),
    ("P5", "Near the daily paid limit", dict(bal=balance((0, 5), plan=57, packs=40, today="near"), plan="active", n=57),
     "From 15 of 20, one line under the cells with a small meter; at 20 it says when it’s back and that nothing banked is lost. Hidden below 15 (engineering’s suggestion, kept).", 1960, 1370),
]


def board():
    ph, dk = [], []
    for key, lab, kw, cap, hph, hdk in STATES:
        ph.append(frame(f"{key} · {lab} · 390 · full length", mphone(page(**kw), h=None), cap))
        dk.append(frame(f"{key} · {lab} · desktop · full length", desk(page(**kw), h=None), "", width=1300))
    ph.append(frame("P6 · Loading · 390", mphone(skeleton(), h=844), "The title is drawn at once; blocks hold the page’s shape. Behind the shipped 400ms delay, no spinner."))
    ph.append(frame("P7 · The read failed · 390", mphone(failed_page(), h=844), "The page’s own state (not transient), so not a toast: one sentence and Try again."))
    lim = dict(bal=balance((0, 5), plan=34, packs=40, today="limit"), plan="active", n=34)
    ph.append(frame("P5b · At the daily paid limit · 390", mphone(page(**lim), h=None), "Neutral, never <code>--danger</code>: the reader did nothing wrong. Buying stays open: the limit is per day, not per balance."))
    two = dict(bal=balance((3, 5), plan=74, packs=40), plan="active", extra_pack=True)
    ph.append(frame("P8 · Layout check: a second pack · 390", mphone(page(**two), h=None),
                    "Not a product decision: a second pack would be one more card in the same column, no redraw."))
    dk.append(frame("P6 · Loading · desktop", desk(skeleton(), h=None), "", width=1300))
    dk.append(frame("P7 · The read failed · desktop", desk(failed_page(), h=None), "", width=1300))
    dk.append(frame("P8 · Layout check: a second pack · desktop", desk(page(**two), h=None), "On desktop it stacks under the first in the right column.", width=1300))
    body = (
        board_head("Buying credits R1 · §2 · /credits", "The Credits page",
                   "A new route, <code>/credits</code>, titled <b>Credits</b>. Reached from the account menu (Menu board) and every <code>Get more credits</code>. "
                   "No tab is lit in the bar: it isn’t one of the five places. Order: what you have, your plan, what’s on sale, what you bought. "
                   "<b>Call:</b> free and paid sit side by side as three cells in spend order, joined by the diamond the brand already uses, under one total. "
                   "A cell is drawn only for a source the reader holds or has held.")
        + '<div class="sec"><h3>Phone · 390</h3><div class="frames">' + "".join(ph) + '</div></div>'
        + '<div class="sec"><h3>Desktop</h3><div class="frames">' + "".join(dk) + '</div></div>'
        + '<div class="note" style="max-width:2600px"><b>Notes</b><ul>'
          '<li>The refund line is fixed under history at every state, and names the support alias and the 14-day rule. There is no refund button.</li>'
          '<li>Receipts open Stripe’s hosted receipt in a new tab (↗). Amounts are as Stripe charged them, in USD.</li>'
          '<li>History pages 20 at a time like other histories in the app; months of the plan each get a row.</li>'
          '<li>The pack and plan art is the brand fan (three card backs, the front one in accent with the count), not card art: no Scryfall image, nothing to break.</li></ul></div>'
    )
    return doc("Buying credits · the Credits page", body, 2770, 6000)
