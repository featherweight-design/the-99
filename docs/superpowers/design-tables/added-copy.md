# Design table: Where an added copy goes (R1)

Committed from `design/design_handoff_the99_added_copy/design-tables/added-copy.md` (R1). **Keep it free is removed: Hugh ruled it out on 2026-10-12** (plan `plan-added-copy-2026-10-12`, re-scope). Every Keep it free row is gone: the chooser's keep rule, keep row, keep selected, keep count and cap rows, the keep note, and the whole "Keep it free, off the chooser" table (KF1 to KF6). The `kept` (L7) and `capped` (L8) line forms go with them. An unassigned copy goes down the seniority queue as it always has.

Mobile = 390, desktop = 900, from `md` up. Values not listed are as shipped (`add-cards-sheet.tsx`, `got-it-receipt.tsx`, `edit-toast.tsx`, `arrivals-summary.tsx`, `contested-card-row.tsx`).

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
| note | 11 / 1.5 `--fg-faint`, `chooser.brewNote` when two or more brews read `can use it` | same |

## Build notes (PR 1, the upload summary)

| Point | As built |
|---|---|
| switch | `ADDED_COPY_ENABLED` and `COLLECTION_EDIT_ENABLED` (`added-copy-flag.ts`). Off, the receipt is written as version 3 and every row draws as shipped |
| receipt | version 4 adds `went` per card; a version 2 or 3 receipt keeps its per (deck, card) rows with no Change |
| line, several decks | `row.goesToMany` only when every deck took one copy; otherwise `row.goesToManyUneven` (audit 8) |
| line, no chooser | a card no deck claims any more draws the sentence with no Change |
| line, contested card | a card the contested section is still deciding keeps its shipped rows: one chooser per card on the page |
| fold | drawn at two or more folded decks; read off the server's claimants, so a pick never unfolds it |
