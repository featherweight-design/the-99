# The 99: Deck Stats card (b), colors, the richer version (design handoff, addendum, PR 4b)

**Source of truth:** `docs/superpowers/plans/2026-10-08-deck-stats.md` (main), section *New in this plan: the mana cost vs. production chart*. Its section *Proposed curve weighting* is **withdrawn**. Hugh dropped weighting on 2026-10-09: on HD - Yuriko and HD Gishath it moved the split by about a point, and neither deck's short color changed.
Aligned with `design_handoff_the99_deck_stats_view/`, card (b) (`Stats Card.dc.html`, `colors()`), and its R1 ruling 3 (the raw pip-share butterfly).

Files: `The 99 - Deck Stats Mana.dc.html` (canvas: m0 calls; m1 Gishath, m2 balanced and m3 thin, each at 390 and 1300; mt counting rules), `STATES-deck-stats-mana.md`, `deck-stats-mana · copy strings.ts`, `READINESS.md`, `brand/`.

**Status:** R2, approved by Hugh 2026-10-09 ("LGTM"). Unblocks PR 4b. Lands in the repo at `design/design_handoff_the99_deck_stats_mana/`.

**One line:** *every source takes its colors. A source that isn't a land is striped.*

Closed and not redrawn: card (b) ships in round 1 as already drawn (ruling 9, lands by color). This addendum is PR 4b only.

## The calls

| # | Open item | Called |
|---|---|---|
| 1 | Mana rocks, dorks, land search on the production side | **Colored, in the colors they make, as a striped segment** after the land segment in that color's bar. Each color keeps one bar, so supply share against pip share is still one length against another. The stripe uses the same hue (135°, 2px on 5px, with a 1px inset edge in the hue), so a Signet never looks like a land. Shares are of all sources. |
| 2 | Curve weighting | **Dropped.** Pips are plain symbol counts per copy (`manaNeeds()`). No "weighted" anywhere. |
| 3 | Only lands make mana | All bars solid and rounded. One line replaces the legend: *Every source is a land. This deck has no mana rocks, dorks or land search.* A fact, not a nudge (ruling 1). |
| 4 | "Short" | Not marked. The card prints and draws both shares. The read belongs to Mana Balance. |

## R1 review (Hugh, 2026-10-09)

