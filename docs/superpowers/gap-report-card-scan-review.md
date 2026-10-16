# Gap report — card scan PR 4 (the review, L1–L4)

Design: `design/design_handoff_the99_card_scan` (R1, approved 2026-10-16). Table: `design-tables/card-scan-review.md`.

## Verify (Agent 2)

Visual: 2 gaps, both in `add-line.tsx`.

1. Tiles container clipped as drawn (`overflow-hidden`), not scrolling.
2. The folded line's unchosen printing keeps the shipped `.p` face (11px IBM Plex Mono) in `--warning`.

State coverage: 0 gaps. L1, the search-pick line, L2, the swap, Search for it instead, V6 None of these, L3, R3, R4, L4
and W2/W3 are all reachable.

## Confirm

Both fixed (`add-line.tsx:90`, `:258`). 0 gaps remain.

## Settled in the build

- The name press is 24px as drawn, with a 44px hit drawn past it below `md` (READINESS: every phone press is 44px).
- The photo is 44×62 as drawn. It is the scan's own crop (the embedder's input, `src/lib/scan/photo.ts`), so the
  board's blur, rotation and filters, which simulate a camera frame on a catalog image, are not applied. Its ground is
  `--surface-sunken`, since the drawn `#2A241C` has no token.
- The folded unchosen line reuses `add.choosePrinting` rather than new copy.
- The fix region's name is `scan.fix.regionLabel`.
- The desktop opens the fix in place, as the phone does: the board draws no open fix at 1300.
- Search for it instead removes that scanned line (the player has said it is wrong) and puts focus in the search.
  None of these closes the scanner onto the search. A swap keeps the region open, now ticking the new card.
