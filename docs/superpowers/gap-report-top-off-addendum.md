# Gap report — Top-Off Addendum R1 (candidate list)

Property table: `docs/superpowers/design-tables/top-off-addendum.md`, enumerated from the
handoff by an agent that never read `src/`. Verified against the implementation row by row,
plus a state-reachability pass, an accessibility-structure pass and the negative contract.

**Verdict: 0 gaps in the addendum's new work.** Everything decisions 1–5 add matches the
table, including both engineering amendments. Six pre-existing chrome mismatches and two
state divergences are recorded below with the reason each stands.

## Fixed during the pass

**The bar's status ladder had an unreachable third rung.** The addendum draws three rungs
and ranks the dock notice last, but `atCap` is `tickedCount >= openSlots`, which is exactly
`openSlots - tickedCount <= 0` — so rungs 1 and 2 partition the whole space and rung 3 has
no residue. Written as the two rungs that can render, which is what the addendum's own
priority order amounts to. `dock.retired` now renders nowhere and carries a comment saying
so; `dock.retiredAnnounce` still carries the same fact to a screen reader on open.

## Standing, with reasons

| # | Item | Why it stands |
|---|---|---|
| 1 | Header spacer row has an extra 9px top padding | Pre-existing; the addendum changes the spacer widths, not the row's padding |
| 2 | Head fixtures have no `min-w-[140px]` | Pre-existing; untouched by this branch |
| 3 | Head fixtures' disabled border is `--border-strong` at 50%, not `--border` | `GhostButton`'s own disabled treatment, shared with every other use of it |
| 4 | Head fixtures' disabled ink does not change to `--fg-locked` | Same; a per-call-site override here would fork the atom |
| 5 | Zero-ticked line has no explicit `line-height: 1.55` | Pre-existing element; only its third branch is new |
| 6 | The decline disables during an in-flight commit, which the table says it does not | Every other control on the surface does, including the `Show it again` this one mirrors. A control that stays live while the write it would race is in flight is the worse reading |

## State divergences

**The bulk restore gates on `declinedHere`, not `declined.size`.** The declined set can hold
an id that has left the route; the pool-intersected figure is the one the label and the
announcement both quote, so gating on the raw size would offer a control whose own count
reads zero. Deliberate, and the narrower of the two.

## Ambiguities in the handoff, and what shipped

The table records seven. In scope here:

1. **Phone decline font-size** — shipped `10.5px`, the component-notes value, matching the
   `Show it again` it is the inverse of. The canvas's 10px was inherited from line 2 rather
   than set on the control.
2. **Zero-ticked line `margin-top`** — shipped `mt-[9px]`, the component-notes value, and
   the value already on the element.
4. **Amendment 1** — shipped `60px` / `36px`, not the canvas's `56` / `40`.
5. **Amendment 2** — shipped one element whose home the width picks, not two CSS-split homes.
6. **`dock.retired`** — shipped fully dead rather than near-dead; see above.
7. **`commit.consequence` at zero ticks** — unchanged and still reads `N of 99 when added`
   while nothing will be added. Out of scope in the addendum's own words, and it is most
   visible in the state this branch adds. Worth raising separately.

Ambiguity 3 (the keep-all confirm's phone answers) belongs to the second pull request.

## Correction to the table

The table as enumerated stated the `md:` breakpoint as 640px, in its header and in eleven
later state conditions. This repo has no Tailwind config and no `--breakpoint-md` override,
so `md:` is Tailwind v4's default **768px**, which `globals.css:406` corroborates with a
hand-written `@media (min-width: 768px)`. That makes
`useIsDesktop` exactly coincident with `md:`. Every occurrence has been corrected in the
committed table. Had the breakpoint really been 640px, every
`isDesktop` gate would have disagreed with its `md:` classes across the 640–768px band and
the cap line would have rendered into the desktop commit row. As built they agree.
