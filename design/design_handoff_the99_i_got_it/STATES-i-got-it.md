# States — I got it R1

Every state is drawn at 390 and at desktop width unless noted. In the Canvas column, "A" is `… A Row and B Confirm` and "C" is `… C Receipt, D History and E Switch off`.

## §A The way in (R2: the buy tag is the control)
| # | State | Canvas | Must not |
|---|---|---|---|
| A1 | At rest, plain row | A1, A2 | Differ from `main` by a pixel; add any element to the row |
| A2 | Every neighbour: figure, `over $X`, ring, ⇄ | A2 | Lose the over ring; overlap the ⇄'s hit area |
| A3 | Spoken-for row | A2 | Preset the deck's ask instead of the shortfall |
| A4 | Commander row | A2 | Draw ⇄ |
| A5 | `sold out` and bare `buy` | A2 | Make the tag inert for want of a price |
| A6 | Hover (desktop), focus, press | A3 | Change anything but the wash (and the focus ring) |
| A7 | Open (confirm up) | A1, A3 | Leave the row's hover ground off while the form is up |
| A8 | Pending (`adding…` in the figure slot) | A3, C1 | Accept a second write; change the tag's width |
| A9 | Disabled, another write for this card in flight | A3, C3 | Send a second write with a stale expected count |
| A10 | The key: two items in a row on desktop, a 2-column grid on the phone | A1 | Stack them on desktop; show the buy item with the switch off |
| A11 | The details link from a Shopping row | A4 | Draw it from /collection, decks' All tab or search; draw it beside Edit copies |
| A12 | All tab's collapsed `$` | A2 note | Make it pressable |

## §B The confirm
| # | State | Canvas | Must not |
|---|---|---|---|
| B1 | Preset | A1, B1, B2 | Badge the preset as "your pick" or "shipped" |
| B2 | Changed printing | B1, B2 | Lose the way back to the listed printing |
| B3 | Foil-only printing | B1 | Offer a finish the printing doesn't have |
| B4 | One printing | B1 | Draw a picker with one tile |
| B5 | Quantity above 1 | B1 | Write more than one holding or entry |
| B6 | Above need | B1 | Warn, or stop at the need |
| B7 | No printing behind the price | B1, B2 | Preselect a printing (Open 1) |
| B8 | Stale | B1, B2 | Write anything; keep the old count |
| B9 | Failed | B1 | Clear the choices; change the row |
| B10 | Pending | B1 | Leave Cancel enabled; reflow |
| B11 | Cancel / Escape / outside / another row | B1 note | Write; ask "discard?" |

## §C Receipt and undo
| # | State | Canvas | Must not |
|---|---|---|---|
| C1 | Clean: the row leaves, the slot holds, the toast | C1 | Reflow the list; drop the printing or finish from the receipt |
| C2 | Claimed by an older deck: the row stays, the toast names the deck | C1 | Say or imply the deck is done |
| C3 | Partial: the row stays, `short N` | C1 | Move the row |
| C4 | Undo checking | C3 | Leave the control enabled; let the toast time out |
| C5 | Undo raises §E | C3 | Name the source deck; style it as destructive |
| C6 | Undo in flight | C3 | — |
| C7 | Undo done, the row returns in place | C3 | Leave the held slot behind |
| C8 | Undo failed | C3 | Change anything; offer an immediate retry |
| C9 | The leave transition | C4 | Animate height; animate under reduced motion |

## §D History
| # | State | Canvas | Must not |
|---|---|---|---|
| D1 | Live entry with its deck line | D1, D2 | Copy the deck name into the entry |
| D2 | Reverted from the toast, and its revert | D1, D2 | Break F1's two-way link |
| D3 | Deck deleted | D1, D2 | Drop Revert; show a dead link |
| D4 | Expanded (one card) | D1 | — |

## §E Switch off
| # | State | Canvas | Must not |
|---|---|---|---|
| E1 | Either switch off: the row is main's | C·E | Reserve a slot |
| E2 | Shopping switch turned off later | C·E note | Hide From Shopping entries already written |
