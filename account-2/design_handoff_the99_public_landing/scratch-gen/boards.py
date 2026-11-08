"""Public landing page R3 boards (account 2, 2026-11-08)."""
import kit
from kit import doc, frame, frames
import functools
board_head = functools.partial(kit.board_head, tag="R3")
import lp as L
import fr as F

T = "Public landing · R3"


def col(*xs, w=440, gap=14):
    return f'<div style="display:flex;flex-direction:column;gap:{gap}px;width:{w}px;flex:none">' + "".join(xs) + "</div>"


def gapv(h=40):
    return f'<div style="height:{h}px"></div>'


# ------------------------------------------------------------ 1 · Main: the calls
def main():
    n = L.note
    r2 = n("R3 · what changed from Hugh’s R2 notes",
           "<ul><li><b>Popular commanders</b> (EDHREC, November 2026): Jace, Multiverse Architect (#1 this month, 11.7K decks) leads the hero and "
           "Commanders; Ashling, the Limitless is the demo deck; Giada (#4 this month) stays. Y’shtola, Vivi and Tam swap in once Hugh’s images arrive.</li>"
           "<li><b>Headline A</b> keeps its words; on the phone two cards fill the space beside it and drift.</li>"
           "<li><b>Free chips:</b> one line under the loop’s heading (all four are free), none on the titles. Corner chips drawn as the alternative.</li>"
           "<li><b>Welcome credits:</b> a gift and a sun, and fifteen diamonds lit three to a tool: each writing tool, three times.</li>"
           "<li><b>Motion:</b> six subtle moves, all once except the drifting cards, none for reduced-motion readers (Motion board).</li>"
           "<li><b>Card marks</b> in demo step 4: to buy, proxy, game changer, tutor, short, and over-committed, with the shipped key line.</li>"
           "<li><b>Tooltips</b> carry a small picture of what the tool gives back (Tooltips board).</li></ul>")
    calls = [
        n("1 · The hero’s screen: the dummy app’s Commanders page, with three cards fanned",
          "A phone drawing Sam’s Commanders list (Jace 84, Ashling 79, Giada 69). On desktop the three cards fan around it; on the phone two cards sit beside the headline instead. "
          "It is the same drawing half the demo uses, so the hero never goes stale and never shows a real account. Nothing moves by itself."),
        n("2 · Theme switch: yes, six swatches under the hero",
          "<i>See it in</i> and six round swatches (each theme’s ground and accent), the chosen one ringed and named. A press sets the same "
          "<code>the99_theme</code> cookie the app reads and re-themes the whole page, the dummy app included."),
        n("3 · Demo liveness: B, a live dummy app",
          "<b>Recommended now: B.</b> Each step renders the real signed-in drawing half (the Commanders row, the deck rows, the Shopping row) "
          "on Sam’s fixture, at native size, and the visitor presses the real controls. On a phone it is the app at its own size, so "
          "it reads cleaner than a shrunk screenshot. AI results replay stored output. <b>Cost:</b> about nine signed-in tools need their "
          "drawing split from their data first. <b>So:</b> the landing ships first with the section held back, and Try it arrives with the refactors."),
        n("4 · Demo order: eight steps",
          "1 Collection · 2 Commanders · 3 Help me choose · 4 The deck · 5 Analysis and Overview · 6 Suggested changes · 7 Get it to 99 "
          "(Look deeper, Top off, Mana Balance) · 8 Buy only what’s missing, with Which deck needs it most?. On a phone the words sit above the "
          "app and Back and Next below it; on desktop the words sit left and the app right."),
        n("5 · Export guides: an expandable row per app, words only",
          "ManaBox, Moxfield, Archidekt and Deckbox each open three short steps in place, with a down chevron that turns when open. No "
          "screenshots or logos of other apps. Moxfield carries the deck-link note. The same rows open from the first run."),
        n("6 · The first-timer path: precons first, then scan or search",
          "<i>New to all this?</i> leads the section, above the app guides: pick the precons you own, then add the rest by scanning them with "
          "the phone’s camera or searching for them by name. No target count."),
        n("7 · Free versus credits: the welcome credits are the offer",
          "A big <b>15 welcome credits</b> and <b>+1 free credit every day</b> lead the block: enough to run every writing tool three times "
          "before spending a thing. Then Free, always beside With credits (1–2 per run), each paid tool with an ⓘ. Prices one press away."),
        n("8 · Written for real: two commanders and one precon Overview",
          "Jace and Ashling’s reads with their art, each opening its page, and Mutant Menace’s stored Overview lead. Read at build "
          "time from stored rows; the words on these boards are stand-ins."),
    ]
    rules = [
        n("Every state, the rules",
          "<ul><li><b>A signed-in reader at /</b> sees Home exactly as today; the landing renders only with no session.</li>"
          "<li><b>Numbers unavailable:</b> the strip drops whole, never shows a zero.</li>"
          "<li><b>Already on the list</b> draws exactly as sent.</li>"
          "<li><b>Open sign-up</b> is a copy and route change: the field goes, <i>Sign up free</i> opens Clerk’s sign-up.</li>"
          "<li><b>Reduced motion:</b> nothing on the page moves by itself.</li></ul>"),
        n("About the screens on these boards",
          "Every product screen is <b>the dummy app</b>, drawn from shipped components on Sam’s made-up binder. Words an AI tool wrote "
          "carry a <b>STAND-IN WORDS</b> tag: the build replays stored output for the fixture, never a live call."),
        n("The appendix: two toast questions (answers in the README)",
          "<ol><li><b>The got-it receipt</b> stays as it is, as the one named exception: a receipt, not a toast, may carry History beside its "
          "Undo, with Change in its body.</li>"
          "<li><b>Yes, every toast with no action carries the ✕.</b> “Exactly one press per toast: its action, or the ✕”. "
          "The token refusal and the credits toast gain it.</li></ol>"),
    ]
    legend = ('<div class="legend"><span><i style="outline:1.5px dashed rgba(207,135,69,.8)"></i>new or changed on a shipped screen</span>'
              '<span><i style="background:#8FA6BE"></i>stand-in words for stored AI output</span></div>')
    body = (board_head(T, "The public landing page: eight calls, R2",
                       "The signed-out <code>/</code> as a showcase: the hero with the launch panel, real catalog numbers, the loop, bringing a "
                       "collection in, a live demo on a made-up player’s cards, stored writing, free versus credits with the welcome offer, the "
                       "close and the Fan Content notice. Invite-only today, with open sign-up drawn too.")
            + legend
            + '<div class="notes" style="grid-template-columns:repeat(4,minmax(0,1fr));max-width:2000px">' + "".join(calls) + "</div>"
            + '<div class="notes" style="max-width:2000px">' + r2 + "".join(rules) + "</div>")
    return doc("Landing · the calls", body, 2120)


