"""Public landing page R1 boards (account 2, 2026-11-08)."""
import kit
from kit import doc, board_head, frame, frames
import lp as L
import fr as F

T = "Public landing · R1"


def col(*xs, w=440, gap=14):
    return f'<div style="display:flex;flex-direction:column;gap:{gap}px;width:{w}px;flex:none">' + "".join(xs) + "</div>"


def gapv(h=40):
    return f'<div style="height:{h}px"></div>'


# ------------------------------------------------------------ 1 · Main: the calls
def main():
    n = L.note
    calls = [
        n("1 · The hero’s screen: a framed composite of two real captures",
          "Commanders (what you can build) over a deck, fanned with a slight tilt; on desktop the desktop Commanders page with the phone over its "
          "corner. No loop: a loop is motion to pause for reduced-motion readers, six themes of frames to keep, and the demo already walks the "
          "product. Captures come from the fixture (si10), never a real account."),
        n("2 · Theme switch: yes, six swatches under the hero",
          "<i>See it in</i> and six round swatches (each theme’s ground and accent), the chosen one ringed and named. A press sets the same "
          "<code>the99_theme</code> cookie the app reads and re-themes the whole page, captures included (si10 shoots every theme). "
          "On the phone it sits under the screen; on desktop under the words."),
        n("3 · Demo liveness: A, the capture walk, inline on the page",
          "<b>A ships with the landing</b>; B waits on about nine refactors of signed-in tools first. The brief’s own target is a minute of "
          "pressing, one press per step, which a press-through gives in full. A also keeps every result exactly what the tool wrote, with no "
          "half of a live tool drifting from the signed-in one. <b>Frame:</b> inline, a stage in the Try it section (the same at 390 and "
          "desktop): <i>Step N of 8</i>, an 8-segment bar, <i>Skip to the end</i> top right; the capture with a numbered ring on the thing "
          "the step is about; then the tags, title, two lines, Back and Next, and the main button’s line at the foot. No sheet or "
          "full-screen walk: nothing to close, and the page keeps scrolling under it."),
        n("4 · Demo order: eleven steps merged to eight",
          "1 Collection · 2 Commanders · 3 Help me choose · 4 The deck · 5 Analysis and Overview · 6 Suggested changes · 7 Get it to 99 "
          "(Proposed cuts with Look deeper, Top off, Mana Balance) · 8 Buy only what’s missing, with Which deck needs it most?. Every tool "
          "appears once; each AI step shows the stored result under the tool."),
        n("5 · Export guides: an expandable row per app, words only",
          "ManaBox, Moxfield, Archidekt and Deckbox each open three short steps in place. No screenshots of other apps (they change without "
          "telling us, and they are other companies’ screens) and no logos. The same rows open from the first run in a sheet (phone) or "
          "modal (desktop). The steps need a check against each app before the build."),
        n("6 · The first-timer path: precons first, then scan the legends",
          "One press of Precons I own lands a whole deck with its commander, so the commander list lights at once. Then scan legendary "
          "creatures first: each is a commander, and the scan’s count card says how many of the cards scanned are commanders you can build. "
          "That line is how the screen says “enough to start”: no target count. Scan moves out of Add cards by hand into its own row."),
        n("7 · Free versus credits: both",
          "A Free or credit tag where each loop step and each demo step is shown, and one two-column block (Free, always · With credits) "
          "with “15 welcome credits” and “one free credit a day” under it. Prices sit one press away: <i>What credits cost</i> opens a "
          "sheet (phone) or modal (desktop) with the pack and the plan, so no dollar figure is on the page itself."),
        n("8 · Written for real: two commanders and one precon Overview",
          "Two commander reads with their art, each opening <code>/commander/&lt;slug&gt;</code>, and one precon’s stored Overview "
          "lead (it needs <code>precon_synopses</code> on the public-read allowlist). Picks vary their openings, and they are read at "
          "build time from stored rows, never typed into copy. It stays its own section, after the demo, rather than folding into it."),
    ]
    rules = [
        n("Every state, the rules",
          "<ul><li><b>A signed-in reader at /</b> sees Home exactly as today; the landing renders only with no session.</li>"
          "<li><b>Numbers unavailable:</b> the strip drops whole, never shows a zero (Hero board).</li>"
          "<li><b>Already on the list</b> draws exactly as sent, so the page never says whether an address is listed.</li>"
          "<li><b>Open sign-up</b> is a copy and route change: the field goes, <i>Sign up free</i> opens Clerk’s sign-up.</li>"
          "<li><b>Reduced motion:</b> nothing on the page moves by itself.</li></ul>"),
        n("About the captures on these boards",
          "Every product screen here is <b>today’s About capture standing in</b>, stamped in blue. Today’s captures sit on a real account, "
          "so the build uses only the si10 re-shoot on the fictional fixture (Sam’s binder). Where the walk shows a stored AI result "
          "that no capture holds yet, a blue dashed slot names the capture owed. Proxies, Home feed and Versions captures are not used."),
        n("The appendix: two toast questions (answers in the README)",
          "<ol><li><b>The got-it receipt</b> stays as it is, as the one named exception: a receipt, not a toast, may carry History beside its "
          "Undo, with Change in its body. No other toast takes a second press.</li>"
          "<li><b>Yes, every toast with no action carries the ✕.</b> The rule becomes “exactly one press per toast: its action, or the ✕”. "
          "Two shipped toasts gain it: the token refusal and the credits toast.</li></ol>"),
    ]
    legend = ('<div class="legend"><span><i style="outline:1.5px dashed rgba(207,135,69,.8)"></i>new or changed on a shipped screen</span>'
              '<span><i style="background:#8FA6BE"></i>today’s capture standing in for the fixture re-shoot</span>'
              '<span><i style="border:1.5px dashed rgba(143,166,190,.7)"></i>a capture owed</span></div>')
    body = (board_head(T, "The public landing page: eight calls",
                       "The signed-out <code>/</code> becomes a showcase that makes a visitor want an account: the hero with the main button, "
                       "real catalog numbers, the loop, bringing a collection in, an interactive demo on a made-up player’s cards, stored "
                       "writing, free versus credits, the close and the Fan Content notice. Invite-only today (<b>Tell me at launch</b>), "
                       "with the open sign-up state drawn too. Recommendations below; the boards follow in reading order. Copy marked DRAFT "
                       "in the README goes to <code>/copy-review</code>.")
            + legend
            + '<div class="notes" style="grid-template-columns:repeat(4,minmax(0,1fr));max-width:2000px">' + "".join(calls) + "</div>"
            + '<div class="notes" style="max-width:2000px">' + "".join(rules) + "</div>")
    return doc("Landing · the calls", body, 2120)


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
                       "The theme switch re-themes the page and its captures (Neon Rain shown, after a press on its swatch). Open sign-up "
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
                       "Each app the parser names opens its own three steps in place, one at a time. Another app and a pasted list say "
                       "what works without a guide. The no-app group leads to the first-timer card.")
            + frames(frame("<b>The section</b> · 390", one(None)), frame("<b>ManaBox open</b> · 390", one("ManaBox")),
                     frame("<b>Moxfield open</b> · 390", one("Moxfield")), frame("<b>Archidekt open</b> · 390", one("Archidekt")),
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
    head = board_head(T, f"Try it: the capture walk · {'desktop 1300' if d else '390'}",
                      "Inline on the page: the stage replaces the start card in place and the page does not jump. One press per step; "
                      "Skip to the end at any step lands on the end, which says what was skipped. The main button’s line sits at every "
                      "step’s foot and the form at the end. Nothing typed reaches anything: Sam’s wishes are read-only.")
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
                       "same per-app guide; Scan your cards gets its own row; and the ways group leads with the first-timer path. "
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
            + frames(frame("<b>First-timer</b> · scanning", F.scan_fragment(), "A line under the shipped count card: how many of the cards scanned are commanders. That is the “enough to start” signal."),
                     frame("<b>First-timer</b> · Import a deck", F.import_fragment()),
                     col(L.note("The first-timer path", "<ol><li><b>Precons I own</b>: one press per precon, a whole deck and its commander. The commander list lights.</li>"
                                "<li><b>Scan your cards</b>, legends first: the count card counts commanders as they come.</li>"
                                "<li>Step 2 opens as soon as one card is in, as shipped. The rest of the box can come later, by scan or Collection Sync.</li></ol>"), w=440), gap=60))
    return doc("Landing · first run", body, 2760)


