# States · Finding the tools R2

## Collection call-out (Cards tab, under the chassis) · R2
| State | Draws |
|---|---|
| No deck, or Free count 0, or closed (✕) | Nothing. The Availability filter as shipped. |
| Reading availability failed (`availabilityOk` false) | Nothing. |
| Free count N, Availability not Free alone | Call-out: `N of your cards are in no deck` / `See which of your decks each one could go in.` and `Show them`. |
| `Show them` pressed | Availability = Free, exactly as the menu sets it: chip, URL `avail=free`, the count line. |
| Availability = Free alone (any other filters too) | Call-out without the button: `Press Find a deck under a card to see which of your decks it fits.` |
| Row view | The call-out as in grid. |

## Find a deck button (under a grid tile) · R2
| State | Draws |
|---|---|
| List not narrowed to Free alone | Nothing. |
| Narrowed to Free alone, reader has a deck | A button under every tile (all are free): two diamonds, `Find a deck`. |
| Card not Commander-legal | No button (the door's own rule); the tile keeps its row height. |
| Pressed | Ringed (`--accent` outline 2, offset 2); the card window opens on Find a deck. |
| Back (← card) | The card's details, the door under the store link as shipped. |
| Close | Focus returns to the button. |

## Home · What you can do · R2
| State | Draws |
|---|---|
| No deck yet | Nothing (Home's ways in already lead). |
| Closed (✕), for this account | Nothing, for good. |
| Every row retired | Nothing. |
| Spares: Free count above 0, Find a deck never opened | `Find a home for your spare cards` with the count. |
| Tune: a deck, Tuning tab never opened | `Make <deck> better`, the most recently touched deck. |
| Build: Commanders never opened since the first deck | `Build another deck`. |
| A row's tool opened from anywhere | That row leaves on the next visit (not mid-visit). |
| Phone / from 1180 | One column / three across. |

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
