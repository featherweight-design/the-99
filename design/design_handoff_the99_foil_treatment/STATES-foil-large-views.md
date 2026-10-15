# STATES — Foil treatment, R2 (large views)

Large views only; tiles are R1's (`STATES-foil-treatment.md`). "Large film" is `data-foil-size="large"`: R1's film at 80%,
spread 1.5x, sliding with the tilt. "Tilt" is ±6° toward the pointer with a hairline of card edge and a soft light, on every card in details
and the zoom. "Tile film" is R1's, unchanged.

| # | Condition | Desktop | Phone |
|---|---|---|---|
| 1 | Shown printing: every owned copy foil, its own art | large film; tilts and follows on hover | large film; one band when the card lands; tilts after a hold |
| 1b | Any card, hovered (desktop) or held 300ms and moved (phone) | tilt ±6°, the side under the pointer lifting; a hairline of card edge on the pointer's side; light at the pointer | same, after the hold |
| 1c | A quick drag on the phone card | n/a | pages or moves the sheet, as today; no tilt |
| 1d | A flip while tilted | tilt eases flat, the turn plays, the tilt resumes on the next move | same |
| 2 | Same, keyboard focus on the face | R1 band, once | n/a |
| 3 | Every owned copy etched | silver large film, same motion | silver, same |
| 4 | Mixed holding (`×3 · 1 foil`, foil + etched) | plain | plain |
| 5 | Picked a plain printing of a foil card | film leaves with the face, at once | same |
| 6 | Face is another printing's or the oracle-level art | plain | plain |
| 7 | Unowned card (suggestion, commander page, not held) | plain | plain |
| 8 | Opened from a precon tile, box not owned | the card's own resolution decides | same |
| 9 | Cold open, face bytes travelling | ground; film held; 300ms fade on arrival | same |
| 10 | Face art failed | film held (`failed`) | same |
| 11 | Two-faced foil printing, flipped | film on both faces, rides the turn | same |
| 12 | Zoom | as 1, at 372 × 520 | as 1, at 318 × 444; one band on open; press and move tilts with no hold; a tap closes |
| 13 | Hover preview of a foil row | tile film, still, no tilt | n/a (no hover) |
| 14 | Peek or neighbour plate, foil | tile film, still, no tilt | tile film, still, no tilt |
| 15 | `prefers-reduced-motion: reduce` | no tilt, no light; film still, centred; no sweep or fade | same |
| 16 | `prefers-reduced-transparency: reduce` | no film, no light; 2px `--fg-muted` ring; the tilt stays | same |
| 17 | `forced-colors: active` | no film, no light; system frame; art stays; the tilt stays | same |
| 18 | Token in details | plain (no finish recorded) | plain |

Surfaces: `components/cards/card-modal.tsx` (details faces, `CardFaces`, the zoom, `PhonePeek`, `NeighborPlate`) and
`components/decks/hover-preview.tsx`. All six themes take the identical film.