# ------------------------------------------------------------ 1b · the headline
def headline():
    why = {
        "A": "<b>Recommended.</b> The 99 problems line keeps its wink as a small italic kicker; the headline says what the product does.",
        "B": "The joke as the headline. Memorable, but a visitor who doesn’t play Commander learns nothing from it.",
        "C": "Shorter and punchier; “hiding” carries the discovery idea.",
        "D": "The most literal. Clear, a little long, no personality.",
    }
    fs = []
    for k in "ABCD":
        fs.append(frame(f"<b>{k}</b> · 390", L.lp(L.topbar(False) + L.hero(False, head=k), False),
                        why[k]))
    chips = frames(frame("<b>Recommended</b> · 390 · one Free line", L.lp(L.loop(False, "line"), False),
                         "All four steps are free, so one line under the heading says it once. No chip on any title."),
                   frame("<b>Alternative</b> · 390 · a chip in each card’s corner", L.lp(L.loop(False, "corner"), False),
                         "If each card should carry its own: top right, on the icon’s line, never after the title."),
                   frame("<b>Recommended</b> · 1300", L.lp(L.loop(True, "line"), True)), gap=40)
    body = (board_head(T, "The headline, and where Free goes",
                       "Headline A is chosen. On the phone two cards (Jace in front, Ashling behind) fill the space the short lines leave, "
                       "and drift a few pixels. B to D stay for the record. Then the loop’s Free chips.")
            + frames(*fs, gap=40) + gapv(50) + chips)
    return doc("Landing · headline and chips", body, 2560)


