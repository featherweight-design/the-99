"""About addendum, friend decks, and calls on what shipped: the boards. Each returns a whole .dc.html."""
import kit
import parts as P
import sr as S
import fdk as F
from kit import doc, board_head, frame, frames, phone, desk, img

BADGE = {"Home": 2, "Friends": 1}


def ph(inner, active=None, h=None, over="", badges=BADGE):
    return phone(inner, active, h=h, badges=badges, over=over or "")


def dk(inner, active=None, h=None, over="", badges=BADGE):
    return desk(inner, active, badges=badges, over=over, h=h)


def note(t, b):
    return f'<div class="note"><h4>{t}</h4>{b}</div>'


def sec(title, cap, body):
    return f'<div class="sec2"><h3>{title}</h3>' + (f'<p class="sp">{cap}</p>' if cap else "") + body + "</div>"


kit.CSS += r"""
.vd{display:inline-block;font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.08em;border-radius:4px;padding:2px 7px;margin-right:8px;vertical-align:1px}
.vd.ok{background:var(--success);color:#14110E}
.vd.rd{background:var(--accent);color:#14110E}
.vd.fx{background:#8FA6BE;color:#14110E}
.calls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;max-width:1500px}
.calls .note p{margin:0 0 7px;font-size:13px;line-height:1.6;color:var(--fg-body)}
.calls .note p b{color:var(--fg)}
.strike{text-decoration:line-through;color:var(--fg-faint)}
/* Jaws: the band with no clean crop */
.dtl .band .grad{position:absolute;inset:0}
.dtl .band .jc{position:absolute;z-index:1;top:16px;right:16px;height:150px;aspect-ratio:63/88;border-radius:7px;transform:rotate(4deg);box-shadow:0 10px 26px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.35);object-fit:cover}
.dtl .band.ow .jc{right:46px}
.dtl.n .band .jc{top:12px;right:12px;height:100px;border-radius:5px}
.dtl .band.cardb::after{background:linear-gradient(180deg,rgba(20,17,14,0) 60%,rgba(20,17,14,.6) 80%,rgba(20,17,14,.92) 96%)}
.bad{position:absolute;z-index:6;font:600 9.5px 'IBM Plex Mono';letter-spacing:.06em;color:#14110E;background:#C6533F;border-radius:4px;padding:2px 6px}
.order{counter-reset:o;display:flex;flex-direction:column;gap:10px;margin:0;padding:0;list-style:none;max-width:1240px}
.order li{counter-increment:o;display:grid;grid-template-columns:30px minmax(0,1fr);gap:12px;font-size:13.5px;line-height:1.6;color:var(--fg-body)}
.order li::before{content:counter(o);width:26px;height:26px;border-radius:7px;background:var(--elevated);border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font:600 12px 'IBM Plex Mono';color:var(--fg)}
.order li b{color:var(--fg)}
/* spare accepted mark, per theme */
.swg{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px;max-width:1240px}
.swc{display:flex;flex-direction:column;gap:10px;align-items:flex-start;padding:14px;border-radius:10px;border:1px solid var(--border)}
.swc .row1{display:flex;align-items:center;gap:18px}
.amk{position:relative;display:inline-flex;color:var(--success)}
.amk .dot{position:absolute;bottom:-1px;right:-4px;width:8px;height:8px;border-radius:50%;background:var(--success);box-shadow:0 0 0 1.5px var(--bg)}
.amk .tk{position:absolute;bottom:2px;right:-1.5px;z-index:1;width:3.5px;height:2px;transform:rotate(-45deg);border-bottom:1.3px solid var(--bg);border-left:1.3px solid var(--bg)}
.x4b{width:76px;height:76px;flex:none}
.amk.x4{transform:scale(4);transform-origin:0 0}
.swc small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.mdl .tip.up{top:auto;bottom:calc(100% + 8px)}
.fsx2 .h .lft{position:relative}
.dif{font-size:12.5px}
"""


