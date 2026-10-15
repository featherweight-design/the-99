# STATES · Announced collapse (addendum A1)

`cols` = the set grid's column count at the current width. `n` = the set's commanders as drawn (after any filter).

| State | When | Draws | Control |
|---|---|---|---|
| Whole | `n ≤ 2 × cols` | every tile | none |
| Collapsed | `n > 2 × cols`, no filter on, not pressed open this visit | the first `cols` tiles; the rest `hidden` | `Show all {n}` ▾ |
| Expanded | collapsed set pressed open this visit | every tile | `Show fewer` ▴, at the foot |
| Filtered | a search or colour is on | every match | none |
| None revealed | `n = 0` | the none plate (unchanged) | none |

Examples: 390 (`cols` 2) collapses from 5; 900 (`cols` 4) from 9; 1300 (`cols` 6) from 13. Star Trek's 15 collapses
at every width.

Rules:

1. The open state is per set code, for the visit (held by the list view with `useAnnouncedVisit`), never stored.
2. A width change that crosses the threshold adds or removes the control; an expanded set stays expanded.
3. Show fewer keeps the toggle in view (`scrollIntoView({ block: "nearest" })`) when it would land above the window.
4. Focus stays on the toggle on both presses. Hidden tiles leave the tab and reading order.
5. Card details' siblings stay every commander in the set, hidden or not.
6. Rows view: no change.
