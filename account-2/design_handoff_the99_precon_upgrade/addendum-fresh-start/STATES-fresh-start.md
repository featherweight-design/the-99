# STATES · Upgrade, coming back (addendum fresh start, R1)

What the press opens, on the precon page and in the deck page's band. Read top to bottom: the first state that holds wins.

| # | When | The press opens | Board |
|---|---|---|---|
| 1 | A run is pending (this tab's or one begun elsewhere) | The wait, as A3. The press reads `Upgrading toward X · 0:05` | F3 |
| 2 | The newest kept run landed and was never shown (G25) | Its result, once, with the tracker and History link (A3). Showing it marks it seen | F3 |
| 3 | Kept runs, all seen | The start screen: `Your last upgrade` row over the intro | F1, F2 |
| 4 | No kept runs | The intro as shipped, no row, no History link | F4 (S0) |

## The start screen's row (`RunRow`)

| Run | Second line | Opened from the row |
|---|---|---|
| A deck was started from it, or it was applied (G26 names the deck) | `14 swaps · in Prismari Artistry` (faint) | Result with `‹ Back`, dashed note `Already in Prismari Artistry. Opening it again uses no credit.`, press live |
| Unused | `14 swaps · no deck yet` (`--accent-text`) | Result with `‹ Back`, no note, Start / Apply live |
| Short run (credits back) | `9 swaps · credits back · no deck yet` (wraps on a phone) | As above, with the shipped short line |
| Over an old list | as above | Shipped `listChanged` line in the foot, press off |

History lists every kept run with the same row. A row opened from History keeps `‹ History` as shipped; the note follows the table above.

## Moving between them
- Start screen → row → result → `‹ Back` → start screen (picks untouched; nothing charged).
- Start screen → History → row → `‹ History`. History → New upgrade → start screen.
- Start screen → `Next · Commander` → steps as shipped. Credits kept-picks return (G22) still reopens at Strategy.
- Result (any) → Try another strategy → Strategy with the run's commander and bracket, as shipped.
- ✕ anywhere closes. The next press follows the table again.

## Must-nots
- Never reopen an old result on its own: only an unseen one opens by itself (state 2).
- Never hide History on the start screen, and never add a second way to the list.
- Never lock a past run: opening one is free, and its Start or Apply stays live while the list still fits.
- Never block a new run because an unused one exists.
- No status chip or stamp on the row: the words go on its existing mono line.
- No row while a run is pending: the wait owns the window.
