"""Buying credits R4 addendum (account 2, 2026-10-21): /credits as shipped on main (pack leads, `Buy pack`,
`Subscribe · $5 a month`, the R2b diamond), plus the C1 free-views line. Reuses account 1's R1 kit (ck.py) for the
shipped shell, cards and balance; only the page order and the line are new here."""
from ck import *
import ck

# Shipped values (src/lib/copy/credits-page.ts, main 2ad3d1a): the board copy follows the build, not R1's file.
C["pack.buy"] = "Buy pack"
FREE_LINE = "Browsing is always free. Anything we write just for you uses a credit."
FREE_ALTS = []

ck.CCSS_R4 = r"""
.vfree{margin:-2px 0 14px;font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:var(--fg-body);text-wrap:pretty;max-width:900px}
.ptitle .vfree{margin:4px 0 0}
.spec{border:1px solid var(--border-strong);border-radius:12px;background:#111319;padding:18px 20px;display:flex;flex-direction:column;gap:12px;font-size:13px;line-height:1.6;color:var(--fg-body)}
.spec b{color:var(--fg)}
.spec code{font:12px 'IBM Plex Mono',monospace;color:var(--fg-body)}
.spec .str{font:500 15px/1.5 'IBM Plex Sans',sans-serif;color:var(--fg);border-left:0;padding:12px 14px;border-radius:8px;background:var(--surface);border:1px dashed rgba(255,77,154,.55)}
.optk{display:inline-flex;align-items:center;gap:8px}
.optk .tag{font:600 11px 'IBM Plex Mono',monospace;letter-spacing:.08em;padding:3px 8px;border-radius:6px;border:1px solid var(--border-strong);color:var(--fg-body)}
.optk .tag.rec{border-color:var(--accent);color:var(--accent)}
"""
kit.CSS = kit.CSS + ck.CCSS_R4


def vfree(new=True):
    return f'<p class="vfree{" new" if new else ""}">{FREE_LINE}</p>'


def ptitle_b(line=False):
    extra = vfree() if line else ""
    return (f'<div class="ptitle"><h1>{C["page.title"]}</h1>'
            f'<span class="sub">{linkify(C["page.sub"])}</span>{extra}</div>')


def plan_offer_card():
    # The shipped K1: `Subscribe · $5 a month` (plan.subscribe(price)), the four lines before it.
    return plan_card("none", new=False)


def pack_offer_card(new=False):
    # The shipped PackCard: `Buy pack`, no price on the press (the card says it; Hugh, 2026-10-17).
    return pack_card(new=new).replace(f'{C["pack.buy"]} · $5<', f'{C["pack.buy"]}<')


def page2(bal=None, plan="none", hist=None, hist_empty=False, line=None, n=74, buy=True):
    """/credits as shipped. `line`: None, "A" (under Get more credits) or "B" (under the page sub)."""
    parts = [ptitle_b(line == "B")]
    parts.append(bal or balance(new=False))
    subscribed = plan in ("active", "cancelled", "soon", "due")
    lineA = vfree() if line == "A" else ""
    if subscribed:
        cols = [sec("Your plan", plan_card(plan, buy=buy, new=False, n=n))]
        if buy:
            cols.append(f'<div><div class="sech"><h2>Get more credits</h2></div>{lineA}{pack_offer_card()}</div>')
        parts.append(f'<div class="offers">{"".join(cols)}</div>')
    elif buy:
        # Pack leads (L6, pack-offers.tsx): the pack card first, the plan offer after it; two columns from md.
        cards = pack_offer_card() + plan_offer_card()
        parts.append(f'<div><div class="sech"><h2>Get more credits</h2></div>{lineA}<div class="offers">{cards}</div></div>')
    parts.append(history(rows=hist, empty=hist_empty, new=False))
    return f'<div class="pg">{"".join(parts)}</div>'


