"""Small items 6, item 6 (account 2, 2026-10-30): What's new with every kind off, over the announcements kit.

Shipped (#2419, whats-new.tsx + feed/home.ts): with no kind on, `loadHomeFeed` returns `{chosen:false, on:[]}` whatever the
reader saved, so the offer line stands alone; its ✕ hides it for the visit and the box reads "Nothing new right now."
alone; the next visit draws the offer again.
"""
import kit
import ann as A
from kit import doc, board_head, frame, frames
from annb import note, col

kit.CSS += r"""
.ofr.alone{border-top:0}
.fq.off p{color:var(--fg-body)}
.vlab{font:500 10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);padding:0 0 2px}
.seq{display:flex;gap:36px;align-items:flex-start}
.ofr.stk{display:block;position:relative;min-height:72px;padding:12px 64px 12px 14px}
.ofr.stk p{padding:0}
.ofr.stk .x4{position:absolute;top:-4px;right:0;margin:0}
.dk .ofr.stk{min-height:64px;padding-right:72px}
.dk .ofr.stk .x4{top:4px;right:4px}
.ofr.stk .pk{position:absolute;right:12px;bottom:10px;white-space:nowrap;margin:0}
.arrowc{align-self:center;font:400 22px 'IBM Plex Sans';color:var(--fg-faint)}
"""

def offer_stk(alone=False, chg=True):
    return (f'<div class="ofr stk{" alone" if alone else ""}{" chg" if chg else ""}"><p><b>Pick what else you want to hear about.</b> New sets, price drops, trade matches and more.</p>'
            f'{A.X}<span class="pk">Pick ▾</span></div>')


QUIET_NAMES = A.quiet("Secret Lair drops, Commander decklists, Wizards news and friends asking for your spares")
QUIET_LEAD = '<div class="fq"><p><b>Nothing new right now.</b></p></div>'
OFF_LINE = '<div class="fq off chg"><p><b>Nothing will show here.</b> Every kind of news is off.</p></div>'


def ph(feed_html):
    return A.ph(A.home(False, "", feed_html))


def dk(feed_html, h=560):
    return A.dk(A.home(True, "", feed_html), h=h)


def board_off():
    t1 = ph(A.feed([], foot=offer_stk(alone=True, chg=False), choose=False))
    t2 = ph(A.feed([], foot=QUIET_LEAD, choose=False))
    b2 = ph(A.feed([], foot=OFF_LINE, choose=True).replace('<span class="r">', '<span class="r chg" style="padding:2px 4px">', 1))
    d1 = dk(A.feed([], foot=offer_stk(alone=True, chg=False), choose=False))
    d2 = dk(A.feed([], foot=OFF_LINE, choose=True).replace('<span class="r">', '<span class="r chg" style="padding:2px 4px">', 1))
    calls = col(
        note("Who sees every kind off",
             "<b>1 · Never chose, nothing on by default.</b> The four default kinds are dark for this reader (announcements off, Friends off), so nothing is on. "
             "The offer line is right here, as shipped.<br><b>2 · Turned everything off in Settings.</b> That reader <i>has</i> chosen, but today the offer still stands "
             "(<code>loadHomeFeed</code> returns the offer whenever <code>on</code> is empty, before it asks <code>neverChose</code>), so a player who said no to all of it is asked again every visit."),
        note("Call: the ✕ sticks",
             "The ✕ saves an empty choice, as it does with kinds on. From then on, and for reader 2 from the start, the box says why it is empty in one line and the head gets "
             "<b>Choose what shows ›</b>, the way back drawn wherever a reader has chosen. Settings › Notifications stays the other way back. "
             "Nothing comes back by itself: the player made a choice and we keep it (your rule: give the player a choice, never lock them in; the link keeps the door open)."),
        note("Engineering",
             "<code>loadHomeFeed</code>: with <code>on</code> empty, return the offer only while <code>neverChose(prefs)</code>; otherwise <code>{chosen:true, items:[], on:[]}</code>. "
             "<code>Quiet</code> with no kind on draws the off line (new string, draft for copy review: <i>Nothing will show here. Every kind of news is off.</i>). "
             "<code>closeAria</code> can go back to saying it sticks. Migration none: <code>feed_offer_closed_at</code> already records the ✕."),
        note("Alternative: confirm shipped",
             "The offer returns each visit (✕ lasts one visit) and the box reads <i>Nothing new right now.</i> alone after it. Drawn on the left for comparison. "
             "If you keep it, reader 2 still sees the offer each visit; I’d at least gate it on <code>neverChose</code>."),
        w=420)
    body = (board_head("item 6 · Home › What’s new · every kind off · 390 and 1300",
                       "With every kind off, the ✕ sticks",
                       "<b>Call: the ✕ saves an empty choice and sticks.</b> After it, What’s new keeps its head with <b>Choose what shows ›</b> and one line that says why the box is empty. "
                       "A reader who turned every kind off in Settings gets the same box straight away, never the offer. Dashed orange outlines mark what changes against what shipped (#2419). "
                       "Strings are drafts for copy review.", tag="R1")
            + '<div class="seq">'
            + frame("<b>Today</b> · 390 · every kind off", t1, "The offer line alone, every visit (stacked, as on 6b).")
            + '<span class="arrowc">→ ✕</span>'
            + frame("<b>Today</b> · 390 · after the ✕", t2, "<i>Nothing new right now.</i> alone. The offer returns next visit.")
            + frame("<b>Drawn</b> · 390 · after the ✕, and every visit after", b2,
                    "One line says why the box is empty; the head’s link is the way back. Reader 2 sees this from the start.")
            + calls + '</div>'
            + frames(frame("<b>Today</b> · 1300 · every kind off", d1, ""))
            + frames(frame("<b>Drawn</b> · 1300 · after the ✕", d2, "The head’s link sits where it sits for any reader who has chosen.")))
    return doc("Every kind off", body, 390 * 3 + 36 * 4 + 40 + 420 + 112)


