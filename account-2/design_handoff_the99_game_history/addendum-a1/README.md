# Game history · Addendum A1 (account 2, 2026-11-01)

Canvas: https://claude.ai/artifact/1XCrDWAFPn2LzCJtTHvrqU (board "A1 · Audit")
Status: **A1, awaiting Hugh's audit.**

Answers the engineering audit on #2551 (lane c4, ORANGE). `A1.dc.html` needs `support.js` beside it and `../art/`.

| Frame | What |
|---|---|
| Z1 · 390, Z2 · 1300 | **Filters with no matches** (Sai, Colin, Won). The chips, Clear all filters and the count *0 games* stay. The headline, its lines, most played and the month heads go. One line, **No games match**, and one way out, **Clear filters**, matching the shipped Decks filter empty (`refresh.ts` `emptyHeading` / `emptyAction`). |
| Z3 · 390 | The sheet before it closes. Counts are within the other filters (Won 2, Drawn 0). A zero option stays pressable, the button reads *Show 0 games*, and closing it lands on Z1. |
| P1 · 390, P2 · 1300 | **Games pressed, first read running.** Same as Stats' `busy`: Games takes the fill with the shell's 4px pending diamond, the deck tiles stay drawn until the read lands, and a second press is ignored. A failure falls back to Decks with the toast (X1). |
| L4 · 1300 | **The next fifty failed.** The shared toast in the desktop slot with Try again. The foot returns to *Show 50 more*. |

Errata (no frame change):
- F1/F4 read *One game logged.* (shipped `gameLogCopy.oneGame`).
- `SOCIAL_GAMES_ENABLED` and `LINEUP_ENABLED` are retired: R3–R4 read "friends off" (`SOCIAL_FRIENDS_ENABLED`), and the Games segment draws when the page passes `lineup`.
- Friend names in the list, chips and summary lines go through `PersonName`/`PersonText`. A gone account reads as logged in rows but is not offered as a filter.
- Three DRAFT lines go to `/copy-review`: the empty body, the 1–2 game line, and the Rule 0 line.
- `Edges.dc.html` was redrawn: the phone capture in X1 no longer shows the capture's own tab bar.

New strings: `games.noMatch` "No games match", `games.clearFilters` "Clear filters", `games.sheetShow(n)` "Show N games" (with 0).
