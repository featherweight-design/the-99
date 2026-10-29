"""Wizards announcements R1: the Home and Settings boards. Each returns a whole .dc.html."""
import kit
import parts as P
import sr as S
import push as U
import w4
import ann as A
from kit import doc, board_head, frame, frames, img

LEAD_SHIPPED = lambda desk: w4.lead("match", desk, "new", press="Ask Colin")


def note(t, b, w=None):
    st = f' style="width:{w}px;flex:none"' if w else ""
    return f'<div class="note"{st}><b>{t}</b><br>{b}</div>'


def col(*items, w=420):
    return f'<div style="width:{w}px;flex:none;display:flex;flex-direction:column;gap:14px;padding-top:28px">' + "".join(items) + "</div>"


# ================================================================ 1 · Home rows
def mixed(desk):
    rows = [A.arow("sl", desk), A.arow("dl", desk), A.irow("price", desk), A.arow("ot", desk), A.irow("combo", desk)]
    return A.feed(rows, n=3, foot=A.show_all(2, 7))


def rows_board():
    p = A.ph(A.home(False, LEAD_SHIPPED(False), mixed(False)))
    d = A.dk(A.home(True, LEAD_SHIPPED(True), mixed(True)), h=1080)
    body = (board_head("Surface 1 · Home’s What’s new · 390 and 1300",
                       "A post is one more row, in the row you already have",
                       "Every Announcements post comes in as one <code>FeedItemRow</code>, sorted into three kinds. Nothing about the row is new but what it holds: "
                       "the <b>hero</b> in the 46×64 slot (call 1), a mono kicker naming the kind with the unseen diamond and the age, the post’s title, its summary, and "
                       "a press that leaves the app with ↗, as a price drop’s already does. <b>A Commander decklists row</b> carries a second, in-app press to the early lists "
                       "on Precons (call 4) and a mono count of lists out. Fixture: the lead is a trade match, so the posts sit among the existing kinds, newest first. "
                       "Dashed outlines mark what is new and are annotations only.")
            + frames(frame("<b>390</b> · Home B, What’s new with three posts", p,
                           "Secret Lair and Commander decklists unseen (the diamond), Wizards news seen (kicker in <code>--fg-locked</code>). The ✕ ends every action line, as shipped. "
                           "Five rows, then <i>2 more · Show all 7</i>."),
                     frame("<b>1300</b> · the main column", d,
                           "From <code>md</code> the presses and the ✕ take the third column. The decklists row’s two presses share it, in-app first."))
            )
    return doc("Home rows", body, 390 + 44 + 1300 + 112)


# ================================================================ 2 · Row states
def cut(rows, desk=False, w=None, foot=""):
    width = w or (390 if not desk else 880)
    cls = "dk d4n" if desk else "ph d4n"
    return (f'<div class="{cls}" style="display:block;width:{width}px;height:auto;padding:14px 16px;border-radius:16px">'
            f'<div class="fd">{"".join(rows)}{foot}</div></div>')


def states_board():
    long_p = cut([A.arow("long")])
    long_d = cut([A.arow("long", True)], True)
    miss_p = cut([A.arow("sl", shape="none"), A.arow("ot", shape="none")])
    miss_d = cut([A.arow("sl", True, shape="none")], True)
    part_p = cut([A.arow("dl")])
    full_p = cut([A.arow("dl6")])
    part_d = cut([A.arow("dl", True), A.arow("dl6", True)], True)
    seen_p = cut([A.arow("sl"), A.arow("sl", seen=True), A.arow("ot", seen=False), A.arow("ot", seen=True)])
    before = cut([A.arow("sl", chg=False), A.arow("dl", chg=False), A.irow("price")])
    after = cut([A.arow("dl", chg=False), A.irow("price")],
                foot="").replace('<span class="x4">✕</span>', '<span class="x4" style="box-shadow:0 0 0 2px var(--accent);border-radius:8px">✕</span>', 1)
    toast = '<div style="position:relative;height:74px">' + S.toast("We couldn’t hide that. Try again.", 8) + "</div>"
    body = (board_head("Surface 1 · the row’s states",
                       "Long words, no picture, lists that fill in, seen and unseen",
                       "Each state as one row cut from What’s new at its real width. The title never clamps (as shipped: it wraps). <b>The summary clamps to two lines</b> at both "
                       "widths, since a post’s summary can run to a paragraph; the post itself is one press away.")
            + frames(frame("<b>2 · Long title and summary</b> · 390", long_p,
                           "Title wraps to three lines at 390; the summary stops at two with an ellipsis. The press line never moves."),
                     frame("<b>2 · Long title and summary</b> · 1300 (the 848 main column)", long_d,
                           "Two title lines at the main column’s width; the summary’s clamp holds."), gap=36)
            + frames(frame("<b>3 · No hero, or it failed</b> · 390", miss_p,
                           "The slot keeps its 46×64 and draws the shipped plate (the combo’s box: <code>--surface-raised</code>, <code>--border-strong</code>) with a post glyph in "
                           "<code>--fact</code>. Missing and failed to load draw the same plate, so the row never shows a broken image."),
                     frame("<b>3 · No hero</b> · 1300", miss_d, ""), gap=36)
            + frames(frame("<b>5 · Lists partly out, then all</b> · 390", part_p + '<div style="height:14px"></div>' + full_p,
                           "<i>3 of 5 lists so far</i> under the summary. When the last two land the same row reads <i>All 5 lists</i>; it is the same post, so it is not new again "
                           "(the Announced group’s <code>new</code> tag tells Precons)."),
                     frame("<b>5 · Partly and all</b> · 1300", part_d, ""), gap=36)
            + frames(frame("<b>1 · Seen and unseen</b> · 390", seen_p,
                           "Unseen: the accent diamond and the kicker in <code>--fg-faint</code>. Seen: no diamond, kicker in <code>--fg-locked</code>. As every kind."),
                     frame("<b>7 · Dismissed</b> · before the ✕", before, ""),
                     frame("<b>7 · Dismissed</b> · after", after + toast,
                           "The row leaves and focus lands on the next ✕ (ringed). A failed write puts it back with the shared toast. Exactly as every row."), gap=36))
    return doc("Row states", body, 390 + 36 + 880 + 112)


