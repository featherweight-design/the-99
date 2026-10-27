# Gap report: signature card, asked once (PR 3 of `2026-10-27-signature-card.md`)

Table: `docs/superpowers/design-tables/signature-card-ask.md`. Handoff: `design/design_handoff_the99_avatar/Onboarding.dc.html` (O1–O4, D1, D2).

## Verify pass

- Visual: 18 of 18 rows match.
- States: all five are reachable (row todo, row done, skipped, strip, picked).

## Notes, not gaps

- **The row's box is the board's.** The board draws the Choose your news row's box (`--surface-rail`, 12/15). README call 4 says "the Friends row's box". The build follows the specimen.
- **The strip's ✕ on desktop is 32.** The board's ✕ has no desktop rule; the welcome strip's is 32 from `sm`. See the table's note.
- **A reader with no profile gets an empty initials box in the strip.** Home has no display name until a profile exists, and a pick makes one (`ensureSenderProfile`). The board always shows initials ("SA").
- **The title wraps to two lines at 390 in Cinzel, Metamorphous and Syncopate.** The board's 223px column wraps the same way.
- **The done row is proved by `signature-ask.test.tsx`, not photographed.** The contact sheets cover the todo row, the strip and the picker at both widths.

VERDICT: 0 gaps remain.
