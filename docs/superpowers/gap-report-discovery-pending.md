# Gap report — discovery pending state and client cache (#338, #339)

Verified against `docs/superpowers/design-tables/discovery-controls.md` on 2026-09-06,
after implementation, before the PR opened.

**Verdict: 0 visual gaps, 0 parity gaps, 0 state-reachability gaps.**

## Scope of the change

Three controls — `ScopeControl`, `SortMenu`, and `FilterBar`'s `ScoreAgainst` — gain one
shared contract while a flip is in flight: the control renders the value being navigated
*to* as its selected one, and marks itself `aria-busy` at `PENDING_OPACITY` (0.55). Nothing
else goes optimistic; the subtitle, the receipt lines and the rows keep describing the list
actually on screen. The list is never dimmed and there is no skeleton.

## Rule 24 versus rule 13 — assessed, not waived

Rule 24 reads "**Motion: none.** Both flips are state changes over data already on the
client — no transition, no dimmed list, no skeleton." Its premise is false for the discovery
scope, whose sort and availability flips are server fetches. The same table says so two rules
earlier: rule 21, "a sort flip is allowed to be a fetch — which is why the sort control is a
menu", and rule 30 says the same of `Score against`. The table contradicts itself, and this
implements the wing that acknowledges the fetch.

Rule 13 — "**Neither control may animate the list**" — is the rule that constrains what the
reader sees underneath, and it is honoured exactly: the list is untouched, with no dim, no
skeleton and no key change on the `<ul>`.

Rule 27 ("no new motion class, no new token") is honoured literally on both counts. No
`transition` property is set on any of the three controls, so the opacity change is
instantaneous and is not motion; and 0.55 is not a new token — it is the value
`full-card-trigger.tsx` already shipped for the same meaning, which this change lifts into
`PENDING_OPACITY` so the four call sites read from one place instead of drifting.

## Idle path

Every pending property is emitted as `undefined` when nothing is in flight, so React omits
the attribute and the inline `opacity` entirely and the resting controls are byte-identical
to what shipped. `aria-busy="false"` on every idle control would be noise in the
accessibility tree. `pending ?? committed` is identity when pending is null.

## Mobile and desktop parity

`ScoreAgainst` renders at two call sites and both receive `pending={availPending}`
(`filter-bar.tsx:258` desktop, `filter-bar.tsx:416` mobile). `SortMenu` is one element passed
into both slots, so both mounts carry the prop. `ScopeControl` is a single subtree with
responsive classes rather than a mobile copy beside a desktop one, so there is nothing to
duplicate.

## Pre-existing deviations, untouched

The verify pass recorded eight deviations that predate this change and that this change does
not touch. They trace to the shipped `§Page Header` spec, which conflicts with this table:
the header renders `h1` at 22px rather than `h2` at 19px; the header block padding differs;
the scope segment is 12.5px/13px rather than 13px/14px, matched to `ScoreAgainst`; unselected
segments are `font-medium` and centred at both widths; the mobile count row is `mt-[9px]`
rather than 10px; the enabled sort sub-line carries `leading-[1.5]` unconditionally; a
hand-typed `?sort=new` with `hasDecks=false` fills the struck row; and the
"Something new — unavailable" note is not rendered, its two signals being carried by the menu
sub-line and `NoDecksBanner`. None is a regression from this work and none is fixed here.

## Not in scope, deliberately

Caching across a **scope** flip (owned ↔ play) is not implemented. `DiscoveryView` unmounts
on that flip, so serving it from cache would need a client-owned scope switch above both
views, which means retaining and rendering both scopes' payloads client-side. That is an
architecture change, and it collides with the control-bar rewrite in flight on #340.
