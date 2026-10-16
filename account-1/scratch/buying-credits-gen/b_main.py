from ck import *
from b_line import ph_crop, cuts_offer

CALLS = [
    ("1 · Where the account menu’s entry sits",
     "No new row. The balance is a line in the menu’s identity block, under the email (<code>◆ 117 credits ›</code>), and the whole line goes to /credits. "
     "A reader who has never bought sees the free count (<code>◆ 3 free credits ›</code>) while payments are on. Your standing rule says no new menu rows; "
     "the balance is a fact about the account, so it sits with the name.", "A1–A3 (A3 is the row, for comparison)"),
    ("2 · How free and paid read side by side",
     "On a spending surface, one line: free first (it’s spent first), then the paid total as one number, e.g. <code>4 of 5 free · reset at 2:01 AM · 114 paid</code>. "
     "On /credits, one total and three cells in spend order, joined by the brand diamond: Free, Plan, Packs. A cell appears only for a source held or once held.",
     "Credit-Line L1–L8, Surfaces, Billing-Page P1–P8"),
    ("3 · How cancel reads, not buried, not pushy",
     "<b>Cancel plan</b> is a full-size neutral button, first on the plan card, with what it does written right under it. One tap cancels; the card turns and offers "
     "<b>Keep my plan</b>, which undoes it at no charge until the date. No confirm sheet, no red, no offer to stay. Engineering’s confirm is drawn beside it for your pick.",
     "Plan-and-Cancel K2–K3, options A and B"),
]

RULINGS = [
    ("Prices: $5 a month for 60; $5 for 40", "Plan and pack cards, history, Stripe button labels", "K1, P1–P4"),
    ("Plan credits roll over, no cap, while subscribed", "The plan card before the press; the Plan cell’s <code>roll over</code>", "K1, P1"),
    ("After a cancel, they last to the period end, then expire; stated at purchase, at cancel, before it happens",
     "K1’s list · the line under Cancel plan and the cancelled card · the card, cell and every credit line from 3 days before", "K1, K2–K3, K4, L7"),
    ("Cancelling stays one obvious tap", "One tap, no sheet; undo with Keep my plan", "K2–K3"),
    ("Pack credits never expire", "Pack card, Packs cell, deletion split", "P1, D1"),
    ("Spend order: free, plan, then packs", "The cells’ order and <code>Spent in this order →</code>", "P1"),
    ("20 paid a day; never blocks a free run", "Disabled only with no free credit; L5, L6; the near/at-limit line on /credits", "L5, L6, P5, P5b"),
    ("US only, refused on Stripe’s page", "<code>Checkout on Stripe · US cards</code> under each buy press; nothing else drawn", "K1, P1"),
    ("Refunds by email, 14 days, no button", "The refund line under history; the deletion warning’s pointer", "P1, D1"),
    ("A chargeback blocks buying and revokes what it bought", "One calm band in place of buying; nothing elsewhere", "B1"),
    ("Forfeited on deletion: said before payment and in the delete flow", "Both offers’ fine print; the Manage account interstitial", "K1, P2, D1–D2"),
    ("Switch off: nothing about buying drawn", "Absent, never disabled; reduced page for anyone with a plan, balance or receipts", "O1–O4"),
]

CONSTRAINTS = [
    ("Checkout is Stripe’s hosted page", "No payment form anywhere. The boards stop at the press and resume at the return (R1–R6)."),
    ("The daily paid limit never blocks a free run", "A press disables only when no free credit is left (L5); a returning free credit runs (L6)."),
    ("About entries are paused", "No About entry drawn. <code>What uses credits?</code> keeps linking to the existing <code>credits</code> entry."),
]

GAPS = [
    ("G1", "<code>creditsCopy</code> gains <code>withPaid</code>, <code>paidNext</code>, the paid forms of <code>first</code> / <code>again</code>, <code>limit</code>, <code>limitFree</code>, <code>expiring</code> and <code>getMore</code>. <code>Allowance</code> needs paid-used-today, the paid limit, when paid is back, and the plan’s expiry date (after a cancel).", "Eng"),
    ("G2", "Cancel from our page, in one tap: a server action setting Stripe’s cancel-at-period-end, not a trip to Stripe’s portal.", "Eng"),
    ("G3", "<b>Keep my plan</b> during the paid month clears cancel-at-period-end (no Checkout, no charge). After the date, subscribing is a new Checkout.", "Eng"),
    ("G4", "<b>Update card</b> opens a Stripe customer-portal session limited to the payment method.", "Eng"),
    ("G5", "The return reads the Checkout session by id from the success URL; the page re-reads every 2s for a minute, then every 10s (R4).", "Eng"),
    ("G6", "<code>/credits</code> is not found for a reader with the switch off and no plan, balance or purchase. The menu line follows the same test.", "Eng"),
    ("G7", "<code>Manage account</code> opens the interstitial when paid credits are held (plan or pack, switch on or off), else goes straight to Clerk.", "Eng"),
    ("G8", "History rows say <code>first month</code> for the subscription’s first invoice (Stripe’s billing reason).", "Eng"),
    ("G9", "The expiry warning’s lead time is drawn at 3 days. Confirm, or name another.", "Hugh"),
    ("G10", "Cancel: inline with undo (A, drawn everywhere) or engineering’s confirm (B).", "Hugh"),
    ("G11", "Every new string is a placeholder in <code>buying-credits · copy strings.ts</code>, for /copy-review.", "Note"),
]

