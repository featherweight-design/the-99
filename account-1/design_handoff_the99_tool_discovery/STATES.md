# States · Finding the tools R3

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

## Find a deck button (beside a row) · R3
| State | Draws |
|---|---|
| List not narrowed to Free alone | Nothing; the row as shipped. |
| Narrowed to Free alone, phone | 44px glyph button beside each row; the call-out's phone line draws the glyph. |
| Narrowed to Free alone, from md | 136px glyph and `Find a deck` beside each row. |
| Card not Commander-legal | No button; the row runs the full width. |
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

## Home · Ask · R3
| State | Draws |
|---|---|
| Reader has a deck, Ask not yet used three times from Home | `Not sure where to go?`, the field as a press, the starters. |
| Used three times from Home (Q7 A) | Nothing. |
| No deck yet | Nothing (Home's ways in already lead). |
| Field pressed | The search opens (phone sheet, desktop dropdown), nothing typed. |
| A starter pressed | The search opens with the question typed. |

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
