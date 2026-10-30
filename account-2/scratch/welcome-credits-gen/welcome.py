"""Welcome credits R1 boards (account 2, 2026-10-21). Brief: docs/superpowers/design-briefs/2026-10-18-welcome-credits-onboarding.md."""
import sys
from wkit import *
import kit

kit.FONTS = kit.FONTS.replace("&amp;display=swap", "&amp;family=Cinzel:wght@700&amp;family=Metamorphous&amp;display=swap")


def H(t):
    return f'<h2 class="disp" style="margin:8px 0 0;font:700 24px \'Chakra Petch\',sans-serif">{t}</h2>'


def tag(t, rec=False):
    return f'<span class="tag{" rec" if rec else ""}">{t}</span>'


def col(*items):
    return '<div class="col">' + "".join(items) + '</div>'


def frames(*items, gap=44):
    return f'<div class="frames" style="gap:{gap}px">' + "".join(items) + '</div>'


# ================================================================ Main
CALLS = [
    ("1", "Placement", "<b>A card on Home</b>, the section itself, last in the stack: under the Friends row on the first-run Home, and at the foot of the right column (desktop) or last (phone) on the dashboard. "
     "No moment, no tour stop, no new menu row. The chip and <code>/credits</code> carry the facts, not the lesson.", "Placement"),
    ("2", "Try it where no landing exists", "Ruled: the shipped reason line, no second landing. <b>How it sits:</b> with no deck, Help me choose leads with <code>Try it ›</code>, then the reason line once, <code>Needs a deck, and you have none yet.</code>, over the four tools that need one. "
     "With a deck: About’s order, <code>Try it ›</code> on the three tools with a landing; Overview and Which deck needs it most? show where they live, with no link.", "Section"),
    ("3", "Welcome on the credit line and the chip", "<b>Its own segment on the line</b>, in spend order: <code>1 of 1 free · 15 welcome · 40 paid</code>. Plan and packs stay one number, <code>paid</code>. "
     "<b>The chip keeps one number</b> (<code>16 credits</code>): it is the total the reader can spend, and splitting it would crowd the identity block.", "Line-and-Chip"),
    ("4", "The Welcome cell’s line", f"<code>{CELL['welcomeSub']}</code>, in the reader’s own day, read after hydration like the Free cell’s reset time. The cell still shows only while it holds a credit.", "Credits-Page"),
    ("5", "The expiring state (3 days, ruled)", f"Everything that names the lot turns <code>--warning</code>, never <code>--danger</code>: the section’s border and grant line, the Welcome cell’s line (<code>{CELL['welcomeSoon']}</code>), the credit line’s tail (<code>{L['expiring']}</code>), and the chip with that line under it, exactly as a cancelled plan’s credits do. The words carry it, not the colour (Low Sun’s warning sits close to its accent).", "States-B"),
    ("6", "The teaser", f"One line at the section’s foot, <code>{W['teaser']} ›</code>, to <code>/credits</code>. Absent (never disabled) with payments off for the reader, and gone once the reader has bought anything.", "Section"),
    ("7", "Dismissal", "A bare <code>✕</code> closes the section for good (stored per account). It also leaves on its own on the expiry date. Used up, it stays until then, saying so, with the teaser. Expired: nothing, anywhere (a last line would nag; the research says not to).", "States-A"),
]

RULINGS = [
    ("15 credits, once, 30 days from the ACCOUNT’s creation", "The grant line names the date; no screen offers more time or a second lot."),
    ("Spend order: free, welcome, plan, pack", "The intro says the free credit goes first; the line and the Credits cells read in that order."),
    ("1 credit is 1 run; welcome runs count to the 20-a-day limit", "Paid-limit row: the line’s limit form names welcome among what is banked. 15 welcome credits alone can never reach 20, so this state needs a purchase too."),
    ("The switch gates the write only", "Switch off, lot held: everything draws as for a held lot."),
    ("L6: views free, never “unlock”, lead with the pack", f"The section quotes R4’s line, <code>{FREE_L6}</code>; the teaser names packs first; no view is drawn behind a credit; the word is nowhere."),
    ("Leftover conversion is out of scope", "Nothing on any board mentions what happens to welcome credits on a purchase."),
    ("No new account-menu row", "The chip stays the only credits thing in the menu."),
    ("Payments off: buying absent, never disabled", "No teaser, no Get more credits, no offers on the reduced /credits."),
    ("Plan and packs one number on a spending surface", "Welcome is a segment of its own; plan and packs stay <code>N paid</code>."),
    ("Moments and the tour not interrupted", "Nothing arrives: the section is in the page, so nothing is ever over an open surface, and the tour’s visit is untouched."),
    ("Expiry shown 3 days out, in the reader’s own day", "All four surfaces turn on the same 3-day rule; every date is the local day."),
]

