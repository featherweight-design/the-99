# Design table: Lineup (R1)

**Commit to `docs/superpowers/design-tables/lineup.md`.** Mobile = 390, desktop = 900, from `md` up. Values not listed are as shipped (`decks-view.tsx`, `deck-stats-shell.tsx`, `deck-stats-money.tsx`, `deck-stats-average.tsx`, `deck-stats-results.tsx`).

## Component: LineupViewSwitch (/decks)

| Property | Mobile | Desktop |
|---|---|---|
| position | shelf-trigger row, left. The trigger moves right | shelf row, first. 1px × 22 `--border-strong` hairline after |
| control | segmented, 2px pad, 1px `--border-strong`, r 9. Segments h 40, r 7, 13px. On `--elevated` 600 `--fg` | segments h 30 |
| row height | 44 + pad 8/10 (was ≈30) | unchanged |
| absent | `LINEUP_ENABLED` off | same |
| url | `?view=lineup`. Remembered per device (G7) | same |

## Component: LineupFilter

| Property | Mobile | Desktop |
|---|---|---|
| position | own row under the switch row, full width, 2 equal segments | the switch row, after a hairline |
| segments | `All decks` · `Finished only`, as the switch | same |
| scope line | mono 11 `--fg-muted`, under | mono 11 `--fg-muted`, inline after |

## Shell (every card)

Deck stats' `Shell`: `--surface-sunken`, 1px `--border`, r 12. Pad 14/14/16 (mobile), 18/20/20 (desktop). Gap 16. Title Metamorphous 16 / 17. Denominator mono 10.5 `--fg-faint`, right. Proposals: border 1px dashed `color-mix(--brass 55%, --border-dashed)`, badge mono 9.5 `--bg` on `--brass`. Stack gap 14 / 18.

## RecencyCard

| Property | Mobile | Desktop |
|---|---|---|
| head | `won w of n` mono 22 / 600, then games · pods · span mono 11 `--fg-faint` | same |
| lane grid | `name fig / lane lane`, gap 2 10, pad 6 0 | `230px 1fr 150px`, gap 14, min-h 40 |
| axis | 10 Jul → today. Month ticks 1px `--border` and mono 9.5. Right edge `--border-strong` | same |
| bead | 14, r 4. Win `--brass` fill, ink `#14110E`. Loss `--surface-sunken`, 1px `--fg-muted` | 16 |
| since line | 3px, `color-mix(--fg-muted 45%)`, last game → right edge | same |
| never | 1px dashed `--border-dashed`, r 10, pad 12 14 14. One 10px dashed square per deck. Names wrap, gap 6 14 | same |

## SpreadCard

| Property | Mobile | Desktop |
|---|---|---|
| slots | 9: bracket 26, boundary 24, gap 3 | bracket 46, boundary 34, gap 4 |
| square | 18, stripes by identity, inset 1px rgba(0,0,0,.35). Stack height 5 squares | 22 |
| slot rule | bracket 1px `--border-strong`, mono 11. Boundary 1px dashed `--border-dashed`, mono 9.5. Open: `--fg` 600, underline | same |
| not analyzed | 7 columns, opacity .55, 1px dashed outline. Wraps below | 2 columns, beside |
| open list | `--surface-rail`, r 9. Flag 12 + deck link + mono 10 note | same |
| colors | `24px 1fr 52px`. Key: mana SVG 22. Bar h 12, gap 2, one segment per deck, lit `--w/u/b/r/g/c`, unlit `--elevated`, ends r 3. Figure `N of M` mono 12 | same |

## SharedCard

| Property | Mobile | Desktop |
|---|---|---|
| row | `name fig / squares squares` | `190px 1fr 96px`, min-h 28 |
| square | 11, r 2. Held `--fg-muted` fill. Wanted, none left: 1px dashed `--fg-muted` | 13 |
| open | 12.5 / 1.55 `--fg-body`. Cart link mono 11 `--warning`, underline 45% | indent 202 |
| chips | pill, h 44, active `--accent` | h 30 |

## CollectionCard

| Property | Mobile | Desktop |
|---|---|---|
| fields | stacked, gap 18 | 2 columns, gap 28 |
| unit | 7px, gap 2. In a deck `--fg-muted`. Not 1px `--border-strong`. 1 = 10 copies / $10 | 8px |
| figures | mono 17 / 600. In `--fg`, not `--fg-muted` | 20 |
| wants row | card 13.5 `--fg` · pct mono 11.5 · line mono 10.5 `--fg-faint` with deck link | same |

## AmongCard

| Property | Mobile | Desktop |
|---|---|---|
| grid | `78px 1fr 84px` | `112px 1fr 120px` |
| strip | h 34, baseline 1px `--border-strong` at 22. Median 1px × 26 `--fg-body` | same |
| dots | 8, `--fg-faint` .85. Ties stack up 6px per deck | same |
| chosen | 12, `--accent`, ring 2 `--surface-sunken` + 1 `--accent` | same |
| select | h 44, full width | h 36 |

## a11y
- The switch is `role="tablist"` and the filter is `role="radiogroup"`.
- Each chart carries a text equivalent: the lane figures, the slot counts and the row figures are all real text. Squares are `aria-hidden`.
- Every deck and card is a `link` with its name. Squares that are links (spread, scatter) take `aria-label` = deck name and bracket / figures.
