from ck import *


def dtabs_ph():
    return ('<div class="dtabs"><span>Overview</span><span>Cards<small>99</small></span>'
            '<span class="on">Analysis</span><span>Games<small>9</small></span></div>')


def cuts_offer(btn, line, more=""):
    return (f'<div style="padding:16px 16px 18px;display:flex;flex-direction:column">'
            f'<div style="display:flex;flex-direction:column;gap:3px"><h3 class="disp" style="margin:0;font-size:17px;font-weight:600">Proposed cuts</h3>'
            f'<span class="ph-sub">this deck is 6 over</span></div>'
            f'<div style="margin-top:14px"><h4 style="margin:0;font-size:14px;font-weight:600">Name the six cuts</h4>'
            f'<p class="lead">We read the six roles running long and name one cut for each, with its reason.</p></div>'
            f'<div style="margin-top:12px">{btn}</div>{line}{more}</div>')


def ph_crop(inner):
    return f'<div class="cropped" style="width:390px">{dtabs_ph()}{inner}</div>'


def dk_crop(btn, line, more=""):
    body = (f'<div style="padding:22px 28px 24px">'
            f'<div style="display:flex;align-items:baseline;gap:12px"><h3 class="disp" style="margin:0;font-size:19px;font-weight:600">Proposed cuts</h3>'
            f'<span class="ph-sub">this deck is 6 over</span></div>'
            f'<div style="margin-top:14px;display:flex;align-items:flex-start;justify-content:space-between;gap:20px">'
            f'<div style="min-width:0"><h4 style="margin:0;font-size:14px;font-weight:600">Name the six cuts</h4>'
            f'<p class="lead">We read the six roles running long and name one cut for each, with its reason.</p></div>{btn}</div>'
            f'{line}{more}</div>')
    tabs = ('<div class="dtabs" style="padding:0 28px"><span>Overview</span><span>Cards<small>99</small></span>'
            '<span class="on">Analysis</span><span>Games<small>9</small></span></div>')
    return f'<div class="cropped" style="width:760px">{tabs}{body}</div>'


LB = "Look deeper"

STATES = [
    # key, label, caption, spent, line text, warn, more
    ("L1", "Free credits left, nothing bought", "As shipped. A reader who has bought nothing reads the line exactly as today, payments on or off.",
     False, C["line.standing"], None, False, False),
    ("L2", "Free left, paid credits held", "<b>New.</b> <code>left</code> becomes <code>free</code> and the paid total joins the end of the line, one number (plan and packs together). Free credits are spent first, so they lead.",
     False, C["line.withPaid"], None, False, True),
    ("L3", "Free spent, paid held: the press is live", "<b>New.</b> The press stays enabled with its <code>◆ 1 credit</code> segment. The line says this run spends a paid credit and how many there are. No color change: spending what you bought isn’t a warning.",
     False, C["line.paidNext"], None, False, True),
    ("L4", "Out of credits, payments on", "<b>New.</b> The press disables as shipped (segment dropped, 50%). <code>Get more credits</code> sits on its own line under the shipped line, a 44px press on the phone, going to /credits. The About link stays.",
     True, C["line.spent"], None, True, True),
    ("L5", "Daily paid limit reached, free spent", "<b>New.</b> Disabled, but the reader has credits: the line says they’re banked and when the press is back (whichever comes first, the next free credit or the limit’s reset). No <code>Get more credits</code>, no About link.",
     True, C["line.limit"], None, False, True),
    ("L6", "Limit reached, a free credit is back", "<b>New.</b> A returning free credit funds a run as usual, so the press is live. The line says when paid credits run again.",
     False, C["line.limitFree"], None, False, True),
    ("L7", "Plan cancelled, credits expire within 3 days", "<b>New.</b> From 3 days before the date, the line carries the expiry in <code>--warning</code>. Earlier than that it reads as L2. Pack credits never expire and never show this.",
     False, C["line.withPaid"], C["line.expiring"], False, True),
    ("L8", "Out of credits, payments off for this reader", "As shipped: no <code>Get more credits</code>, and no disabled button in its place. Blocked readers (§5) DO keep the link; the billing page explains the pause.",
     True, C["line.spent"], None, False, False),
]