# ================================================================ 3 · The lead story
def lead_board():
    sp = A.ph(A.home(False, A.lead_post("sl"), A.feed([A.arow("dl"), A.irow("price"), A.arow("ot")], n=2)))
    sd = A.dk(A.home(True, A.lead_post("sl", True), A.feed([A.arow("dl", True), A.irow("price", True), A.arow("ot", True)], n=2)), h=1060)
    dp = '<div class="ph d4n" style="padding:14px 16px;height:auto">' + A.lead_post("dl") + "</div>"
    dd = '<div class="dk d4n" style="display:block;padding:20px 26px;width:1000px;height:auto">' + A.lead_post("dl", True) + "</div>"
    N = [("Secret Lair x JAWS is live", "Five full-art cards: the shark, the boat and the beach. On sale until Nov 5.")]
    shade = ('<div class="shade" style="position:relative"><div class="sb"><span>9:02</span><span>Thu, Oct 29</span></div>'
             + U.and_note(N[0][0], N[0][1]).replace('<div class="ab">', '<div class="ab">', 1).replace("</div></div>", f'</div></div><img class="big" src="{img("jaws-rising.jpg")}" alt="">', 1)
             + U.and_note("Foundations Commander: the decklists", "Three of the five decklists are up. The last two follow next week.", when="9:00").replace("</div></div>", f'</div></div><img class="big" src="{img("art-giada.jpg")}" alt="">', 1)
             + "</div>")
    lock = U.lock_screen([("Secret Lair x JAWS is live", "Five full-art cards: the shark, the boat and the beach. On sale until Nov 5.", "now"),
                          ("Foundations Commander: the decklists", "Three of the five decklists are up. The last two follow next week.", "9:00")]).replace("Thursday 23 October", "Thursday 29 October").replace("Tap one to open it in The 99", "Tap one to open the post")
    body = (board_head("Surface 1 · call 2 · an announcement leads Home",
                       "A post can lead, with its hero landscape",
                       "<b>Call: yes, Secret Lair and Commander decklists can lead; Wizards news never leads</b> (it is a row, like an answer to your own request). "
                       "They take the last places in <code>LEAD_PRIORITY</code>, after everything about your own cards and friends: "
                       "<code>spare-request, trade-match, combo, price-drop, commander-decklists, new-precon, new-set, secret-lair</code>. Decklists sit before new precons because "
                       "the list comes first and is the precon’s first news. The lead is the only place the hero is shown whole: <b>landscape, tilted a little</b> as the card is, "
                       "over its own blurred art. Its press is the filled button, out with ↗; a decklists lead adds the in-app press as a quiet second.")
            + frames(frame("<b>390</b> · Secret Lair leads", sp,
                           "On a phone the hero spans the band (164 tall, −1.5°) above the words, so the title gets the band’s full width. The ✕ ends the button line, as shipped."),
                     frame("<b>1300</b> · Secret Lair leads", sd,
                           "From <code>md</code> the hero takes the card’s place at the left, 272×153, −3°. The row below it is never repeated."))
            + frames(frame("<b>390</b> · decklists lead", dp,
                           "<b>See the lists</b> (filled, into Precons) and <i>Read the post ↗</i> beside it. The mono count sits under the summary."),
                     frame("<b>1300</b> · decklists lead", dd, ""))
            + frames(frame("<b>Push</b> · Android shade", shade,
                           "The push is the row, sent: title, summary and, where the system shows a large image, the hero. A tap opens the post (ruling 3), and marks the row seen."),
                     frame("<b>Push</b> · iPhone lock screen", lock, "iOS shows no image. Both through the existing flush and its overnight hold."),
                     col(note("Push words", "<ul><li>Title: the post’s title.</li><li>Body: the summary, cut by the system.</li>"
                                            "<li>Image: the hero (Android, desktop Chrome); none on iOS.</li><li>Tap: the post, in the browser (outbound), for all three kinds. "
                                            "A decklists push does not open Precons: ruling 3 says it links out.</li></ul>"))))
    return doc("Lead story", body, 390 + 44 + 1300 + 112)


