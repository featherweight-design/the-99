# Gap Report — Commanders plane (R6)

**Handoff:** `design/design_handoff_the99_commanders_plane` (R6)
**Tables verified against:** the `Amendments — R6` sections of
`design-tables/discovery-controls.md` and `design-tables/discovery-empties.md`
**Widths:** 390px and 1280px
**Date:** 2026-09-06

## Verdict

**0 gaps.** Both verify passes returned clean, and the two behavioural claims most
likely to be asserted rather than checked were confirmed directly against the source:

- `page-header.tsx:86-118` — the two rows come from `flex-wrap` plus full-width children
  plus `order`. Title and scope are `sm:w-auto`, so they share line 1 under
  `sm:justify-between`; the `w-full` subtitle at `sm:order-3` is forced to line 2 beneath
  the control. At 390px all three are `w-full` in order 1→2→3, so the subtitle reads
  before the control. The control's x-position is now a function of the header's padding
  alone, which is the whole point of #335.
- `discovery-view.tsx:456` — `suppressExactNote={report?.cause === "join"}`, consumed at
  `filter-bar.tsx:577` inside the `sm:hidden` strip only. The desktop note at
  `filter-bar.tsx:489` never reads the flag, so the one-report rule fires at 390px and
  nowhere else, as drawn.

## Conformance fixes made during this pass

Verifying the extracted canvas values rather than trusting them surfaced four real
differences between the build and the drawing, all fixed in `d8f6ae4`:

1. The exclusion line marks the **threshold and the nearest miss** as well as the counts,
   each carrying its `%`. The build marked counts only.
2. Those marks are a **colour lift at weight 400**, not a bolding. `Emphasised` gained an
   optional `weight` (default 600) so a colour-only mark does not have to bold.
3. The archetype overflow trigger takes its declared 44px touch target through padding
   cancelled by an equal negative margin, so the sentence around it does not shift.
4. The pool variant of the floor empty takes its own **470px** body measure; the
   collection variant keeps 430px.

## Recorded, not fixed

- **`README.md:530` is stale.** It says the pool variant's aside prints the count that
  clears in the other pool. The canvas (`:624`), `STATES-search-and-exclusions.md:276-280`
  and `README.md:543` (`floorPool.ctaNote` = "Deleted") all agree there is no aside. The
  build renders `note={null}`, which follows the three that agree. Handoff doc defect, no
  code change.
- **The header's drawn `flex-wrap: wrap` was superseded by decision 8** (gap 2), which
  removed it. The build keeps `flex-wrap`, because it is the mechanism producing the two
  rows the same decision asks for — the declaration is what was superseded, not the
  layout. Flagged for ratification rather than treated as a gap.
- **`FilterBar` renders the search field and the join control twice**, once in the
  `hidden sm:block` desktop subtree and once in the `sm:hidden` mobile strip. The table
  itself places both controls in different parent rows at each width, so the duplication
  is required by the design; `display:none` keeps one instance in the accessibility tree.
  Each control is internally one responsive subtree.
