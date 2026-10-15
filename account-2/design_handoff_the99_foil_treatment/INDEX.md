# The 99 — Foil treatment · R1 handoff package

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
| `READINESS.md` | R1, waiting on Hugh. |
| `foil-treatment · copy strings.ts` | Empty: no strings. |
| `brand/` | The locked brand sheet. |

## The answer in one line per question

1. Static; it fades in with the art.
2. Desktop hover or focus: one 640ms band of light.
3. Phones: static.
4. One recipe in all six themes; reduced transparency gets a solid 2px edge.
5. Etched: a cool silver film.
6. Mixed: no film. Every owned copy foil, or nothing.
7. Large views: later.
