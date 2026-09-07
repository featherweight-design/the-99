# Gap report — deck row over-committed marker goes count-only (#354)

Design authority: `docs/superpowers/design-tables/card-availability.md` §3 (marker), §4 (deck
decklist row), §1.1–1.2 (formulae and copy), §17.5 (spoken prose).

Surface changed: `src/components/decks/decklist-row.tsx`. The `AvailabilityMarker` prop
`nameless={inShopping}` became a bare `nameless`, so the over-committed row prints `short 1` in
both the All and Shopping views instead of `short 1 — also in Kykar` in All only.

## Verify pass

Pass 1 (visual, §3 and §4 rows) and pass 2 (state reachability, rows 4.7–4.11) ran against the
committed table. All five named states remain reachable and the hard state remains correctly
unreachable under self-exclusion. Two findings, both fixed before this report:

1. `decklist-row.tsx` — the marker carried `shrink-[4]` next to the component's own `min-w-0`.
   That pair existed so the deck-name half could truncate to its 6ch floor before the card name
   lost a character. Count-only there is no name half, so the only child is `flex-none
   whitespace-pre` and a forced shrink would have overflowed the box rather than clipped inside
   it. Now `shrink-0`; the card name keeps `flex-auto min-w-0` and the ellipsis, so it is still
   what absorbs a narrow row.
2. `card-availability.md` — the 4.6 / 4.10 amendment note claimed four surfaces still pass
   `selfExcluded` without `nameless` and listed the suggestion tile among them. The tile passes
   `density="chip"`, and `availability-marker.tsx` forces `nameless` on every chip (row 14.1), so
   it is count-only too. Corrected to three: the add-panel search row, the resolution expander and
   the quick-add bar.

`marker.overAlsoIn` and `marker.overAlsoInAria` are therefore not dead copy.

## Pre-existing deviations, recorded not fixed

- Row 3.4's label hexes and row 4.5's `#6B3226` container border are per-theme tokens now
  (`--avail-over-fg`, `--avail-over-border`), superseded by the six-theme replacement run.
- Row 4.5's border ships as `shadow-[inset_0_0_0_1px_…]`; a real border adds 2px and shifts the
  row height inside the desktop grid.

## Open with Design

Table rows 4.6 and 4.10 and the §1.1 self-exclusion paragraph are amended and marked **not yet
ratified by Design**. The drawn form named the other claimant; the shipped form does not, because
the name moved to the card modal's allocation receipt (row 14.7, #353) rather than being withheld.
This is one ask with 14.7's, not a second one.

## Confirm pass

Both findings re-checked, 0 gaps remain.
