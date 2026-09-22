# Errata — the bracket mark assets

Engineering's notes on the drop. `ASSETS.md` is Design's document and is not edited here.

## 1 · The 22px collisions — RESOLVED in R9

**Was:** `ASSETS.md` stated that the numeral at 22px "renders at ~9px and is not legible — the
silhouette carries the rank there", and also that ranks 1 and 2 were "a single silhouette" at that
size. Both could not hold: if the silhouette carries the rank and two ranks share one, the chip
carried no rank for those two. 3-vs-4 was the same question at a margin the file called thinner
than 4-vs-5 got and never tested at size.

**Now:** both are closed, and verified against the files rather than the prose.

| rank | chip | measured |
|---|---|---|
| 1 | one diamond, radius `11.5` | `M20 8.5 L31.5 20 L20 31.5 L8.5 20 Z` |
| 2 | **the ring alone, radius `16.5`** — the core is dropped, not the ring | `M20 3.5 L36.5 20 L20 36.5 L3.5 20 Z` |
| 3 | core + **four spokes**, attached, vertex → rim | `M20 8.5 L20 3.2` and three more |
| 4 | core + **four studs**, detached, floating at the rim | `M20 1.2 L21.6 2.8 L20 4.4 L18.4 2.8 Z` |
| 5 | core + closed outer ring | unchanged |

`16.5 / 11.5 = 1.43`, so Design's "43% apart in linear size" is exactly right. Ranks 3 and 4 both
draw five paths over the same core, and the difference is structural rather than a matter of
degree: rank 3's ornaments are LINES that bridge core to rim, rank 4's are CLOSED shapes that
touch neither.

Ranks 1, 4 and 5 are byte-identical to what shipped, and all five full marks are untouched.

**The label was considered and refused, with a reason.** Engineering had offered "pair every chip
with its bracket name" as a fourth candidate; Design's answer is that it *"would have made both
collisions moot, but it changes what the chip is for"* — the chip exists so a rank can be read
where a label will not fit. Recorded because a later reader will have the same idea.

**This unblocks PR 5.** Round 3's declaration draws chips throughout — the `[1,2]` ask is
"lead + chips **Exhibition** / **Core**", which was precisely the 1-vs-2 collision.

## 2 · The declaration canvas contradicts this file

The declaration handoff's canvas says ranks 3, 4 and 5 stay distinct at 22px. That was written
before R9 and happens to be true of the amended files; it was not true of the ones it described.
Harmless now, and worth correcting whenever that package is next touched.

## 3 · A note for the build

Each SVG is ~8KB, of which nearly all is a C2PA provenance blob rather than art. Strip it at
whatever step copies these into `public/`.
