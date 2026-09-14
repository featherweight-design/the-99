# Gap report — deck versioning, Surface 2 (the review page)

Verified against `docs/superpowers/design-tables/deck-versioning-surface-2.md`, row by row, on
2026-09-11. Implementation: `review-changes.tsx`, `update-diff-row.tsx`, `pull-control.tsx`,
`app/decks/[id]/changes/page.tsx`.

**Superseded in part, 2026-09-14 (PR #622).** Two findings below describe a build that no longer
ships. The `md:contents` desktop rows of Fixed 2 are gone — each line is now a wrapping flex line
at every width, because `md:contents` promoted the phone's two lines into one desktop line whose
items could squeeze the card name to zero. And the `open card →` hint of Deviations-kept 5 was
removed outright, along with the row's `Open →` control; the card name is the only trigger. The
amended rows are in `docs/superpowers/design-tables/deck-versioning-surface-2.md`, which is the
table of record for both.

Seven table rows came back as mismatches. Four were real and are fixed; three are deviations
this PR keeps deliberately, each with its reason. Two further deviations were decided during
implementation and are recorded below.

## Fixed

1. **Holding deck name was not drawn** (`update-diff-row.tsx`). The table reserves a row slot
   for it on sleeved adds — mono 10px `--fg-faint`, inline after the name on desktop, on the
   meta line on the phone — and the name survived only inside the pull control's accessible
   name. `DiffRowIn` now takes `heldBy` and draws `review.heldBy(deck)`, which is what that
   copy key was written for.
2. **The phone pull row was one line** (`update-diff-row.tsx`). The table draws a pull-bearing
   row as two lines on the phone: a name line, then a meta line at `padding-left 16px` carrying
   the deck, the price and the control, in an `8px` plate with an `8px` gap. The row now stacks
   under `md`, with each line `md:contents` so the desktop row stays the same flat flex line
   every other row is; the cost column takes `md:order-last`, the one place the phone and
   desktop orders disagree.
3. **Guard tag had a fill instead of a border** (`pull-control.tsx`). The table gives both guard
   tags the buy tag's shape — `1px solid --accent-shadow`, radius 4px, padding `1px 5px`. The
   `color-mix` fills are gone and the border is on.
4. **Guard tag/action gap was 6px** (`pull-control.tsx`), table says 5px. Now 5px.

## Deviations kept, with reasons

1. **Page heading is `h1`, not the canvas's `h3`/`h2`.** The canvas mock is a fragment; this is
   a route with one subject, and its column headings are the `h2`s beneath it. Changing it would
   leave the page with no `h1`.
2. **Row gap is 9px on the phone and 10px on desktop**, where the table says 9px at both widths.
   The gap is the shared `ROW_GAP` in `ui/row-shell.ts`, which five row components read; the
   review page's rows are two of them. Same reasoning the table's own §Errata applies to the
   cost track: a shared constant governs, and a caller picking its own would misalign against
   the rows beside it.
3. **Hover moves the fill, not the border.** The table draws the hover as `--elevated-hover` on
   `1px --accent-shadow`, and its own Discrepancies 22 flags the collision: `--accent-shadow` is
   already how this component says a removal has been *kept*. A hover that borrowed it would
   make a row the pointer is passing over read like one the player has decided about.
4. **The pull control does not stop propagation**, which the table lists. The row plate is a bare
   `div` with no click handler and the card name is its own trigger button, so the guard asserted
   a listener nobody registers.
5. **The review box, hover fill and `open card →` hint are gated behind a `review` prop.** These
   two row components are mounted twice over — by the update flow and by this page. That flow
   draws six row kinds in one list and four of them are other components on the shipped 44px /
   12px box, so retuning the pair unconditionally would leave a kept removal and an unchanged
   row misaligned against their own neighbours.

## Not verified — out of scope for this PR

The what-changed strip, the shape block, and the apply bar (`Commit as v{n}` / `Discard` / the
D32 confirm) are plan Tasks 16, 18 and 19, shipping as PR 5. No component for any of them exists
yet, so their table rows were not counted as gaps. `commitOpen` is already threaded through to
`ReviewChanges`.

VERDICT: 0 gaps remain.
