"""Wizards announcements R1: the Main board, then every board in canvas order."""
import kit
import ann as A
import annb, preb, r1b
from kit import doc, board_head
from annb import note
import push  # noqa: F401  (its CSS carries .flow2)

FLOW = [("1 · In", "Every Announcements post comes in",
         "The ingest sorts each into Secret Lair, Commander decklists or Other. All three are on from the start."),
        ("2 · Home", "A row in What’s new",
         "Kicker, title, summary, the hero in the 46×64 slot, Read on Wizards ↗. A decklists post may lead the page."),
        ("3 · Precons", "Early lists in Announced",
         "Each posted list is a tile in its set’s block, tagged early list. View-only: owned cards marked, no Start, no Overview."),
        ("4 · Release", "The release list replaces it",
         "When MTGJSON lists the box. The set leaves Announced; its precons open their shipped pages.")]

CALLS = [
    ("1", "The hero in a 46×64 slot",
     "<b>A: crop the hero to the slot</b> (drawn everywhere): radius 4, cropped to its centre, no card shadow, so it never reads as a card. "
     "Missing or failed: the plate with a post glyph in <code>--fact</code>, never a broken image. The title never clamps; the summary clamps at 2 lines. "
     "B and C are below for comparison."),
    ("2", "Can an announcement lead Home?",
     "<b>Secret Lair and Commander decklists can; Wizards news never does.</b> The hero goes landscape in the lead band (phone: 164px across the top at −1.5°; desktop 272×153 at −3°). "
     "<code>LEAD_PRIORITY</code>: spare-request, trade-match, combo, price-drop, <b>commander-decklists</b>, new-precon, new-set, <b>secret-lair</b>. Board 3."),
    ("3", "The “Pick what else” offer",
     "Default-on kinds fill the window, so the offer can’t wait for an empty feed. <b>While the reader has never chosen, What’s new ends with one line</b>: "
     "“Pick what else you want to hear about…” with Pick ▾ and ✕. Pick opens the shipped boxes in place; ✕ saves an empty choice and the line is gone. Board 4."),
    ("4", "A decklists row’s two presses",
     "<b>Both, one line</b>: <i>See the lists ›</i> (in-app, to the set’s block in Announced) first, <i>Read the post ↗</i> muted after. A push of it opens the post."),
    ("5", "The early mark",
     "The words <b>early list</b> in <code>--fact</code> ink on the tile’s sub-line, no box (R1b); the tile stays solid (dashed means nothing to open). "
     "The page carries a dashed <code>--fact</code> band. Boards 6 and 7."),
    ("6", "A kind switched off and Precons",
     "<b>Precons is unaffected</b>, as engineering prefers. The switch governs Home rows and pushes only. Board 6."),
    ("7", "Kind names (for /copy-review)",
     "<table class=\"tbl\"><tr><th>Kind</th><th>Settings</th><th>Row kicker</th></tr>"
     "<tr><td><code>secret-lair</code></td><td>Secret Lair drops</td><td>Secret Lair</td></tr>"
     "<tr><td><code>commander-decklists</code></td><td>Commander decklists</td><td>Commander decklists</td></tr>"
     "<tr><td><code>wizards-other</code></td><td>Other Wizards news</td><td>Wizards news</td></tr></table>"
     "The three rows sit after New precons in Settings. Board 5."),
]

GAPS = [("Quiet line casing", "<code>Quiet</code> lowercases kind names, which would print “secret lair”. Each kind needs its own inline form (board 4)."),
        ("Early seen key", "Early lists use <code>early:&lt;code&gt;</code>, apart from <code>lists:&lt;code&gt;</code>, so seeing them never hides the release news."),
        ("Unmatched lines", "Lines the catalog can’t match are kept, by the post’s words, in a last group <i>Not in our catalog yet</i>; they count toward M, never toward owned (board 7)."),
        ("Early list address", "Its own route; once the release list lands it redirects to the release page (board 8)."),
        ("Fixtures", "“Foundations Commander” (FDC, Nov 13) and its five lists are fixtures from the precon grid, not a real announcement. Friend names Colin, Peter, Max, Chris.")]


