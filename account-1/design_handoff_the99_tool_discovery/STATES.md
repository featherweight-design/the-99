# States · Finding the tools R6

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

## Find a deck in row view · R4
| State | Draws |
|---|---|
| List not narrowed to Free alone | Nothing; the row as shipped. |
| Narrowed to Free alone, phone | A 40px `Find a deck` strip under each row, inside its outline; every cell of the row as shipped. |
| Narrowed to Free alone, from md | The 136px button beside each row, the row's height. |
| Any sort (Name, Date added, Price) | The row's own figure leads its type line as shipped; the strip or button is unchanged. |
| Card not Commander-legal | No strip or button; the row as shipped. |
| Pressed / Back / Close | As the tile's button. |

## Ask (card search) · R3
| State | Draws |
|---|---|
| Open, nothing typed, recents | Add several (as shipped), the starters, Recent cards. |
| Open, nothing typed, no recents | Add several, the starters, the shipped empty state. |
| A starter pressed | The question typed in; the results as for a typed question. |
| Query hits a tool's phrases | `Tools for this` (1 to 3), then the cards: rows as shipped, or `No card names match.` |
| Query hits card names only | The shipped results. No tools heading. |
| Query hits nothing | `Nothing here answers that yet`, the starters, `Every tool, in About ›`. |
| A tool needs a deck, reader has none | The answer draws with the tool's shipped `none` line in place of the reader's number; the press lands on New deck. |
| A tool's switch off for this reader | That tool never answers (`requestFlags`). |
| Offline | As shipped (S7). Tools still answer; the reader's numbers are those the page holds, or left out. |

## Home · search panel · R5
| State | Draws |
|---|---|
| Any reader with a collection, quiet day | The panel (title, line, field, fan, starters), first under the page head, for good. |
| Arrivals banner, Rule 0 table or game to log (R6) | Those first, then the panel, then the welcome strip, signature and lead (Q10 A). |
| No collection yet | Nothing (first-run Home leads with adding cards). |
| Fewer than three cards with art | The fan draws the ones there are; none with none. The lens stays. |
| Desktop, field focused, nothing typed | The field ringed (`--accent`, 3px halo); the in-place list opens: the starters and Recent cards. |
| Desktop, typing | The in-place list under the field: `Tools for this`, then the cards, as the rail's search ranks them. |
| Desktop, Esc / ✕ / press outside | The list closes; the query clears on ✕ only. |
| Desktop, ⌘K or the rail magnifier | The rail's dropdown as shipped; Home's field is not focused. |
| Phone, field pressed | The full-screen search sheet, nothing typed. |
| A starter pressed | Desktop: typed into the panel's field, answers in place. Phone: the sheet with it typed. |
| A starter whose tool cannot answer this reader (no deck for Find a deck) | That starter is left out; the row closes up. |
