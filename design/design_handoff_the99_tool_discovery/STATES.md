# States · Finding the tools R12

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

## Home order · R7 (Q11 A, recommended)
| State | Draws |
|---|---|
| Reader with welcome credits | The panel with the shipped strip as its foot (no edge, no fill); no separate strip. |
| Credits line closed (✕) or lot gone | The panel without its foot. |
| Feed with items | What's new directly under the lead story, then the decks. |
| Busy day | Banner, Rule 0's cards, the panel, the lead, What's new, decks; Commitments and Friends in the rail. |

## First run · R7 (Q12 A, recommended)
| State | Draws |
|---|---|
| No collection | First run as shipped; no panel. Search through the magnifier and ⌘K. |
| Option B | An unnumbered `Look up any card` row after step 3; a press opens the card search, nothing typed. |

## Desktop rail and headings · R8 (Q13 A, Q14 A)
| State | Draws |
|---|---|
| From 1180, feed with items | What's new tops the rail (compact rows, Choose your notifications beside Clear all), then Commitments, Friends. |
| From 1180, feed quiet or offer | The quiet or offer state at the rail's top, as shipped otherwise. |
| Below 1180 | What's new under the lead (R7 A); rows as shipped. |
| Any width | Section headings in the display face with the diamond; counts in mono. |

## What's new, Show all sheet · R10 (Q15 A)
| State | Draws |
|---|---|
| 5 items or fewer | No Show all; the foot as shipped. |
| More than 5 | Five rows; Show all N opens the sheet. |
| Sheet open, All | Every item, Today / This week / Earlier; chips for the kinds present. |
| A chip pressed | Only that kind; empty groups leave; the count in the head stays the total. |
| Clear all | Clears the shown items; the sheet closes when none are left. |
| ✕ on a row | That row leaves; the counts update. |
| Esc / ✕ / scrim | Closes; focus back on Show all. |

## Spare offers on Home · R11 (Q16 A, Q17 A, Q18 A)
| State | Draws |
|---|---|
| An unanswered, open offer to the reader | It leads at both widths: kicker `Spare offer`, `Max is offering you <card>`, `Max has 1 spare. You want 1.`, Yes, No, `14 days left`; ✕ in the card's top right. |
| An unanswered, open ask of the reader | The same lead with the ask's kicker and `incomingDetail` line. |
| Two or more waiting | The newest leads; the others answer in their What's new rows (Yes, No, days left; ✕ in the row's corner). |
| Answered (lead or row) | The shipped receipt in place; the Friends badge falls by one. |
| Ran out while on screen | The row keeps `Answer in Friends.` with no presses until the next read. |
| Friends badge | The count of offers and asks waiting on the reader (rail and tab bar); none at 0. |
| The reader's offer answered | Row kicker `Your offer`, `Max said yes to <card>` / `The handover is between you.`, `Your offer ›` opens the shipped sheet. |

## Home search follow-ups · R12 (Q19 A to Q22 A)
| State | Draws |
|---|---|
| Tool row at rest | 48px tile, 28px wrench (phone); 40px tile, 24px (dropdown). |
| A tool pressed, page loading | The row ringed, spinner in the tile, `Opening {name}…`; other rows dim; the progress bar on top. |
| The page commits | The search closes onto it. |
| Esc or ✕ while opening | Closes; the navigation is dropped. |
| The push fails | The row back at rest; the shipped toast. |
| A deck tool, one deck fits | Foot `in {deck}`; a press opens it, as shipped. |
| A deck tool, several fit | Foot `Pick a deck · {n} can use it`; a press shows the picker in the same box. |
| The picker | `‹ Answers`; name and cost; `Which deck? {n} of yours can use it.`; the decks, last touched first. |
| Landing on a busier screen | The target haloed (2.4s), as shipped. |
| Landing on Help me choose, intro open | The intro panel haloed. |
| Landing on Help me choose, intro folded, or on a page that is the tool | Top of the page, no halo. |
