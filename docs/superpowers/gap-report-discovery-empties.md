# Gap report — the discovery empties and the window (Phase 11)

Property table: `docs/superpowers/design-tables/discovery-empties.md`
Implementation: `src/components/commanders/discovery-empty.tsx`, `filtered-empty.tsx`,
`reveal-control.tsx`, `discovery-view.tsx`, `commanders-view.tsx`.

## Verify pass (Agent 2)

Both passes ran: every row of the property table at both widths, and every row of the
state coverage table for reachability. Seven items came back from the visual pass and
five from the state pass. Two were disproved on inspection; the rest are below.

### 1. The window count never rendered — FIXED

`discovery-view.tsx` passed `wasWindowed={false}` as a literal, so state 4's count line
was absent at both widths on a list of several thousand rows. The Phase 9 gap report
deferred the flag explicitly — "the count and the band are one feature and land
together" — and the band landed here without it. It now derives from
`filtered.length > REVEAL_STEP`, which is the owned scope's own predicate.

The same literal is why states 6 and 7 read as partially reachable: with no windowed
rows there was nothing for the reveal's focus move to land on.

### 2. The built clause was not emphasised — FIXED

The table gives the clause `var(--fg)` at weight 600. `filtered-empty.tsx` rendered it as
plain body text. It is emphasised whole rather than through the `Emphasised` helper the
other two empties use: the clause *is* the new reason this state has under discovery, so
there is no phrase inside it to lift above the rest.

### 3. The scope link was drawn as a label — FIXED per M-10

The canvas draws the second affordance as `--fg-faint` mono with no underline, no accent
and no hover — visually identical to the inert aside beside the floor empty's CTA. M-10
resolves that as a drawing that omits an affordance rather than one that means "this link
looks exactly like the label beside it", so it ships accent with a hover underline.

### 4. Affordance-group gap — FIXED per M-9

`12px` on the filtered empty against `10px` on the floor empty, for a visually identical
CTA-plus-note pairing. M-9 calls it drafting drift; both are now `10px`.

### 5. Sort-menu option sub-line — not a real issue

Reported as `11px` / `--fg-locked`. Checked against
`docs/superpowers/design-tables/discovery-controls.md:369`, which gives `10.5px` and
**full** `--fg-faint`, "not dimmed further". The `11px` / `--fg-locked` treatment belongs
to a separate `Something new — unavailable` note beside the trigger, which is deliberately
not implemented and was escalated to Design in the Phase 9 gap report. No change.

### 6. Count-line mobile spacing — moot

Flagged against the mobile count row's margin, which only exists once the count renders.
Item 1 was the cause; the row now draws as the table gives it.

### 7. The `FilteredEmpty` canvas predates Surfaces v2 — RAISED WITH DESIGN, not patched

The drawing shows left-aligned pill chips with `✕`, no crown, and no `--warning` count
line. The shipped component is the re-skinned one. State 3c requires the owned scope to
render **byte-identically to today**, so the shipped geometry cannot move, and the two
scopes share one component. This needs a Design ruling on which drawing is current; it is
raised in the PR body rather than resolved here.

### 8. The floor empty answered a colour filter — FIXED

The state pass's one real bug. `showFloorEmpty` tested the post-filter length, so under
`sort=new` a colour with no candidates was answered with "none of the 3,334 clears that
floor" — a statement about a server-side exclusion the pips played no part in. Worse, the
filtered empty was gated behind it, so state 3 was unreachable under `sort=new` entirely.
The floor now reads the server's own count.

### 9. The reveal said nothing, and moved no focus — FIXED

States 9 and 11 ask discovery to keep the shipped range message and the shipped
`preventScroll` focus move. Neither existed here. Both now do, and the message is
extracted to `revealAnnouncement` in `reveal-control.tsx` so the two lists cannot drift
apart on a sentence the handoff says they share.

## Confirm pass (Agent 3)

All seven items re-checked against the fixed code. Seven FIXED, zero remaining.

**VERDICT: 0 gaps.**

## Carried to the PR body

- Item 7 above — the `FilteredEmpty` canvas against the shipped component, needs Design.
- The built clause matches on `selected ⊆ colorIdentity`, so a five-colour deck reads as
  "is Green" under a Green filter. The predicate is right — the clause claims those decks
  would have been in *this* filtered list — but the wording may want "fits".
- M-7: the canvas draws the ghost outline in `--accent` where the shipped `GhostButton`
  uses `--border-strong` until hover. Built as drawn, since both empties are new.