# ------------------------------------------------------------ 10 · written for real, free and credits
def written_free():
    def costs(d):
        rows = ('<div class="pr"><div><div><b>Credit pack</b><span>40 credits that never expire</span></div><span class="amt">$5</span></div>'
                '<div><div><b>Monthly plan</b><span>50 credits a month, unused ones roll over</span></div><span class="amt">$5 a month</span></div></div>'
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
                     frame("<b>What credits cost</b> · 390 · sheet", L.lp(fp + costs(False), False)), gap=40)
            + gapv()
            + frames(frame("<b>Written for real</b> · 1300", L.lp(L.written(True), True)), gap=60)
            + gapv(30)
            + frames(frame("<b>Free and credits</b> · 1300 · What credits cost open", L.lp(fd + costs(True), True)), gap=60))
    return doc("Landing · written and credits", body, 1500)


BOARDS = [
    ("Main", main, "1 · The calls"),
    ("Page-390", page390, "2 · The whole page · 390"),
    ("Page-Desktop", page1300, "3 · The whole page · desktop"),
    ("Hero-States", hero_states, "4 · Theme, open sign-up, no numbers"),
    ("Launch-List", launch, "5 · Tell me at launch"),
    ("Collection", collection, "6 · Bring your collection"),
    ("Demo-390", demo390, "7 · Try it · 390"),
    ("Demo-Desktop", demo1300, "8 · Try it · desktop"),
    ("First-Run", firstrun, "9 · The first run"),
    ("Written-Free", written_free, "10 · Written for real, free and credits"),
]
