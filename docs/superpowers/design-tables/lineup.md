# Design table: Stats on /decks (R2)

**Commit to `docs/superpowers/design-tables/lineup.md`.** Build source: `The 99 - Decks Stats (R2).dc.html`, frame component `Decks Stats.dc.html`. Mobile = 390, desktop = 900, from `md` up. 1300 holds the 900 column. **Superseded (Hugh, 2026-10-12):** at desktop Stats takes the Tiles view's container, the whole of `<main>` with 22px sides, rather than a 900 column pinned left (Stats PR 4, #1577). Values not listed are as shipped (`decks-view.tsx`, `deck-stats-shell.tsx`, `deck-stats-money.tsx`, `deck-stats-average.tsx`, `deck-stats-results.tsx`, `bracket-mark.tsx`, `colour-pips.tsx`).

**Naming.** Code side is `lineup` throughout: `LINEUP_ENABLED`, `lineup.ts`, `LineupView`. Players see "Stats". Removed from R1: `LineupViewSwitch`, `?view=lineup`, the slot chart, "Ties stack", Curve against lands, and Decks that share the most.

**Rulings closed (Hugh, 2026-10-12).** Both former proposals ship: "What each deck is worth" and "Jobs, deck by deck". A folder never scopes Stats, and the shelves leave in Stats. No `ABOUT_VERSION` bump.

