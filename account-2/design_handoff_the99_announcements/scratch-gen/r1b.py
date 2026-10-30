"""Wizards announcements R1b: Hugh's three notes (2026-10-29): Settings' boxes, the precons `new` mark, the link-out icon."""
import kit
import ann as A
import pre as R
from kit import doc, board_head, frame, frames
from annb import note, col

OLD = "&#8599;"   # the old glyph, kept as an entity so build.py's swap leaves it


def page(inner):
    return f'<div class="stp"><h1>Settings</h1><p class="sub">Saved as you change them</p>{inner}</div>'


def sphone(inner):
    return kit.phone(page(inner), None, badges={"Home": 3})


def with_layout(v, fn):
    old = A.LAYOUT["v"]
    A.LAYOUT["v"] = v
    try:
        return fn()
    finally:
        A.LAYOUT["v"] = old


# ================================================================ 9 · Settings: the boxes say what they are
def settings_board():
    a1 = sphone(A.news())
    a2 = sphone(A.news(home=("secret-lair", "commander-decklists", "spare-request"), push=("secret-lair", "spare-request")))
    a3 = sphone(A.news(state="cant"))
    ad = kit.desk(page(A.news(where="browser")), None, badges={"Home": 3})
    sh = with_layout("shipped", lambda: sphone(A.news()))
    b = with_layout("chips", lambda: sphone(A.news()))
    c = with_layout("split", lambda: sphone(A.news()))
    body = (board_head("Settings › Notifications · 390 and 1300",
                       "Two labelled columns, In app and Push, both on the right",
                       "Hugh: the boxes bookending each row don’t say what they are, the in-app one least of all. <b>A (recommended)</b>: the section is "
                       "<b>Notifications</b>; each kind’s name and line run full width on the left, and its two boxes sit side by side on the right under "
                       "column heads <b>In app</b> and <b>Push</b>, the standard notification grid. The device row (<i>Push on this phone</i>) leaves the list for "
                       "its own sunken band above the heads: it is about this device, not a kind. Same shipped 18px <code>Checkbox</code>, each cell its own 44px press; "
                       "the row’s text no longer toggles anything, so no press is ambiguous. Words are drafts for /copy-review.", tag="R1b")
            + frames(frame("<b>A · columns</b> · 390 · all on", a1,
                           "The default: the three Wizards kinds and Friends asking for your spares ticked in both columns."),
                     frame("<b>A · columns</b> · 390 · mixed", a2,
                           "Other Wizards news off in both; Commander decklists in app only. Each box reads against its head."),
                     frame("<b>A · columns</b> · 390 · push unavailable", a3,
                           "The Push column and its head leave; <b>In app</b> keeps its head, so the lone box still says what it is."),
                     frame("<b>Today</b> · 390 · for comparison", sh,
                           "The shipped section: an unlabelled box on the left, Push’s on the right, the device row mixed into the kinds."), gap=36)
            + frames(frame("<b>A · columns</b> · 1300 · this browser", ad, "The 720 column: the heads sit over the boxes at the column’s right edge."),
                     frame("<b>B · labelled chips</b> · 390", b,
                           "Each row gets two chips, <i>In app</i> and <i>Push</i>, under its line. Self-explaining, but nine rows of chips is busy and every row grows."),
                     frame("<b>C · two lists</b> · 390", c,
                           "<i>In the app</i>, then <i>Push</i>, each a full list. Clear, but every kind is listed twice and the page doubles."), gap=36))
    return doc("Settings R1b", body, 1300 + 390 * 2 + 36 * 2 + 112)


# ================================================================ 10 · The new mark
def block(v, rows=False, desk=False):
    old = dict(R.MARK)
    R.MARK.update(new=v, early="tag" if v == "tag" else "text")
    try:
        if desk:
            return kit.desk(R.list_page(True), "Decks")
        inner = R.rows_view_set() if rows else R.set_block(desk)
        h = R.announced(desk, inner)
    finally:
        R.MARK.update(old)
    w = 390
    return f'<div class="ph d4n" style="display:block;width:{w}px;height:auto;padding:0 16px 14px;border-radius:16px">{h}</div>'