GAPS = [
    ("G1", "Home reads the lot per request, outside the cached payload (as the chip does): units, left, expiry. The <code>Used up</code> and <code>Partly spent</code> rows need the grant row read the brief describes.", "Eng"),
    ("G2", "The dismissal is stored per account (a spent-like flag, like a moment’s), so it holds across devices; it is never cleared by a purchase.", "Eng"),
    ("G3", "<code>creditsCopy</code> gains the welcome segment forms (<code>withWelcome</code>, <code>welcomeNext</code>, a welcome <code>expiring</code>, the limit form naming welcome) and <code>Uses a welcome credit.</code>; <code>Allowance</code> gains the welcome expiry.", "Eng"),
    ("G4", "Dates in the reader’s own day: the shipped <code>expiring</code> and <code>shortDay</code> read UTC. The welcome forms are drawn after hydration, like the Free cell’s reset time.", "Eng"),
    ("G5", "When a plan and the welcome lot are both within 3 days, the chip’s line names the earlier one; the credit line names both.", "Eng"),
    ("G6", "Rows follow <code>captionLineSwitches</code>, as Written for you does: a row whose switch is off is not drawn, and with every row off the section is absent.", "Eng"),
    ("G7", "About entry: not drawn here. It joins the launch-end batch (G1 of the launch plan); new entry or an edit to <code>credits</code> is Hugh’s call.", "Hugh"),
    ("G8", "Every string is a placeholder in <code>welcome-credits · copy strings.ts</code>, for /copy-review.", "Note"),
]


def main_board():
    calls = "".join(f"<tr><td><b>{n}</b></td><td>{t}</td><td>{a}</td><td><code>{b}</code></td></tr>" for n, t, a, b in CALLS)
    rul = "".join(f"<tr><td>{a}</td><td>{b}</td></tr>" for a, b in RULINGS)
    gaps = "".join(f"<tr><td><b>{a}</b></td><td>{b}</td><td>{c}</td></tr>" for a, b, c in GAPS)
    body = (
        board_head("Welcome credits · R1 · account 2 · 2026-10-21", "Where credits work, for a new sign-up",
                   "A new account holds 15 welcome credits no screen names. These boards draw where the player learns which tools spend them, when the lot expires, and that <code>/credits</code> exists, "
                   "over the shipped first-run Home, dashboard, account menu chip, credit line and <code>/credits</code>. "
                   "Source of truth: <code>docs/superpowers/design-briefs/2026-10-18-welcome-credits-onboarding.md</code> (main, #2071). Its rulings and the buying-credits handoff’s calls are not reopened. "
                   "Kamigawa (Neon Rain) values; new things outlined in pink dashes. No new token, motion or dependency. Fixtures: account made Oct 21, lot ends Nov 20, production’s 1 free credit a day.")
        + H("The calls (the brief’s Open 1 to 7)")
        + '<div class="note" style="max-width:1580px">' + table([], ["#", "Open", "Called", "Board"]).replace("<tbody></tbody>", f"<tbody>{calls}</tbody>") + '</div>'
        + H("Rulings, and where each is honoured")
        + '<div class="note" style="max-width:1580px">' + table([], ["Ruling", "On the boards"]).replace("<tbody></tbody>", f"<tbody>{rul}</tbody>") + '</div>'
        + H("Gaps")
        + '<div class="note" style="max-width:1580px">' + table([], ["#", "Gap", "Who"]).replace("<tbody></tbody>", f"<tbody>{gaps}</tbody>") + '</div>'
        + H("The boards")
        + '<div class="note" style="max-width:1580px">' + table([
            ["<code>Placement</code>", "Open 1: the four candidates against engineering’s read, and the call on the first-run Home and the dashboard, 390 and desktop."],
            ["<code>Section</code>", "Item 2 and 3: the section, its rows, Try it and the reason line, with and without a deck, 390 and desktop; its spec."],
            ["<code>Line-and-Chip</code>", "Item 4: the credit line with welcome credits on the shipped press, every form, and the chip by state."],
            ["<code>Credits-Page</code>", "Item 5: the Welcome cell’s line and its expiring form on <code>/credits</code>."],
            ["<code>States-A</code> to <code>States-D</code>", "Item 6: every row of “Every state to draw”, at 390 and desktop, with the chip, line and cell beside each."],
            ["<code>Themes</code>", "Low Sun (Amonkhet) and First Frost (Kaldheim)."],
        ], ["Board", "Draws"]) + '</div>'
    )
    return doc("Welcome credits R1 · calls", body, 1700, 2600)


