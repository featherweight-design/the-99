# The 99: Deck Stats, round 1 (design handoff)

**Source of truth:** `docs/superpowers/design-briefs/2026-10-03-deck-stats.md`, read from **PR #1228** (`refs/pull/1228/head`). It is not on `main` yet. If the merged brief differs, the brief wins.
Drawn against `builder-tab-specs.ts` (tab rules), the shipped Your deck / Analysis chrome as drawn in `design_handoff_the99_deck_description`, and the brief's per-item record. `stats.ts`, `build.ts`, `read.ts`, `games.ts` were not re-read: their behavior is taken from the brief's `file:line` citations.

**Status:** R2, approved by Hugh 2026-10-03. /copy-review owes a pass on every string. Where R1 rulings below disagree with the R2 section, R2 wins.

**One line:** *the list, drawn. A second view of Your deck, not a sixth tab.*

Note: `design_handoff_the99_deck_stats/` is the earlier, separate 2026-09-12 "What this deck is" block. This round replaces its placement (the foot of the Deck panel) with the Stats view; its drawing rules (unit square, no hard 99, no `$0.00`, `7+`, lands never a ninth column) carry over.

## Files
- `The 99 - Deck Stats.dc.html`, the canvas. 2a the toolbar · 1a calls · 1b the whole view at 1300 and 390 · 1c to 1h every view and its thin or empty state at both widths · 1i About · 1j states.
- `Stats Card.dc.html`, the one card component every frame mounts (prop `card`). Six kinds.
- `STATES-deck-stats.md`, `deck-stats · copy strings.ts`, `ABOUT-entry.md`, `READINESS.md`.
- `The 99 - Deck Stats R1 (explorations).dc.html`, the rejected directions, for the record.
- `brand/`, `support.js`.

## Placement
A **List / Stats** segmented switch is the first row of the Your deck panel, at both widths (44px tall, full width at 390). No sixth tab, no change to the tab row.
- A tab is a destination with a count; Stats has no count and describes the list the tab already holds.
- Analysis keeps judgment (ruling 2); folding facts into it makes them read as verdict.
- Games would hide five of seven views behind a tab about play.
- A band cannot hold seven views without making them sparklines.
Off: no switch, no fetch, the panel is the list as it ships. The switch remembers the last view per device.

## The six cards (seven views)
| Card | Views | Drawing |
|---|---|---|
| The curve, by card type | a | Unit tally (one square per card, never rescaled), eight columns to `7+`. Type chips are the breakdown and the control: tap one to light its squares. Land is a dashed chip, never a ninth column. |
| Colors, asked for and made | b | Butterfly per color pip: share of pips left, share of land sources right, counts printed. Non-land sources as dashed squares, counted, not colored. |
| Jobs | e | One tally row per job from `readLabels`; tap a row to name its cards. Overlap stated. A card with no label is read from its text and says nothing (Hugh's ruling, 2026-10-10: users do not know what labels are, so the app never mentions them; a card with no label is read from its rules text and nothing is said.) |
| Against the average deck | d | Diverging bars from the average, one neutral ink, figures whole on the right, basis named. Mini diverging curve. |
| Money and ownership | c | Three figures (deck value, owned, to buy), the deck as one square per card (owned, basics, to buy), priciest five. |
| Results | f + g | Record, beads oldest first, last five underlined after the sixth game; By version rows with **Version not recorded** last. |

## Rulings
1. **Facts, never grades.** No success, warning or danger in Stats. Accent only on To buy and links.
2. **The Analysis link** is `finding ⟶` beside the figure. It opens Analysis at that finding and never repeats the finding's title. Drawn only when a reading exists and has a finding on that figure; absent otherwise, never a prompt to analyze.
3. **Color supply** counts lands by what each land can add: a dual twice, a fetch for the basic types it can fetch, an any-color land once for each of the deck's colors. Non-land sources are counted and drawn hollow. See READINESS for the data this needs.
4. **One count per job on the page.** Ramp, draw, removal and wipes in the Average card use the same label counts as the Jobs card.
5. **No version:** “Version not recorded”, italic, last. States no cause.
6. **Empty and thin:** every view draws at its true size; only Results has an empty state (record, trend and by-version collapse into one). Never `0–0–0`, `avg 0` or `$0.00`.
7. **Round 2 room:** more cards in the same stack (evolution, collection share, opening hand); a share button on the switch row.

## R2 (Hugh's picks, supersedes the rulings above where they differ)
- **Placement A, grouped:** one segmented control `All · Shopping | Stats` replaces the two pills. At 390 it takes row one (three 44px segments); Lock cards and density move to row two, grouping and sort to row three. In Stats every tool leaves.
- **Color:** curve squares in the card-type palette (2c); a hue per job; average bars violet (fewer) and blue (more); Money from 2c (owned `--fg-muted`, to buy filled `--warning`, linking to Shopping); wins `--brass`, losses outlined, draws half-filled.
- The new palettes (8 type hues, 6 job hues, 2 average hues) need tokens across all six themes: equal lightness and chroma per palette.
- R1 explorations: `The 99 - Deck Stats R1 (explorations).dc.html`.

## Turn 2 (record)
- **2a, placement revised:** Stats becomes a third pill in the existing All · Shopping row, after a hairline (A, recommended), or a third icon in the density toggle (B). The separate switch row from turn 1 is withdrawn either way.
- **2b to 2d, color directions:** Mana colors, a card-type palette, and filled charts. In all three, To buy takes Shopping's orange (`--warning`) and links to the Shopping pill, and wins turn gold (`--brass`). Turn 1's "no WUBRG off the pips" and "accent only on To buy" rulings are suspended until a direction is picked.

## About
New entry `deck-stats`, chapter 04. See `ABOUT-entry.md`.
