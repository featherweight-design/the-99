# READINESS — Foil treatment (R1)

**🟢 R1 approved (Hugh, LGTM, 2026-10-15).** Ready to build.

## Locks held

| Lock | How R1 holds it |
|---|---|
| Only copies that are actually foil | `data-foil` only when every owned copy of the drawn printing is foil (or etched). Never suggestions, unowned commanders, drafts, tokens. |
| No new image downloads | Two CSS gradients on two pseudo-elements. |
| On the ring span every tile draws over its art | `data-foil` on that span; no new element. |
| Corner radius ≥ 3.1% of tile width | Inherits the art clip: 5.0% (181px), 5.2% (173px), 7.8% (115px). |
| No per-tile JS loop, no per-tile filter or backdrop-filter | None; no blend mode or `will-change` either. |
| Reduced motion static; reduced transparency and forced colours handled | Still film; solid 2px `--fg-muted` edge; film dropped. |
| 200-tile grid stays smooth | Static film, no layer at rest; phones never create the band; one hovered tile animates `transform`. Proof: `measure:load`, slow profile, before/after. |
| No change to what a tile says | No strings. |
| No About entry | None, no bump. |

## Open questions, called

1. Static, fading in with the art.
2. Desktop: one 640ms sweep on hover or keyboard focus. No tilt, no pointer-following.
3. Phones: static.
4. One recipe for all six themes; reduced transparency swaps the film for a solid 2px edge.
5. Etched drawn as a cool silver film, same sweep.
6. Mixed: no film. Rule everywhere: every owned copy of the drawn printing is foil. Deck rule agreed (widened from pin to drawn printing, G5).
7. Large views: not this round (G4).

## For the audit

- The departure in README §Where each surface reads "foil" (drawn printing, not only the pin).
- G2's proposed `failed` arrival mark.
- Keep or drop etched (G6).
