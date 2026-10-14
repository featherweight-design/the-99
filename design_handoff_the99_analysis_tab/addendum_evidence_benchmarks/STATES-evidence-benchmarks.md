# States: evidence benchmarks (Analysis tab addendum, R2)

Canvas ids are in brackets. `README.md` is the prose. This extends `../STATES-analysis-tab.md` and changes none of its rows.

## §A The page, per state

| Canvas | State | Block |
|---|---|---|
| 1j | never analyzed (2a), loading (2b), failed (2c) | **none**. 2a is unchanged |
| — | fetching (8a) | none |
| 1a–1h | any analyzed reading (2e–2h) | last in the tab, under *What is in this deck*: head row and caption, 4 grade tiles, then the Dependencies box |
| 1i | stale (2i) | whole, with caption `captionStale(date)`. No tag, no dimming. The banner's note stacks under its line, left-aligned |
| — | failed re-read over a held reading (2d) | whole, as 1i. It's the held reading's block |
| — | Re-analyze loading over a held reading | whole. The banner button disables in place, as shipped. The block never goes busy on its own |
| 3a | list under the floor (60 drawn, the plan fixes it) | dashed box: `tinyHead`, `tinyLine`, the five names. No grades and no rows |
| — | `DECK_BENCHMARKS_ENABLED` off | not computed and not drawn |

*Recommended mix* sits above the tabs, under the commander art, in every state. It isn't part of the tab.

## §B A grade tile

| State | Name | Headline | Meter | Figure line | Opener |
|---|---|---|---|---|---|
| graded (velocity, flow, interaction) | 12/600 `--fg` | step word, display 18 (15 at 390) `--fg` | 5 segments: segment i of 1..step in `STEP_INK[i]` (one blue, h 250, chroma 0.02 to 0.135), the rest `--elevated` + `--border-strong` inset | 10.5 (11.5) `--fg-muted`, the decisive run `--fg`/600 | `open(n)` |
| win speed, counted combo | as above | as above | as above | `figure.win` | `openCombo(lines)` |
| win speed, no combo | as above | `noCombo`, sans 14/500 (13) `--fg-body` | **none** | `noComboLine` | **none**. Drawn in a dashed panel; at 390 the panel sits inside the row at min 104px, matching the graded rows |

- Ground: graded `--surface` / `--border-strong`. No combo: transparent / 1px dashed `--border-dashed`.
- 1300: `repeat(4, 1fr)`, gap 10. 390: one `--surface` box of rows, with a 44px right-aligned opener.
- Meter: `role="img"`, `aria-label = stepAria(...)`.

## §C The Dependencies box

| State | Content |
|---|---|
| one or more rows [1a–1g] | head: `deps.name` 12/600 + the InfoTip ring (`deps.sub` in the tooltip, §2t). Then one row per dependency at the light cut or above: **heavy first**, then the fixed order graveyard · artifacts · enchantments · creatures · activated · combat |
| four rows [1e] | the same form. The box grows by row, and the grades row is unchanged |
| none [1h, 3a all-lowest] | dashed panel inside the box: `noneHead`, `noneLine`, `checked`. No opener |

**Row:**
- 1300: `220px 1fr 1.15fr 120px` at ≥46px. The cells are: the strength tag (50px) + the name 13/600 · the figure · `brokenBy` over the hate · the opener.
- 390: stacked, in the same order, with the opener at 44px.

**Strength tag:**
- It's a word, never a meter. Mono 9 uppercase, radius 4.
- Heavy: `--fg` on a 1px `--fact` edge with a 14% `--fact` tint.
- Light: `--fg-muted` on a `--border-strong` edge.

**Rules:**
- There's no total and no row count anywhere.
- Ground `--surface-sunken` / `--border`. Rows are split by 1px `--border`.
- **Combat, Heavy** (no route out of combat) draws **no opener**: there are no cards to list (the findings' zero rule). Combat Light lists its routes.

## §D Ledger (ModalChrome 760, phone sheet from 52)

| Ledger | Header aside | Summary | Groups | Points | Link |
|---|---|---|---|---|---|
| velocity [2a] | step word | `readings.velocity`, scale, `expectedTurn` | Counted · Read, not counted | `+1` / `+0.5` / `+0.25` / `0` | `linkCurve` |
| card flow [2b] | step word | `readings.flow`, scale | Counted | `+2` / `+1` | `linkJobs` |
| interaction [2c] | step word | `readings.interaction`, scale | Counted, sorted by weight | `+3` / `+2` / `+1` | `linkJobs` |
| win speed [2d] | step word | `readings.win`, scale, `winNote` | one section per line: plates, pieces, produces, `byT8`, `foundBy`, Spellbook link | none | none |
| graveyard [2e] | strength tag | `readings.graveyard`, `brokenBy`, `landsLeftOut` | Uses the graveyard | none | none |
| artifacts [2f] | strength tag | `readings.artifacts`, `brokenBy`, `onceNote` | Pays off · With abilities · Other artifacts | none | none |
| enchantments | strength tag | `readings.enchantments`, `brokenBy`, `onceNote` | Pays off · Other enchantments | none | none |
| creatures | strength tag | `readings.creatures`, `brokenBy` | Pays off on creatures | none | none |
| activated | strength tag | `readings.activated`, `brokenBy` | Creatures with abilities | none | none |
| combat, light [2g] | strength tag | `readings.combat`, `brokenBy`, `reachNote` | Wins outside combat | none | none |

- **Dependency ledgers have no scale and no mini meter.** The strength tag sits left of the title `ledgerTitle(row)`.
- **Rows are the shared card row** (`ROW_SHELL` + DecklistRow padding), split by a 4px gap.
  - The order is: availability marker · name · why tag (mono 10.5 `--fg-muted`) · `CostTrack` 72 · points (40px, graded only).
  - 1300: 34px tall. 390: 52px, with a meta line of pips then the why.
  - Hover: `--elevated-hover` + `HoverPreview`. Press: `CardDetailTrigger`, with siblings set to the ledger's rows.
  - Group heads are the decklist's: display 15 + a mono count.
- **Card names are `CardDetailTrigger`s.** The card stacks over the sheet as it does over the receipt (`← {title}`). Depth stays at two.
- **A ledger simply lists its cards.** No group, note or line refers to how a card was read.

## §E Announcements

None new. The block arrives with the reading and is covered by the shipped `Analysis ready.`

## §F Sheets, added to `STATES-analysis-tab.md` §D

| Sheet | Opened from | Width | Stacks |
|---|---|---|---|
| Ledger | a tile's *see the N cards / lines*, or a dependency row's *see the N cards* | 760 | a line or plate → CardModal, *← {title}* |