def board_stack():
    rows = [A.irow("price"), A.irow("match")]
    p_rows = ph(A.feed(rows, n=2, foot=offer_stk(), choose=False))
    p_quiet = ph(A.feed([], foot=QUIET_NAMES + offer_stk(), choose=False))
    p_alone = ph(A.feed([], foot=offer_stk(alone=True), choose=False))
    d_rows = dk(A.feed(rows, n=2, foot=offer_stk(), choose=False), h=640)
    body = (board_head("item 6b · Home › What’s new · the offer line, stacked · 390 and 1300",
                       "✕ in the top corner, Pick ▾ in the bottom corner",
                       "Your note: Pick ▾ and ✕ side by side read as two buttons for one thing. <b>Drawn (R1d, keeping the line’s narrow height): the ✕ moves to the top right corner and Pick ▾ to the bottom right, level with the words’ last line</b>, "
                       "where the opened offer already puts it (Pick pressed: ✕ top right over the boxes), so the line and its opened form now share one ✕ position. "
                       "Same in every place the offer stands: under rows, under the quiet line, alone. Rows keep their shipped action line (press, then ✕), since there the ✕ belongs to one row. "
                       "Engineering: <code>Offer</code>’s closed form becomes a two-column grid: the words span both rows on the left; the shipped <code>DismissButton</code> top right (44 on a phone / 32 from md) and Pick ▾ bottom right, end-aligned. Pick ▾ sits in the corner below the ✕’s hit box, so the box stays as tall as the words (min 72 on a phone, 64 from md). "
                       "Amends the announcements Offer board and small items 5’s Offer-Empty.", tag="R1d")
            + '<div class="seq">'
            + frame("<b>Drawn</b> · 390 · under rows", p_rows, "✕ top right, Pick ▾ bottom right; the box stays as tall as the words.")
            + frame("<b>Drawn</b> · 390 · under the quiet line", p_quiet)
            + frame("<b>Drawn</b> · 390 · alone (nothing on yet)", p_alone)
            + '</div>'
            + frames(frame("<b>Drawn</b> · 1300 · under rows", d_rows, "On desktop the words fit one line or two; the ✕ at 32.")))
    return doc("Offer stacked", body, 1412)


BOARDS = [("Offer-Stacked", board_stack, "6b · The offer line, stacked"), ("Every-Kind-Off", board_off, "6 · What’s new with every kind off")]