# ============================================================================ Main
CALLS = [
    ("1 · About entry for friend decks", "rd", "DRAWN",
     "<p>One entry, <code>friend-decks</code>, <b>Your friends’ decks</b>, on Friends, chapter 04, following <code>FRIEND_DECKS_ENABLED</code>, <code>since: 16</code> (switched, no bump). It covers the four things in one caption: a friend’s deck opens read-only (with your own dots), "
     "Settings › Your decks (both boxes, by their shipped names), Hidden from friends in the ⋯ menu, and the game log’s “A deck not listed”. The halo is the /friends privacy line, <code>[data-decks-seen]</code>. Board E1.</p>"
     "<p>Two shipped entries get a switched key each (no bump): <code>friends</code> key 2 stops saying friends never see what you own, and <code>opponents</code> key 3 names hiding beside renaming.</p>"),
    ("2 · Jaws’ tile: cut the shark out of the poster", "rd", "R2 · PICK ONE",
     "<p>R1’s card on a gradient is gone. A printing whose art carries the card’s words gets a <b>crop box set on its full card image</b>; one with no box yet draws the gradient, never the words.</p>"
     "<p>For Jaws, two boxes from the real card avoid every word: <b>1 · the swimmer and the shark</b> (recommended) and <b>2 · the jaws</b>. Board Jaws-Tile.</p>"),
    ("3 · Spare requests (#2221, #2230)", "ok", "RATIFIED",
     "<p><b>Tick in <code>var(--bg)</code>:</b> all six themes are dark, so it is a dark tick on green in each, as the board drew it (no theme draws it light). <b>Tooltip upward:</b> right for a 640 modal. <b>The 11 shared-component differences:</b> the shipped view switch, key items and buy tag win; the board’s were drift in Design’s kit. <b>Declined inside the cooldown</b> over Ask instead: right, since Ask instead would be refused. Board Calls.</p>"),
    ("4 · Push landings and seen (#2219, D4)", "ok", "RATIFIED",
     "<p>Seen is a cursor, so only Home and /friends move it; a set, precon or friend-page landing marks nothing, and Opening Home closes every delivered notification. Ratified. The push handoff’s call 5, G5 and its About key 3 said a tap marks the item seen: corrected here (board Calls).</p>"),
    ("5 · Stale lines on Design’s boards", "fx", "FIXED",
     "<p><b>“Your last upload added X”</b> on four menu and Home boards now reads the shipped <b>“You added X.”</b> (edited in place in the handoff, text only). <b>The friendPillStyle line</b> in the menu and Home About README now says the pill draws only with <code>FRIEND_DECKS_ENABLED</code> off; with it on, a friend’s tile shows the card count alone (#2220).</p>"),
    ("6 · Inventory notes from the menu and Home walk", "ok", "RATIFIED",
     "<p><b>Sign-in marks the feed seen:</b> right; it is the Home visit after sign-in, which draws the lead first and moves the cursor after. <b>The first-run tour covers the opt-in row on a phone:</b> fine; the tour comes first and the opt-in stays on Home until it is answered. "
     "<b>Friend inventories name friends a fresh fork hasn’t linked:</b> a tooling note; seed first (<code>scripts/seed-r2-friend-fixture.mts</code>). No design change.</p>"),
]