DECIDE = (
    '<div class="note" style="max-width:1580px;border-color:var(--accent);background:color-mix(in srgb,var(--accent) 6%,#111319)">'
    '<b style="font:700 17px \'Chakra Petch\',sans-serif">Your input: three choices</b><ul>'
    '<li><b>1 · Cancel: inline with undo, or a confirm sheet.</b> Board <code>§3 · The plan and cancelling it</code>, bottom section <code>Your pick: inline (A) or a confirm (B)</code>. Option A is what every other board draws.</li>'
    '<li><b>2 · Where the menu entry sits.</b> Board <code>Menu entry and §7</code>, frames <code>A1</code> (a line under your email, the call) and <code>A3</code> (a new menu row, as the brief proposed).</li>'
    '<li><b>3 · How early the expiry warning shows.</b> Drawn at 3 days. Board <code>§3 · The plan and cancelling it</code>, frame <code>K4</code>, and <code>§1 · The credit line</code>, frame <code>L7</code>. A number is enough.</li>'
    '</ul><p class="cap" style="margin-top:8px">Theme check: board <code>R1b · Themes</code> shows the main screens in Low Sun, Witching Hour and First Frost.</p></div>')

BOARDS = [
    ("R1 - Credit-Line", "§1 · the line in every state (L1–L8) on the CreditButton, 390 and desktop; the grammar"),
    ("R1 - Surfaces", "§1 · the line in place on the outline press and the synopsis row; the surface inventory"),
    ("R1 - Billing-Page", "§2 · /credits: plan and packs, never bought, plan only, packs only, near and at the limit, loading, failed, a second pack"),
    ("R1 - Plan-and-Cancel", "§3 · the tap, every plan state, and options A and B"),
    ("R1 - Checkout-Return", "§4 · processing, added (pack, plan), still processing, cancelled, a re-read failed"),
    ("R1 - Blocked-and-Off", "§5 and §6 · blocked; switched off with nothing bought; the reduced page"),
    ("R1 - Menu-and-Delete", "§2’s entry and §7 · the menu line, the row option, the Manage account interstitial"),
    ("R1b - Themes", "Round 1b · the main screens in Low Sun, Witching Hour and First Frost"),
]


def board():
    strip = ('<div style="display:flex;gap:30px;align-items:flex-start">'
             + ph_crop(cuts_offer(cbutton("Look deeper", spent=True), cline(C["line.spent"]), getmore(new=False)))
             + '<div class="cropped" style="width:390px"><div class="pg" style="gap:14px">' + balance((3, 5), plan=74, packs=40, new=False) + '</div></div>'
             + '<div class="cropped" style="width:390px"><div class="pg" style="gap:14px">' + plan_card("active", new=False) + '</div></div></div>')
    body = (
        board_head("Buying credits · round 1 · for Hugh’s audit · 2026-10-16", "Buying credits R1: calls, rulings and gaps",
                   "Brief: <code>docs/superpowers/design-briefs/2026-10-16-buying-credits.md</code>. Rulings closed, not reopened. "
                   "<b>The answer in one line:</b> when a reader runs out, the credit line they already read offers <code>Get more credits</code>; it leads to one Credits page "
                   "that shows what they have in the order it’s spent, sells the plan and a pack with their terms said before the press, and lets them cancel in one tap.")
        + DECIDE + strip
        + '<div class="sec"><h3>The three open items, called</h3>' + table(CALLS, ["Open item", "Called", "Boards"]) + '</div>'
        + '<div class="sec"><h3>Rulings, and where each is honoured</h3>' + table(RULINGS, ["Ruling", "On screen", "Frames"]) + '</div>'
        + '<div class="sec"><h3>Constraints</h3>' + table(CONSTRAINTS, ["Constraint", "How"]) + '</div>'
        + '<div class="sec"><h3>Gaps</h3>' + table(GAPS, ["#", "Gap", "Who"]) + '</div>'
        + '<div class="sec"><h3>Boards</h3>' + table(BOARDS, ["Board", "Holds"]) + '</div>'
        + '<div class="note" style="max-width:1580px"><b>Not drawn</b><ul>'
          '<li>The paused state (<code>Paused until November 1</code>): it retires with payments.</li>'
          '<li>The About <code>credits</code> entry’s edit, admin revenue and grants, per-group allowances, stage 2: out of this brief.</li>'
          '<li>Stripe’s pages (Checkout, receipt, card update): hosted by Stripe. We draw the press that leaves and the page we come back to.</li></ul></div>'
    )
    return doc("Buying credits R1", body, 1700, 3000)
