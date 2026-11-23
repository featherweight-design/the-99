# States · Finding the tools R1

## Collection call-out and switch (Cards tab, under the chassis)
| State | Draws |
|---|---|
| No deck, or Free count 0, or closed (✕) | Nothing. The Availability filter as shipped. |
| Free count N, nothing filtered | Call-out (`N of your cards are in no deck`) and switch, `All` chosen. |
| Availability = Free alone | Call-out and switch, `In no deck · N` chosen; the `Free` chip as shipped. |
| Any other filter on (search, colors, type, set, another availability) | Call-out only; the switch hides (the chips say what is on). |
| Row view | Call-out and switch as in grid. |
| Reading availability failed (`availabilityOk` false) | Nothing. |

## Find a deck press (grid tile)
| State | Draws |
|---|---|
| List not narrowed to Free alone | Nothing. |
| Narrowed to Free alone, reader has a deck | Press on every tile (all are free); name line yields 32 / 40px. |
| Card not Commander-legal | No press (the door's own rule). |
| Pressed | Box ringed (`--accent` outline 2, offset 2); the card window opens on Find a deck. |
| Back (← card) | The card's details, the door under the store link as shipped. |
| Close | Focus returns to the press. |

## Deck tabs
| Deck | Row |
|---|---|
| Brew (no version) | Your deck · Analysis · Tuning · Games |
| Committed or linked | Your deck · Analysis · Tuning · Games · Versions |

## Tuning tab
| State | Draws |
|---|---|
| Landing | Consider (full width from md), then the shipped four tiles with their shipped states. |
| Consider open | Hub's underline row (desktop) / `‹ Tuning` + `1 of 5 tools` (phone); the shipped Consider panel. |
| Consider empty (nothing to suggest) | The panel's shipped empty state; the tile's status reads `nothing to consider`. |
| Consider degraded (EDHREC down) | The panel's shipped notice; tile status empty. |
| Leave the tab | Resets to the landing (the hub's shipped rule, now on the Tuning tabpanel's unmount). |

## Where credits work
| Shape | Rows | Free block |
|---|---|---|
| `decks` | Every row with Try it | Both rows with Try it |
| `noDeck` | As shipped (lead rows with Try it, reason line, rest) | Under the reason line, no Try it |
| `locked` | As shipped (lock line, no Try it) | Under the lock line, no Try it |
