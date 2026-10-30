# Swap tools addendum: the stand-in row (2026-09-25)

This amends `../addendum_ranking_rebuild/` (1b) and nothing else. The canvas is `Stand-in Row Addendum.dc.html`, drawn at 1300 (the sheet at 640) and at 390. The child `Stand-ins Sheet` is a copy that takes a `treat` prop.
- **Adopted: 3a, word tags** (`treat="tags"`), LGTM 2026-09-26.
- 3b, 3c and 2a (`line`) stay on the canvas as the record. Don't build them.

## Decided (Hugh)
- Each row says what it **keeps**, **gains** and **loses** against the card it replaces.
- A row never shows a percentage.
- A row can run to 3 lines at 390 and 2 at 1300.

## The row (3a)
**Layout.** Two grid rows.
- Row 1 is the name line, which holds the art thumbnail, the ownership dot, the name, and the `in N brews` mark.
- At 1300 the price and **Take** columns sit on row 1. At 390 the price chip joins the name line (the name ellipsizes), and Take sits on row 1 at the right.
- Row 2 is the comparison. It spans **all columns** (`grid-column: 1 / -1`), indented 43px to the name. The measure is about 560px at 1300 and about 315px at 390.

**Comparison.**
- The order is fixed: `[{type}]` → `KEEPS` → `GAINS` → `LOSES`. Any group can be absent.
- The line is a flex-wrap, gap 3px (rows) / 14px (groups).
- A group wraps as a unit, and its items stay together.
- **Type** (other-types rows only): mono 10.5 `--fg-muted`, e.g. `sorcery`, `artifact · staple`. The staple keeps its word.
- **Tag:** mono 8.5, uppercase, letter-spacing 0.1em, padding 2 / 5, radius 4, line-height 1, centred on the text.
  - `KEEPS` / `GAINS`: `--fg-body` on `--surface`, 1px `--border-strong`.
  - `LOSES`: `--fg-muted`, transparent, 1px **dashed** `--border-dashed`.
- **Items:** sans 12 / 1.45. Several per group, separated by `, ` in `--fg-faint`.
  - Kept and gained items are `--fg-body`; lost items are `--fg-muted`.
- **Accessibility:** tags are `aria-hidden`, and each group carries visually hidden `keeps ` / `gains ` / `loses `.

**Budget.**
- 1 comparison line at 1300 and 2 at 390, so the row totals 2 / 3 lines.
- Each tag costs about 40px.
- Over budget: drop a `gains` item, then the whole gains group, then a second `keeps` item. **Never drop `loses`.**
- The container clips at 19px / 40px as a backstop only, and it cuts whole groups. The writer must fit, and the tests should assert `scrollHeight <= clientHeight`.

**Gone from the row:** both synergy shares and `MV n`. Mana value appears only as a gain or loss that fits. The group heading `by {cmdr} synergy` still states the order.

**Lead** (creature sheet): *Every card here ramps, as Lotus Cobra does, and each row says what it keeps, gains and loses against it. Creatures come first, then other types, each from the cards Gishath decks favor most.*

## Lands (design's reading, which Hugh may overrule)
- Lands keep 1a's mana line (`makes {colors}, untapped · {drawback}`). The mana line already is the *keeps* and the drawback the *loses*, and its rung words carry the ladder.
- Only the 390 price move applies.

## Copy (owed to /copy-review)
- `keeps` · `gains` · `loses` (tags, and the hidden labels) · `staple`
- The creature sheet lead, and Lotus Cobra's job line (`creature · mana value 2 · landfall: one mana of any color`)
- The row items are fixture copy. The writer (model or rules) is engineering's call. Hugh's form example: Incubation Druid, *keeps taps for mana, +1/+1 counters · loses haste*.
