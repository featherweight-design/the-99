# READINESS · Flip between decks + custom deck order (R3, #2989 #2990)

**Verdict: Green.** R3 approved by Hugh 2026-11-18: "A2 is the best option, agreed with arranging." Build from README.md; ship as two PRs, custom order first (the strip reads its order).

## Rulings
- Q1 Placement: **A2**, the strip under the art (phone: first row of the under-band; desktop: row under the band). Same strip at both widths. Ruled as drawn.
- Q2 Arrange in folders: **allowed**, one saved order; folder decks move among their own slots. Ruled as drawn.
- Arrange on desktop is a centred 720px column. Ruled as drawn.
- Phone sort is the shipped ⇅ dropdown, not a sheet.

## Gaps for the build
- G1 Order handoff: sessionStorage `{ids, caption}` written on navigation from /decks; direct opens fall back to All decks in the saved sort. Not drawn: decide what happens if the stored list no longer contains the current deck (rec: fall back as for a direct open).
- G2 No swipe between decks (would fight horizontal carousels on the deck page).
- G3 Migration `decks.sort_position` (nullable; null sorts as newest; new decks above the current top). `reorderDecks(ids[])` touches only the caller's own decks.
- G4 Retire the /decks and Home list cache on reorder (`docs/agents/list-cache.md`, `list-stamp:triggers`).
- G5 The global ←/→ handler is the one plausible regression: put it behind a feature switch, skip list in README §1.
- G6 Copy is DRAFT: run /copy-review on the README copy list before build.