# ------------------------------------------------------------ 2 · the whole page at 390
def page390():
    a = L.page(False, parts=["top", "hero", "nums", "loop"])
    b = L.page(False, parts=["bring", "try", "written"])
    c = L.page(False, parts=["free", "close", "foot"])
    body = (board_head(T, "The whole page · 390 · invite-only · Low Sun",
                       "One page in three frames, read left to right: the page continues from the foot of each frame to the top of the next. "
                       "Same sections and order as desktop.")
            + frames(frame("<b>1</b> · Hero, numbers, the loop", a), frame("<b>2</b> · Bring your collection, Try it, Written for real", b),
                     frame("<b>3</b> · Free and credits, the close, the footer", c), gap=60))
    return doc("Landing · 390", body, 1530)


# ------------------------------------------------------------ 3 · the whole page at desktop
def page1300():
    a = L.page(True, parts=["top", "hero", "nums", "loop", "bring"])
    b = L.page(True, parts=["try", "written", "free", "close", "foot"])
    body = (board_head(T, "The whole page · desktop 1300 · invite-only · Low Sun",
                       "Two frames, read left to right. Content sits in a 1120 column. The bare signed-out shell: no rail, the shipped "
                       "Fan Content notice last, centered.")
            + frames(frame("<b>1</b> · Hero, numbers, the loop, Bring your collection", a), frame("<b>2</b> · Try it, Written for real, Free and credits, the close", b), gap=60))
    return doc("Landing · desktop", body, 2780)


# ------------------------------------------------------------ 4 · hero states: theme, open sign-up, numbers unavailable
def hero_states():
    k390 = L.lp(L.topbar(False) + L.hero(False, theme_on=1, theme="kamigawa"), False, "kamigawa")
    k1300 = L.lp(L.topbar(True) + L.hero(True, theme_on=1, theme="kamigawa"), True, "kamigawa")
    o390 = L.lp(L.topbar(False) + L.hero(False, open_=True), False)
    o1300 = L.lp(L.topbar(True) + L.hero(True, open_=True), True)
    oc390 = L.lp(L.close(False, open_=True), False)
    n390 = L.lp(L.topbar(False) + L.hero(False) + L.loop(False), False)
    body = (board_head(T, "The hero: a second theme, open sign-up, and no numbers",
                       "The theme switch re-themes the page and the dummy app (Neon Rain shown, after a press on its swatch). Open sign-up "
                       "swaps the field for one button everywhere the call to action draws. With the catalog unreadable the numbers strip drops.")
            + frames(frame("<b>Theme</b> · 390 · Neon Rain", k390, "The swatch sets <code>the99_theme</code>; the page re-renders in that theme and keeps the reader’s scroll."),
                     frame("<b>Theme</b> · 1300 · Neon Rain", k1300), gap=60)
            + gapv()
            + frames(frame("<b>Open sign-up</b> · 390 · hero", o390, "<b>Sign up free</b> opens Clerk’s sign-up. The fine line says it costs nothing; Sign in stays in the bar."),
                     frame("<b>Open sign-up</b> · 390 · the close", oc390),
                     frame("<b>Open sign-up</b> · 1300 · hero", o1300), gap=60)
            + gapv()
            + frames(frame("<b>Numbers unavailable</b> · 390", n390, "The strip drops whole: the loop follows the hero directly. Never a zero, never a dash."),
                     col(L.note("Numbers, the rule", "Read from the catalog at build or cache time (commanders, written reads, precons, combos, cards). "
                                "Any one unreadable and the whole strip drops, so the five never disagree with each other. No user counts."), w=420), gap=60))
    return doc("Landing · hero states", body, 2860)


