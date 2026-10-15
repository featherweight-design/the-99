# The 99 — Foil treatment · handoff package (R1, R2)

A still foil film over the art of foil copies on the deck Card view, the Collection grid and the precon open view, with one
light sweep on desktop hover. Cosmetic: no About entry, no new strings, no new tokens.

Source of truth: `docs/superpowers/design-briefs/2026-10-15-foil-treatment.md` (branch `brief/foil-treatment`).

## Start here

| Read | For |
|---|---|
| **`The 99 - Foil Treatment (R1).dc.html`** | **The calls, specimens, locks and timing in one board.** |
| `R1 - Deck-Desktop.dc.html`, `R1 - Deck-Phone.dc.html` | A Collector's Edition deck (the paint worst case), six themes, preferences. |
| `R1 - Collection-Desktop.dc.html`, `R1 - Collection-Phone.dc.html` | The common case, about 1 foil in 20. |
| `R1 - Precon-Desktop.dc.html`, `R1 - Precon-Phone.dc.html` | Avengers Assemble CE beside the regular edition. |
| `R1 - States.dc.html` | Every state. |
| `R1 - Motion.dc.html` | The arrival and the sweep, looping. |
| `R1 - Tokens.dc.html` | Why tokens stay plain. |
| `README.md` | Calls, the CSS, timing, gaps. |
| `STATES-foil-treatment.md` | The matrix. |
| `READINESS.md` | R1, approved. |
| `foil-treatment · copy strings.ts` | Empty: no strings. |
| `brand/` | The locked brand sheet. |

## The answer in one line per question

1. Static; it fades in with the art.
2. Desktop hover or focus: one 640ms band of light.
3. Phones: static.
4. One recipe in all six themes; reduced transparency gets a solid 2px edge.
5. Etched: a cool silver film.
6. Mixed: no film. Every owned copy foil, or nothing.
7. Large views: R2, below.

## R2 · Large views (waiting on Hugh's audit)

| Read | For |
|---|---|
| **`The 99 - Foil Treatment (R2).dc.html`** | **The nine calls, a live follow, intensity, timing, locks, sizes and the CSS.** |
| `R2 - Details-Desktop.dc.html`, `R2 - Details-Phone.dc.html` | Card details from a CE deck: rest, follow, focus, six themes, etched, mixed, plain pick, no own art, cold open, preferences. |
| `R2 - Zoom.dc.html` | The zoom on both widths, a two-faced foil turning, preferences. |
| `R2 - Preview.dc.html` | The hover preview, the neighbour plate, and a precon card in details. |
| `R2 - Motion.dc.html` | Follow, focus sweep, phone landing band, cold arrival, flip, looping. |
| `R2 - States.dc.html`, `STATES-foil-large-views.md` | Every state. |
| `README.md` §R2 | Calls, where details reads foil, the CSS, timing, sizes, gaps. |
| `READINESS-r2.md` | R2, waiting on Hugh. |

1. Intensity: R1's film at 80%, spread 1.5x.
2. Desktop: the film follows the pointer; focus plays one sweep.
3. Tilt: no.
4. Phone: still, one band when a card lands.
5. Cold face: the face never waits; the film fades in when the bytes land.
6. Precons: details keeps the card's own resolution.
7. Peek and preview: R1's tile film, still.
8. Flip: the film rides both faces.
9. Mixed: no film.