# ================================================================ Placement
def ph_scrolled(inner, offset, h=844, over="", tabs=None):
    """A phone frame scrolled down the page by `offset` px."""
    return ph_fr(f'<div style="margin-top:-{offset}px">{inner}</div>', h=h, over=over, tabs=tabs)


def placement_board():
    fr_ph = first_run(section())
    # A · a first-run moment, anchored to the avatar (the chip is inside the closed menu)
    mom = ('<div class="halo" style="right:16px;top:17px;width:40px;height:40px;border-radius:12px"></div>'
           '<div class="mom" style="right:14px;top:70px"><b>15 welcome credits</b> run the tools that write something just for you, until Nov 20. <u>See where</u><span class="x">✕</span></div>')
    a = frame("A · A first-run moment · 390 · visit 2", ph_fr(first_run(""), h=844, over=mom),
              "<b>Not called.</b> Engineering’s read holds: it would be the first moment that is not a tool’s, so it needs a slot in the fixed order and an anchor. "
              "The chip can’t anchor it (the menu is closed, and an open menu holds every moment), so it points at the avatar and says what the menu will show. "
              "It cannot arrive on the tour’s visit, so most players meet it on visit two, and once spent it never returns.")
    # C · the chip and /credits only
    c1 = frame("C · The chip alone · 390 · the menu open", menu_sheet2(chip("credits", 16)),
               "<b>Not called as the place to teach.</b> No row is added; the chip already counts the lot in. It teaches nothing until the player opens the menu and presses it.")
    c2 = frame("C · …then /credits · 390", ph_fr(credits_page(bal_w(new=False), hist_rows=None), h=844, tabs=tabbar("none")),
               "Where the facts live (items 4 and 5 keep them here), but a player has to come looking. The tour’s look step lights the menu, not the chip.")
    # D · the tour's seventh stop
    tour = ('<div class="tscr"></div><div class="halo" style="right:16px;top:17px;width:40px;height:40px;border-radius:12px"></div>'
            '<div class="tcard" style="left:25px;top:96px"><span class="x">✕</span><span class="tk">6 of 7 · Credits</span><h4>15 welcome credits</h4>'
            '<p>The tools that write something just for you use a credit. These 15 are yours until Nov 20. Your count is in the account menu.</p>'
            '<span class="tf">Seven stops · about a minute · ✕ skips the tour</span><div class="tn"><span class="dots"><i></i><i></i><i></i><i></i><i></i><i class="on"></i><i></i></span><span class="nx">Next</span></div></div>')
    d = frame("D · A tour stop before the banner · 390", ph_fr(first_run(""), h=844, over=tour),
              "<b>Not called.</b> Locked 9 keeps the banner last, so this is a seventh stop: <code>Six stops · about a minute</code> changes, it runs only with <code>FIRST_RUN_TOUR_ENABLED</code>, once, and again only on <code>/?tour=1</code>. A player who skips it never sees the lot named.")
    b1 = frame("B · Called · the first-run Home · 390 · full length", ph_fr(fr_ph),
               "<b>Called.</b> The section is the last thing in the stack, under the Friends row and unnumbered like it, so the kicker stays <code>Step 1 of 3</code> and nothing competes with “Add your collection”. "
               "It is in the page, so it is on screen without a press, never arrives over anything, and asks nothing of the tour or the moments.")
    b2 = frame("B · the first-run Home · desktop · full length", dk_fr(first_run(section(desk_=True), desk_=True)),
               "Desktop: the same place, full width, its rows in Written for you’s three columns (name and where, what, cost).", width=1300)
    d1 = frame("B · the dashboard, once the cards are read · 390 · full length",
               ph_fr(dashboard(section(narrow=False)), tabs=tabbar("Home")),
               "The player keeps the section after the collection is read. On the phone it is the last block, after Commitments’ slot (absent here at zero decks), so it never pushes Ready to build or the ways in down.")
    d2 = frame("B · the dashboard · desktop · full length", desk(dashboard(section(desk_=True, narrow=True), desk_=True), h=None, active="Home"),
               "Desktop: the foot of the 316 right column, under Friends, in its stacked form.", width=1300)
    read = table([
        ["A · a first-run moment", "Needs a slot and an anchor; the chip can’t anchor it; no earlier than visit 2.", "Agreed. It would also be the first moment with no tool behind it.", tag("not called")],
        ["B · a card on Home", "The one candidate on screen without a press; competes with step 1; read outside Home’s cache.", "Last in the stack, so it competes with nothing; read per request (G1).", tag("called", True)],
        ["C · the chip or /credits", "No new row; the chip, or the Welcome cell it leads to.", "Kept for the facts (items 4, 5), not the lesson: it needs a press.", tag("not called")],
        ["D · a tour stop", "A seventh stop; switch-bound; once; skippers never see it.", "Agreed; it also spends the tour’s one minute on money.", tag("not called")],
    ], ["Candidate", "Engineering’s read", "Design", ""])
    body = (
        board_head("Welcome credits R1 · item 1 · Open 1", "Where it goes: a card on Home",
                   "The four candidates the brief names, each drawn where it would sit, against engineering’s read. <b>Called: B</b>, the section as the last card on Home. "
                   "Hugh’s standing preference is an inline place on the shipped page over a follow-up step, and B is the only one a player meets without pressing anything.")
        + f'<div class="note" style="max-width:1700px">{read}</div>'
        + '<div class="sec"><h3>The three not called · 390</h3>' + frames(a, c1, c2, d) + '</div>'
        + '<div class="sec"><h3>B, called · the first-run Home</h3>' + frames(b1, b2) + '</div>'
        + '<div class="sec"><h3>B, called · the dashboard</h3>' + frames(d1, d2) + '</div>'
    )
    return doc("Welcome credits R1 · placement", body, 1900, 7000)


