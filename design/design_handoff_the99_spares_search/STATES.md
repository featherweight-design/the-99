# States · find a friend's spares (R1)

## Spares tab (a friend's page)

| State | Frame | Grid | Result line | Boards |
|---|---|---|---|---|
| Rest | wide chassis ≥1000 / compact head <1000, `No filters on` | Wanted first | `25 spares` | P1, D1 |
| Search by name or type | field holds the query, ✕ clears | matches only | `3 of 25 spares` | P2, D2 |
| A filter on | chip per value; compact: badge on Filters, chip shelf | matches | `4 of 25 spares` | P3, D3 |
| Panel open (desktop) | `Wanted ▾` / `Type ▾` popover, counts respect the other filters, 0 dims | live behind it | live | D3, D4 |
| Filters sheet (phone) | Wanted, Color identity, Type, Done; `4 of 25 match` | behind the scrim | sheet's own status | P3 |
| No results | frame stays | `ZeroState`: heading, body, Keep only search (query and filter), Clear all filters | `0 of 25 spares` | P4, D5 |
| Empty / not sharing | none | shipped empty card | — | P5, D6 |
| `?spare=` landing | as shipped | modal opens over its tile | — | — |

Tile caption lines: `N spares` · `▮ on your wishlist` (shipped) · `◌ a deck needs it` / `◌ N decks need it` (new) · ask state (shipped).

## Wishlist tab

| State | Tile | Meta row | Boards |
|---|---|---|---|
| Spares reading | as shipped, no press | `9 wanted` | W0, D1 |
| No friend has it | as shipped | key only if another tile draws a press | W1 |
| One friend | press: glyph | + `friend has a spare` | W1, W3 |
| Two or more | press: glyph + count | same | W1, W3, D2 |
| Requested / accepted | glyph with accent dot / green tick | + `requested` / `accepted` | W1 (Zimone) |
| Press open | press ringed, `Friends with a spare` modal (sheet on phone) with Ask | — | W2, D3 |
| Read failed | as shipped, nothing said | — | — |
| No friends | no read, as shipped | — | — |
| Sort: Friends' spares (desktop) | presses first, most friends first, then newest | — | D4 |
| A friend's wishlist (their page) | no press | — | — |
