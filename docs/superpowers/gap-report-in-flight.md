# Gap Report — In-flight feedback for control flips that fetch (R2)

**Handoff:** `design/design_handoff_the99_in_flight` (R2)
**Verified against:** `src/components/commanders/page-header.tsx`, `discovery-view.tsx`,
`commanders-view.tsx`, `rack/*`, `list-nav.ts`, `pending.ts`, `src/lib/copy/lanes.ts`
**Widths:** 390px and 1280px
**Date:** 2026-09-07

## Verdict

**🟠 Orange — the premise is superseded, not wrong.** R2 closes R1's blocking finding
cleanly and would have been Green against the build it was drawn on. It was not drawn on
this build. `#435` — *Split /commanders into two lanes: owned and discover*, merged as
`3da8c52` — deleted the surface every ruling in R2 is placed on, and reduced the set of
controls the ruling governs from three to one.

This needs a Design round-trip. Where the participle lives now is a placement question on
a surface Design has not drawn a pending state for, and improvising it here would be
choosing a location the drawing does not contain.

## What R2 got right, and keep

R1 ruled on a three-clause subtitle and assigned `re-reading…` to `read against N cards` —
the one clause locked and tested as invariant under an availability flip
(`src/lib/discovery/list-wiring.test.ts:110-114`). R2 counted four clauses, retired
`re-reading…`, gave that clause no pending state at all, and moved the availability
participle onto the pool clause that actually changes. That reasoning is sound and the
*non-placement* rulings survive the lane split intact:

- The list is never touched — no `RegionLoader`, skeleton, dim, overlay or `aria-busy` on
  the region. The outgoing rows are the previous answer and stay pressable.
- One gate, 500 ms, never tuned per control.
- Client-side controls get no mark.
- Nothing announced mid-flight; no escalation tier at any duration.
- `LoadingScreen` is the region loader, and it is reached only when there are no outgoing
  rows.

## What `#435` removed

**1 — The subtitle is gone.** `page-header.tsx` is now `PageHeader({ lane })`: a fixed
title and a fixed gloss (`Commanders` / `yours, not yet built`), 39 lines, no props for
counts, no scope toggle. Its own header comment states the change: *"the scope is now the
route, the nav is the switch, and the counts the subtitle reported have moved onto the
rack's result line."* R2's mechanism — *a pending clause replaces the subtitle clause its
control owns* — has no clauses left to replace. All three participles are homeless.

**2 — Three fetching controls became one.** `discovery-view.tsx:120-123` is explicit:
*"Scope is the only one left that can reach the server, and even it usually does not — a
cache hit answers in memory and this never turns true."* One `useTransition` feeds one
`scopePending` boolean into the rack. `commanders-view.tsx` holds no transition at all and
passes no pending flag: **the owned lane now has zero fetching controls.** So `counting…`
has no owner (scope is the route, not a control), and `re-scoring…` has no owner (the
owned lane's availability is a client swap, and Discover mounts no availability control at
all).

**3 — The count line moved and took a live region with it.**
`rack/result-line.tsx` is the only line on either lane that carries counts, and it is
deliberately *the rack's only live region*, announced on a 300 ms debounce so a reader
typing four letters hears one count. Any participle placed there collides with a rule that
was written to prevent exactly that chorus. R2 could not have accounted for it.

## What is already shipped

The crown half of the ruling is in the build and needs nothing. `rack/select.tsx` takes
`pending`, sets `aria-busy`, applies `PENDING_OPACITY` (0.55, from `pending.ts`) and swaps
the selected option's label for `PendingMark` via `PendingLabel` — the never-disabled,
never-reflowing treatment from PRs #411 and #416. The rack's scope control is wired to it
(`filter-rack.tsx:106`, `filter-sheet.tsx:241`).

So the live question is narrow: **does one surviving server control, which usually answers
from cache, need a copy state at all beyond the crown it already has?**

## Two corrections that outlive the redraw

Both are eng-resolvable and were found against the pre-`#435` build; they should be
carried into whatever R3 says, because both are statements about *ownership* rather than
about the subtitle.

1. **"Two participles under `I own`" was already one** even before the split.
   `commanders-view.tsx` passes no availability pending flag — that flip is a client swap
   over data already on the client. Design's own ruling 7 says the same thing, so the
   sentence contradicted the ruling two pages above it. Post-`#435` it is **zero**.
2. **`ordering` is not optional.** R2's reference assembler types it optional and runs
   `.filter(Boolean)`, which taken literally deleted `ranked by fit` from the owned
   subtitle. The narrower true statement — the owned lane has no sort *control*, so that
   clause can never go pending — is the one that survives.

## What ships from this branch

The R2 drop, and this report. **No implementation plan**: a plan written against
`page-header.tsx`'s four clauses instructs a worker to edit code that no longer exists.
The plan is re-written after R3 lands.