# ================================================================ Section
def sec_crop(inner, w=390):
    return f'<div class="cropped" style="width:{w}px;padding:16px;background:var(--bg)">{inner}</div>'


def sec_crop_dk(inner, w=1238):
    return f'<div class="dk" style="height:auto;width:{w}px;display:block"><div style="padding:16px 28px">{inner}</div></div>'


def section_board():
    spec = (
        '<div class="callout" style="max-width:1700px">'
        f'<div><b>Anatomy, top to bottom.</b> The pack card’s diamond (R2b’s offer art) carrying the welcome credits left, at 36px; the title <code>{W["title"]}</code> in the theme’s display face (18px, 21px desktop); the grant line in 13.5px <code>--fg-body</code> with the count in <code>--fg</code> 600; a bare ✕ (44px hit, 32px on desktop), top right. '
        f'Then one paragraph: R4’s free line, <code>{FREE_L6}</code>, then the intro in <code>--fg-muted</code>. Then the rows, then the teaser.</div>'
        '<div><b>The rows are Written for you’s</b> (<code>writtenForYouCopy.rows</code>, reused whole: name, where, what, cost), drawn as About draws them: on the phone name and the short cost chip, what, then where; from <code>lg</code> three columns, 300 / 1fr / 170, with the full cost. One change: <code>Try it ›</code> joins the where line, <code>--accent-text</code> 600 12.5px, with a 44px hit.</div>'
        f'<div><b>Try it and the reason line (ruled; how it sits is the call).</b> With no deck, the tools are split once: Help me choose first, the one a new player can run, with <code>Try it ›</code>; then the shipped reason line once, <code>{NEEDS_A_DECK}</code>, in 11px mono <code>--fg-muted</code> after a hairline, over the other four. Four copies of one line in five rows is noise. '
        'With a deck: About’s order, <code>Try it ›</code> where the tool has a landing of its own (<code>suggested-changes</code>, <code>proposed-cuts</code>, <code>help-me-choose</code>); Overview and Which deck needs it most? have none, so their where line stands alone. No second landing.</div>'
        '<div><b>The card:</b> Written for you’s, <code>--surface</code> on <code>--accent-dim</code>, radius 14, padding 16 (20 24 desktop). Last in the Home stack, the stack’s own 11px (12px) gap above it.</div>'
        '</div>')
    land = table([
        ["Help me choose, with “Anything else?”", "<code>help-me-choose</code> (no deck needed)", "Try it ›", "Try it ›"],
        ["Suggested changes", "<code>suggested-changes</code>, needs a deck", "under the reason line", "Try it ›"],
        ["Look deeper, in Proposed cuts", "<code>proposed-cuts</code>, needs a deck (the landing says if none runs long)", "under the reason line", "Try it ›"],
        ["Overview", "none", "under the reason line", "where only"],
        ["Which deck needs it most?", "none of its own (find-a-deck’s is not reused)", "under the reason line", "where only"],
    ], ["Row", "Landing", "No deck", "With a deck"])
    body = (
        board_head("Welcome credits R1 · items 2 and 3", "The section, and Try it",
                   "The five tools from About’s Written for you, the grant line with its date, the L6 free line and the teaser to <code>/credits</code>. Cropped from the Home stack; the full pages are on Placement and the States boards.")
        + spec
        + '<div class="sec"><h3>No deck yet (every new sign-up) · 390 and desktop</h3>'
        + frames(frame("S1 · held, no deck · 390", sec_crop(section()), ""),
                 frame("S1 · held, no deck · desktop", sec_crop_dk(section(desk_=True)), "", width=1238)) + '</div>'
        + '<div class="sec"><h3>With a deck · 390 and desktop</h3>'
        + frames(frame("S2 · held, a deck · 390", sec_crop(section(deck=True, left=12)), ""),
                 frame("S2 · held, a deck · desktop", sec_crop_dk(section(deck=True, left=12, desk_=True)), "", width=1238)) + '</div>'
        + f'<div class="note" style="max-width:1238px"><b>Try it, per row</b>{land}</div>'
    )
    return doc("Welcome credits R1 · section", body, 1800, 4000)