**Frame mismatch: build differs from the canvas.**
- **Proposal styling:** the R2 frames still draw the `PROPOSAL` badge and the dashed brass border on Worth and Jobs.
- **Build:** both use the standard Shell, with no badge.
- **Canvas:** unchanged this round.
- **Decks per color:** the canvas lights the first N segments (`j < ds.length`, `Decks Stats.dc.html:739`). The build first kept one fixed segment per deck in lineup order; Hugh ruled on 2026-10-13 for the canvas, so the build lights the first N and rings no chosen deck.
- **Fold summaries follow the card state:** the canvas hard-codes `67 wanted by your commanders` in Collection's summary (`:778`). The build's summary counts whatever the deck select and the filter currently show (T5: Gods' own count).
- **Finished only (F2):** the canvas omits Worth and Jobs from F2 (`:570`) and leaves the wanted block at the All-decks `67` / `144` and the same rows (`:800-802`). The build draws every card under Finished only, with the brews left out of Worth, Jobs and the wanted list, and the wanted counts recounted on the finished decks.

## Component: StatsViewSwitch (/decks, `Tiles · Stats`)

| Property | Mobile | Desktop |
|---|---|---|
| position | view row, left. Shelf trigger right in Tiles; `Expand all` right in Stats | view row, first. Then 1px × 22 `--border-strong` hairline, margin 0 6 |
| control | `role="tablist"`. 2px pad, 1px `--border-strong`, r 9, gap 2 | same |
| segment | h 40, pad 0 13, r 7, 13px. Selected: `--elevated`, 600 `--fg`. Unselected: transparent, 400 `--fg-muted` | h 30 |
| view row | pad 8 16 10, gap 8 | pad 10 22, gap 6, border-top 1px `--border`, wraps |
| url | `?view=stats`. Remembered per device (G7). With the switch off, the param is ignored and Tiles draws | same |
| absent | `LINEUP_ENABLED` off: no segment. The shelf row is as shipped | same |
| shelves | leave in Stats. A folder never scopes Stats | same |

## Component: StatsFilter

| Property | Mobile | Desktop |
|---|---|---|
| control | `role="radiogroup"`. Own row under the view row, pad 0 16 12, gap 8. Grid 1fr 1fr | in the view row, after a hairline |
| segments | `All decks` (default) · `Finished only`, styled as the switch segments | same |
| scope line | mono 11 `--fg-muted`, under: `21 decks · 3 brews included` / `18 finished decks · 3 brews left out` | inline after |

## Component: ExpandAll

| Property | Mobile | Desktop |
|---|---|---|
| position | view row, right (`flex:1` spacer) | view row, last, after the scope line |
| type | 13 `--accent`, text button, min-h 44 | min-h 34 |
| label | `Expand all` while any card is folded, `Collapse all` when every card is open | same |
| action | opens or folds every card at once. Writes the fold memory (G10) | same |

## Shell + fold head (every card)

| Property | Mobile | Desktop |
|---|---|---|
| shell | `--surface-sunken`, 1px `--border`, r 12, column gap 16. Stack gap 10, stack pad 4 16 20 | stack gap 12, pad 14 22 0, border-top 1px `--border` |
| shell pad | open 6 14 16 · folded 6 14 | open 8 20 20 · folded 8 20 |
| head | `<button>` with `aria-expanded`, the whole row. Flex, gap 10, min-h 52, pad 6 0. Open: border-bottom 1px `--border` | min-h 46 |
| title | `--font-display` at `--display-weight`, 16, `--fg`. Denominator mono 10.5 `--fg-faint`, baseline gap 10, wraps | 17 |
| summary | only when folded, under the title (gap 3). Mono 11 / 1.5 `--fg-muted`, `text-wrap: pretty`. Strings in `decks-stats · copy strings.ts` `summary.*` | same |
| chevron | 44 × 44, 12px `--fg-muted`. `▴` open, `▾` folded | same |
| first visit | `recency` open, every other card folded | same |
| memory | per card, per device, in the `useStoredView` shape (G10) | same |
| never folded away | a folded recency card still counts never-played decks in its summary | same |

## IdentityMark: clustered pips

Used in every deck row, chip, lane, select and Never-played name. 26 × 26 box, `flex: none`, `position: relative`.

| Count | Pip centres (px from box centre, x, y) |
|---|---|
| 1 | (0, 0) |
| 2 | (−4, 0), (4, 0) |
| 3 | (0, −4.6), (4, 2.3), (−4, 2.3), plus a centre halo |
| 4 | (0, −5.6), (5.6, 0), (0, 5.6), (−5.6, 0), plus a centre halo |
| 5 | radius 6.8, from −90° every 72°, plus a centre halo |

| Property | Value |
|---|---|
| pip | 7, r 50%. Fill `--w/u/b/r/g`, inset 0 0 0 1px rgba(0,0,0,.3) |
| outline | one halo per pip (and the centre for 3+). Outer r 5.5 `--border-dashed`, inner r 4.5 `--bg`, then the pips. Reads as one hugging outline |
| vertical | the cluster is centred on its own y-extent |
| colorless | one hollow pip: 7, `1.5px solid var(--c)`, no fill, in its halo |
| order | WUBRG |
| a11y | `aria-hidden`. The deck name carries it |

## SpreadCard: "Brackets and colors"

### Bracket rows (replaces slots and squares)

| Property | Mobile | Desktop |
|---|---|---|
| label | `ANALYZED BRACKET` mono 9.5, ls .12, `--fg-faint` | same |
| row | grid `56px 1fr 18px`, gap 10, `align-items: start`, min-h 30. Pad 6 0 with decks, 1 0 empty | `88px 1fr 24px` |
| rows | 9: `1 · 1–2 · 2 · 2–3 · 3 · 3–4 · 4 · 4–5 · 5`, then not analyzed | same |
| single row | border-bottom 1px solid `--border` | same |
| range row | border-bottom 1px dashed `--border`. With decks: `--surface-rail` | same |
| mark | `BracketMark` art: `public/brackets/bracket-N-*.svg` as a mask in `--bracket-N`, its own numeral masked out (disc 35%), Cinzel 700 at 0.4 × size in `--bracket-N` on top. 26 | same |
| range mark | lower mark at 1, upper at `DIM_OPACITY` .65, margin-left −5 | same |
| top align | mark cell, chip line and count all take the first chip's height (34 / 30), so wrapped rows read as one row | same |
| chip | inline-flex, gap 7, h 34, pad 0 10 0 6, r 8. 1px `--border-strong`, `--surface`. Mark, then the deck link 12.5. Note mono 10 `--fg-faint`: `declared N`, or `colorless` | h 30 |
| chosen chip | none: no deck is picked out on this card; the deck select lives in This deck among yours (Hugh, 2026-10-13) | same |
| empty | `none` mono 10.5 `--fg-locked` | same |
| count | mono 11 `--fg-muted`, right. Blank when 0 | same |
| not analyzed row | min-h 44, pad 9 0 4, margin-top 6. Label `not analyzed` mono 10 / 1.3 `--fg-muted`, top-aligned. Chips dashed `--border-dashed`, transparent | same |
| no analysis (T3) | every deck under not analyzed, then 12.5 `--fg-body` sentence | same |

### Decks per color

| Property | Mobile | Desktop |
|---|---|---|
| block | pad-top 12, border-top 1px `--border`, gap 7. Label `DECKS PER COLOR` mono 9.5, ls .12 | same |
| row | grid `24px 1fr minmax(60px, max-content)`, shared by every row (subgrid), gap 10, min-h 28. 60, not the canvas's 52: `10 of 20` in Plex Mono 12 is about 58px and ran past the card, and the track grows for `100 of 100` | same |
| key | `public/mana/{W,U,B,R,G,C}.svg`, 22, as an image, untinted. `alt` = color name | same |
| bar | h 12, gap 2, one segment per deck in scope, the first N lit `--w/u/b/r/g` (colorless `--fg-muted`) for the N decks that play it, as the canvas draws it (Hugh, 2026-10-13); unlit `--elevated`, ends r 3. `aria-hidden` | same |
| chosen | none (Hugh, 2026-10-13) | same |
| figure | `N of M` mono 12 `--fg`, right, nowrap | same |
| sizes | mono 10.5 / 1.6 `--fg-faint`, pad-top 4 | same |

## RecencyCard (R1, plus marks)

| Property | Mobile | Desktop |
|---|---|---|
| head | `won w of n` mono 22 / 600, then games · pods · span mono 11 `--fg-faint` | same |
| lane | `name fig / lane lane`, gap 2 10, pad 6 0. Name: mark + link 13, gap 7 | `230px 1fr 150px`, gap 14, min-h 40 |
| track | h 30. Baseline 1px `--border-strong` at 14. Month rules 1px `--border`, right edge `--border-strong` | same |
| bead | 14, r 4, mono 9 / 600. Win `--brass` fill, ink `#14110E`. Loss `--surface-sunken`, 1px `--fg-muted` | 16 |
| since line | 3px r 2 at 13, `color-mix(--fg-muted 45%)`, last game → right edge | same |
| figures | `N days ago` mono 11.5 `--fg`. `won w of n · pods of a–b` mono 10 `--fg-faint` | same |
| never | 1px dashed `--border-dashed`, r 10, pad 12 14 14, gap 10. Names with marks, min-h 28, gap 6 14 | same |

## SharedCard (R1, unchanged)

| Property | Mobile | Desktop |
|---|---|---|
| row | `name fig / squares squares`, pad 9 0 | `190px 1fr 96px`, min-h 28 |
| square | 11, r 2, gap 3. Held `--fg-muted` fill. Wanted, no copy left: 1px dashed `--fg-muted` | 13 |
| open | 12.5 / 1.55 `--fg-body`. Cart link mono 11 `--warning`, underline 45% | indent 202 |
| chips | select/unselect pills. h 44, pad 0 12, 12.5. Selected `--accent`, `--bg` 600. Unselected 1px `--border-strong`, `--elevated` | h 30 |

## CollectionCard + "Not in a deck, wanted by your commanders"

| Property | Mobile | Desktop |
|---|---|---|
| fields | stacked, gap 18 | 2 columns, gap 28 |
| unit | 7, r 1.5, gap 2. In a deck `--fg-muted`. Not in one: 1px `--border-strong`. 1 = 10 copies / $10 | 8 |
| figures | mono 17 / 600. In a deck `--fg`, not in one `--fg-muted` | 20 |
| wanted block | pad-top 12, border-top 1px `--border`, gap 8. Heading 14 / 600 | same |
| deck select | min-h 44, full width, pad 0 12, r 9, 1px `--border-strong`, `--surface`, 13.5, gap 8, `▾` 10 `--fg-muted` | min-h 36, content width |
| select options | `All decks` (default, no mark), then each deck with its mark. Picked deck shows its mark | same |
| cut chips | select/unselect, as SharedCard. `40% or more · N` (selected by default) · `20% or more · N` | same |
| recount | chip counts follow the select: All decks `67` / `144`, one deck that deck's own (Gods `4` / `11`, illustrative). With one deck selected, the `N more` line is hidden | same |
| partner deck | reads `commander_pair_support_cards`. Basis reads `Kratos + Atreus decks` (T5) | same |
| row | grid `1fr auto`, gap 3 12, pad 9 0. Card 13.5 `--fg` · pct mono 11 + `of {basis}` `--fg-faint` · line mono 10.5 `--fg-faint` with deck link | same |

## AmongCard: lines and a rank column

| Property | Mobile | Desktop |
|---|---|---|
| select | min-h 44, full width, with the chosen deck's mark. Default: played most recently | min-h 36 |
| grid | `74px 1fr 72px`, gap 10 | `112px 1fr 110px`, gap 16 |
| head | `RANK` mono 9.5, ls .08, `--fg-faint`, right | same |
| groups | `THE BUILD` (Mana value, Lands, Ramp) · `JOBS` (Card draw, Removal) · `VALUE` (Deck value). Mono 9.5, ls .12 | same |
| row | min-h 52, border-bottom 1px `--border`. Name 13 `--fg-body` | same |
| strip | h 46. Track 2px r 1 `--elevated` at 26. Lo / hi mono 9.5 `--fg-faint` at 33 | same |
| other decks | one line per deck: 2 × 12, r 1, `--fg-faint` .8, at 21. No stacking: equal values overlap | same |
| median | 2 × 20 `--fg` at 17 | same |
| chosen | 12 dot, `--accent`, ring 0 0 0 2px `--surface-sunken`, at 21. Value above it: mono 11 / 600 `--accent` at 0, clamped to the edge past 20% / 80% | same |
| rank | `Nth of M` mono 12 `--fg`, `tied ` prefix when equal. `median X` mono 10 `--fg-faint`. Right, gap 1 | same |
| legend | 11.5 `--fg-body`: 10 dot `--accent` = deck name · 2 × 10 `--fg-faint` = `the other N` · 2 × 14 `--fg` = `the median deck` | same |

## WorthCard: "What each deck is worth" (ships)

| Property | Mobile | Desktop |
|---|---|---|
| head | total mono 22 / 600 `--fg`, alone | same |
| sort | select/unselect chips: `Most first` (selected by default) · `By name` | same |
| row | `name fig / track track`, `1fr 70px`, gap 3 10, pad 5 0, border-bottom 1px `--border` | `250px 1fr 76px`, gap 12, min-h 28 |
| name | mark + link 12.5, gap 7, ellipsis | same |
| track | h 16 | h 22 |
| bar | inset top / bottom 5, width = value ÷ max, r 0 3 3 0. `--fg-muted` .75 | same |
| chosen | the deck selected on AmongCard. Bar `--accent` at 1, name and figure `--accent` 600 | same |
| median | 1px dashed `--fg-body` at median ÷ max, top / bottom −2, through every row | same |
| figure | `$0.00` mono 11.5, right | same |
| legend | 14 × 8 r 2 `--accent` = chosen deck · 1 × 12 dashed `--fg-body` = `the median deck, $X` | same |
| caption | `ManaPool prices, 2h ago` mono 10.5 `--fg-faint` | same |

## JobsCard: "Jobs, deck by deck" (ships)

| Property | Mobile | Desktop |
|---|---|---|
| grid | `1fr repeat(4, 46px)`, gap 3 | `1fr repeat(4, 84px)` |
| columns | Lands · Ramp · Draw · Removal. Head mono 9.5, ls .06, uppercase, `--fg-faint`, centred, pad-bottom 6, border-bottom 1px `--border` | same |
| sort | press a column head to sort by it, most first, then by name. Sorted head `--fg` with ` ↓`, `aria-sort="descending"`. Default Ramp | same |
| row | min-h 32, pad 1 0. Name: mark + link 12.5, ellipsis | min-h 28 |
| cell | h 28, r 3, mono 11. Shading per column, min to max: `color-mix(--fg-muted (6 + t × 52)%, transparent)`. Ink `--bg` when t > .6, else `--fg` | h 24 |
| chosen | the AmongCard deck: inset 0 0 0 1px `--accent`, r 4, name `--accent` 600 | same |
| caption | `Press a column to sort.` mono 10.5 `--fg-faint` | same |
| data | the deck's Jobs counts (G3: label generation in the cache key) | same |

## a11y
- The switch is `role="tablist"` and the filter is `role="radiogroup"`. Chips are toggle buttons (`aria-pressed`).
- Every fold head is a `<button aria-expanded>`, with the title as its name. The summary is in the accessible name only while folded.
- Every chart carries a text equivalent:
  - the lane figures, bracket counts, `N of M`, ranks, worth figures and job cells are real text;
  - squares, segments, strips and identity marks are `aria-hidden`.
- Bracket marks carry `aria-label` = `bracket N` (range: `bracket N to N+1`).
- Mana keys carry the color name as `alt`.
- Every deck and card is a `link` with its name.
