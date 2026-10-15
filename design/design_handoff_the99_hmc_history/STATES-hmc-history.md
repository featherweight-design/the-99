# Help me choose history — states matrix (R1)

Fixtures: Account A's shape (a handful of runs, Oct 12 to 13), names illustrative; the long list and the deleted-deck
reason are hand-built, as the brief allows.

## List

| # | State | Phone (390) | Desktop (column) |
|---|---|---|---|
| H0 | Entry | `History` link on the form's back line, 44px, accent, history glyph. Always drawn with the switch on. | No link: the column is on screen. |
| H1 | Empty | View: `‹ Help me choose`, `History` + `your past runs`, dashed box `No runs yet` + body. | Column with the same dashed box. |
| H2 | One run | One month heading, one row, foot. | Same in the column. |
| H3 | A handful | Month headings; rows: words (2-line clamp), long ask, no-words answers line, found nothing. | Same; column scrolls inside past 560px. |
| H4 | Long list | Page scrolls; `Show 20 more` (44px) at the foot of 20; foot line. | Inner scroll region; `Show 20 more` (30px). |
| H4b | Next page failed | Rows kept; `Couldn’t load more runs. Try again.` beside the press. | Same. |
| H5 | Loading | Real heading; 3 row shapes on `.anim-skeleton`; sr-only status `Loading your past runs`. | Same in the column. |
| H6 | Failed | Failure mark + `Your past runs didn’t load. They’re kept; only the list failed to arrive.` + `Try again` (44px). | Same (40px). |
| H7 | A read in flight | Pending row on top: accent border, `reading` tag, `now`; opens the live waiting panel; settles in place (3s re-read). | Same. |
| H8 | Focus | Row: 2px accent ring, 2px offset; `Show 20 more`, `Try again`, `History` link the same. | Same; hover and focus raise the row border to `--border-strong`. |
| H9 | Back from a run | Focus on the row that opened it. | Same. |
| H10 | Switch off | No link, no view (not found). | No column. |

## Row anatomy

| Part | Rule |
|---|---|
| Words | `--fg`, 13.5px (13 column), line-height 1.45, clamp 2. |
| No words | `YOUR ANSWERS` mono 10px `--fg-faint` + answers line `--fg-body`. |
| Thumbs | First 3 picks, 22×30 (18×25 column), radius 3, art crop. None for found nothing or reading. |
| Tail | `N picks` / `found nothing · no credit used`, mono 10.5px `--fg-muted`. |
| Date | `historyDate`, mono 10.5px `--fg-faint`. |
| Chevron | `›` at 390 only. |
| Box | `--surface`, 1px `--border`, radius 9, padding 11×12 (10×12 column), min-height 60 at 390. |

## Opened run

| # | State | Phone (390) | Desktop |
|---|---|---|---|
| R1 | Opening | `‹ History`, title, meta, note draw at once; picks on the results skeleton. | Same, three card shapes + rows. |
| R2 | Past run | Shipped results page; meta `Oct 13 · 9:40 PM · a past run`; note `A past run, read-only. It used 1 credit on Oct 13; opening it again used none.` | Same, best fits as three cards. |
| R3 | Aged, some gone | Note + `7 of its 9 picks are still open to you.`; gone picks in `NOT OPEN TO YOU NOW · 2` after the picks. | Same; group two to a line; best fits refill from open picks. |
| R4 | Aged, reason not drawn | Row keeps its place; line reads `Its line named a deck you’ve since deleted.` (`--fg-faint`); sub drops `each with a line on why`. | Same. |
| R5 | Aged, all gone | Note + `None of its 9 picks are open to you now.`; gone group heads the page; then The rest of your results. | Same. |
| R6 | Nothing found | Note `A past run, read-only. It found nothing, so no credit was used.`; today's empty panel with stored `pool`, without its standing line. | Same. |
| R7 | Won't open | Failure mark + `This run didn’t load. Try again from History.` + `Back to History`. | Same. |
| R8 | Focus | Title focused on open (tabindex −1); ring on `‹ History`, `Back to History`, a gone pick's name, `Open deck`. | Same. |

## Doors

| # | State | Rule |
|---|---|---|
| D1 | New deck, has runs | `Your past runs ›` under the press (390, own 44px line, `--fg-muted`) / closing the sentence (desktop). Goes to History open. |
| D2 | New deck, no runs | Door unchanged. |
| D3 | Discover | Unchanged; no history link. |
| D4 | Switch off | No door, no link. |
