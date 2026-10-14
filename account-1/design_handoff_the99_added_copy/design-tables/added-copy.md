# Design table: Where an added copy goes (R1)

**Commit to `docs/superpowers/design-tables/added-copy.md`.** Mobile = 390, desktop = 900, from `md` up. Values not listed are as shipped (`add-cards-sheet.tsx`, `got-it-receipt.tsx`, `edit-toast.tsx`, `arrivals-summary.tsx`, `contested-card-row.tsx`).

## Component: CopyLine (Add Cards)

| Property | Mobile | Desktop |
|---|---|---|
| position | saved state, after `countsAfter`, before `See it in History` | same |
| block head | mono 10 / .14em uppercase `--fg-faint`, `line.head(n)`, pad-bottom 6 | same |
| row | min-h 44, pad 8 0, top 1px `--border`, flex, gap 10, center | same |
| sentence | 13.5 / 1.5 `--fg-body`, wraps; card `--fg` 600; deck names `--fg` | same |
| Change | 13.5 `--accent`, a `button`, min-h 44, flex-none, right | same |
| open | label → `Done`; the chooser mounts under the row, pad-bottom 12 | same |
| foot | mono 11 / 1.5 `--fg-faint`, pad-top 9, top rule when rows exist | same |
| order | the order cards were added (newest first, as the list) | same |
| a11y | Change `aria-expanded`, `aria-controls` the chooser; name `line.changeAria(card)` | same |

## Change: GotItReceipt body

| Property | Value |
|---|---|
| body | `receiptBody` gains `self`, `softSelf`, `nobody`. `claimed` / `claimedMany` are unchanged. It's no longer null when `stillNeeds <= 0` |
| Change | inline after the sentence: 12.5 / 600 `--accent`, underline offset 2, min-h 32 (44 hit area on phone via padding), margin-left 6 |
| absent | `nobody` |
| open | the app's modal (`md:w-[520px]`) / bottom sheet; the toast clock holds (`inFlight`) until it closes, then `restart()` |
| dialog | title `receipt.changeTitle` display 20; sub `{card} · added just now` 14 `--fg-body`; ContestedCardRow with `thisDeckId`; one `Done` (outline) |

## Change: ArrivalsSummary `No longer to buy`

| Property | Mobile | Desktop |
|---|---|---|
| grouping | one row per card (was per deck × card) | same |
| row | name 13.5 / 600 line; subline: sentence 13 `--fg-body` + Change | name col 170 flex-none · sentence flex 1 · Change |
| Change | as CopyLine | same |
| open | the chooser under the row, pad 2 0 12 | same |
| live | frozen until Change; then redrawn from `assignCopy`'s card | same |
| note | `sectionClearedNote` + `summaryNoteTail` | same |

## Change: ContestedCardRow

| Property | Mobile | Desktop |
|---|---|---|
| fold | committed claimants fully held and senior to the first movable one: one row, min-h 44, 1px dashed `--border`, radius 7, `▸` + mono 11 `--fg-faint` `fold(n, deck)` + `Show` 12.5 `--accent` | same |
| soft outcome | brew with soft share > 0 and granted 0: `can use it`, mono 11 `--fg-muted`, mark hollow | same |
| keep rule | 1px `--border`, margin 4 2 | same |
| keep row | as an option: `--bg`, radius 7, min-h 52 / 44. Mark round at one copy, square above. `Keep it free` 13 `--fg` | same |
| keep selected | border + mark `--accent`; outcome `kept free` mono 11 `--fg-body` (one copy) | same |
| keep count | copies > 1: stepper 44 × 44 / 28 × 28, value mono 13, after the label; tap row 0 ↔ 1 | same |
| cap | `given · kept` when keep > 0 | same |
| note | 11 / 1.5 `--fg-faint`, `chooser.keepNote` (brews: `chooser.brewNote` first) | same |
| a11y | keep row `role=radio` at one copy; with count, a `group` with a spinbutton | same |

## Keep it free, off the chooser

| Surface | Slot | Text | Ink |
|---|---|---|---|
| Decklist row | availability marker slot | `marker.keptFree(n)` + Change | mono 10.5 `--fg-faint`; Change 12.5 `--accent` |
| Shopping row | the owned fact | `ownedKept(owned, other, kept)` + Change | same |
| Card detail | `detailSplit` | `detailSplitKept(inUse, kept)` | as shipped |
| Cart line | owned fact | `ownedKept` | as shipped |
