# READINESS — Foil treatment, R2 (large views)

**🟡 R2 drawn, waiting on Hugh's audit.** Nothing here goes to main until he approves. R1's readiness is `READINESS.md`.

## Locks held

| Lock | How R2 holds it |
|---|---|
| Only real copies, only over that printing’s own art | Film only when every owned copy of the SHOWN printing is foil (or etched) and the face is that printing’s own image. Representative or oracle-level art, unowned cards and suggestions: never. |
| No new image downloads | Gradients only. The film’s arrival mark reuses the face’s own URL, which the browser already fetches for the face. |
| The face never waits for the film | The face stays a CSS background drawn at once. Only the film span carries an arrival mark. |
| Reduced motion is static | The follow, the sweeps and the fade all sit under no-preference. The film still draws, centred. |
| Reduced transparency and forced colours | R1’s rules already cover every `[data-foil]`: a 2px `--fg-muted` ring, and no film. |
| No change to what details says | No strings. The finish line, the picker captions and the zoom caption are untouched. |
| No per-frame JavaScript | One custom property per pointermove on one element; a CSS transition does the rest. Nothing runs while idle. |
| No About entry | None, no bump. |

## Open questions, called

1. Intensity at size: R1’s film, at 80% strength and spread one and a half times wider.
2. Motion at size: Desktop: the film follows the pointer across the face, up to a quarter of the card’s width each way, and eases home when the pointer leaves.
3. Tilt on desktop: No tilt.
4. The phone: A still film, plus one R1 sweep when a card lands: details opening, a swipe settling, the zoom opening.
5. Arrival on a background face: The face never waits; only the film does.
6. Precons in details: Details keeps the card’s own resolution.
7. The peek and the hover preview: Both get R1’s tile film, still, with no motion.
8. The flip: The film rides both faces through the turn.
9. A mixed holding in details: No film, the same rule as tiles: every owned copy of the shown printing is foil, or nothing.

## For the audit

- Call 2: the film following the pointer on desktop, in place of the hover sweep (hover the first card on the R2 boards).
- Call 3: no tilt (R2-G4 says how it would go in later).
- Call 5: the film's own arrival mark on a background face.
- Call 6: details keeps the card's own resolution from a precon (R2-G3).
- The 80% strength on pale art (R2-G1).
