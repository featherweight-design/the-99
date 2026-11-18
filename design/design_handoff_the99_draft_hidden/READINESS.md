# READINESS · Draft deck hidden row (R1, #2988)

**Verdict: Green.** R1 approved by Hugh 2026-11-17. Small change to `DeckCardOverflow` plus a scroll-and-wash on Settings' Your decks; no schema change.

- G1 Settings row links to `/settings#settings-decks` (no in-place flip). Ruled as drawn.
- G2 No per-deck "keep hidden" offer in the why block. Ruled as drawn.
- G3 Copy is DRAFT: run /copy-review on the new `socialCopy.hideDeck` lines before shipping.
- G4 a11y: the why block is plain text; each row's accessible name carries its destination ("Show drafts to friends, in Settings").
- Commit as v1 gating must reuse the `offerFirstCommit` test (no version, full body, nothing unresolved).
