# States: Deck Stats (R2)

Canvas ids in brackets. `README.md` is the prose.

## §A The view

| State | Canvas | Draws |
|---|---|---|
| switch off | n/a | No Stats segment, no fetch. All and Shopping as they ship. |
| loading | n/a | The six card shells with titles and rules; bodies empty. No spinner, no skeleton bars. |
| populated | 1b | Six cards. One column at 390; two at 1300 (curve, jobs, money left; colors, average, results right). |
| not analyzed | 1b | Identical, minus every `finding ⟶`. Never a prompt to analyze. |

## §B Per view

| View | State | Canvas | Draws |
|---|---|---|---|
| a | populated | 1c1 | Tally, type chips, caption with average mana value and lands. |
| a | type lit | 1c2 | Chip border `--fg`, its squares keep their type color, the rest `--border-strong`. Caption states the lit count. |
| a | thin | 1c3 | Empty bucket: `0` in `--fg-locked`, no squares. Zero types keep their chip. |
| b | populated | 1d1 | Butterfly of shares, counts printed, hollow squares for non-land sources. |
| b | one color | 1d2 | Caption leads “Every pip is green.” |
| b | thin / no lands | 1d3 | Equal small bars. At no lands every source is 0 and the caption says so. |
| c | populated | 1g1 | Three figures, the square grid, the priciest five. |
| c | all owned | 1g2 | To buy reads “Nothing” in `--fg-body`; the To buy legend and Shopping link are absent. |
| c | unpriced | 1g3 | “no price”, never `$0.00`; deck value says how many copies it priced. |
| d | commander or pair | 1f1 | Basis names the commander (or both partners) and the deck count. |
| d | identity | n/a | As 1f1; basis reads “the average Jund deck”, no deck count. |
| d | starting mix | 1f2 | Lands and jobs only; the note says why curve and types are absent. |
| d | thin | 1f3 | Bars cap with `‹` or `›`; figures whole. |
| e | populated | 1e1 | Six rows, one open at a time; overlap footnote. |
| e | unlabeled cards | 1e2 | Dashed squares and their count under the rows. |
| f | 6+ games | 1h1 | Record, beads, last five underlined and stated. |
| f | 1 to 5 games | 1h2 | Record and beads; no last-five line. |
| f + g | no games | 1h3 | One absence for both; link to Games. |
| g | populated | 1h1 | Current version first, newest down, Version not recorded last. |
| g | brew (no versions) | n/a | By version absent, as the Versions tab is. Record and beads still draw. |
| g | version with no games | 1h1 | “no games yet” in place of beads, no record. |

## §C Interaction

| Control | Does | Hit target |
|---|---|---|
| All · Shopping \| Stats | Stats swaps the panel body and hides every list tool | 44px segments at 390, full width |
| Type chip | lights that type's squares; tap again clears; Land is not selectable | 44px at 390, 28px at 1300 |
| Job row | opens its card names; one row open at a time | the whole row |
| `finding ⟶` | opens Analysis at that finding | 44px at 390 (padded) |
| Log a game in Games ⟶ | switches to the Games tab | 44px at 390 |

## §D Announcements

None on load. A lit type announces its caption (`aria-live="polite"` on the caption only). Each card is a `role="figure"` with an `aria-label` stating its denominator.

## §E The toolbar (2a)

| Segment | 1300, right side | 390, rows under the control |
|---|---|---|
| All | count line, Lock cards, By type / By role, sort, list/grid | row 2: Lock cards, list/grid · row 3: grouping, sort |
| Shopping | By type / By role, sort | row 2: grouping, sort |
| Stats | provenance line | provenance line, then the cards |

## §F Bead key

Win `--brass` fill · Loss outlined `--fg-muted` · Draw half-filled `--fg-muted`. The letter is always printed.
