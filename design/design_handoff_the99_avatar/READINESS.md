# Readiness — signature card and spare asks outside Shopping

**Verdict: Green.** R1b approved by Hugh 2026-10-27 ("Much better. Let's open a PR."). Nothing below blocks the
build; each open item has a drawn default.

## For Hugh

1. **The label.** "Signature card" replaces "your commander" everywhere the face is named (call 1). Placeholder for
   `/copy-review` like every string here.
2. **Settings does not get the face.** /friends stays the one place it is edited (call 6); onboarding and the Home
   strip open the same picker in place.
3. **About.** An edit to the `friends` entry, not a new entry; it rides the next batched `ABOUT_VERSION` bump.

## For engineering

1. **The face.** `setFace(viewer, oracleId, printingId | null)` replaces `setCommander`; any game card, any printing
   of it; `social_profiles.face_printing_id` nullable, falling back to the usual art at read (G1, G2).
2. **The picker.** The shipped `CommanderPicker` in `SocialModal`, searching every game card; a result with more
   than one printing opens a second screen of printing-picker tiles with a face preview; one press saves (G3).
3. **Ask once.** One account flag set by Skip, the Home strip's ✕ or any pick; the first-run row and the Home strip
   read it (G4).
4. **A friend's Spares tab.** A tile press opens the shipped `SparesSheet` for that card with the page's friend first.
   Requested / ✓ Accepted sit on the tile's count line ("1 spare · Requested") and never add a line, so the grid
   stays even (Hugh, R1b).
5. **The deep link.** `/friends/{publicId}?spare={oracleId}` from the trade-match push, its Home item and the Waiting
   row opens that modal on landing; a spare gone since shows the shared toast instead (G5).
6. **Switch.** Only if engineering sees a plausible regression (G6).
