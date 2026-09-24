# Gap report: deck tuning PR D1 (Suggested changes on the Analysis tab)

Property table: `docs/superpowers/design-tables/deck-tuning-addendum.md`, enumerated from the
placement addendum (v2 canvas, r1 for frames B2/B3/C1/C2, r3 section E) with Hugh's rulings on
top. Verified row by row against the build (design-review Agent 2), 29 visual gaps and 4 state
reachability gaps found. Each is listed below with what was done.

## State reachability

| # | Gap | Resolution |
|---|---|---|
| S1 | A failed re-run dropped the last set; the states table keeps it on screen (ST:42). | FIXED. `readTuningState` reads the newest OK run's items whatever the newest run's status; the failure box draws above the kept set. `probe:tuning-run` case 9 asserts it, and fails with the old rule. |
| S2 | Credits spent was unreachable on an unchanged deck, because `gateReason` answers `unchanged` first. | FIXED. The panel reads spent off the allowance itself. Unit test fails when it reads the gate. |
| S3 | The unchanged state only drew in the results branch. | FIXED. The set branch now covers every state with a set on screen, a failure above it included. |
| S4 | The intent ask drew over results; the design shows it only before a first set. | FIXED. Unit test fails when it draws in every state. |

## Visual

| # | Gap | Resolution |
|---|---|---|
| 1 | Tab body gap 16/24 against the Analysis panel's 22/28. | KEPT. The gap is the Analysis tab's own, from its handoff (shipped #877); the tuning section sits in it and does not restyle its host. |
| 2 | The read line with games names the recommended mix. | KEPT, deliberately. Spec gap 6: every card may cite the mix, and a read line that omits a source a card then cites is untrue. |
| 3 | Read line drawn in the all-answered state. | FIXED. |
| 4 | Lead max-width 680 in every state. | FIXED: over a set only. |
| 5 | Lead drawn in no-games results on desktop. | FIXED. |
| 6 | All-answered list gap 8. | FIXED: 6. |
| 7 | All-answered rows in slot order, not applied first. | KEPT. "Nothing reorders" (C3) is the stronger ruling; a row that jumps when answered is the reorder it forbids. |
| 8 | Loading action row gap 16. | FIXED: 12, across Reading…, Stop and the progress line (the confirm pass caught the band still at 16 before the progress line). |
| 9 | Phone progress line inside the action column. | FIXED within the shared band: under the pair, centred. |
| 10 | `role=status` on the loading heading. | KEPT. The panel has one live region, which says `Reading your deck` on the press; two regions would announce twice. |
| 11 | Loading text column min-width and phone gap. | FIXED. |
| 12 | Credit note max-width 380 always. | FIXED: spent only. |
| 13-17 | Unchanged state margins, widths, and the missing weakest-axis row. | FIXED, except the first-sentence emphasis: the lead is one sentence since the copy pass. |
| 18 | Failure block had no box. | FIXED. |
| 19-21 | Failure action row, Try again geometry, note placement. | KEPT the panel's shared action band (the fixed band across states is the design's own rule), with the failure's note riding in it ahead of the credit line. |
| 22 | Add thumbnail placeholder stripes. | FIXED. |
| 23 | Buy chip geometry. | KEPT the shipped `BuyTag` row variant: README :81 names the shipped chip, and the table records the canvas's drawing of it. |
| 24 | Phone done-row label padding. | KEPT: it holds the 44px floor on a two-line label. |
| 25 | One list label everywhere. | FIXED: `This list` in C1, the long form in D1/E5. |
| 26 | Dashed row label gap. | FIXED. |
| 27 | Ask block bottom margin. | FIXED. |
| 28 | Emphasis span in the ask pitch. | DEFERRED to the copy review: the pitch is one copy function, and splitting it is a copy change. |
| 29 | Placeholder colour. | FIXED; 16px at 390 kept, since a smaller field zooms iOS Safari. |

## Deferred to D2

The deck-header intent line (E2/E2b, with its seeded state), the Games-tab pointer line and the
`note.readBack` amendment, and retiring `deck-tuning.md`'s copy-drift allowlist row.