# ================================================================ 4 · The offer, a kind off
def offer_board():
    rows_p = [A.arow("sl", chg=False), A.arow("dl", chg=False), A.arow("ot", chg=False)]
    rows_d = [A.arow("sl", True, chg=False), A.arow("dl", True, chg=False), A.arow("ot", True, chg=False)]
    cp = A.ph(A.home(False, "", A.feed(rows_p, n=2, foot=A.offer())))
    op = A.ph(A.home(False, "", A.feed(rows_p[:1], n=1, foot=A.offer(True))))
    cd = A.dk(A.home(True, "", A.feed(rows_d, n=2, foot=A.offer())), h=900)
    od = A.dk(A.home(True, "", A.feed(rows_d[:2], n=2, foot=A.offer(True))), h=1000)
    off_p = A.ph(A.home(False, "", A.feed([A.arow("dl", chg=False), A.irow("price")], n=2)))
    q1 = ('<div class="ph d4n" style="display:block;width:390px;height:auto;padding:14px 16px;border-radius:16px">'
          + A.feed([], foot=A.quiet("Commander decklists, other Wizards news and friends asking for your spares")).replace('<div class="fd">', '<div class="fd chg">') + "</div>")
    q0 = ('<div class="ph d4n" style="display:block;width:390px;height:auto;padding:14px 16px;border-radius:16px">'
          + A.feed([], foot=A.quiet("secret lair drops, commander decklists, other wizards news and friends asking for your spares")) + "</div>")
    body = (board_head("Surface 1 · call 3 and state 6 · the offer, and a kind switched off",
                       "The offer stays until you answer it",
                       "Today the opt-in fills What’s new until a default-on kind has something to show, then it is gone for good. With three announcement kinds on for everyone, "
                       "that would be the first post. <b>Call: while a reader has never chosen, the offer stays as the last line of What’s new</b>, under the rows: the shipped "
                       "line <i>Pick what else you want to hear about.</i>, a <b>Pick ▾</b> that opens the shipped boxes in place, and a ✕. <b>Show these</b> or the ✕ is the "
                       "reader’s choice (the ✕ saves an empty pick), and from then on the choice lives in Settings, as call 7 of menu and Home said. "
                       "The boxes offer only what is off; the three announcement kinds are already on.")
            + frames(frame("<b>390</b> · never chosen · the offer, closed", cp,
                           "One line, a 44px <b>Pick ▾</b> and the ✕. It sits after the rows (and after <i>Show all N</i> when there is one)."),
                     frame("<b>390</b> · Pick pressed", op,
                           "The shipped boxes and <b>Show these</b> (dimmed until a box is ticked) open in place of the line. The ✕ stays at the top right."),
                     col(note("Who sees it",
                              "<ul><li>A reader with nothing stamped in <code>feed_kinds</code> or <code>feed_kinds_declined</code> (never chose). Defaults count as not chosen.</li>"
                              "<li>Saving or ✕ stamps the choice: the line never returns.</li>"
                              "<li>It replaces today’s full opt-in only once something shows. With nothing in the window and nothing chosen the box is today’s opt-in, unchanged.</li>"
                              "<li>Engineering: <code>alsoOn</code> no longer ends at the first item; <code>loadHomeFeed</code> returns <code>offer</code> beside <code>items</code> while not chosen.</li></ul>"),
                         note("Why not the top of the list", "News is what the reader came for. A five-box form above it on every visit would push the news below the first screen on a phone."), w=400))
            + frames(frame("<b>1300</b> · closed", cd, ""))
            + frames(frame("<b>1300</b> · opened", od,
                                                                 "Two columns of boxes, as the shipped opt-in lays them from <code>md</code>; <b>Show these</b> at its desktop size."))
            + frames(frame("<b>6 · Secret Lair switched off</b> · 390", off_p,
                           "Its rows leave Home and its pushes stop. Nothing else moves; the head’s count counts only what is on."),
                     frame("<b>6 · Quiet, with Secret Lair off</b> · 390", q1,
                           "Nothing in the window: the quiet line names only the kinds still on, in Settings’ order."),
                     frame("<b>Gap · as built today</b>", q0,
                           "<code>Quiet</code> lowercases every name. <i>Secret Lair</i> and <i>Wizards</i> are names: the kinds need a quiet-line form of their own "
                           "(<code>feedCopy.news.kinds[k].inline</code>) instead of <code>toLowerCase()</code>."), gap=36))
    return doc("Offer and kind off", body, 1420)


