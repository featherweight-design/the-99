# Gap report: I got it PR 5 (About entries for Deck printings and I got it)

Checked against the two about-entry packages: `design_handoff_the99_i_got_it/about-entry/` (S1) and
`design_handoff_the99_deck_printings/about-entry/` (P1), at 390 and 1300 on a scratch copy of staging
(`about-got-it`, `about-deck-printings` in `docs/superpowers/inventories/i-got-it.json`).

## Placement and switches: as drawn

| Entry | Chapter | After | Switch | since |
|---|---|---|---|---|
| `shopping-got-it` | 03 | `stand-ins` | `SHOPPING_MARK_BOUGHT_ENABLED`, read through `shoppingMarkBoughtEnabled` (already needs `COLLECTION_EDIT_ENABLED`) | 14 |
| `deck-printings` | 03 | `export` | `DECK_PRINTINGS_ENABLED` | 14 |

S1's open 1 (two switches, one key) needed no array form: `visible.ts` maps every switch to its feature's
own flag, and I got it's flag is already the AND of both. The sheet counts this bump's own entries
(`2 new` with all three switches on), not the `6 new` / `7 new` the handoffs drew alongside collection
edit, which bumped on its own (12).

## Differences, kept deliberately

| # | Element | Handoff | Built | Why |
|---|---|---|---|---|
| 1 | Copy | the entry objects' drafts | rewritten through `/prose-pass` | The repo's About voice rules: caption is the pitch with no UI mechanics, keys carry the controls with labels in quotes. Fact-diff kept every current fact; S1's "You never mark the deck by hand" was dropped as a repeat of the caption. |
| 2 | Shape | S1 gives `caption` as an array and `keyLines` | one string with `\n\n`, and `keys` | `AboutEntry`'s fields. |
| 3 | P1 specimen | the Set field and its region | the region alone, opened | The region carries what the entry teaches (the deck intro, the pick); the closed field is the shipped card-details row the `card-detail` entry already shows. |
| 4 | S1 receipt | the app's toast, static | `ToastFrame` with a new `inline` placement | The deck toast is `fixed` to the page's slot; inline is the same look in flow. One component still draws both. |
| 5 | Figure numerals | — | `marksPending` on both | No numbered marks are drawn yet, so the keys render as a plain list, as on `deck-benchmarks`. |

## Confirm: 0 gaps remain