def options():
    p = dict(A.POSTS["sl"])
    def opt(lab, shape, cap):
        return (f'<div class="fr"><div class="lab">{lab}</div><div class="ph d4n" style="display:block;width:390px;height:auto;padding:6px 0;border-radius:14px">'
                f'{A.arow("sl", False, shape=shape, chg=False)}</div><p class="cap">{cap}</p></div>')
    return ('<div class="frames" style="gap:36px">'
            + opt("<b>A · crop to the slot</b> · recommended", "card", "Same footprint as every shipped row; the column of pictures stays one width.")
            + opt("<b>B · wide 86×64</b>", "wide", "Shows more of a landscape hero, but the text column jumps for these rows only.")
            + opt("<b>C · no picture</b>", "nopic", "Quietest, but the row loses the art Hugh likes and reads unfinished beside its neighbours.")
            + "</div>")


R1B = [("9", "Settings: In app and Push columns",
         "Hugh: boxes bookending each row don’t say what they are. <b>A</b>: section <b>Notifications</b>, both boxes on the right under heads <b>In app</b> and <b>Push</b>, "
         "the device row in its own band above. B (labelled chips) and C (two lists) drawn for comparison. Every Settings frame now uses A."),
        ("10", "Precons: <i>new</i> in the line",
         "Hugh: the boxed <code>new</code> floats beside the name and <i>in 15 days</i>. <b>A</b>: no box; <i>new</i> leads the set’s mono meta line in accent, as the precon tiles "
         "already say <i>new · you own…</i>. <i>early list</i> loses its box too. B (Home’s diamond) drawn for comparison. Changes the shipped <code>NEW_TAG</code>."),
        ("11", "A smaller box-and-arrow link-out icon",
         "Hugh: the &#8599; is too large. The standard external-link icon, 0.72em, replaces it app-wide (about 30 places, some in copy strings). Every board now draws it.")]


def main_board():
    flow = '<div class="flow2">' + "".join(f'<div class="st"><em>{a}</em><b>{b}</b><span>{c}</span></div>' for a, b, c in FLOW) + "</div>"
    calls = "".join(note(f"Call {n} · {t}", b) for n, t, b in CALLS)
    gaps = "".join(f'<tr><td><b>{g}</b></td><td>{b}</td></tr>' for g, b in GAPS)
    idx = ("<ol><li><b>Home-Rows</b>: each kind, seen and unseen, at 390 and 1300.</li>"
           "<li><b>Row-States</b>: long text, missing hero, 3 of 5 then all lists, dismissed.</li>"
           "<li><b>Lead-Story</b>: a post leading Home, and its push.</li>"
           "<li><b>Offer</b>: the opt-in line, and a kind switched off.</li>"
           "<li><b>Settings</b>: all on, one off, push unavailable, a failed save.</li>"
           "<li><b>Announced</b>: early lists in the set’s block.</li>"
           "<li><b>Early-List</b>: the view-only page and its states.</li>"
           "<li><b>Release-Arrival</b>: the release list replaces it.</li>"
           "<li><b>R1b-Settings</b>, <b>R1b-New-Mark</b>, <b>R1b-Link-Icon</b>: Hugh’s three notes.</li></ol>")
    body = (board_head("Wizards announcements · R1 and R1b", "Every post comes in; early decklists are view-only until the release list",
                       "Brief <code>2026-10-29-wizards-announcements.md</code> (#2373). Hugh’s rulings held: every Announcements post comes in, sorted into Secret Lair, Commander decklists and Other, "
                       "all three on by default, each can be turned off; early decklists are view-only with owned cards marked, no Start and no Overview until the release list replaces them. "
                       "Builds on <code>design_handoff_the99_menu_home</code> (rows, lead, Settings) and <code>design_handoff_the99_upcoming_precons</code> (Announced). "
                       "Orange dashed outlines mark what is new against the shipped page. Copy is placeholder for /copy-review.")
            + flow
            + '<h3 class="mh">R1b · Hugh’s three notes</h3>'
            + '<div class="notes">' + "".join(note(f"Board {n} · {t}", b) for n, t, b in R1B) + "</div>"
            + '<h3 class="mh">The seven open calls</h3>'
            + f'<div class="notes">{calls}</div>'
            + '<h3 class="mh">Call 1 · the three shapes</h3>' + options()
            + '<div class="notes" style="grid-template-columns:2fr 1fr;margin-top:24px">'
            + f'<div class="note"><b>Gaps for engineering</b><table class="tbl">{gaps}</table></div>'
            + note("The boards", idx) + "</div>")
    return doc("Wizards announcements · R1", body, 1612).replace("</style>", ".mh{font:600 13px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);margin:28px 0 12px}</style>", 1)


BOARDS = [("Main", main_board, "R1 · the flow, calls, gaps")] + annb.BOARDS + preb.BOARDS + r1b.BOARDS