def opt_head(letter, title, rec=False):
    tag = f'<span class="tag{" rec" if rec else ""}">{letter}{" · recommended" if rec else ""}</span>'
    return f'<span class="optk">{tag}</span>'


def free_line_board():
    p2 = dict(bal=balance((2, 5), new=False), plan="none", hist_empty=True)
    p1 = dict(bal=balance((3, 5), plan=74, packs=40, new=False), plan="active")
    secs = []
    for letter, where, rec, cap_ph, cap_dk, cap_p1 in [
        ("A", "Under the Get more credits heading, above the pack card", False,
         "The line opens the offers: the first thing under the heading, before any price. 13px body in <code>--fg-body</code>, two lines at 390.",
         "One line across both columns, since the section spans them while the plan is on offer (P2, P4).",
         "Subscribed (P1, P3): the section is the right column, so the line fits on one line there, but the pack card still starts 32px lower than the plan card and is 32px shorter (214 against 245). Their feet stay level, but R1b’s equal heights break in P1 and P3."),
        ("B", "Under the page sub, in the head", True,
         "The line joins the head: title, the sub, then this. On every state of the page, offers or not.",
         "Desktop: one line under the sub.",
         "Subscribed: nothing below the head moves; both cards 245px tall with one top edge, as R1b."),
    ]:
        ph = frame(f"{letter}{1} · P2 never bought · 390 · full length", mphone(page2(line=letter, **p2), h=None), cap_ph)
        dk = frame(f"{letter}{2} · P2 never bought · desktop · full length", desk(page2(line=letter, **p2), h=None), cap_dk, width=1300)
        dk1 = frame(f"{letter}{3} · P1 plan and packs · desktop · full length", desk(page2(line=letter, **p1), h=None), cap_p1, width=1300)
        ph1 = frame(f"{letter}{4} · P1 plan and packs · 390 · full length", mphone(page2(line=letter, **p1), h=None), "")
        secs.append(f'<div class="sec"><h3>{opt_head(letter, where, rec)} {where}</h3><div class="frames">{ph}{ph1}{dk}{dk1}</div></div>')
    spec = (
        '<div class="spec" style="max-width:1400px"><span class="k">The string (final)</span>'
        f'<div class="str">{FREE_LINE}</div>'
        '<div>Key <code>creditsPageCopy.viewsFree</code>. <b>Hugh’s words, worked through with the copywriter (2026-10-21)</b>: final, not a placeholder. No “AI” or “model”; no “unlock”, “premium” or “full access”; no figure, so it never goes stale with a price. C1 in the launch epic quotes “Credits pay for AI model runs ... view stays free” and needs amending to this line.</div>'
        '<div><b>Type:</b> IBM Plex Sans 13px / 1.5, <code>--fg-body</code> (the plan card’s fine print weight, one step up from the pack’s 12.5px <code>--fg-muted</code>, so it reads as the section’s own sentence and not a card’s footnote). '
        '<b>Spacing, B:</b> 4px under the sub, on the head’s own 6px gap, so it reads as the head’s third line; the head keeps its 22px (26px desktop) to the balance. Up to 900px wide: one line on desktop, two at 390. <b>Spacing, A:</b> 10px under the heading (the shipped <code>mb-[10px]</code>, less 2px to sit with it), 14px to the first card (the cards’ own gap). Not a link, no icon, no tint.</div>'
        '<div><b>When it shows:</b> A, wherever the <b>Get more credits</b> section draws (payments on, not paused). Where there is nothing on sale (payments off, O2 to O4; paused, B1) there is no price on the page for it to qualify. '
        'B, on every state, the loading screen and the read-failed state included, since <code>CreditsHead</code> draws the head for all three.</div>'
        '</div>'
    )
    body = (
        board_head("Buying credits R4 addendum · item 1 · C1 launch blocker", "The free-views line",
                   "C1 needs <code>/credits</code> to say that viewing is always free and only tool runs cost credits. Drawn over <code>/credits</code> as shipped on main "
                   "(the pack leads, <code>Buy pack</code>, <code>Subscribe · $5 a month</code>, the crown’s diamond). The new line is outlined in dashes. "
                   "<b>A</b> is the placement in the brief (under the heading, above the pack card). <b>B</b>, recommended, puts it in the head: A breaks R1b’s equal card heights on desktop once subscribed, and B says it on every state of the page.")
        + spec + "".join(secs)
    )
    return doc("Buying credits R4 · the free-views line", body, 3700, 3758)