# ================================================================ Line and chip
LINE_STATES = [
    ("W1", "Free credit left, welcome held", L["withWelcome"], None, False, False,
     "The shipped L2 form with welcome as its own segment: <code>15 welcome</code>, never <code>15 paid</code>. Press as shipped."),
    ("W2", "Free spent, the run takes a welcome credit", L["welcomeNext"], None, False, False,
     "L3’s form: <code>this run uses 1 of 15 welcome</code>. The press stays live; <code>first</code> says <code>Uses a welcome credit.</code> No colour: spending a gift is not a warning."),
    ("W3", "Welcome and paid held", L["welcomePaid"], None, False, False,
     "Spend order left to right: free, welcome, then plan and packs as one number."),
    ("W4", "Welcome within 3 days of expiry", L["welcomeNextPart"], L["expiring"], False, False,
     "L7’s tail, in <code>--warning</code>, shaped like a plan’s: <code>9 welcome credits expire Nov 20</code>, the reader’s own day."),
    ("W5", "Welcome used up, nothing else held", L["spent"], None, True, True,
     "Nothing held: the shipped L4, with <code>Get more credits</code> under it while payments are on. No trace of the lot."),
    ("W6", "Paid limit reached (welcome and a pack held)", L["limit"], None, True, False,
     "L5 with welcome among what is banked. 15 welcome credits can’t reach the 20-run limit alone, so this needs a purchase too. Never <code>--danger</code>."),
]