def main_board():
    calls = "".join(f'<div class="note"><h4><span class="vd {k}">{v}</span>{t}</h4>{b}</div>' for t, k, v, b in CALLS)
    idx = ("<ul><li><b>E1-Friend-Decks</b>: the entry in the Reference at 1300 and 390, its picture in six themes, line switches, gaps.</li>"
           "<li><b>Jaws-Tile</b>: call 2 (R2), two crops cut from the real Jaws card, and the rule for full-art and borderless printings.</li>"
           "<li><b>Calls</b>: calls 3 to 6, with the accepted mark in six themes, the tooltip in the 640 modal, and the string fixes.</li></ul>")
    edits = ('<table class="tbl"><tr><th>Entry</th><th>Today</th><th>With <code>FRIEND_DECKS_ENABLED</code> on</th></tr>'
             '<tr><td><code>friends</code> key 2</td><td>Friends see your name and your commander, never what you own. Your spares show only to the pods you share them with.</td>'
             '<td><b>Friends see your name, your commander and the decks you let them open, never your collection.</b> Your spares show only to the pods you share them with.</td></tr>'
             '<tr><td><code>opponents</code> key 3</td><td>A seat keeps names and decks as they were that night, even if a friend renames a deck or leaves.</td>'
             '<td>A seat keeps names and decks as they were that night, even if a friend <b>renames or hides a deck</b>, or leaves.</td></tr>'
             '<tr><td><code>push</code> key 3 (push handoff, unbuilt)</td><td>A tap opens what it’s about and marks it seen on Home.</td><td><b>A tap opens what it’s about. Opening Home marks your news seen.</b> Not tied to this switch: a plain edit to the push handoff before it is built (call 4).</td></tr></table>'
             '<p style="margin-top:10px;font-size:12.5px;color:var(--fg-muted)">The first two are each a <code>keySwitches</code> pair (<code>!FRIEND_DECKS_ENABLED</code> / <code>FRIEND_DECKS_ENABLED</code>), as #2228 did for <code>whats-new</code>. Ordinary edits, no bump.</p>')
    body = (board_head("About addendum · friend decks · and calls on what shipped", "One entry for friend decks, and six calls on what engineering built",
                       "Addendum to <code>design_handoff_the99_friend_decks</code> (#2203, READINESS G6 deferred the entry here) and the shipped lines of spare requests (#2221, #2230), push (#2219) and menu and Home. "
                       "Checked against main at <code>6560671</code>. The feature stays off in production until this entry ships. Every string is a placeholder for <code>/copy-review</code>.")
            + f'<div class="calls">{calls}</div>'
            + '<div class="notes" style="grid-template-columns:2fr 1fr;max-width:1500px">'
            + note("Edits to shipped entries", edits) + note("The boards", idx) + "</div>")
    return doc("About · friend decks addendum", body, 1612)


# ============================================================================ Jaws
JAWS = ("Jaws, Relentless Predator", "Jaws, Relentless Predator", "jaws-rising.jpg", "Complete", 99, 0, "U")
GRAD_U = "linear-gradient(150deg, #6a9bcb, #305c88 58%, #1c3a57)"   # commanderGradient(['U']), src/lib/cards/gradients.ts
# Crop boxes as fractions of SLD 2175's full card image (Hugh's upload, the card at 758x1032).
BOX = {"rising": (0.008, 0.234, 0.654, 0.551), "face": (0.212, 0.460, 0.767, 0.731)}


def jtile(mode, narrow=False, owner=False):
    """mode: shipped (the printing's own crop, text and all) | grad (no crop: the shipped null branch) | rising | face"""
    t = F.deck_tile(JAWS, narrow=narrow, owner=owner)
    art = f'<img class="art" src="{img("jaws-rising.jpg")}" alt="">'
    if mode == "shipped":
        return t.replace(art, f'<img class="art" src="{img("jaws-card.jpg")}" alt="" style="object-position:center 28%">', 1)
    if mode == "grad":
        return t.replace(art, f'<div class="grad" style="background:{GRAD_U}"></div>', 1)
    if mode == "face":
        return t.replace(art, f'<img class="art" src="{img("jaws-face.jpg")}" alt="" style="object-position:center 40%">', 1)
    return t.replace(art, f'<img class="art" src="{img("jaws-rising.jpg")}" alt="" style="object-position:center 35%">', 1)


def ftab(tiles, desk_=False):
    return (F.friend_head("decks", desk_, {"spares": 6, "wish": 12, "decks": 4}) + '<p class="gl">Newest first. Open one to see its list.</p>'
            f'<div class="dts" style="margin-top:12px">{tiles}</div></div>')