def board():
    ph, dk = [], []
    for key, lab, cap, spent, text, warn, more, new in STATES:
        btn = cbutton(LB, spent=spent)
        line = cline(text, warn=warn, new=new and not more)
        mo = getmore() if more else ""
        if more:
            line = cline(text, warn=warn)
        ph.append(frame(f"{key} · {lab} · 390", ph_crop(cuts_offer(btn, line, mo)), cap))
        dbtn = cbutton(LB, spent=spent, desk=True)
        dk.append(frame(f"{key} · desktop", dk_crop(dbtn, line, getmore(desk=True) if more else ""), "", width=760))
    rule = table([
        ("Free only (no paid ever held)", "<code>4 of 5 left · reset at 2:01 AM</code>", "unchanged (<code>standing</code>, <code>first</code>, <code>again</code>)"),
        ("Free left + paid held", f"<code>{C['line.withPaid']}</code>", "<code>withPaid(free, limit, nextAt, paid)</code>"),
        ("Free spent + paid held", f"<code>{C['line.paidNext']}</code>", "<code>paidNext(limit, nextAt, paid)</code>; press enabled"),
        ("Nothing to spend, payments on", f"<code>{C['line.spent']}</code> + <code>{C['line.getMore']}</code> under it", "<code>spent</code> unchanged; <code>getMore</code> link to <code>/credits</code>"),
        ("Paid limit hit, free spent", f"<code>{C['line.limit']}</code>", "<code>limit(paid, backAt)</code>; press disabled"),
        ("Paid limit hit, free back", f"<code>{C['line.limitFree']}</code>", "<code>limitFree(...)</code>; press enabled"),
        ("Any of the paid lines, plan expiring ≤ 3 days", f"… · <code>{C['line.expiring']}</code> in <code>--warning</code>", "<code>expiring(planLeft, at)</code> appended"),
        ("Payments off for this reader", "the free-only forms above; paid forms still read if they hold paid credits", "no <code>getMore</code>"),
    ], ["Reader holds", "Line", "creditsCopy"])
    body = (
        board_head("Buying credits R1 · §1 · the credit line", "“Get more credits” on every credit count",
                   "Every spending surface draws one line through <code>CreditsText</code> beside the shipped <code>CreditButton</code> or press. "
                   "This board draws the line on Proposed cuts’ Look deeper offer, at 390 and desktop. The <b>Surfaces</b> board shows the same line in place on the other surfaces. "
                   "<b>Call:</b> free and paid read side by side on one line, free first because it’s spent first, paid as one total. The split between plan and packs lives on the billing page, where expiry matters.")
        + '<div class="sec"><h3>The grammar</h3>' + rule + '</div>'
        + '<div class="sec"><h3>Phone · 390</h3><div class="frames">' + "".join(ph) + '</div></div>'
        + '<div class="sec"><h3>Desktop</h3><div class="frames">' + "".join(dk) + '</div></div>'
        + '<div class="note" style="max-width:1600px"><b>Rules</b><ul>'
          '<li><code>Get more credits</code> shows only when nothing can be spent and payments are on for the reader: never while a credit (free or paid) remains, never at the daily limit, never when the switch is off.</li>'
          '<li>It always sits directly under the credit line, aligned with it: left on desktop, and centered on the phone where the surface centers its line (Suggested changes).</li>'
          '<li>The paused state (<code>Paused until November 1</code>) retires with payments and isn’t redrawn.</li>'
          '<li>A press never disables while a credit can fund it. Disabled means: no free credit, and either no paid credit or the paid limit is reached.</li></ul></div>'
    )
    return doc("Buying credits · the credit line", body, 1700, 3200)