def main_board(items=None):
    rows = "".join(f"<tr><td><b>{n}</b></td><td>{t}</td><td>{a}</td><td><code>{b}</code></td></tr>" for n, t, a, b in (items or ITEMS))
    body = (
        board_head("Buying credits · R4 addendum · account 2 · 2026-10-21", "Four rulings and gaps on /credits",
                   "From the monthly plan’s build (U3b). Source of truth: <code>design/design_handoff_the99_buying_credits/</code> as merged, and <code>/credits</code> as shipped on main "
                   "(<code>src/components/credits/</code>, <code>src/lib/copy/credits-page.ts</code>). Where the build departs from a board, the shipped value is Hugh’s ruling and these boards redraw to it. "
                   "No new surface, token, motion or dependency.")
        + '<div class="note" style="max-width:1400px">' + table([], ["#", "Item", "Answer", "Board"]).replace("<tbody></tbody>", f"<tbody>{rows}</tbody>") + '</div>'
    )
    return doc("Buying credits R4 · items", body, 1520, 503)


# ---------------------------------------------------------------- items 2 to 4
def bal2(cells, total=None):
    """The shipped Balance: cells as (key, n). Subs as balance.tsx draws them; Welcome and Gift carry none."""
    sub = {"free": C["bal.freeSub"], "plan": "roll over", "gift": "", "pack": "never expire"}
    lab = {"free": "Free", "plan": "Plan", "gift": "Gift", "pack": "Packs"}
    cs = []
    for k, n in cells:
        small = "of 5" if k == "free" else ""
        cs.append(cell(lab[k], n, sub[k] or "&nbsp;", small))
    tot = total if total is not None else sum(n for _, n in cells)
    order = f'<div class="order"><span class="k">{C["bal.order"]}</span><span class="k">→</span></div>' if len(cells) > 1 else ""
    return (f'<div class="bal"><div class="tot"><b>{tot}</b><span>{C["bal.total"]}</span></div>'
            f'{order}<div class="cells">{"".join(cs)}</div></div>')


def offers_sec():
    return f'<div><div class="sech"><h2>Get more credits</h2></div><div class="offers">{pack_offer_card()}{plan_offer_card()}</div></div>'


