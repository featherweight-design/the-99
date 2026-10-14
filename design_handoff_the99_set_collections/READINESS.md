# READINESS — Set collections (R3)

**Self-assessed: 🟢 green, with one engineering dependency.** All three R1 blockers are closed by
Product's rulings and the drawings that follow from them. The remaining dependency is a cache
invalidation, named below — a one-line change, not a design question.

## What is green

- **The dim treatment.** Three carriers, measured in all six themes, with the `--border-dashed`
  failure caught and corrected before handoff. `DIM-missing.md` carries the numbers.
- **Both routes' happy paths**, desktop and phone, including the full cell and caption anatomy, the
  two-section structure and the extras ratio rule.
- **All five index states and seven of the nine grid states**, drawn rather than described.
- **The money block.** Cost figure, its stated gap, the one-selector rule satisfied by having no
  per-cell control, and the four price cases in one skin.
- **The three filters**, including the ruling that no join-mode modifier is mounted on this page.
- **Copy.** Every string in `set-collections · copy strings.ts`, with singular forms and aria names.

## Closed at R2

- **Unpinned fill → mark the cell.** Ruled by Product. Drawn as the outlined `BY NAME` diamond, the
  unset half of `printing_picker`'s `Your pick`. R1's head-line proposal withdrawn.
- **100%, all three branches** — extras owned, extras present but none owned, no extras at all. None
  renders `0 / 0`.
- **Entry point 1a ratified**, with the route boundary written down after Product's
  Commanders/Discover warning (README decision 15). That boundary is what to review the PR against.
- **Three edges outside the spec's state list drawn**: upload-while-open, the wrapping head at 390px,
  100% with unowned extras.
- **Scope: nothing cut.** The money block ships.

## The one dependency

**`revalidatePath` must reach `/collection/sets/[code]`.** Pinning a printing from the card-detail
modal moves a fill between two cells on this page (decision 14); the shipped write path revalidates
`/collection` only, so without this the swap happens invisibly and the by-name mark points at an act
that appears to do nothing. One line — but the mark is not worth shipping without it.

## Closed at R3

- **Drawn on the shipped `/collection`**, which surfaced the `Set ▾` / `By set` collision and got it
  ruled (decision 20) before it could ship as a bug.
- **The grid at 390px in full**, not only its two filtered states.
- **`Cost the 105 extras` withdrawn** and replaced by the cost strip re-scoped to the extras.
- **100% furniture removed** — two restating lines, and the Missing-only toggle.
- **Cell caption matched** to the shipped `TLA · uncommon` format.
- **§4 cell heights fixed** — the matrix was on `minmax(420px, 1fr)`; it is now flat-sized.

## Still open, not blocking

### The set icon needs one asset check
Written down in full (decision 24) and marked on every disc in the canvas. The only unknown is whether
`icon_svg_uri` inherits `currentColor`; if it does not, the `--success` ring at 100% needs a
fetch-and-recolour. **One check, not a redesign.**

### §1b is severable and unscoped
The Collection cost track is `rows-view.tsx` only. It is specified and drawn, but it was asked for
mid-handoff and has not been costed against whatever else is in that file's queue.

## Not blocking, but I want eyes on it

**Sticky-head height (108 / 96 / 118px) is asserted, not measured on a device.** The wrap case is
drawn and the growth rule is stated; the figures come from the drawn type sizes. Measure in the first
build rather than trusting them.

**The by-name mark's frequency is unmeasured.** On a collection pasted from a list it could appear on
most owned cells. The weight is chosen for that case and the cost is accepted in decision 13, but
nobody has yet seen a real pasted collection rendered on this grid.

**Real art luminance varies far more than the sample.** The 3.15–3.44:1 step is a property of the
treatment measured against a mid-grey stand-in, not a per-card guarantee. A very dark art at `.28`
is closer to the plate than the figure suggests — the dashed edge and the price tag are what carry it
there, which is the argument for three carriers restated as a risk.

**Windowing.** Left to engineering with two constraints (sticky head, `extras ↓` jump). If the chosen
approach cannot satisfy both, that comes back to Design.

## Dependencies

- **`printings.booster`, `printings.rarity`, `sets.base_set_size`** — the whole page. The
  not-indexed state exists precisely because these land nullable.
- **`filter-bar.tsx`'s colour filter** — mounted, not forked.
- **The deck-side buy tag and the #330 checkout builder** — reused.
- **`src/lib/collection/card-detail.ts`** — the cell's target. No new modal is designed.

## What I would cut to ship sooner

The cost strip and the cart link-out (ruling 7). The grid, the dim, the two sections and the three
filters are the feature; the money is the second visit. Cutting it removes one head block, one button
and one copy sub-block, and leaves every other state untouched — the price tag on the cell stays,
because it is a carrier of *missing*, not only a price.
