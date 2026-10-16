# Discovery R3 · STATES · the first-run tour, and tools where the need is

## The tour's life (per account)

| State | What the screen draws | Leaves this state when |
|---|---|---|
| **Not for this account** | Nothing. The account existed when the tour shipped (G24). | Never. |
| **Waiting** | Nothing. A new account that has not visited Home yet. | Its first Home visit settles, plus 600ms, with nothing open over Home: **Running**. |
| **Running** | Step 1 to 6 over Home: the scrim, a cutout on one control, and the card. The account is marked spent as step 1 appears. | ✕, Esc, Finish, `Read the note ›`, or leaving Home: **Spent**. |
| **Spent** | Nothing, for good. The note stays at the foot of the Reference. | Never. |

- **Leaving mid-tour** (a reload, closing the tab, following the banner's own link before step 6) spends it. It is shown once, not finished once.
- **During the visit it runs,** no R1 moment arrives (R1 E6), and the Home banner is part of the tour rather than competing with it.

## Each step

| Step | Kicker | Lit control, 1280 | Lit control, 390 | 390 scroll | Card holds | Card at 1280 |
|---|---|---|---|---|---|---|
| 1 | `1 of 6 · Collection` | Step 1's card (Upload and the ways group) | the same | step 1's controls to the top, its fan above the fold | the precon line (`PRECONS_ENABLED`); the footnote | right of the lit card, below it |
| 2 | `2 of 6 · Commanders` | Commanders, in the rail's lock well | Commanders tab, under the bracket | top | a /commanders capture, `Commanders, once your cards are in` | 16px right of the rail |
| 3 | `3 of 6 · Decks` | Decks, in the lock well | Decks tab | top | a deck capture, `A deck, once you build one` | 16px right of the rail |
| 4 | `4 of 6 · Buying` | Decks (Buying has no slot) | Decks tab | top | a Shopping capture, `Shopping, inside every deck` | 16px right of the rail |
| 5 | `5 of 6 · Your look` | the account button (rail foot) | the account button (header) | top | the six miniatures and a status line | rail side, its foot 14px above the frame's |
| 6 | `6 of 6 · What’s new` | the Home banner | the Home banner | top | the note's opening line and `Read the note ›`; Next reads `Finish` | under the banner |

At 390 the card is docked 12px above the tab bar, 358 wide; the page scrolls so the lit control clears it.

## Presses on the card

| Press | Does | Where |
|---|---|---|
| Next | The next step; the cutout glides, the card crossfades | steps 1–5 |
| Back | The step before | steps 2–6 |
| Finish | Ends the tour, spent; Home as it was | step 6 |
| `Read the note ›` | Ends the tour, spent; opens the note (dialog 1280, sheet 390); closing it lands on Home | step 6 |
| ✕ `Skip the tour`, or Esc | Ends the tour, spent; Home as it was; no confirm, no toast | every step |
| A miniature | Applies that theme at once, as the account menu does (`data-theme`, the cookie, `<name> applied.`) | step 5 |
| Enter | Next (Finish on 6) | focus starts on Next |
| Anything under the scrim | Nothing; the app is inert while the tour runs | every step |

## When the tour waits, or never opens

| Situation | Behaviour |
|---|---|
| A sheet, dialog or menu is open over Home on load | Waits for it to close on that visit; otherwise the next Home visit |
| The account arrived on another route first (an invite link) | Opens on the first Home visit, whenever that is |
| `PRECONS_ENABLED` off | Step 1 drops its precon line; the ways group is as shipped (its Precons row follows the same switch) |
| `NO_COLLECTION_ENTRY_ENABLED` off | Step 1 lights the shipped card (Upload and Paste); the precon line goes with the group |
| `ABOUT_SHEET_ENABLED` off | Home has no banner, so step 6 has nothing to light: its card stands centred over the scrim with no cutout, drops the banner sentence, and keeps the note and Finish (not drawn; Hugh's call whether the switch can be off once the tour ships) |
| Reduced motion | The cutout and card cut between steps; nothing slides |

## Tools where the need is

Each one has three states: **on and needed** (drawn), **on and met** (the slot as shipped), **switch off** (the slot as shipped).

| # | On and needed | Met, or switch off | Drawn |
|---|---|---|---|
| E1 | `Not sure what to build? Help me choose →` under the zero state's buttons, on /decks and Home | The zero state as shipped | E1, E1·off |
| E2 | `Not sure which? Help me choose →` closing the guided banner; M12 anchors on it | The banner as shipped; M12 absent with the switch off | E2, E2·off |
| N1 | The short role cell's slot reads `suggest swaps →` (390 `suggest →`); interactive border; opens Analysis on Suggested changes' tile | A dash (met, under 99, or a shelf's `consider →` wins the slot) | N1 on, N1 off |
| N2 | `balance mana →` in the Land cell, whenever Mana Balance is on | A dash | N2 on, N2 off |
| N2b | `Proposed cuts →` under the over count, whenever Proposed cuts is on | Absent, as today with the hub off | not drawn (unchanged look) |
| N3 | The Money card's line reads `See the 15 in Shopping, 2 over $8 ⟶`; lands on Shopping with the first over row's ⇄ haloed 2.4s | `See the 15 in Shopping ⟶`, as shipped | N3 on, N3 off |

- **None of these is spent,** and none is a moment. Each reads the figure on every render.
- **A nudge may carry an R1 moment.** M4 already points at N2's control, and no new moment is added.
