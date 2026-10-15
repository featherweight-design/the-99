# READINESS — Foil treatment, R2 (large views)

**🟡 R2 drawn, waiting on Hugh's audit.** Nothing here goes to main until he approves. R1's readiness is `READINESS.md`.

## Locks held

| Lock | How R2 holds it |
|---|---|
| Only real copies, only over that printing’s own art | Film only when every owned copy of the SHOWN printing is foil (or etched) and the face is that printing’s own image. Representative or oracle-level art, unowned cards and suggestions: never. |
| No new image downloads | Gradients only. The film’s arrival mark reuses the face’s own URL, which the browser already fetches for the face. |
| The face never waits for the film | The face stays a CSS background drawn at once. Only the film span carries an arrival mark. |
| Reduced motion is static | The tilt, the light, the follow, the sweeps and the fade all sit under no-preference. The film still draws, centred. |
| Reduced transparency and forced colours | R1’s rules cover every `[data-foil]`: a 2px `--fg-muted` ring, and no film. The light is dropped under both; the tilt stays. |
| No change to what details says | No strings. The finish line, the picker captions and the zoom caption are untouched. |
| No per-frame JavaScript | Three registered custom properties written on pointer events on one element; the browser transitions them. A 300ms hold timer on the phone. Nothing runs while idle. |
| No About entry | None, no bump. |

## Open questions, called

1. Intensity at size: R1’s film, at 80% strength and spread one and a half times wider.
2. Motion at size: The film follows the tilt: it slides toward the pointer or finger, up to a quarter of the card’s width each way, and a soft light follows with it.
3. Tilt (Hugh, 2026-10-15: yes, subtle; smoothed against his reference app): Every card in details and the zoom tilts up to 6° toward where you point: the side under the pointer lifts toward you, and a sliver of card edge shows along the far sides, as a card does in hand.
4. The phone: Press and hold the card, then move your finger: it tilts the same way.
5. Arrival on a background face: The face never waits; only the film does.
6. Precons in details: Details keeps the card’s own resolution.
7. The peek and the hover preview: Both get R1’s tile film, still, with no motion.
8. The flip: The film rides both faces through the turn.
9. A mixed holding in details: No film, the same rule as tiles: every owned copy of the shown printing is foil, or nothing.

## For the audit

- The tilt (added at Hugh's request, smoothed against his reference): 6°, the side under the pointer lifting, a card edge
  on the far sides, a soft light, all on one set of eased values; every card; desktop on hover, phone after a 300ms hold.
  Hover the first card on `The 99 - Foil Treatment (R2)`; the phone hold is drawn on `R2 - Details-Phone`.
- R2-G4: tilt on every card, not only foil.
- Call 5: the film's own arrival mark on a background face.
- Call 6: details keeps the card's own resolution from a precon (R2-G3).
- The 80% strength on pale art (R2-G1).
