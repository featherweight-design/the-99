from ck import *


def ph_sec(inner, title="Your plan"):
    return (f'<div class="cropped" style="width:390px"><div class="pg" style="gap:14px">'
            f'{sec(title, inner)}</div></div>')


def dk_sec(inner, title="Your plan", extra=""):
    return (f'<div class="dk" style="height:auto;width:1000px;display:block;border-radius:14px"><div class="pg" style="padding:24px 28px 28px">'
            f'<div class="offers">{sec(title, inner)}{extra}</div></div></div>')


ARROW = ('<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:120px;align-self:center">'
         '<span class="k" style="color:var(--accent)">one tap</span><span style="font:22px \'IBM Plex Mono\';color:var(--accent)">→</span>'
         '<span class="k" style="text-align:center">no sheet, no Stripe page</span></div>')

ARROW_BACK = ('<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:120px;align-self:center">'
              '<span class="k" style="color:var(--accent)">Keep my plan</span><span style="font:22px \'IBM Plex Mono\';color:var(--accent)">←</span>'
              '<span class="k" style="text-align:center">undoes it, no charge</span></div>')


def board():
    pk = sec("Get more credits", pack_card(new=False))
    seq_ph = ('<div class="frames" style="gap:24px">'
              + frame("K2 · Subscribed · 390", ph_sec(plan_card("active", pressed=True)),
                      "<b>Cancel plan</b> is a full-size neutral button, the card’s first control: not a grey link, not in an overflow, not red. What it does is said right under it, before the press.")
              + ARROW
              + frame("K3 · Cancelled, still in the paid month · 390", ph_sec(plan_card("cancelled")),
                      f"The card turns at once; the live region says <code>{C['plan.cancelledLive']}</code> <b>Keep my plan</b> undoes it while the month runs: Stripe’s cancel-at-period-end is switched back off, no Checkout, no charge.")
              + ARROW_BACK + '</div>')
    seq_dk = ('<div class="frames" style="gap:24px">'
              + frame("K2 · desktop", dk_sec(plan_card("active", pressed=True), extra=pk), "", width=1000)
              + frame("K3 · desktop", dk_sec(plan_card("cancelled"), extra=pk), "", width=1000) + '</div>')
    rest_ph = ('<div class="frames">'
               + frame("K1 · Not subscribed · 390", ph_sec(plan_card("none", new=True), title="Get more credits"),
                       "The purchase page’s statement, before the press: rollover with no cap, renews monthly until cancelled, expiry after a cancel, forfeited on deletion. Stripe’s page repeats the price; we don’t draw it.")
               + frame("K4 · Expiry within 3 days · 390", ph_sec(plan_card("soon")),
                       "From 3 days before the date, the card’s border and words turn <code>--warning</code>, the Plan cell’s <code>expire Nov 16</code> does too, and every credit line carries L7. That’s the “before it happens” warning; there’s no email.")
               + frame("K5 · Past due · 390", ph_sec(plan_card("due")),
                       "A renewal failed and Stripe is retrying. Credits still spend. <b>Update card</b> is the press here (Stripe’s hosted billing page, ↗); Cancel stays one tap, as a text button.")
               + frame("K6 · Expired · 390",
                       '<div class="cropped" style="width:390px"><div class="pg" style="gap:18px">'
                       + sec("Get more credits", plan_card("none", new=False))
                       + history(rows=[("Oct 16", C["hist.planMonth"], "$5.00", "60 credits"), ("Sep 16", C["hist.planFirst"], "$5.00", "60 credits")], new=False)
                       + '</div></div>',
                       "After the date the plan credits are gone, the Plan cell goes, and the card is the offer again. History keeps every month paid.")
               + '</div>')
    rest_dk = ('<div class="frames">'
               + frame("K1 · desktop", dk_sec(plan_card("none", new=True), title="Get more credits", extra=sec("&nbsp;", pack_card(new=False))), "", width=1000)
               + frame("K4 · desktop", dk_sec(plan_card("soon"), extra=pk), "", width=1000)
               + frame("K5 · desktop", dk_sec(plan_card("due"), extra=pk), "", width=1000)
               + '</div>')
    # option B, engineering's confirm, drawn for comparison only
    conf_body = (f'<p>Your 74 plan credits last until November 16, then expire. Pack credits are not affected.</p>'
                 '<div style="display:flex;flex-direction:column;gap:8px;margin-top:4px"><span class="pbtn n">Cancel plan</span>'
                 '<span class="pbtn o">Keep my plan</span></div>')
    conf = mphone(page(bal=balance((3, 5), plan=74, packs=40, new=False), plan="active"), h=844, check="scroll",
                  over=sheet("Cancel your plan?", conf_body))
    opts = ('<div class="frames">'
            + frame("Option A · called · inline, with undo", ph_sec(plan_card("active", new=False)) + '<div style="height:12px"></div>' + ph_sec(plan_card("cancelled", new=False)),
                    "One tap cancels. The expiry is stated beside the button before the tap and on the card after it, which meets the ruling. A mistaken tap costs nothing: Keep my plan restores it until the date. Hugh’s preference for an inline option over an extra step.")
            + frame("Option B · engineering’s confirm sheet", conf,
                    "Says the same words one step later. Safe, but it’s two taps, and the second screen reads as a hurdle on the one action the ruling asks to keep obvious. Drawn so you can pick; A is what the other boards assume.")
            + '</div>')
    body = (
        board_head("Buying credits R1 · §3 · the plan", "The plan, and cancelling it",
                   "<b>Call: cancel is one tap, said plainly, and undoable.</b> Not buried (a full-size button, first on the card), not pushy (neutral, no red, no “are you sure”, no offer to stay). "
                   "The ruling’s three statements of expiry land at purchase (K1), at cancel (the line under the button, and the card after), and before it happens (K4 and the credit line from 3 days out).")
        + '<div class="sec"><h3>The tap</h3>' + seq_ph + seq_dk + '</div>'
        + '<div class="sec"><h3>Every other plan state</h3>' + rest_ph + rest_dk + '</div>'
        + '<div class="sec"><h3>Your pick: inline (A) or a confirm (B)</h3>' + opts + '</div>'
    )
    return doc("Buying credits · the plan", body, 2200, 5200)