# ------------------------------------------------------------ 5 · the launch list press
def launch():
    def ph(state, v=""):
        return L.lp(L.hero(False, state=state, value=v), False)
    def dk(state, v=""):
        return L.lp(L.hero(True, state=state, value=v), True)
    body = (board_head(T, "Tell me at launch: the press and its answers",
                       "The flyer’s launch list, reused: one field, one press, the shipped words. The answer replaces the form in place, "
                       "in the hero and in the close alike.")
            + frames(frame("<b>Entry</b> · 390", ph("entry")), frame("<b>Sending</b> · 390", ph("busy"), "The press reads <i>Sending…</i> and holds; the field keeps its text."),
                     frame("<b>Sent</b> · 390", ph("sent"), "Already on the list draws exactly this, so the page never reveals a listed address."),
                     frame("<b>Not an email</b> · 390", ph("invalid"), "Checked before sending. The field keeps the text and takes the error edge."),
                     frame("<b>Throttled</b> · 390", ph("throttled"), "The anonymous rate bucket refused. The shipped line; the press works again after the wait."), gap=40)
            + gapv()
            + frames(frame("<b>Entry</b> · 1300", dk("entry")), frame("<b>Sent</b> · 1300", dk("sent")), gap=60)
            + gapv(30)
            + frames(frame("<b>Not an email</b> · 1300", dk("invalid")), frame("<b>Throttled</b> · 1300", dk("throttled")), gap=60))
    return doc("Landing · launch list", body, 2780)


# ------------------------------------------------------------ 6 · bring your collection
def collection():
    def one(app, d=False):
        return L.lp(L.bring(d, open_app=app), d)
    body = (board_head(T, "Bring your collection: the section and its export guides",
                       "New to all this? leads, then each app the parser names opens its own three steps in place, one at a time. Moxfield carries the deck-link note.")
            + frames(frame("<b>The section</b> · 390", one(None)), frame("<b>ManaBox open</b> · 390", one("ManaBox")),
                     frame("<b>Moxfield open</b> · 390", one("Moxfield"), "The deck-link note sits inside Moxfield’s guide, and again on the first run’s Import a deck."), frame("<b>Archidekt open</b> · 390", one("Archidekt")),
                     frame("<b>Deckbox open</b> · 390", one("Deckbox")), gap=40)
            + gapv()
            + frames(frame("<b>The section</b> · 1300 · ManaBox open", one("ManaBox", True)),
                     col(L.note("Promises the first run keeps", "<ul><li>Every source here is a path the first run offers (next board).</li>"
                                "<li>The one requirement, a Name and a Quantity column, is said here, on the upload page, and in the failure.</li>"
                                "<li>The guide’s steps are the same words in both places, from one copy file.</li>"
                                "<li>No logos and no screenshots of other apps.</li></ul>"), w=440), gap=60))
    return doc("Landing · bring your collection", body, 2180)


# ------------------------------------------------------------ 7/8 · the demo
def demo_board(d):
    W = 1300
    fs = [frame("<b>Start</b>", L.lp(L.try_it(d), d))]
    for i in range(L.N):
        fs.append(frame(f"<b>Step {i + 1}</b> · {L.STEPS[i]['t']}", L.lp(L.stage(i, d), d)))
    fs.append(frame("<b>The end</b>", L.lp(L.demo_end(d), d)))
    fs.append(frame("<b>Skipped</b> from step 4", L.lp(L.demo_end(d, skipped_at=3), d)))
    if d:
        rows = [fs[i:i + 2] for i in range(0, len(fs), 2)]
        body = "".join(frames(*r, gap=60) + gapv(36) for r in rows)
        width = 2760
    else:
        rows = [fs[:6], fs[6:]]
        body = "".join(frames(*r, gap=40) + gapv(36) for r in rows)
        width = 2620
    head = board_head(T, f"Try it: the live dummy app · {'desktop 1300' if d else '390'}",
                      "Inline on the page: the stage replaces the start card in place and the page does not jump. One press per step; "
                      "Skip to the end at any step lands on the end, which says what was skipped. The main button’s line sits at every "
                      "step’s foot and the form at the end. Nothing typed reaches anything: Sam’s wishes are read-only. "
                      "The app renders at its own size; the accent ring marks what the step is about.")
    return doc(f"Landing · demo {'desktop' if d else '390'}", head + body, width)