def line_board():
    rows = []
    for k, t, text, warn, spent, more, cap in LINE_STATES:
        rows.append(f'<div class="sec"><h3>{k} · {t}</h3><p class="cap" style="max-width:1300px">{cap}</p>'
                    + frames(frame(f"{k} · 390", line_ph(text, warn, spent, more), ""),
                             frame(f"{k} · desktop", line_dk(text, warn, spent, more), "", width=760)) + '</div>')
    chips = [
        ("Lot held (16 = 1 free + 15 welcome)", chip("credits", 16), chip("credits", 16, d=True), "One number, the total the player can spend, as shipped. No welcome word: the menu is not where the lot is explained."),
        ("Lot expiring within 3 days", chip("expiring", 10, line=L["expiring"]), chip("expiring", 10, line=L["expiring"], d=True), "The plan’s expiring form, with the welcome line under the chip, in <code>--warning</code>."),
        ("Lot used up, never bought", chip("free", 1), chip("free", 1, d=True), "Back to the shipped never-bought chip: <code>1 free credit</code>."),
        ("Lot used up and the free credit spent", chip("out"), chip("out", d=True), "The shipped out state, payments on only."),
    ]
    crow = "".join(f'<div class="sec"><h3>{t}</h3><p class="cap" style="max-width:1300px">{cap}</p>'
                   + frames(frame("phone sheet · 390", menu_sheet2(a), ""), frame("desktop popover", menu_pop2(b), "", width=330)) + '</div>'
                   for t, a, b, cap in chips)
    body = (
        board_head("Welcome credits R1 · item 4 · Open 3 and 5", "Welcome credits on the credit line and the chip",
                   "The line counts the lot as <code>N paid</code> today, untrue for a gift. <b>Called:</b> on the line, welcome takes its own segment in spend order; plan and packs stay one number. "
                   "On the chip, one number, as shipped. Drawn on Proposed cuts’ shipped press (Look deeper), the line every spender shares.")
        + "".join(rows)
        + H("The chip, by state")
        + crow
    )
    return doc("Welcome credits R1 · line and chip", body, 1400, 6000)


# ================================================================ Credits page
def credits_board():
    held = credits_page(bal_w())
    soon = credits_page(bal_w(welcome=9, warn=True))
    off = credits_page(bal_w(welcome=9), buy=False)
    bought = credits_page(bal_w(welcome=15, packs=40), hist_rows=[("Oct 23", C["hist.pack"], "$5.00", "40 credits")])
    body = (
        board_head("Welcome credits R1 · item 5 · Open 4 and 5", "The Welcome cell’s line",
                   f"The shipped cell (<code>balance.tsx</code>) has no line under Welcome. <b>Called:</b> <code>{CELL['welcomeSub']}</code>, the shape of a cancelled plan’s <code>expire Nov 16</code>, dated in the reader’s own day (drawn after hydration, like the Free cell’s reset time). "
                   f"Within 3 days: <code>{CELL['welcomeSoon']}</code> in <code>--warning</code>. The cell is drawn only while it holds a credit (shipped). The head carries R4’s line (placement B, approved).")
        + '<div class="sec"><h3>Held · 390 and desktop</h3>'
        + frames(frame("P-W1 · held · 390 · full length", ph_fr(held, tabs=tabbar("none")), "Free, then Welcome, in spend order; the offers lead with the pack (L6)."),
                 frame("P-W1 · held · desktop · full length", desk(held, h=None), "", width=1300)) + '</div>'
        + '<div class="sec"><h3>Expiring within 3 days · 390 and desktop</h3>'
        + frames(frame("P-W2 · expiring · 390 · full length", ph_fr(soon, tabs=tabbar("none")), "The line, not the colour, carries it."),
                 frame("P-W2 · expiring · desktop · full length", desk(soon, h=None), "", width=1300)) + '</div>'
        + '<div class="sec"><h3>Also bought, and payments off · 390</h3>'
        + frames(frame("P-W3 · a pack bought · 390 · full length", ph_fr(bought, tabs=tabbar("none")), "Welcome sits between Free and Packs. The pack’s history row is the only purchase; the grant is not a purchase and has no row."),
                 frame("P-W4 · payments off · 390 · full length", ph_fr(off, tabs=tabbar("none")), "The reduced page (O-forms): no offers, no buying anywhere. The Welcome cell stays: the lot still spends."),
                 frame("P-W4 · payments off · desktop · full length", desk(off, h=None), "", width=1300)) + '</div>'
    )
    return doc("Welcome credits R1 · credits page", body, 2400, 6000)


# ================================================================ States
SIDE_H = 520


def side(ch, line_html, bal_html):
    items = [frame("chip · 390", menu_sheet2(ch, h=SIDE_H), "")]
    if line_html:
        items.append(frame("credit line · 390", line_html, ""))
    if bal_html:
        items.append(frame("/credits balance · 390", f'<div class="cropped" style="width:390px"><div class="pg">{bal_html}</div></div>', ""))
    return '<div style="display:flex;flex-direction:column;gap:30px">' + "".join(items) + '</div>'


