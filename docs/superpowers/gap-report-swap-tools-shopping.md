# Gap report: swap tools, PR 3 (the Shopping limit line and the over-limit marks)

Design review ran against `docs/superpowers/design-tables/swap-tools-shopping.md`, enumerated from
the swap-tools handoff (the limit line, the DecklistRow over and under states, BuyTag's ring, and
the state coverage table) and `READINESS-audit.md` rulings H1–H3 and findings F5 and F12.

## Deferred to PR 4a, by the plan

The ⇄ button on an over row, the key line's `⇄ cheaper stand-ins`, and the desktop row's reserved
22px slot. The ⇄ opens the stand-ins sheet, and a control that opens nothing would ship a dead
press, so all three land with the sheet.

## Verify: 3 visual gaps, 0 state gaps

Fixed in this PR, and confirmed by the confirm pass:

- The `$` field's caret is `--accent`.
- The desktop gap between the Shopping figure and the over item's `·` is 5px. The name block's
  own gap is 6px, so the over item pulls back one pixel.

A deviation, recorded in the code:

- The `$` field's input is 16px below `md` against the table's 13px. iOS Safari zooms the page on
  focus into any input under 16px, which would throw the phone's whole row out of its layout.

Every state in the coverage table is reachable: null and set limits, editing, the refused
figure, none over, some over, no price feed, empty Shopping, the All tab, and a row with no price
(F5: an unpriced or sold-out card is never over).

## Found in the browser, not in the table

- **The editing state's separator dangled at 390.** The line wraps there while editing, and the
  `·` was its own flex item, so it ended the first line with the count below it. It now travels
  with the count, and `probe:swap-shopping` reads it by geometry. Reverting the fix fails the
  probe at 390, where the two sit 43px apart.
- **F12 at 768** (the narrowest two-column width). Every name in the grid is cut there, marked or
  not, and the grid overflows the viewport. That predates this PR and is logged in the board's
  `found` collection as `swap-decklist-768-overflow`. The inline `over $10` costs a name about 10px
  more at that width. With PR 4a's 22px ⇄ still to come, the placement question went to the
  orchestrator for a Design ruling. At 390 the line sits on the second row and costs the name
  nothing (184px of room, against Design's 131px). At 1300 no name is cut.

## Copy

The refusal key `limit.tooLow` is now `limit.invalid`, because the field refuses a figure above
the server's $100,000 ceiling as well as one under $1. Its wording, and every other swap-tools
string, goes to `/copy-review`.