def demo390():
    return demo_board(False)


def demo1300():
    return demo_board(True)


# ------------------------------------------------------------ 9 · first run
def firstrun():
    P = F.ph
    D = F.dk
    body = (board_head(T, "The first run keeps the landing’s promise",
                       "Signed in, no cards: the shipped step 1 with three changes. A <i>How to export</i> line under the buttons opens the "
                       "same per-app guide; Scan your cards gets its own row; and the ways group leads with the first-timer line (precons, then scan or search). "
                       "Then every way a file can go.")
            + frames(frame("<b>Empty</b> · 390", P(F.rest(False), h=1230)),
                     frame("<b>How to export</b> · 390 · sheet", P(F.rest(False), h=1230, over=F.guide_sheet(False))),
                     frame("<b>Upload failed</b> · 390", P(F.failed(False), h=1230), "Shipped words; the press can be tried again at once."),
                     frame("<b>No Name or Quantity column</b> · 390", P(F.no_column(False), h=1230),
                           "Today: <i>We couldn’t read this file: header missing Quantity column.</i> Now it says what to do."),
                     frame("<b>Partial match</b> · 390", P(F.partial(False), h=1230), "The shipped review, with one line saying why the skipped names stay out."),
                     frame("<b>Success</b> · 390", P(F.success(False), h=1230, locked=False), "Step 2 opens on the count of commanders the cards can build."), gap=40)
            + gapv()
            + frames(frame("<b>Empty</b> · 1300", D(F.rest(True), h=920)), frame("<b>How to export</b> · 1300 · modal", D(F.rest(True), h=920, over=F.guide_sheet(True))), gap=60)
            + gapv(30)
            + frames(frame("<b>No Name or Quantity column</b> · 1300", D(F.no_column(True), h=920)),
                     frame("<b>Success</b> · 1300", D(F.success(True), h=920, locked=False)), gap=60)
            + gapv()
            + frames(frame("<b>First-timer</b> · scanning", F.scan_fragment(), "A line under the shipped count card: how many of the cards scanned are commanders you can build."),
                     frame("<b>First-timer</b> · Import a deck", F.import_fragment(), "The Moxfield deck-link note, under the box where a pasted link would fail."),
                     col(L.note("The first-timer path", "<ol><li><b>Precons I own</b>: one press per precon, a whole deck and its commander. The commander list lights.</li>"
                                "<li><b>Add the rest</b>: scan them with the phone’s camera, or search for them by name.</li>"
                                "<li>Step 2 opens as soon as one card is in, as shipped. The rest of the box can come later, by scan or Collection Sync.</li></ol>"), w=440), gap=60))
    return doc("Landing · first run", body, 2760)


# ------------------------------------------------------------ 10 · written for real, free and credits
def written_free():
    def costs(d):
        rows = ('<div class="pr2"><div class="row"><b>Credit pack</b><span class="amt">$5</span><span>40 credits that never expire</span></div>'
                '<div class="row"><b>Monthly plan</b><span class="amt">$5 a month</span><span>50 credits a month; unused ones roll over</span></div></div>'
                '<p class="fnote" style="font-size:13px;margin-top:12px">Credits are bought once you’re in. Browsing stays free either way.</p>')
        head = '<div class="mh"><h3>What credits cost</h3><span class="x">✕</span></div>'
        if d:
            return '<div class="scrim"></div><div class="mdl">' + head + rows + '</div>'
        return '<div class="scrim"></div><div class="sheet"><div class="grab"></div>' + head + rows + '</div>'
    fp = L.free_vs(False)
    fd = L.free_vs(True)
    body = (board_head(T, "Written for real, and free versus credits",
                       "Stored writing a visitor reads without a call, with public pages on: each commander opens its page. Then the free "
                       "and credits block, and its one link to prices.")
            + frames(frame("<b>Written for real</b> · 390", L.lp(L.written(False), False)),
                     frame("<b>Free and credits</b> · 390", L.lp(fp, False)),
                     frame("<b>What credits cost</b> · 390 · sheet", L.lp(fp + costs(False), False), "Each price on one line, its words under the name."),
                     frame("<b>ⓘ open</b> · 390 · Suggested changes", L.lp(L.free_vs(False, tip="Suggested changes"), False),
                           "A press on ⓘ opens a popover under it; a press outside or on another ⓘ closes it. One open at a time."), gap=40)
            + gapv()
            + frames(frame("<b>Written for real</b> · 1300", L.lp(L.written(True), True)), gap=60)
            + gapv(30)
            + frames(frame("<b>Free and credits</b> · 1300 · What credits cost open", L.lp(fd + costs(True), True)), gap=60)
            + gapv(30)
            + frames(frame("<b>ⓘ open</b> · 1300 · Overview of a deck", L.lp(L.free_vs(True, tip="Overview of a deck"), True),
                           "Desktop opens on hover or focus, and on press for touch. The same words in both."), gap=60))
    return doc("Landing · written and credits", body, 1780)