def jaws_board():
    sai = F.deck_tile(F.COLIN[0])
    p0 = ph(ftab(f'<div style="position:relative"><span class="bad" style="right:10px;top:10px">card text in the band</span>{jtile("shipped")}</div>' + sai), "Friends", h=844)
    p1 = ph(ftab(jtile("rising") + sai), "Friends", h=844)
    p2 = ph(ftab(jtile("face") + sai), "Friends", h=844)
    pa = ph(ftab(jtile("grad") + sai), "Friends", h=844)
    d1 = dk(ftab(jtile("rising") + F.deck_tile(F.COLIN[0]) + F.deck_tile(F.COLIN[2]), True), "Friends")
    d2 = dk(ftab(jtile("face") + F.deck_tile(F.COLIN[0]) + F.deck_tile(F.COLIN[2]), True), "Friends")
    own = ('<div style="padding:14px 16px 0;display:flex;align-items:baseline;justify-content:space-between"><h1 style="margin:0;font:700 22px Cinzel,serif">Decks</h1>'
           '<span style="font:11px IBM Plex Mono;color:var(--fg-faint)">3 decks</span></div>'
           f'<div class="dts" style="padding:14px 16px 16px">{jtile("rising", owner=True)}{F.deck_tile(F.MINE[0], owner=True)}</div>')
    po = ph(own, "Decks", h=844)
    narrow = (f'<div style="display:flex;gap:14px;align-items:flex-start"><div style="width:230px">{jtile("rising", narrow=True)}</div>'
              f'<div style="width:230px">{jtile("face", narrow=True)}</div></div>')
    card = (f'<div style="display:flex;gap:28px;align-items:flex-start;max-width:1240px"><div style="position:relative;width:300px;flex:none">'
            f'<img src="{img("jaws-card.jpg")}" alt="" style="width:300px;display:block;border-radius:12px">'
            '<span style="position:absolute;left:3px;top:92px;width:193px;height:126px;outline:2px solid #CF8745;border-radius:3px"></span>'
            '<span style="position:absolute;left:64px;top:190px;width:166px;height:110px;outline:2px dashed #8FA6BE;border-radius:3px"></span></div>'
            '<div style="display:flex;flex-direction:column;gap:12px;font-size:13.5px;line-height:1.6;color:var(--fg-body)">'
            '<p><b style="color:#CF8745">Solid: 1 · The swimmer and the shark.</b> The poster’s own story: the swimmer at the waterline, the shark rising under her. Left of the cost and type line, above the rules text. The bottom-left is open water, so the name block sits on calm blue.</p>'
            '<p><b style="color:#8FA6BE">Dashed: 2 · The jaws.</b> Tight on the mouth, below the type line and left of the P/T. The loudest picture on any tile; the name block sits on the jaw.</p>'
            '<p>Both are cut from the full card image, because Scryfall’s art crop of this printing is the whole poster, words included. No text survives in either box.</p></div></div>')
    rule = ('<ol class="order">'
            '<li><span><b>A printing whose art crop is clean draws its crop</b>, as today. Almost every deck.</span></li>'
            '<li><span><b>A printing whose art carries the card’s words</b> (full art or borderless with text over the picture) draws a <b>crop box we set on its full card image</b>: a small catalog table of boxes, one row per such printing, written by hand. Jaws is the first row.</span></li>'
            '<li><span><b>Such a printing with no box yet</b> draws the identity gradient (the shipped null branch), never the words. It gets a box when someone notices.</span></li></ol>')
    body = (board_head("Call 2 · Jaws, Relentless Predator’s tile", "Cut the shark out of the poster",
                       "Hugh’s R1 note: the card on a gradient looked awkward and broken. R2 draws from the real card (SLD 2175, Hugh’s image). Its art crop carries the title, cost, type line, P/T and rules, "
                       "but the poster has clean water in it: two boxes avoid every word. <b>Pick one</b>, 1 recommended.", tag="R2")
            + sec("The two boxes, on the card", "", card)
            + frames(frame("<b>Shipped</b> · 390 · the fault", p0, "The printing’s own crop: half the title and the cost in the band."),
                     frame("<b>1 · The swimmer and the shark</b> · 390 · recommended", p1, "Reads as Jaws at a glance, and as art, not a card. Name and colour on open water."),
                     frame("<b>2 · The jaws</b> · 390", p2, "All teeth. Strong, but it reads as a close-up of anything with teeth."),
                     gap=40)
            + frames(frame("<b>1</b> · 1300 · a friend’s Decks", d1, "Three across; the band is wider than the box, so cover trims a little top and bottom."))
            + frames(frame("<b>2</b> · 1300 · a friend’s Decks", d2, "The same at 1300."))
            + frames(frame("<b>1</b> · 390 · the owner’s /decks", po, "Your own tile, the ⋯ over the corner, as every tile."),
                     frame("<b>Fallback</b> · 390 · no box yet", pa, "A text-over-art printing nobody has boxed yet: the gradient, never the words."), gap=40)
            + sec("Under the 330 floor", "The 168 band. Left 1, right 2.", narrow)
            + sec("The rule", "", rule)
            + '<div class="note" style="max-width:1240px"><h4>For engineering</h4><ul>'
              '<li><b>J1 · Data.</b> <code>printing_art_crops</code>: printing id, the box as fractions of the full card image (x0, y0, x1, y1). Jaws’ SLD 2175: box 1 is 0.008, 0.234, 0.654, 0.551; box 2 is 0.212, 0.460, 0.767, 0.731 (measured on the card at 758×1032). Catalog data, copied staging to production like the rest.</li>'
              '<li><b>J2 · Drawing.</b> A boxed printing’s band draws the full card image (<code>image_uri</code>, large) scaled so the box fills the band, then <code>ArtWash</code> as usual. Everywhere a commander band draws (tiles, spines, Home, Commanders).</li>'
              '<li><b>J3 · Which printings.</b> Scryfall’s <code>full_art</code>, or <code>border_color: borderless</code> without <code>textless</code>, marks a printing whose crop may carry words; one without a box draws the gradient. Engineering can list the commanders it hits so Design boxes the ones that matter.</li></ul></div>')
    return doc("Jaws · full-art tiles", body, 1612)


