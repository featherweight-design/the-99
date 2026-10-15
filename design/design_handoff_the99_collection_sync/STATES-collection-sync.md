# States — collection sync R1

Every state is drawn at 390 and at desktop unless noted. Canvas column names the R1 board.

## Choice (STEP 2 OF 4)
| # | State | Canvas | Must not |
|---|---|---|---|
| C1 | Three cards, nothing picked | Choice-Desktop C1, Choice-Phone C1 | Preselect any card; move or reword Replace or Add |
| C2 | Sync picked | C2 both | Hide Sync's figure |
| C3 | Sync unavailable: no record of the last upload | Choice-Desktop C3 | Remove the card, or make it unreachable to a screen reader |
| C3b | Unavailable: last upload past 90 days | Choice-Desktop C3b, Choice-Phone C3 | Quote a count history can't back |
| C3c | Unavailable: never uploaded | Choice-Desktop C3c | Offer a reduced merge |
| C4 | Focus, roving radios over three | C4 both | Skip the disabled card's reason |
| C5 | First import | (shipped) | Show the choice, or Sync |

## Stale file
| # | State | Canvas | Must not |
|---|---|---|---|
| S1 | File's cards equal the last upload, carries tokens (staging fixture) | Stale S1 | Say “is older”; draw a follow-up with nothing to choose |
| S2 | File looks older; Sync picked; follow-up with three options | Stale S2 | Nest radios inside the card; pick Everything by default |
| S3 | The pick named at the review's head, with Change | Edge-States E5 | Surprise the player with removals they didn't pick |

## Review
| # | State | Canvas | Must not |
|---|---|---|---|
| R0 | Reading | Edge-States E1 | Draw figures before the dry run |
| R1 | No conflicts: taken, kept, tokens, decks short | Review-Desktop, Review-Phone R1–R2 | Count ledger entries; list agreed cards |
| R2 | Tokens only (file adds nothing to cards) | Review-Phone R3 | Draw a deck section or file-side lists |
| R3 | Nothing differs (re-sync) | Edge-States E2 | Write an empty History entry |
| R4 | Nothing of yours to keep | Edge-States E3 | Hide Sync |
| R5 | Long list, 500 shipped | Edge-States E4 | Cap what the confirm writes |

## Conflicts
| # | State | Canvas | Must not |
|---|---|---|---|
| K1 | A few, some undecided, bar held | Conflicts K1, P1 | Pre-pick a side; disable the button outright |
| K1b | Held button pressed → first card left | Conflicts-Phone P2 | Raise a toast or inline error |
| K2 | All answered, some to the file: overwrite banner, `edited` tags | K2, P4 | Tag kept rows |
| K3 | Many (98), bulk pressed | K3, P3 | Act on shown rows only; announce per row |
| K4 | Focus on a row's radios | K4 | Lose answers on Back, failure or retry |

## Confirm
| # | State | Canvas | Must not |
|---|---|---|---|
| X1 | Short-deck dialog / sheet, Sync's title and confirm | Confirm X1 | Use danger red; focus the confirm |
| X2 | Confirming | X2 | Leave Cancel or the radios live |
| X3 | Refused, nothing written | X3 | Clear the review or the answers; write tokens alone |
| X4 | Unconfirmed | X4 | Write a second entry on retry |

## Receipt and History
| # | State | Canvas | Must not |
|---|---|---|---|
| Y1 | Summary after a Sync | Receipt Y1 | Drop the kept clause |
| Y1b | Summary after a tokens-only Sync | Receipt (note) | Claim a card moved |
| Y2 | History entry, opened | Y2 | List kept cards as the entry's rows |
| Y3 | Revert, partly changed since | Y3 | Claim tokens are taken back (G3) |

## About and switch
| About | `upload-choice` edit, `post-import` caption half-line | About-Entry | Bump `ABOUT_VERSION` |
| Switch off | Shipped Replace flow | Main | Reserve a slot |