1. **Title:** `Mana colors`, replacing *Colors, asked for and made*.
2. **Header on one line at 390:** title and denominator are `nowrap`. `Mana colors` at 17 + ⓘ + `104 pips · 65 sources` fits the 328px header with about 80px spare.
3. **Column heads:** `PIPS` · `SOURCES`. *Asks for* and *Makes* are cut.
4. **The caption** moves into a tooltip on an ⓘ beside the title.
5. **Hollow squares removed** (R1's "color unreadable" row, and the PR 4 contrast frame). Cards whose mana color can't be read are not counted, and the tooltip says so in one clause. That removes the old About key line's contradiction too: no non-land source is drawn without its color.
6. **"Mana" leads every** *mana rock, dork or land search*.
7. **Corner radii:** a bar with no striped part is fully rounded (3px). A mixed bar rounds the outer ends only.

## Property table (card b, PR 4b)

Sits beside the `deck_stats_view` tables. Anything not listed is unchanged from `Stats Card.dc.html` `isColors`.

| Element | Property | 390 | 1300 | Was (PR 4) |
|---|---|---|---|---|
| Card | padding | 16px 14px | 20px 22px | same |
| Title | text · type | `Mana colors` · Metamorphous 17, `nowrap` | Metamorphous 19 | `Colors, asked for and made` |
| ⓘ | glyph · target | 18px circle, 1px `--fg-faint`, `i` Plex Mono 10.5 `--fg-muted`; open: `--fg` · 44×44 | same glyph · 28×28 | n/a |
| Tooltip | opens | tap; tap again or outside closes | hover or focus; Esc closes | n/a (was the caption) |
| ↳ box | | card width, below the header rule +6px | 340px wide, left-aligned to the title | n/a |
| ↳ fill | | `--elevated`, 1px `--border-strong`, radius 8, padding 12 14, shadow 0 8 24 / 45% | same | n/a |
| ↳ text | | two lines of 12.5 Plex Sans `--fg-body`, gap 8 | same | n/a |
| Denominator | text | `{pips} pips · {sources} sources`, Plex Mono 10.5 `--fg-faint`, `nowrap` | same | `{pips} pips · {lands} lands` |
| Column heads | text | `PIPS` (right-aligned) · `SOURCES` | same | `ASKS FOR · PIPS` · `MAKES · LAND SOURCES` |
| Pip bar (left) | fill · height · radius | pip color · 14 · 3 | same | same |
| Pip bar | length | share of all pips ÷ the card's largest share × 60% of the half column | same | same |
| Pip label | text | `{n} · {share}%`, plain counts | same | same |
| Source bar (right) | length | share of **all** sources (land + non-land), same scale as pips | same | share of land sources |
| ↳ land only | radius | 3 all corners | same | same |
| ↳ land segment, mixed | fill · radius | solid pip color · 3 0 0 3 · ≥ 4px | same | n/a |
| ↳ non-land segment | fill | `repeating-linear-gradient(135deg, {c} 0 2px, transparent 2px 5px)` + `inset 0 0 0 1px {c}`, 1px gap after land | same | n/a |
| ↳ non-land segment | radius · min width | 0 3 3 0 (3 if no land) · 8px, taken from the land segment | · 10px | n/a |
| ↳ mixed bar | floor | ≥ 13px (4 + 1 + 8), even if that overstates a tiny share; the printed share is always exact | ≥ 15px | n/a |
| Source label | text | `{land + non-land} · {share}%` | same | `{lands} · {share}%` |
| Legend | when | any non-land source exists | same | n/a |
| ↳ swatches | | 18×10, `--fg-muted`, solid and striped | same | n/a |
| ↳ text | | `Land {n}` · `Mana rock, dork or land search {n}`, 12 Plex Sans `--fg-body`, counts 11 Plex Mono | same | n/a |
| Lands-only line | when | non-land total is 0 | same | n/a |
| Divider above legend / line | | 1px dashed `--border-dashed`, padding-top 12 | same | same |
| Hollow squares | | **removed** | removed | every non-land source |
| Caption | | **removed** (in the tooltip) | removed | land-only caption |

## Notes for engineering

1. **One function.** Extend `manaSupply()` in `src/lib/mana/supply.ts` as the plan says: resolve `supply[color].nonland` from text, and leave `demand` unweighted. `unattributedNonland` stays internal (for measurement), and the card never draws it.
2. **The bar is one element per color,** split by `lands / (lands + nonland)`. Its length is `(lands + nonland) / Σ all sources`. Unreadable cards never enter Σ.
3. **Counting rules** are in canvas section mt and in `STATES`. A mana rock or dork follows the land policy: each color it can add, and an any-color source counts once for each deck color. Land search for "a basic land" counts each color among the deck's basics. Colorless sources go on the C row.
4. **Mana Balance (plan Q3):** the chart needs only per-color totals. A prescriptive read will want *which* cards make each color, so return `sources[color]: cardId[]` (land and non-land kept separate) and derive the totals from those arrays.
5. **Theme check:** the stripe is 2px of the hue on `--surface-sunken`. White (`--w`) and the C row are the weakest. Check both on all six themes, and if either fails, widen the stripe to 3px rather than adding a token.

## Ledger

1. Strings to /copy-review (all placeholders).
2. Only Low Sun (the R2 reference theme) is drawn.
3. About entry: the key line *"Mana sources that aren't lands are counted, but their colors aren't"* becomes false when 4b ships. Edit it at the next version; this doesn't need a new entry.
4. Fixture figures (Gishath, Korvold, Feather) are illustrative, not staging reads.
5. The unreadable-color hit rate should be measured on staging once the parse rule is set. If it's large, Hugh may want those cards back on the card; R2 assumes it is small.