def mark_board():
    body = (board_head("Precons › Announced · the new mark",
                       "<i>new</i> joins the line it belongs to",
                       "Hugh: the boxed <code>new</code> tag floats, shoved beside the set’s name and its <i>in 15 days</i>. <b>A (recommended)</b>: no box. "
                       "<i>new</i> leads the set’s mono meta line in accent ink (<i>new · Nov 13, 2026 · in 15 days</i>), the same words and place the precon tiles already "
                       "use (<i>new · you own 20 of 68</i>); the group head reads <i>1 set · new</i>. The early list mark follows: <i>early list</i> as plain "
                       "<code>--fact</code> words on the tile’s sub-line, no box, and the early page’s eyebrow says it once. This changes the shipped "
                       "<code>NEW_TAG</code> in three places (<code>announced-group</code>, <code>announced-parts</code>, <code>announced-row</code>).", tag="R1b")
            + frames(frame("<b>A · in the line</b> · 390 · tiles", block("text"), "The name stands alone; <i>new</i> is the first word of the line under it."),
                     frame("<b>A · in the line</b> · 390 · rows view", block("text", rows=True),
                           "The row’s third line leads with <i>new</i>; <i>in 15 days</i> stays alone at the right."),
                     frame("<b>B · Home’s diamond</b> · 390 · tiles", block("dot"),
                           "The unseen diamond the Home rows use, before the name. Quiet, but a new reader has to learn it, and Precons has never used it."),
                     frame("<b>Today</b> · 390 · rows view", block("tag", rows=True), "The shipped tag, for comparison."), gap=36)
            + frames(frame("<b>A · in the line</b> · 1300", block("text", desk=True), "One meta line on desktop: <i>new · FDC · Nov 13, 2026 · in 15 days · 3 of 5 lists so far</i>.")))
    return doc("New mark R1b", body, 390 * 4 + 36 * 3 + 112)


# ================================================================ 11 · The link-out icon
def pair(label, text, cls="lnk", size=14):
    st = f"font-size:{size}px"
    return (f'<tr><td>{label}</td><td><span class="{cls}" style="{st}">{text}&nbsp;{OLD}</span></td>'
            f'<td><span class="{cls}" style="{st}">{text}&nbsp;↗</span></td></tr>')


def icon_board():
    big = ('<div style="display:flex;gap:40px;align-items:flex-end;padding:8px 4px 4px">'
           f'<div style="text-align:center"><div style="font-size:64px;line-height:1;color:var(--fg-body)">{OLD}</div><p class="cap">today · the {OLD} glyph</p></div>'
           '<div style="text-align:center"><div style="font-size:64px;line-height:1;color:var(--fg-body)">↗</div><p class="cap">R1b · box and arrow</p></div></div>')
    rows = (pair("Home row, outbound press", "Read on Wizards")
            + pair("Decklists row, the muted press", '<span style="color:var(--fg-muted)">Read the post</span>')
            + pair("Price drop press", "Buy at Mana Pool")
            + pair("<code>ExternalLink</code>, card page", '<span style="color:var(--accent-hover,#E09A5A);text-decoration:underline;text-underline-offset:3px">More on Scryfall</span>')
            + pair("Credits history, 12.5px", '<span style="color:var(--fg-body)">Receipt</span>', size=12.5)
            + pair("Fan Content notice, 11px", '<span style="color:var(--fg-faint)">Fan Content Policy</span>', size=11))
    table = f'<div class="note" style="width:760px;flex:none"><table class="tbl"><tr><th>Where</th><th>Today</th><th>R1b</th></tr>{rows}</table></div>'
    spec = note("The icon",
                "<ul><li>The standard <b>external link</b> mark: an open box with an arrow leaving its corner, as Hugh sent. "
                "24-unit grid, round caps and joins, stroke 2.4 so it holds at 11px.</li>"
                "<li><b>Smaller than the glyph</b>: 0.72em square (10px beside 14px text), sitting on the baseline, 0.3em after the word, bound to it so it never wraps alone.</li>"
                "<li>Colour unchanged: whatever the glyph uses today (<code>--fg-muted</code> in <code>ExternalLink</code>, the press’s own ink in the feed).</li>"
                "<li>Every board in this canvas now draws it.</li></ul>", w=520)
    build = note("App-wide, for engineering",
                 f"<ul><li>One <code>LinkOutIcon</code> in <code>src/components/ui/</code>, <code>aria-hidden</code>; the spoken <i>(opens in a new tab)</i> stays.</li>"
                 f"<li>About 30 places draw {OLD} today, some inside copy strings (<code>deck-analysis</code> source, <code>decks-builder</code> detailHint, "
                 "<code>mana-balance</code> buyLink, the brackets sheet): the glyph leaves the copy and the component draws the icon.</li>"
                 "<li>Not a switch: purely visual, no regression path.</li></ul>", w=520)
    body = (board_head("The link-out icon, app-wide",
                       "A smaller, standard box-and-arrow for every link that leaves the app",
                       f"Hugh: the {OLD} we use is too large; the box-and-arrow mark is more standard. It replaces the glyph everywhere a press opens another site, "
                       "drawn smaller than the text beside it.", tag="R1b")
            + frames(frame("<b>Side by side</b>", big), frame("<b>In place</b>", table), gap=36)
            + frames(spec, build, gap=24))
    return doc("Link icon R1b", body, 1500)


BOARDS = [("R1b-Settings", settings_board, "R1b · 9 · Settings: In app and Push columns"),
          ("R1b-New-Mark", mark_board, "R1b · 10 · Precons: the new mark"),
          ("R1b-Link-Icon", icon_board, "R1b · 11 · The link-out icon")]