def state_row(key, title, trig, cap, sec_ph, sec_dk, side_html):
    return (f'<div class="sec"><div class="rowh">{tag(key)}<h3 style="margin:0;font:700 19px \'Chakra Petch\',sans-serif">{title}</h3></div>'
            f'<p class="cap" style="max-width:2100px"><code>{trig}</code> · {cap}</p>'
            + frames(frame(f"{key} · first-run Home · 390 · full length", ph_fr(first_run(sec_ph)), ""),
                     frame(f"{key} · desktop · full length", dk_fr(first_run(sec_dk, desk_=True)), "", width=1300),
                     side_html) + '</div>')


def states_a():
    rows = [
        state_row("Held, unused", "The section, whole", "lot exists, not expired, welcome === 15",
                  "The five tools, the grant line with its date, the free line, the teaser.",
                  section(), section(desk_=True),
                  side(chip("credits", 16), line_ph(L["withWelcome"]), bal_w())),
        state_row("Partly spent", "The count left", "not expired, 0 < welcome < 15",
                  "The diamond and the grant line carry what is left: <code>9 of your 15 welcome credits are left</code>.",
                  section(left=9), section(left=9, desk_=True),
                  side(chip("credits", 9), line_ph(L["welcomeNextPart"]), bal_w(free=(0, 1), welcome=9))),
        state_row("Used up", "Says so, keeps the teaser", "lot exists, not expired, welcome === 0",
                  "The diamond dims to 0 and the grant line says so; the rows stay (the free credit still runs them) and so does the teaser. The section leaves on Nov 20 or on ✕. The Welcome cell is gone (it shows only while it holds a credit); the chip is the never-bought one.",
                  section("usedUp"), section("usedUp", desk_=True),
                  side(chip("free", 1), line_ph(L["standing"]), bal_w(welcome=0))),
    ]
    body = (board_head("Welcome credits R1 · item 6 · every state (1 of 4)", "Held, partly spent, used up",
                       "Each row: the first-run Home at 390 and desktop, full length, then the chip, the credit line and the <code>/credits</code> balance in the same state.")
            + "".join(rows))
    return doc("Welcome credits R1 · states A", body, 2300, 7000)


def states_b():
    rows = [
        state_row("Expiring", "3 days out, in --warning", "not expired, welcome > 0, expiry within 3 days",
                  "The border and the grant line turn <code>--warning</code> and the line says it: <code>9 welcome credits expire in 3 days, on November 20.</code> The chip, the line’s tail and the Welcome cell turn with it. Never <code>--danger</code>.",
                  section("expiring", left=9), section("expiring", left=9, desk_=True),
                  side(chip("expiring", 10, line=L["expiring"]), line_ph(L["welcomeNextPart"], warn=L["expiring"]), bal_w(welcome=9, warn=True))),
        state_row("Expired", "Nothing", "lot exists, expiresAt <= now",
                  "Called: nothing, not a last line. The section, the Welcome cell and the line’s segment are gone; the chip is the never-bought one. A last line would nag, and the free credit carries on.",
                  "", "",
                  side(chip("free", 1), line_ph(L["standing"]), bal_w(welcome=0))),
        state_row("No lot", "Nothing new anywhere", "no welcome row (switch off at sign-up, older than 30 days, a missed webhook)",
                  "As shipped today. No fallback grant (ruled).",
                  "", "",
                  side(chip("free", 1), line_ph(L["standing"]), None)),
    ]
    body = (board_head("Welcome credits R1 · item 6 · every state (2 of 4)", "Expiring, expired, no lot", "") + "".join(rows))
    return doc("Welcome credits R1 · states B", body, 2300, 6000)


def states_c():
    rows = [
        state_row("Switch off, lot held", "Draws as held", "welcomeCreditsEnabled false, lot exists",
                  "Called: the section still draws. The switch gates the write only and the lot still spends, so its facts are true; hiding them would leave credits no screen names, the problem this brief exists to fix. With payments on, the teaser stays.",
                  section(left=12), section(left=12, desk_=True),
                  side(chip("credits", 13), line_ph(L["welcomeNext"].replace("15", "12")), bal_w(welcome=12))),
        state_row("Payments off, lot held", "The facts, no teaser", "paymentsEnabled false, welcome > 0",
                  "The section without its teaser: absent, not disabled. No Get more credits anywhere; <code>/credits</code> stays reachable, reduced, with the Welcome cell.",
                  section(left=12, teaser=False), section(left=12, teaser=False, desk_=True),
                  side(chip("credits", 13), line_ph(L["welcomeNext"].replace("15", "12")), bal_w(welcome=12))),
    ]
    body = (board_head("Welcome credits R1 · item 6 · every state (3 of 4)", "Switch off, payments off", "") + "".join(rows))
    return doc("Welcome credits R1 · states C", body, 2300, 4600)