# ------------------------------------------------------------ 11 · tooltips
def tooltips():
    specs = L.tip_specimens()
    body = (board_head(T, "The ⓘ on each paid tool: what it does, and what you get",
                       "Each tooltip says what the tool does in a sentence, then shows a small picture of what it gives back, drawn from the "
                       "dummy app on Sam’s cards. The words in the picture are stand-ins for stored output. Phone: a popover under the row on press; "
                       "desktop: on hover, focus or press. One open at a time; ✕-less, it closes on a press outside.")
            + f'<div style="display:flex;gap:36px;flex-wrap:wrap;max-width:1900px">{specs}</div>'
            + gapv(50)
            + frames(frame("<b>In place</b> · 390 · Overview", L.lp(L.free_vs(False, tip="Overview of a deck"), False)),
                     frame("<b>In place</b> · 1300 · Overview", L.lp(L.free_vs(True, tip="Overview of a deck"), True)), gap=60))
    return doc("Landing · tooltips", body, 1960)


# ------------------------------------------------------------ 12 · motion
def motion():
    sp = L.motion_specimens()
    rules = L.note("The motion rules",
                   "<ul><li><b>Subtle and once.</b> Everything runs once as it arrives, except the hero’s drifting cards.</li>"
                   "<li><b>Reduced motion:</b> none of it runs. Numbers, bars and diamonds draw at their end state.</li>"
                   "<li><b>Never blocks reading.</b> Text is never animated in; nothing waits on a motion to finish.</li>"
                   "<li><b>Off-screen, nothing moves.</b> The drift pauses when the hero leaves the screen.</li>"
                   "<li>The specimens here loop so the canvas shows them; on the page each runs once.</li></ul>")
    body = (board_head(T, "Motion: let the page breathe",
                       "Six small moves, drawn live. Nothing crazy: the page should feel alive, never busy.")
            + f'<div style="display:flex;gap:28px;flex-wrap:wrap;max-width:1500px">{"".join(sp)}</div>' + gapv(30)
            + col(rules, w=560))
    return doc("Landing · motion", body, 1560)


BOARDS = [
    ("Main", main, "1 · The calls"),
    ("Headline", headline, "1b · Headline and Free chips"),
    ("Page-390", page390, "2 · The whole page · 390"),
    ("Page-Desktop", page1300, "3 · The whole page · desktop"),
    ("Hero-States", hero_states, "4 · Theme, open sign-up, no numbers"),
    ("Launch-List", launch, "5 · Tell me at launch"),
    ("Collection", collection, "6 · Bring your collection"),
    ("Demo-390", demo390, "7 · Try it · 390"),
    ("Demo-Desktop", demo1300, "8 · Try it · desktop"),
    ("First-Run", firstrun, "9 · The first run"),
    ("Written-Free", written_free, "10 · Written for real, free and credits"),
    ("Tooltips", tooltips, "11 · Tooltips"),
    ("Motion", motion, "12 · Motion"),
]
