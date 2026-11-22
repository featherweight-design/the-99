# States · tablet sheet and coin toss

Tablet = `device === "tablet"` (short side ≥ 600 px), which includes a desktop window. Phone rows are unchanged unless noted.

## The sheet

| State | Tablet / desktop | Phone | Board |
|---|---|---|---|
| Closed | The table | The table | Sheet, reference |
| Open from a seat at the bottom edge | Half sheet from the bottom, veil over the rest | Full cover (shipped) | D1 |
| Open from a seat at the top edge (rot 180) | Half sheet hanging from the top, facing that seat | Full cover, turned (shipped) | D2 |
| Open from a seat on a short end (rot ±90, e.g. tablet 3 One at the end) | Half sheet from that end: 590 of 1180 deep, 820 long | Full cover, turned | E1 |
| Portrait (turned layouts) | Half sheet from the long edge the seat sits on | n/a | D5, C2 |
| Tap on the veil | Closes the sheet | n/a (no veil) | — |
| ✕ or Esc | Closes (shipped) | Closes (shipped) | — |
| Opened from a badge (focus) | Counters, the counter ringed (shipped) | shipped | C1 grid |
| History open on Table | Scrolls inside the panel | shipped | X3 |
| End game (How did it end?) | Inside the half sheet, four tiles across at ≥ 900 px (shipped grid) | shipped | rule only |
| Menu, dice or a pick opened | Closes the sheet (shipped: one popover at a time) | shipped | — |
| Game ends under an open sheet | Sheet closes (shipped) | shipped | — |
| Reduced motion | Appears at once; veil at once | shipped | — |
| Desktop window under 760 px tall | 380 px floor | n/a | D6 note |

## Commander damage (tablet / desktop)

| State | Card | Board |
|---|---|---|
| Opponent, one commander, no damage | Art fills the card; name top left; commander name and `0` stepper (− disabled) | D1 Max |
| Opponent, damage taken | Count in the accent | D1 Colin, Peter |
| Partner pair | Split art; under each half its name and a stacked stepper (count over − and +), so it fits at 4 and 5 across | D3, D7 Max |
| Seat with no deck | Plain card surface; shipped fallback name `Commander` | D3 Alex |
| One opponent (2 seats) | One card across the sheet | D4 |
| Five opponents (6 seats) | Five across | D3 |
| No opponents | Shipped `noOpponents` line | rule only |
| An opponent who is out | Unchanged from shipped (listed, steppers live) | rule only |

## The tab row (every device)

| State | Row | Board |
|---|---|---|
| Any tab selected | Commander damage, Counters, Tax, Mana, Table, together, in that order, counts unchanged | Tabs |

## Coin toss (every device)

| State | What | Board |
|---|---|---|
| Flip | 0–900 ms toss, 900–1150 ms rattle, ring from 900 ms, result card at 1150 ms | Coin K frames |
| Heads | Ends on the front face (`--rx` 0) | Coin K 0 ms face |
| Tails | Ends on the back face (`--rx` 180°) | Coin K 1150 |
| Flip again (tap the coin or the card's button) | New toss from the start (keyed on `roll.k`, shipped) | — |
| Reduced motion | Coin at rest on its face, result at once | Coin, reduced |
| Phone | Same toss at 72 px, 5 px rim | Coin, phone animation |
| Heads face | Five struck pips (W U B R G) in the ring, HEADS on the bottom arc | Faces C |
| Tails face | One struck {C}, TAILS on the bottom arc | Faces C |
| Any theme | Faces recolour with the accent (shade, light, metal mixes) | — |
| Phone faces | Same drawing at 72 px; each pip about 17 px | Faces, phone |