def pack_first_board():
    p2 = dict(bal=balance((2, 5), new=False), plan="none", hist_empty=True)
    p4 = dict(bal=balance((1, 5), packs=72, new=False), plan="none",
              hist=[("Oct 2", C["hist.pack"], "$5.00", "40 credits"), ("Sep 18", C["hist.pack"], "$5.00", "40 credits")])
    k1_ph = f'<div class="cropped" style="width:390px"><div class="pg" style="gap:14px">{offers_sec()}</div></div>'
    k1_dk = f'<div class="dk" style="height:auto;width:1000px;display:block;border-radius:14px"><div class="pg" style="padding:24px 28px 28px">{offers_sec()}</div></div>'
    ph = ('<div class="frames">'
          + frame("K1 · Not subscribed · 390", k1_ph, "The pack card first, the plan offer under it, 14px apart. The plan card keeps its four lines before <b>Subscribe · $5 a month</b>.")
          + frame("P2 · Never bought · 390 · full length", mphone(page2(**p2), h=None), "Free cell only. Get more credits: pack, then plan.")
          + frame("P4 · Packs only · 390 · full length", mphone(page2(**p4), h=None), "Free and Packs cells; the plan offered after the pack, as in P2.")
          + '</div>')
    dk = ('<div class="frames">'
          + frame("K1 · desktop", k1_dk, "From <code>md</code>: pack left, plan right, one grid row, so both cards take the row’s height (the plan’s, with its four lines). Each press sits at its card’s foot, so <b>Buy pack</b> and <b>Subscribe</b> line up.", width=1000)
          + frame("P2 · desktop · full length", desk(page2(**p2), h=None), "", width=1300)
          + frame("P4 · desktop · full length", desk(page2(**p4), h=None), "", width=1300)
          + '</div>')
    body = (
        board_head("Buying credits R4 addendum · item 2 · launch decision L6", "Pack first",
                   "Redrawn to the build (<code>pack-offers.tsx</code>: the plan offer is passed in as <code>lead</code> and drawn after the packs). R1 drew the plan first in K1, P2 and P4; L6 (“both at launch, pack leads”, 2026-10-17) overrides it. "
                   "On the phone the pack card sits above the plan card; from <code>md</code> the pack is left and the plan right at equal heights. "
                   "Subscribed states (P1, P3, K2 to K5) are unchanged: Your plan stays left and Get more credits right, since a held plan is something you have, not an offer. "
                   "Item 1’s line is left off these boards until its placement is picked.")
        + '<div class="sec"><h3>Phone · 390</h3>' + ph + '</div>'
        + '<div class="sec"><h3>Desktop</h3>' + dk + '</div>'
    )
    return doc("Buying credits R4 · pack first", body, 3800, 2731)


def strip_frame(label, cells, cap, desk_=False):
    inner = f'<div class="pg" style="gap:14px">{ptitle_b()}{bal2(cells)}</div>'
    if desk_:
        body = f'<div class="dk" style="height:auto;width:1000px;display:block;border-radius:14px"><div class="pg" style="padding:24px 28px 28px">{ptitle_b()}{bal2(cells)}</div></div>'
        return frame(label, body, cap, width=1000)
    return frame(label, f'<div class="cropped" style="width:390px">{inner}</div>', cap)


CELL_CASES = [
    ("Plan held, its credits all spent", [("free", 3), ("plan", 0), ("pack", 40)],
     "A plan is held (active, cancelled in its month, or past due), so the Plan cell stays, at 0: the card beside it says when it renews or ends."),
    ("K6 · plan expired, packs held", [("free", 3), ("pack", 40)],
     "The plan ended and its credits expired: no plan, nothing to spend, so the Plan cell goes (K6). The offer is back under Get more credits."),
    ("Packs all spent, no plan", [("free", 3), ("pack", 0)],
     "A pack was once bought, so the Packs cell stays at 0. Pack credits never expire, so the 0 is the reader’s own spending, and the pack on sale sits right under it."),
    ("K6 · plan expired, no pack ever", [("free", 3)],
     "Free only, as if never bought; history keeps the months paid. No order strip with one cell."),
    ("A gift held (prompt 7)", [("free", 3), ("plan", 74), ("gift", 10), ("pack", 40)],
     "Gift sits between Plan and Packs, in spend order. Like Welcome it is never bought, so it shows only while it holds a credit. With four cells at 390 the subs wrap (Free’s to three lines), as shipped; a layout note, not this item."),
]