def states_d():
    rows = [
        state_row("Paid limit reached", "The line’s limit form; the section adds nothing", "paidAtLimit true",
                  "Only reachable once something is bought (15 welcome runs can’t reach 20), so the teaser is already gone. The section is unchanged; the press disables and the line says what is banked, welcome included. Drawn on the first-run Home: Help me choose needs no deck.",
                  section(left=9, teaser=False), section(left=9, teaser=False, desk_=True),
                  side(chip("credits", 30), line_ph(L["limit"], spent=True), bal_w(free=(0, 1), welcome=9, packs=21, today=True))),
        state_row("Also bought", "The teaser goes", "everBought true",
                  "Called: the teaser leaves once anything is bought. The player has found <code>/credits</code>; the line has done its job. The rest stays until the date or ✕.",
                  section(left=15, teaser=False), section(left=15, teaser=False, desk_=True),
                  side(chip("credits", 56), line_ph("1 of 1 free · 15 welcome · 40 paid"), bal_w(welcome=15, packs=40))),
    ]
    body = (board_head("Welcome credits R1 · item 6 · every state (4 of 4)", "Paid limit, also bought", "") + "".join(rows))
    return doc("Welcome credits R1 · states D", body, 2300, 4600)


# ================================================================ Themes
def themes_board():
    secs = []
    for key, name, disp, toks in [t for t in THEMES if t[0] in ("amonkhet", "kaldheim")]:
        sw = "".join(f'<i style="background:{toks[k]}"></i>' for k in ["bg", "surface", "elevated", "accent", "fg"])
        chip_sheet = menu_sheet2(chip("expiring", 10, line=L["expiring"]), h=SIDE_H).replace('<span class="on">Kamigawa</span>', '<span class="">Kamigawa</span>')
        if key == "amonkhet":
            chip_sheet = chip_sheet.replace('<span class="">Amonkhet</span>', '<span class="on">Amonkhet</span>')
        else:
            chip_sheet = chip_sheet.replace('<span class="">Kaldheim</span>', '<span class="on">Kaldheim</span>')
        sidecol = ('<div style="display:flex;flex-direction:column;gap:30px">'
                   + frame("chip, expiring · 390", chip_sheet, "")
                   + frame("credit line, expiring · 390", line_ph(L["welcomeNextPart"], warn=L["expiring"]), "")
                   + frame("Welcome cell, expiring · 390", f'<div class="cropped" style="width:390px"><div class="pg">{bal_w(welcome=9, warn=True)}</div></div>', "")
                   + '</div>')
        secs.append(f'<div class="sec th th-{key}"><div class="th-head"><b>{name}</b><span class="th-sw">{sw}</span>'
                    f'<span class="k">display face {disp.split(",")[0]}</span></div>'
                    + frames(frame("held · first-run Home · 390 · full length", ph_fr(first_run(section())), ""),
                             frame("expiring · desktop · full length", dk_fr(first_run(section("expiring", left=9, desk_=True), desk_=True)), "", width=1300),
                             sidecol, gap=36) + '</div>')
    body = (board_head("Welcome credits R1 · themes", "Low Sun and First Frost",
                       "The section, the chip, the line and the Welcome cell in Low Sun (Amonkhet, the default) and First Frost (Kaldheim), from each theme’s shipped tokens and display face. "
                       "In Low Sun <code>--warning</code> and the accent are close in hue, so the expiring state is carried by its words: the grant line, the chip’s line, the cell’s line.")
            + "".join(secs))
    return doc("Welcome credits R1 · themes", body, 2300, 4600)


BOARDS = {
    "Main": main_board, "Placement": placement_board, "Section": section_board, "Line-and-Chip": line_board,
    "Credits-Page": credits_board, "States-A": states_a, "States-B": states_b, "States-C": states_c, "States-D": states_d,
    "Themes": themes_board,
}

if __name__ == "__main__":
    only = sys.argv[1:]
    for n, f in BOARDS.items():
        if only and n not in only:
            continue
        open(f"out/{n}.dc.html", "w").write(f())
        print("wrote", n)
