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

## Picking which swaps to keep (R1c, #2985)
| State | Row | Facts and press |
|---|---|---|
| Picked (default) | Reason line + `✓ Picked` toggle at its end | As found |
| Unpicked | Both sides at 45%, chip hidden, `Not picked. <cut> stays in the deck.` + `Pick` toggle (empty box) | Title `11 swaps toward Spells · 3 not picked`; To buy, Already yours, Bracket and the press count picked pairs |
| Picked pairs under the chosen bracket | as above | Bracket `2 → 2`; line `Without the swaps you didn’t pick, it plays at bracket 2, under the 3 you chose.` Press stays on |
| None picked | Every row unpicked | Press off |
Pairs stay whole. Picks are stored on the run (G28): opening it again from the start screen or History shows them. The commander pair has no toggle.

## Must-nots
- Never reopen an old result on its own: only an unseen one opens by itself (state 2).
- Never hide History on the start screen, and never add a second way to the list.
- Never lock a past run: opening one is free, and its Start or Apply stays live while the list still fits.
- Never block a new run because an unused one exists.
- No status chip or stamp on the row: the words go on its existing mono line.
- No row while a run is pending: the wait owns the window.
- Picking never confirms, never costs a credit, and never asks for a new run.
- Never split a pair: a lone cut or add would leave the deck off 99.
- Never move the marker or buy tag right of the pips: the card row's order holds.