def cells_board():
    ph = "".join(strip_frame(f"{chr(65 + i)} · {t} · 390", cs, cap) for i, (t, cs, cap) in enumerate(CELL_CASES))
    dk = "".join(strip_frame(f"{chr(65 + i)} · {t} · desktop", cs, "", desk_=True) for i, (t, cs, cap) in enumerate(CELL_CASES[:3]))
    rule = table([
        ["Plan", "while plan credits are held, or a plan is held (active, cancelled in its month, past due)", "goes once the plan credits are gone and no plan is held (K6)", "Plan credits expire. A 0 left after expiry would count something that can’t come back without a new Checkout, and the offer below already says that."],
        ["Packs", "once any pack was bought", "never", "Pack credits never expire, so a 0 is what the reader spent, and stays true. It also keeps the strip steady between buys."],
        ["Gift, Welcome", "while they hold a credit", "at 0", "Never bought, so there is no empty source to explain."],
    ], ["Cell", "Shows", "Goes", "Why"])
    body = (
        board_head("Buying credits R4 addendum · item 3 · K6 and the balance row", "The Plan cell and the Packs cell",
                   "<b>Confirmed: the asymmetry is right, as built</b> (<code>buildCreditsModel</code>: <code>plan &gt; 0 || plan held</code> for Plan, <code>pack &gt; 0 || a pack ever bought</code> for Packs). "
                   "R1’s P-table said every cell stays once its source was held; K6 already excepted the plan, and the build follows K6. Prompt 7’s Gift cell shares the row and follows the Welcome rule. Drawn on the shipped strip.")
        + f'<div class="note" style="max-width:1600px">{rule}</div>'
        + '<div class="sec"><h3>Phone · 390</h3><div class="frames">' + ph + '</div></div>'
        + '<div class="sec"><h3>Desktop</h3><div class="frames">' + dk + '</div></div>'
    )
    return doc("Buying credits R4 · Plan and Packs cells", body, 3300, 1367)


def subscribe_board():
    k1_ph = f'<div class="cropped" style="width:390px"><div class="pg" style="gap:14px">{offers_sec()}</div></div>'
    k1_360 = f'<div class="cropped" style="width:360px"><div class="pg" style="gap:14px">{offers_sec()}</div></div>'
    k1_dk = f'<div class="dk" style="height:auto;width:1000px;display:block;border-radius:14px"><div class="pg" style="padding:24px 28px 28px">{offers_sec()}</div></div>'
    body = (
        board_head("Buying credits R4 addendum · item 4 · copy plan.subscribe", "The Subscribe label",
                   "<b>Confirmed: <code>Subscribe · $5 a month</code>, as built.</b> The R1 boards and STATES K1 already drew the price on the press; the copy strings file’s bare <code>Subscribe</code> was the file’s slip, not a ruling. "
                   "A recurring charge carries its price and its interval at the point of purchase (Obligation-class per /copy-review). The pack press stays <code>Buy pack</code> (Hugh, 2026-10-17): one charge, priced on the card above it. "
                   "Fix in the handoff’s copy file: <code>plan.subscribe: (price) =&gt; `Subscribe · ${price} a month`</code>, matching <code>credits-page.ts</code>.")
        + '<div class="frames">'
        + frame("K1 · 390", k1_ph, "Full width, 44px, one line. Pack first, as item 2.")
        + frame("K1 · 360 (narrowest phone)", k1_360, "Still one line at 360.", width=360)
        + frame("K1 · desktop", k1_dk, "40px, sized to its label, at the card’s foot beside <code>Checkout on Stripe · US cards</code>.", width=1000)
        + '</div>'
    )
    return doc("Buying credits R4 · Subscribe label", body, 2000, 1026)


ITEMS = [
    ("1", "Launch blocker (C1): the free-views line",
     "Drawn. String (Hugh and the copywriter, final): “Browsing is always free. Anything we write just for you uses a credit.” Placement A (under Get more credits) or B (the page head, recommended), for Hugh.", "Free-Line"),
    ("2", "Pack first: K1, P2 and P4’s plan offer",
     "Redrawn to the build: pack above plan on the phone; from md, pack left and plan right at equal heights. Subscribed states unchanged.", "Pack-First"),
    ("3", "K6 and the Plan cell asymmetry",
     "Confirmed. Plan shows while plan credits or a plan are held; Packs stays once a pack was ever bought; Gift and Welcome only while they hold a credit.", "Cells"),
    ("4", "The Subscribe label",
     "Confirmed: Subscribe · $5 a month. The copy file’s bare Subscribe was its slip; the boards and STATES K1 drew the price.", "Subscribe"),
]
