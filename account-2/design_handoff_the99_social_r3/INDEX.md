# The 99 — Social R3 (opponents and matchups) · R1 handoff package (approved)

Round 3 of 3 of the social line: seating opponents in the log-a-game form, who won on a loss, the history row's
opponents, and the matchup panel on the Games tab. Phone and desktop. Behind `SOCIAL_GAMES_ENABLED` (needs friends on).

Source of truth: `docs/superpowers/design-briefs/2026-10-15-social-screens.md` (branch `brief/social-screens`).

## Start here

| Read | For |
|---|---|
| **`The 99 - Social R3 (R1).dc.html`** | **Start here: the five calls, the locks, the gaps.** |
| `R1 - Form-Desktop.dc.html` / `R1 - Form-Phone.dc.html` | Across the table in the shipped form: no friends, the picker, a friend's decks, who won, pod quick-seat, a full pod, games off. |
| `R1 - Games-Desktop.dc.html` / `R1 - Games-Phone.dc.html` | Matchups and the vs line: none yet, mostly one-game rows, colors, friends, past ten games. |
| `README.md` | Each decision with its reason; the gap list. |
| `STATES-social-r3.md` | The matrix. |
| `READINESS.md` | R1's verdict and what engineering needs. |
| `social-r3 · copy strings.ts` | Every new string, for `/copy-review`. |
| `brand/` | The locked brand sheet. |

The same canvas is live as a Design artifact in account 2. Open the `.dc.html` files with `support.js` beside them.

## The answer in one line

Seats are one optional row in the shipped form, drawn as the table you sat at; one picker seats a friend, a friend's
deck or anyone; a trophy says who won a loss; Matchups splits a deck's games by commander, colors and friend as a
square per game, never a rate.
