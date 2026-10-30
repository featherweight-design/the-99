# States — change commander R3

| # | Surface | State | Drawn | Notes |
|---|---|---|---|---|
| 1 | Header | single commander | 1a | `Change commander` |
| 2 | Header | pair | 1b | `Change pair` |
| 3 | List | several (owned, held, in 99, no data, to buy) | 2a | Yours whole, To buy 8 + more |
| 4 | List | a figure open | 2b | one at a time |
| 5 | List | pair deck, mixed pair | 2c | mixed sorts in To buy |
| 6 | List | only unowned | 3a | `You own none of them yet.` |
| 7 | List | none, single / pair | 3b | copy.none / copy.nonePair |
| 8 | List | loading | 3c | lede + 4 skeleton rows, `role=status` |
| 9 | List | failed | 3d, R3-D | Analysis 2c composition; bone Try again |
| 10 | List | no deck data | 2a (Kaheera) | not a button; last in group |
| 11 | List | candidate in the 99 | 2a (Pantlaza) | mark replaced; confirm is a trade |
| 12 | List | Show more pressed | — | +8, focus first new row; hidden when none left |
| 13 | Confirm | leaves / leads, to buy | 4a | buy line |
| 14 | Confirm | trade | 4b | ⇄, body stays whole |
| 15 | Confirm | pair | 4c | two plates a side |
| 16 | Confirm | brew | 4c | no version: only another change undoes |
| 17 | Confirm | writing | — | `Changing…` at .6, not disabled |
| 18 | Confirm | failed | 4d, R3-D | danger line below the buttons; primary `Try again` |
| 19 | Deck page | after swap | 5a | new band; no chip; banner line |
| 20 | Deck page | after trade / pair | 5b | +1/−1 and command-zone hints |
| 21 | Review | swap / trade / pair | 5c, 5d | Commander section first |
| 22 | Discard | after a swap | — | consequence names the old commander back (copy.discard) |
| 23 | Price | no price for a to-buy half | — | BuyTag's own absent/sold-out states |
| 25 | List | a name opened | R3-C | existing CardModal, stacked; `← Change commander` |
| 26 | Row / confirm | mana value | R3-A, R3-B | CostPips + (n less/more than …) |
| 27 | Header | door, joined plate | R3-E | brew with Commit as v1; pair |
| 24 | Availability | claim read failed | — | marks absent; groups fall back to owned/unowned from the collection |
