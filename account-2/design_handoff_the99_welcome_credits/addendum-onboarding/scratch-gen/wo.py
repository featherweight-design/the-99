"""Where credits work · addendum onboarding (account 2, 2026-11-12).

Every frame is a PNG of the SHIPPED components rendered with the shipped CSS (Low Sun), from a scratch copy of main with
wopatch.diff applied (the proposal as code, reference only): WhereCreditsWork in SocialModal over FirstRunChecklist with
WelcomeStrip, MobileHeader/TabBar/NavRail locked. The tour card is TourRun's markup copied into render.tsx (TourRun needs a
browser), placed and cut out by post.js the way placeCard/cutoutFor do. Recipe: the A3 one
(design_handoff_the99_public_landing/scratch-gen/a3). Boards use the precon-upgrade kit.py and up.py.
python3 wo.py out        -> boards with art/ paths (the handoff folder)
python3 wo.py out blob   -> boards with /_blob urls (the canvas)
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "../../../design_handoff_the99_precon_upgrade/scratch-gen"))
import kit
from kit import doc, board_head, frame, frames
from up import note

OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
BLOB = json.load(open(os.path.join(HERE, "woblobs.json"))) if "blob" in sys.argv else None
kit.CSS += r"""
.shot{display:block;border-radius:14px;border:1px solid var(--border-strong);background:var(--bg)}
.shot.ph{width:390px}
.shot.dk{width:650px}
.shot.dkf{width:1300px}
"""


def src(n):
    n = f"wo-{n}.png"
    return BLOB[n] if BLOB else f"art/{n}"


def shot(n, cls):
    return f'<img class="shot {cls}" src="{src(n)}" alt="">'


CALLS = [
    "<b>The sixth row is <code>Upgrade this precon</code>, where <code>A precon’s page</code>, priced <code>2 per run</code>.</b> Same row, same pill, same ink. "
    "The five 1-credit pills stay bare (<code>each</code>, <code>per run</code>), and a number leads a pill only where a run can cost more than 1, as Suggested changes’ shipped <code>1 or 2 per run</code> already does. So the 2 is the first thing in its pill, and nothing new is added to say it. A screen reader hears <code>2 credits per run</code>. "
    "The name is the press’s and the landing row’s (<code>Upgrade this precon · 2 credits</code>, the credits-path addendum).",
    "<b>Where the row sits.</b> Last, as on the landing. With cards and no deck it moves up beside Help me choose, over the <code>Needs a deck, and you have none yet.</code> line, because it needs no deck of yours: the precon is the deck. "
    "<code>Try it ›</code> goes to the precon list (<code>/decks/precons</code>), where a run starts on the precon the player picks. Before a collection it sits under the lock line with the other five, as Decks is locked then.",
    "<b>First run: a stop in the first-run tour, not a sheet that opens itself.</b> <code>5 of 7 · Credits</code>, after Buying (what a deck costs) and before Your look. "
    "It lights the welcome strip, the way What’s new lights the About line, and its card is the inline list: the six rows as name and cost, under the title <code>Where your credits go</code> and R4’s line with the free-credit-first clause. "
    "The where lines and <code>Try it</code> stay in the sheet: nothing runs before a collection, and the card must stay short enough to sit over the page on a phone. Its foot points at the lit strip’s <code>Where they work</code>, which opens the full sheet any time.",
    "<b>Why not the same sheet.</b> Opening by itself over the first-run Home, it would be a moment, and the tour already takes the first visit (no moment arrives the same visit). Opened from the tour, it would be a sheet over the scrim, two layers to close. "
    "<b>Why not a list in the checklist:</b> that was welcome credits R1, ruled too large.",
    "<b>On a phone the stop brings the strip to the top</b> (as step 1 already scrolls its card up), so the docked card sits under it, over the page, never over the strip.",
    "<b>The stop shows only while the strip draws</b> (a live lot not closed). Without it the tour is the shipped six stops and its foot says <code>Six stops</code>. The tour taken again from the account menu gets the stop while the dashboard’s strip draws.",
]
GAPS = [
    "<b>G22 · The row follows the reader’s switch.</b> <code>writtenForYou</code> takes the reader’s <code>PRECON_UPGRADE_ENABLED</code> and leaves the row out when it’s off (wopatch.diff). The landing’s own claim is the credits path’s G21.",
    "<b>G23 · Try it and the no-deck lead.</b> <code>welcomeSheet</code> puts <code>upgrade</code> in <code>lead</code> beside <code>help-me-choose</code> when the reader has no deck, and its <code>tryHref</code> is <code>/decks/precons</code> whenever rows are live.",
    "<b>G24 · The tour stop.</b> A <code>credits</code> step (banner cutout, below-start, target <code>tour:welcome</code> registered by the strip) between <code>buying</code> and <code>look</code>; <code>stepsFor</code> drops it when the strip has no target, so the kicker and the diamonds count 6 or 7; the foot reads <code>footSeven</code> with it. At 390 its scroll brings the strip to 14px under the top, as step 1’s does.",
    "<b>G25 · About.</b> If About’s tour entry counts six stops, it says seven while the stop can show: Hugh’s call at the next About batch.",
    "Locked and unchanged: welcome credits stay 15, no bundle or recipe; the sheet keeps name, where and cost, its grant line and its teaser. All new copy is DRAFT (<code>copy strings.ts</code>).",
]
W = 4 * 390 + 3 * 36 + 112


def b_main():
    body = (board_head("Where credits work · addendum · onboarding", "Upgrade gets a row, and first run shows where credits go",
                       "Hugh’s brief: add Upgrade this precon as a sixth row, the only tool at a flat 2 credits, without breaking the row pattern; and show the list in first-run onboarding, after the 15 credits are granted (they are granted at sign-up, so from the first Home). "
                       "Every frame is the shipped sheet, Home and tour rendered with the shipped CSS (Low Sun), with this addendum applied.", tag="W R1")
            + note("Design calls", CALLS, True) + note("Gaps for engineering", GAPS)
            + frames(frame("<b>S2</b> · 390 · the sheet with cards, no deck", shot("sheet-nodeck-phone", "ph"), "Upgrade leads with Help me choose; <code>2 per run</code> in the shipped pill."),
                     frame("<b>O1</b> · 390 · the tour’s Credits stop", shot("tour-credits-phone", "ph"), "The strip lit, the six rows inline."),
                     frame("<b>O1</b> · 1300 · the same <i>(half size)</i>", shot("tour-credits-desktop", "dk"), "Placed under the strip, as What’s new is under its line."), gap=36))
    return doc("Onboarding addendum calls", body, W)


def b_sheet():
    body = (board_head("S · The sheet", "Six rows, name, where and cost",
                       "The shipped sheet (390) and modal (1300) in its three shapes, with the shipped five-row sheet first for reference. Only the sixth row and, with no deck, its place in the lead change.", tag="W R1")
            + frames(frame("<b>S0</b> · 390 · shipped, cards and no deck", shot("sheet-nodeck-shipped-phone", "ph"), "For reference."),
                     frame("<b>S1</b> · 390 · before a collection", shot("sheet-locked-phone", "ph"), "Under the lock line with the rest. No Try it."),
                     frame("<b>S2</b> · 390 · cards, no deck", shot("sheet-nodeck-phone", "ph"), "Leads beside Help me choose, over the needs-a-deck line."),
                     frame("<b>S3</b> · 390 · with a deck", shot("sheet-decks-phone", "ph"), "Last, with Try it › to the precon list."), gap=36)
            + frames(frame("<b>S0</b> · 1300 · shipped <i>(half size)</i>", shot("sheet-nodeck-shipped-desktop", "dk")),
                     frame("<b>S1</b> · 1300 · before a collection <i>(half size)</i>", shot("sheet-locked-desktop", "dk")), gap=36)
            + frames(frame("<b>S2</b> · 1300 · cards, no deck <i>(half size)</i>", shot("sheet-nodeck-desktop", "dk")),
                     frame("<b>S3</b> · 1300 · with a deck <i>(half size)</i>", shot("sheet-decks-desktop", "dk")), gap=36))
    return doc("Onboarding addendum sheet", body, W)


def b_first():
    body = (board_head("O · First run", "The tour stops at the strip",
                       "The first-run Home as shipped (the strip under the About line), then the tour’s new Credits stop: 5 of 7, after Buying. The rest of the tour is unchanged.", tag="W R1")
            + frames(frame("<b>O0</b> · 390 · first-run Home, shipped", shot("home-phone", "ph"), "The strip, and its <code>Where they work</code>, as shipped."),
                     frame("<b>O1</b> · 390 · the Credits stop", shot("tour-credits-phone", "ph"), "The strip brought up and lit; the card docked above the tab bar."), gap=36)
            + frames(frame("<b>O0</b> · 1300 · first-run Home, shipped", shot("home-desktop", "dkf")))
            + frames(frame("<b>O1</b> · 1300 · the Credits stop", shot("tour-credits-desktop", "dkf"), "The card under the lit strip, at its start, 340 wide as every stop.")))
    return doc("Onboarding addendum first run", body, 1300 + 112)


# Measured board heights (rendered at full size, plus 24px of foot).
H = {"Main": 1950, "S-Sheet": 2154, "O-First-Run": 3046}
BOARDS = [("Main", b_main, "W · calls"), ("S-Sheet", b_sheet, "S · The six-row sheet"), ("O-First-Run", b_first, "O · First run")]
if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for n, fn, _ in BOARDS:
        open(f"{OUT}/{n}.dc.html", "w").write(fn().replace('"height":1200', f'"height":{H[n]}'))
        print("wrote", n)