# ================================================================ 5 · Settings
SFOLD = '<div class="fold" style="top:770px"><span>first screen ends</span></div>'


def sph(inner, over=""):
    return P.phone if False else kit.phone(inner, None, badges={"Home": 3}, over=over)


def settings_board():
    d1 = sph(A.settings(state="on"))
    d2 = sph(A.settings(state="on", home=("secret-lair", "commander-decklists", "spare-request"), push=("secret-lair", "commander-decklists", "spare-request")))
    d3 = sph(A.settings(state="cant"))
    d4 = sph(A.settings(state="on", home=("secret-lair", "commander-decklists", "wizards-other", "spare-request"), lit="wizards-other"),
             over=S.toast("We couldn’t save that. Try again.", 96))
    dk1 = kit.desk(A.settings(True, state="on", where="browser"), None, badges={"Home": 3})
    body = (board_head("Surface 2 · Settings › What’s new on Home · 390 and 1300",
                       "Three more rows, ticked from the start",
                       "The shipped section (<code>news-section.tsx</code>): one row per kind, the Home box and its 44px Push box, the device row first. <b>Three rows join it, after "
                       "New precons</b> so Wizards’ news sits with the catalog kinds: <b>Secret Lair drops</b>, <b>Commander decklists</b>, <b>Other Wizards news</b>. "
                       "Both their boxes start ticked and their line ends <i>On from the start.</i>, the words the spare request already uses. A kind switched off is simply unticked, as any kind. Names are drafts for /copy-review (call 7).")
            + frames(frame("<b>All on</b> · 390 · the default", d1,
                           "A reader who never touched Settings: the three new rows and Friends asking for your spares ticked in both columns."),
                     frame("<b>One off</b> · 390", d2,
                           "Other Wizards news unticked at Home and Push. Home loses its rows; its pushes stop."),
                     frame("<b>Push unavailable</b> · 390", d3,
                           "This browser can’t push: the column, its head and the foot’s push clause leave, as shipped. The Home boxes stay."),
                     frame("<b>A failed save</b> · 390", d4,
                           "The reader unticked Other Wizards news’ push box; the save failed, so the box is ticked again and the shared toast says so."), gap=36)
            + frames(frame("<b>All on</b> · 1300 · this browser", dk1, "The 720 column, unchanged but for the three rows."))
            + '<div class="note" style="max-width:1500px"><b>Kind names (call 7, for /copy-review)</b><table class="tbl">'
              '<tr><th>Kind</th><th>Settings name</th><th>Settings line</th><th>Row kicker</th></tr>'
              '<tr><td><code>secret-lair</code></td><td><b>Secret Lair drops</b></td><td>When Wizards announces a Secret Lair drop. On from the start.</td><td>Secret Lair</td></tr>'
              '<tr><td><code>commander-decklists</code></td><td><b>Commander decklists</b></td><td>When Wizards posts a Commander set’s decklists. On from the start.</td><td>Commander decklists</td></tr>'
              '<tr><td><code>wizards-other</code></td><td><b>Other Wizards news</b></td><td>Everything else Wizards announces. On from the start.</td><td>Wizards news</td></tr>'
              '</table><p style="margin-top:8px">Why <i>Wizards news</i> and not <i>Announcement</i>: every one of the three is an announcement. The kicker says whose news it is, '
              'which is what a reader needs beside a link that leaves the app.</p></div>')
    return doc("Settings", body, 390 * 4 + 36 * 3 + 112)


BOARDS = [("Home-Rows", rows_board, "1 · Home rows"), ("Row-States", states_board, "2 · Row states"),
          ("Lead-Story", lead_board, "3 · The lead story and push"), ("Offer", offer_board, "4 · The offer, a kind off"),
          ("Settings", settings_board, "5 · Settings")]
