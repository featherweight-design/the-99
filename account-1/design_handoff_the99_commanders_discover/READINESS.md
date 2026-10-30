# READINESS — /commanders and /discover, R1

**Amber**, and coupled to the refresh (see the dependency section in `README.md` — the two share one
`nav.tsx` change and are recommended to ship together).

**R4** draws the discover row at 390 (`E6`) and splits the phone row note into one entry per lane.

**R3** redraws the discover row's figure column against the counts that exist (no blended score, no
delta) and states one thumbnail rule per lane per breakpoint: none at rest, anywhere.

**R2 added three frames:** I1 trailing-edge rack, I2 the two discover order menus, I3 the thumbnail
contingency. R1's other items are accepted.

**Amber.** Both racks, both lanes, six states each, mobile and desktop, and the four open calls are
answered and drawn. What holds it off green is provenance, not drawing: the spec and the three
component files this handoff is supposed to conform to are not in the project.

## Green — build from these as drawn

- Both lanes' racks, desktop and phone, in all six states (`STATES-filter-rack.md`).
- The row: every shipped figure retained, the art bleeding in from the leading edge, and the synergy
  and fit graphs in the theme accent ramp. Header CTAs removed from both lanes.
- Discover's Best fit / Something new scope, in the rack and in the sheet with its glosses.
- Both lanes at both breakpoints, with per-lane phone row specs and the count fold stated.
- The four calls: greyed colour match, chip overflow, the 1024px breakpoint, the badge.
- The five-item nav, measured at 390 / 375 / 360 / 320 (`CHROME-five-item-nav.md`).
- Copy, production-final, in `commanders-discover · copy strings.ts`.
- The sheet — reused from `design_handoff_the99_collection_filter/` with no geometry change.

## Amber — decide before build

0. **Two picks are drawn and waiting, not open questions.** Reading order — leading (`D2`,
   recommended) vs trailing (`I1`). Discover's third order option — `Colour` (`I2` left) vs
   `Recently released` (`I2` right, recommended). Both are one-frame changes once picked.

1. **Diff the four calls against the spec.** They were written to fill silence; call 1 in particular
   reverses `commanders_plane`'s absent-modifier ruling on the strength of locked decision 4 as the
   brief states it.
2. **Confirm `N decks tracked` exists.** If discover has no popularity figure, the row drops the line
   and `Order · Popularity` needs a different default.
3. **Confirm discover's third order option.** `Colour` is a guess; *recently released* may be the
   useful one.
4. **The printing thumbnail.** Confirmed: the row identifies the commander, and no printing is named.
   `I3` is the frame to build from if that ever changes — and if a printing is named, the thumb is
   required, not optional.

## Red — blocking

1. **`docs/superpowers/specs/2026-09-07-commanders-two-lanes-design.md` is not in the project.** Nine
   decisions are honoured as the brief states them and nothing else in the spec has been read.
2. **`filter-bar.tsx`, `facet-strip.tsx`, `discovery-row.tsx` are not in the project.** Row anatomy,
   pip row and GhostButton geometry are traced from this project's canvases. If the components
   disagree, they win.
3. **The owned-and-built commander is on neither lane.** Literal reading of the brief. It needs a
   ruling before build, not after.

## Not covered

- Real mana symbols. Scoped in `README.md` at about a day, with a recommended size split; not drawn.
- The fifth nav item in the **pre-refresh** chrome. Not drawn deliberately — see the dependency
  section; it only exists if /discover ships ahead of the refresh.

- The transition when a discover commander becomes owned (gap 7 in `README.md`).
- Loading and skeleton states for either lane. Both inherit the shipped list skeleton; neither has
  been re-rendered against the new rack.
- Keyboard walk frames. The a11y model is stated in the canvas's contract card and in
  `STATES-filter-rack.md`, but no ordered focus frames are drawn — `collection_filter`'s walk covers
  the sheet, and the rack is ordinary tab order.
- Theme rendering. Drawn in the refresh's brass palette only; the six R6 themes are not re-rendered
  here.
