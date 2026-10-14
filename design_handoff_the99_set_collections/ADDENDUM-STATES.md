# States — the addendum's surfaces (rack, grid, index row)

Companion to `STATES-set-grid.md`, which is unedited and still governs the cells, the head, the
sections and the four failure pages. This file covers only what the addendum changes, at both widths,
including what each state must **not** do.

## The rack — six states, two widths

Three rows always: **controls · chips · result.** The bar's height never changes with the results,
and on this route that promise is load-bearing because the bar lives inside a sticky head.

### 1 · Rest
Wide: field at its full width, five symbol pips with no rings, `Rarity · all` hairline,
`Missing only` hairline. Row 2 prints `no filters on`. Row 3 states the page —
`399 cells · 62 yours, 337 missing · extras ↓`.
Compact: field · `Filters` (no badge) · `Missing`. Row 2 empty of chips, same rest line.

- **Must not** collapse row 2. The line is what keeps the height fixed.
- **Must not** draw the phone badge at zero.
- **Must not** dim an unlit pip. No opacity, no tint, no rim.

### 2 · One filter on
Trigger takes `--accent` **and** its label takes the value: `Rarity · uncommon`. One chip in row 2.
**No `Clear all filters` yet** — at one filter the chip's `×` and the lit control are both shorter
routes, and a third control beside them is noise.

### 3 · Several filters on
Chips in **dimension order, never click order** — colour, rarity, missing-only. Colour collapses past
one pip (`White` at one, `3 colours` past that); **never one chip per hue**. `Clear all filters` at
the trailing edge, clearing the three dimensions **and the query**, never the sort (there is none).

- **Must not** wrap at desktop. Three dimensions cap the line at ≈380px of 1100, so the chassis's one
  legitimate height change is unreachable here.
- Compact: chips **scroll horizontally, never wrap**, and the strip **starts at its trailing edge**,
  so the clipped item is a chip and never `Clear all filters`.

### 4 · Rarity panel open
280px, anchored, `--surface-rail` on a `--border-strong` hairline, 44px rows, rotated-diamond marker
filled `--accent` when on, per-row counts from the one filtered computation, footer `n of 4 on`
beside `Clear rarity`. Opening lands focus on the current value, not the first row.

- **Must not** expand in flow — it would push the grid down from inside a sticky head.
- **Must not** carry a search field. Four values have nothing to search.
- **Must not** allow two values. Single-select; picking the lit one clears it, which is how *all* is
  reached.
- **Must not** overflow the column. Anchored to the trigger’s trailing edge when a leading-edge anchor
  would run past it — a 280px panel hung from a trigger late in the row otherwise crops its own
  footer, which is the one control in it that is not a value.

### 5 · Phone sheet open
Pips first at 44px, then the rarity chip group at 44px (wrapping to two rows is allowed **in the
sheet only**), then `Clear all` and `Show N cards`. Scrim, `z-50`, `useDialogA11y`.

- **Must not** contain the search field or missing-only — both are on the persistent row, which is
  why the badge counts neither.
- **Must not** re-order per route. Pips lead every sheet in the app.

### 6 · Zero results
The rack stays complete and on screen above the empty state. With a query, the heading names the
query and two corrections are offered narrowest-first: `Clear the search`, then `Clear all filters`.
With missing-only on and every match owned, the shipped good-news branch carries it
(`headingOwnsAll("cards matching “plains”")`).

- **Must not** replace the rack. The filters that caused this must stay removable.
- **Must not** claim good news when the intersection is simply empty — the owns-all copy needs the
  other filters to have matched at least one cell.

## The grid — three states

**Rest.** `repeat(auto-fill, minmax(146px, 1fr))`, gap 10/18, `aspect-ratio: 63/88`. 2 tracks at
390px, 7 at 1180.

**Filtered.** Same tracks, fewer cells. **`auto-fill`, never `auto-fit`** — the one keyword that
decides the no-reflow constraint.

**Below ~330px of content.** One column. Two tracks there would be 139px, under the source width.

- **Must not** give the cell a width or height literal at any width.
- **Must not** differ in geometry between owned and missing. Border *style* and art *opacity* only.
- **Must not** re-measure the column count except at a section boundary.

## The phone head — two states

The head is inline in `set-grid-view.tsx`’s `sticky top-0 z-[2]` container — the same block as the
control row and the result line. It is sticky **at every width today**; this ruling gives it a second
height on the phone, not a new mechanism.

**Rest (148px).** Icon + title + `HOB · 2026`; `162 / 208 base · 78%` with the extras ratio trailing;
the 44px cost line; the control row; the result line. The delta strip renders here when it fires.

**Collapsed (52px), past 120px of scroll, restoring at 40px.** Icon + title + ratio + search icon +
`Filters` with its badge.

**Cost line expanded (tap).** Grows in place to the caveat and `Send 46 to ManaPool`; the head’s
height changes only on that explicit tap, never on scroll.

- **Must not** reflow the grid at any scroll position — the bar overlays.
- **Must not** interpolate with scroll offset, or animate the title’s size.
- **Must not** carry the chip line; the `Filters` badge carries the state.
- **Must not** collapse while the delta strip is firing.
- **Must not** change the desktop head — same container, full form, `md:` sizes untouched.
- **Must not** drop the rest height from the document; reserve it, or the page jumps on first cross.

## The index row — four cases

| Case | Base ratio | Second line | Bar |
|---|---|---|---|
| Extras owned | `62 / 276 · 22%` at `--fg-body` | `4 / 123 extras` at `--fg-muted` | `--accent` |
| Extras, none owned | same | `0 / 98 extras` | `--accent` |
| Complete, extras outstanding | `--success` | `18 / 123 extras` at `--fg-muted` | `--success` |
| Not indexed | `not indexed yet` at `--fg-locked` | absent | absent |

- **Must not** print `0 / 0 extras`, or a second line on an unindexed row.
- **Must not** take `--fg-locked` for the extras figure. It is text and owes 4.5:1.
- **Must not** render the figure without appending its clause to the row's `aria-label` — one explicit
  label on the `<Link>` replaces every descendant.
- **Must not** give the extras a bar of their own.
