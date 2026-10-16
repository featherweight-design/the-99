# Discovery R1 · STATES: the moments

## A moment's life

| State | What the screen draws | Leaves this state when |
|---|---|---|
| **Absent** (switch off for this reader) | Nothing. No record is kept. | The switch turns on for the reader: the moment becomes Not yet. |
| **Not yet** | Nothing. | Its condition holds on the reader's own data: Eligible. |
| **Eligible, control off screen** | Nothing. | The control comes on screen on a visit no moment has used: Showing. |
| **Eligible, visit taken** | Nothing. The loser of a tie, or a visit another moment already used. | A later visit, with the condition still holding and the control on screen: Showing. |
| **Showing** | The bubble beside the control, and the halo. | ✕, pressing the control, Esc, a press elsewhere, the control scrolled out of view, or the page left: Spent. |
| **Spent** | Nothing, for good. | Never. |

Rules the matrix comes from:

- **One per visit, across every screen.** A visit is one app session (30 minutes away ends it, G4).
- **First on screen wins.** On a tie, the fixed order decides (Main, Q2).
- **Spent once shown.** That means visible for at least 1 second (G5), however it closed.
- **The Friends Home card** (M16) runs the same lifecycle. Showing means drawn on Home; Spent means ✕, a first friend added, or `Add a friend` pressed.

## When a moment may not arrive

| Over the page | A moment on the page | A moment whose control is inside it |
|---|---|---|
| Card details (dialog / sheet) | waits | arrives (M8, M9) |
| Any other sheet or dialog | waits | n/a |
| The account menu, any menu or popover | waits | n/a |
| A toast | waits until it closes | n/a |
| The Home banner, on Home | waits (the banner wins Home) | n/a |
| The first-run tour (R3) | none during the tour | n/a |

## Per moment

| # | Condition (locked) | Control on screen means | Switch | Must not |
|---|---|---|---|---|
| M1 | deck under 100 with cards to fill | the Top off strip's door is in view | none | press the door; add anything |
| M2 | first open at 100 (99 / 99), carried forward if the visit is taken | the Analysis tab is in view | `TUNING_ENABLED` | open Analysis; start a run |
| M3 | deck over 100 | `Proposed cuts →` is in view | `PROPOSED_CUTS_ENABLED` | open the panel; Look deeper |
| M4 | at 100, on a visit after M2's | `balance mana →` is in view (else the Analysis tab) | `MANA_BALANCE_ENABLED` | open Mana Balance |
| M5 | first Shopping row over the deck's limit | that row's ⇄ is in view | `SWAP_TOOLS_ENABLED` | open stand-ins |
| M6 | first spare marker seen | that row's other-ways press is in view | `SOCIAL_FRIENDS_ENABLED` | open the spares sheet |
| M7 | first contested copy | that row's marker is in view | none | open card details |
| M8 | card details, owned card in no deck | the door is in view (390: full sheet) | `SWAP_TOOLS_ENABLED` | open the picker; start a read |
| M9 | card details, card not owned | `Add to wishlist` is in view (390: full sheet) | `SOCIAL_WISHLIST_ENABLED` | add to the wishlist |
| M10 | the deck's 3rd logged game | the Matchups switch is in view | `SOCIAL_GAMES_ENABLED` | change the split |
| M11 | the first logged game; no friend yet | the account button (always in view) | `SOCIAL_FRIENDS_ENABLED` | open the menu |
| M12 | first /commanders visit with no decks | Discover in the rail / tab bar (always in view) | `HELP_ME_CHOOSE_ENABLED` | navigate; start a run |
| M13 | /decks with 3+ decks | the Stats segment is in view | `LINEUP_ENABLED` | switch to Stats |
| M14 | first New deck press | `Browse precons →` is in view | `PRECONS_ENABLED` | navigate |
| M15 | second upload's choice step | the Sync card is in view | `COLLECTION_SYNC_ENABLED` | pick Sync |
| M16 | Home, a deck exists, no friend yet, no banner on this load | (the card is the moment) | `SOCIAL_FRIENDS_ENABLED` | n/a |