# ============================================================================ Calls 3 to 6
THEMES = [("amonkhet", "Low Sun", "#14110E", "#6FA368"), ("kamigawa", "Neon Rain", "#0E0F14", "#6FA368"), ("ixalan", "Canopy", "#0E1310", "#5EA990"),
          ("phyrexia", "Oil Haze", "#0D0B0E", "#6FA368"), ("eldraine", "Witching Hour", "#120E17", "#6FA368"), ("kaldheim", "First Frost", "#121217", "#6FA368")]


def lum(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c]
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]


def ratio(a, b):
    la_, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la_ + .05) / (lb + .05)


def amark(x4=False):
    m = f'<span class="amk{" x4" if x4 else ""}">{S.SPARE_SVG.format(s=16)}<span class="dot"></span><span class="tk"></span></span>'
    return f'<span class="x4b">{m}</span>' if x4 else m


def calls_board():
    cells = "".join(f'<div class="swc" style="--bg:{bg};--success:{ok};background:{bg}"><div class="row1">{amark(True)}{amark()}</div>'
                    f'<small>{n}<br>tick {bg} on {ok}<br>{ratio(bg, ok):.1f}:1</small></div>' for t, n, bg, ok in THEMES)
    m = S.modal_html("dina-ask", True, 150)
    m = m.replace('<span class="ii new">i</span>', '<span class="ii on">i</span>', 1)
    m = m.replace('<span class="ii on">i</span></span></div>', f'<span class="ii on">i</span><div class="tip up" style="width:300px">{S.SPARE_TIP}</div></span></div>', 1)
    d1 = dk(S.shopping_page(True), "Decks", h=720, over=m)
    diffs = ('<table class="tbl dif" style="max-width:1240px"><tr><th>#2230’s differences</th><th>Count</th><th>Call</th></tr>'
             '<tr><td>View switch: well and segment size</td><td rowspan="3">11</td><td rowspan="3"><b>Shipped wins.</b> The handoff calls these “shipped, unchanged”; the boards drew them from Design’s kit, which had drifted. Nothing to build.</td></tr>'
             '<tr><td>Key items: wrapping</td></tr><tr><td>Buy tag: size and type</td></tr>'
             '<tr><td>The cart’s controls spacing (shared with By card and By deck)</td><td>2</td><td><b>Shipped wins.</b></td></tr>'
             '<tr><td>Phone: head to first panel 25px, board 14px</td><td>1</td><td><b>Ratified:</b> the shipped sticky controls band carries its own padding and rule; 14px under the rule matches By card.</td></tr></table>')
    d4 = ('<table class="tbl" style="max-width:1240px"><tr><th>A tap on</th><th>Lands on</th><th>Marks seen</th></tr>'
          '<tr><td>new-set</td><td>the set’s page</td><td>nothing (the set page has no cursor)</td></tr>'
          '<tr><td>new-precon</td><td>the precon</td><td>nothing</td></tr>'
          '<tr><td>price-drop, combo, any collapsed push</td><td>Home</td><td>Home’s feed cursor, as any Home visit</td></tr>'
          '<tr><td>trade-match</td><td>the friend’s Spares</td><td>nothing</td></tr>'
          '<tr><td>spare-request</td><td>/friends, Waiting on you</td><td>/friends’ cursor, as any visit</td></tr></table>'
          '<p style="margin-top:10px;font-size:12.5px;color:var(--fg-muted);max-width:1240px">Ratified: a per-item seen would need a second store for one benefit, and moving the cursor from a set page would hide items the reader never saw. '
          'The Home badge keeps counting a set the reader already opened from a push, until they open Home: honest, and short. Opening Home closes every delivered notification, as built. '
          '<b>Corrected in the push handoff</b> (this PR): call 5 and G5 lose “marks that item seen”, and <code>about · push.ts</code> key 3 reads <i>A tap opens what it’s about. Opening Home marks your news seen.</i></p>')
    stale = ('<table class="tbl" style="max-width:1240px"><tr><th>Where</th><th>Was</th><th>Now</th></tr>'
             '<tr><td><code>design_handoff_the99_menu_home</code>: Feed-Kinds, Home-Directions, Home-States, Menu (combo item)</td><td><span class="strike">Your last upload added Demonic Consultation. Neither is in a deck yet.</span></td><td><b>You added Demonic Consultation.</b> (<code>feedCopy.home.line.combo</code>)</td></tr>'
             '<tr><td><code>addendum-menu-home-line/README.md</code>, “Also seen and left as built”</td><td><span class="strike">a friend’s deck status uses friendPillStyle over the shipped statusPillStyle (#2193)</span></td>'
             '<td><b>with <code>FRIEND_DECKS_ENABLED</code> off, a friend’s deck status uses <code>friendPillStyle</code> (#2193); with it on, a friend’s tile shows the card count alone (friend decks R2, #2220)</b></td></tr></table>')
    inv = ('<table class="tbl" style="max-width:1240px"><tr><th>Note</th><th>Call</th></tr>'
           '<tr><td>Sign-in marks the feed seen</td><td><b>Ratified.</b> Sign-in lands on Home, and a Home visit marks what it shows seen after drawing it, so the lead story is seen once, on that visit. The same rule as every visit; nothing special for sign-in.</td></tr>'
           '<tr><td>The first-run tour covers the opt-in row on a phone</td><td><b>Ratified.</b> The tour is the first thing a new reader meets and closes in a few presses; the opt-in stays on Home until it is answered, so nothing is lost. The tour does not move.</td></tr>'
           '<tr><td>Friend inventories name friends a fresh fork hasn’t linked</td><td><b>Tooling, no design call.</b> Run <code>scripts/seed-r2-friend-fixture.mts</code> on the fork first; the inventories’ notes already say so. Design’s fixture names stay.</td></tr></table>')
    body = (board_head("Calls 3 to 6 · what shipped differently", "Ratified, with two string fixes on Design’s side",
                       "Each deviation checked against main at <code>6560671</code> and the PR bodies. Ratified means it stays as built.")
            + sec("3a · Spare requests: the accepted mark’s tick in var(--bg)", "The shipped mark (<code>MarkedSpareGlyph</code>): the spare glyph in <code>--success</code>, an 8px dot, the tick drawn in <code>--bg</code> on it. Every theme’s <code>--bg</code> is dark, so the tick is dark on green everywhere, as the board drew it. At 1x and at 4x, in each theme’s own tokens.",
                  f'<div class="swg">{cells}</div>')
            + sec("3b · Spare requests: the ⓘ tooltip opens upward", "Opened downward it clipped at the foot of the 640 modal. Upward it sits over the Replacing box, which it never needs to read. Ratified.",
                  frames(frame("<b>The modal</b> · 1300 · tooltip open", d1, "Drawn from the spare requests kit: Dina’s spares, Chris’s row, the ⓘ open.")))
            + sec("3c · Spare requests: the cart’s 14 differences (#2230)", "", diffs)
            + sec("4 · Push: a landing marks seen only through Home’s and /friends’ cursors (D4)", "", d4)
            + sec("5 · Stale lines on Design’s boards: fixed in this handoff", "", stale)
            + sec("6 · Inventory notes from the menu and Home walk", "", inv))
    return doc("Calls on what shipped", body, 1612)


BOARDS = [("Main", main_board, "Main · the entry and the six calls"),
          ("Jaws-Tile", jaws_board, "Call 2 · full-art and borderless tiles"),
          ("Calls", calls_board, "Calls 3 to 6 · ratified and fixed")]

import aboutfd
BOARDS.insert(1, ("E1-Friend-Decks", aboutfd.about_board, "E1 · Your friends’ decks"))
