# Close-out walk: Tuning hub, Mana Balance and History

**Walked:** 2026-10-11, `next dev` on this branch against scratch branch `br-broad-tree-a6yshi9d`
(a `pull:staging` copy), signed in as the audit account, on its `HD - Gishath` deck, with
`ANALYSIS_TAB_ENABLED`, `TUNING_ENABLED`, `PROPOSED_CUTS_ENABLED`, `MANA_BALANCE_ENABLED` and
`DECK_STATS_ENABLED` on. Chromium at 390×844 (touch), 1300×900 and 900×900, each width with
`prefers-reduced-motion` unset and, at 390 and 1300, set to `reduce`. **66 of 66 checks passed.**
The scratch branch was deleted once this was recorded.

## What was checked, and how

| Check | Result |
|---|---|
| A tool tile (Mana Balance, History) brings the hub's top into view | Every width: one `scrollIntoView` on the hub, `behavior: "smooth"` with motion allowed and `"auto"` under reduced motion. The hub lands at 16px, or at the page's limit when the page is too short (History on this deck: 221px at 390, 426px at 1300). |
| Smooth is smooth | Frames seen moving: Mana Balance 28 at 390 and 45 at 1300, against 4 under reduced motion. History at 390 travels 206px while the main thread renders its rows (one 235ms frame gap), so rAF sees the start and the end only; the call asked for `smooth`, and the scroll runs on the compositor. |
| History waits for its rows | The rows (or the empty box) are drawn when the scroll lands, at every width. Unit test: no scroll while the first page is pending; mutation-checked. |
| No "without the commander" line | The Mana Balance table carries no `without` text at any width. Measured first on staging: counting the commander's own cost in Needed and in Improve my mana's order moves nothing on Gishath or Blood Rites. |
| Needed figures stay in their column | Every Hardest costs row, all three colors: the figure's right edge is inside the row. `You have 34 · Needs at most 26` stays on one line at 390 and wraps at its ` · ` to two right-aligned lines at 900 and 1300. |
| Improve my mana's result comes into view when it lands | One `scrollIntoView` on the result heading, smooth or `auto` as above, never while it reads. The heading lands at 16px at every width. |
| A staple row, its hover preview and its card details draw one printing | On Stomping Ground, which the account owns as CLU 281 (not the catalog's printing): the row's thumbnail, the hover preview (1300, 900) and the card details all draw CLU 281. At 390 no hover preview draws, as on the decklist, and a tap opens the details. Overgrown Farmland, the card Hugh named, is not among this account's green staples on the scratch copy, so the same chain was proven on the card that is; `readManaHelpFor`'s unit test pins the overlay. |
| About entry | `Reading your deck’s mana` draws in 04 with the tool's own color table as its figure, at every width. |

Screenshots of each surface were taken at each width during the walk.

## Seen, not changed

- The card details' `SET` field read `EOE` while the art drawn was CLU 281. That field is card details'
  own, not this line's, and is left for its owner.
