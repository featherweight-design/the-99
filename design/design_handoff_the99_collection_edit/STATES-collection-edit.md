# States — collection edit R1

Every state is drawn at 390 and at desktop width unless noted. In the canvas column, A, B, C and F refer to the four canvases (A+E, B, C+D, F+G).

## §A Upload choice
| # | State | Canvas | Must not |
|---|---|---|---|
| A1 | Choice, nothing picked, count form | A1 · 390 | Preselect either option |
| A1b | Replace picked, no-count form (last upload > 90 days) | A1 · 1300 | Show a number history can't back |
| A2 | Replace preview, overwrites hand edits, decks short, unmatched | A2 · both | Raise a second dialog after the confirm bar |
| A3 | Add preview, unmatched | A3 · 1300 | Show a deck section (Add never lowers) |
| A3b | Add where every row is already owned | A3 · 390 | Read as "nothing to do" |
| A4 | Pending write | A4 | Leave Cancel enabled |
| A5 | Failed write, nothing changed | A5 | Clear the review |
| A6 | First import onto empty | A6 | Ask the question |

## §B Add cards
| # | State | Canvas | Must not |
|---|---|---|---|
| B0 | Head with Add cards; phone strip | B0 | Move the strip off y 109 |
| B0b | /collection empty, two equal doors | B0 · both | Make one door primary |
| B0c | Home step one with Add cards by hand | B0 · both | Style it as a link |
| B1 | Empty sheet | B1 · both | Scrim the collection on desktop |
| B2 | Typing, with results | B2 · 390 | Search owned cards only |
| B3 | No results | B3 · 390 | Offer a non-catalog card |
| B4 | Several lines, two printings of one card, owned, picker open | B4 · 480 | Merge different printings or finishes |
| B5 | Exact duplicate combined | B5 · 390 | Write two lines for one holding |
| B6 | Close with unsaved | B6 | Ask when the list is empty |
| B7 | Saving | B7 | Run a deck check |
| B8 | Saved, with History link | B8 · 390 | Write more than one entry |
| B9 | Failed save | B7 | Drop the list |

## §C Card details
| # | State | Canvas | Must not |
|---|---|---|---|
| C1 | Owned, several printings, at rest | C1 | Move or wrap the marker |
| C2 | Editing; foil and nonfoil of one printing; move staged | C2 | Show the art region open beside Your copies |
| C3 | Move inline | C3 | Write a move as two entries |
| C4 | Not owned, then adding | C4 | Set an art preference |
| C5 | One printing | C5 | Offer Move |
| C6 | Raise → saving → saved | C6 | Check decks |
| C7 | Lower that leaves a deck short → §E | C7 | Save before the check |
| C8 | Lower to zero, last copy | C8 | Close the modal |
| C9 | Failed save | C9 | Discard staged edits |
| C10 | Phone teaser and full sheet | C · 390 | Allow pull-to-teaser while editing |

## §D Row removal
| # | State | Canvas | Must not |
|---|---|---|---|
| D1 | Control at rest, menu open (rows and grid, both widths) | D | Nest the ⋯ inside the card button |
| D2 | Pending | D | Change the row's height |
| D3 | Gone → Undo strip | D | Reflow the list or grid |
| D4 | Failed, row stays | D | Remove the row |

## §E Short-deck warning
| # | State | Canvas | Must not |
|---|---|---|---|
| E1 | One deck | A · E1 both | Use danger red on the confirm |
| E2 | Several | A · E2 | — |
| E3 | Long (3 named, rest counted), expanded | A · E3 both | Push the buttons off screen |
| E4 | Pending check | A · E4 | Reflow the source |
| E5 | Confirm pending | A · E5 | — |
| E6 | Confirm came back changed | A · E6 | Open a second dialog |
| E7 | Cancel | A · E7 | Write anything |

## §F History
| # | State | Canvas | Must not |
|---|---|---|---|
| F0 | Empty | F0 · 390 | Hard-code the date |
| F1 | Every kind, short expanded, reverted + revert, aged-out link absent, pending, 90-day edge | F1 · 1300 | End the list without a foot |
| F2 | Phone list | F2 | — |
| F3 | Long Replace expanded | F3 | Render all rows at once |
| F4 | Revert confirm, matches | F4 | List the entry's own deltas |
| F5 | Revert confirm, differs | F5 · 390 | Hide the zero rows |
| F6 | Revert warns about decks → §E | F6 | Skip the check |
| F7 | Pending; catalog failure | F6/F7 | Partially write |

## §G Switch off
| G | Everything is `main` | G | Reserve slots for absent controls |
