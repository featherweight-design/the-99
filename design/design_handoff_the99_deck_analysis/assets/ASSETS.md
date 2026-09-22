# The bracket mark — asset set

**This folder is the mark set's only home.** Ten files: five full marks, five chip forms. Nothing
imports a bracket mark from any other handoff package. Open `bracket-marks.html` to see all ten.

| rank | name | full mark | chip form |
|---|---|---|---|
| 1 | Exhibition | `bracket-1-exhibition.svg` | `bracket-1-exhibition-chip.svg` |
| 2 | Core | `bracket-2-core.svg` | `bracket-2-core-chip.svg` |
| 3 | Upgraded | `bracket-3-upgraded.svg` | `bracket-3-upgraded-chip.svg` |
| 4 | Optimized | `bracket-4-optimized.svg` | `bracket-4-optimized-chip.svg` |
| 5 | cEDH | `bracket-5-cedh.svg` | `bracket-5-cedh-chip.svg` |

All ten are a 40-unit viewBox on `currentColor`, no fill. **Full mark** is drawn at 26 / 36 / 44;
**chip form** at 22. Below 20px `BracketMark` draws the numeral alone and no file is used.

`bracket-5-cedh.svg` **is** the reissue. The old rank-5 file (rank 4's geometry with a 5 in it) is
gone, not renamed — there is no `-reissued` suffix to choose between.

## The full marks are additive

1 is the inner diamond alone. 2 adds the mid ring. 3 adds four cardinal ticks. 4 adds four studs.
5 **joins rank 4's four studs into a closed third ring** through their own outer corners —
`(20,1.2) (38.8,20) (20,38.8) (1.2,20)` at the same `1.1` weight. Nothing new is introduced and the
footprint is unchanged, so every existing size and alignment still holds.

## The chip form keeps only the newest ornament

**This is the rule, stated as it ships.** It is *not* cumulative, and it is narrower than the
sentence carried in earlier rounds ("sheds the mid ring, each rank keeps its own distinguisher"),
which read as though rank 4 would keep its ticks and rank 5 its ticks and studs.

| rank | chip draws | sheds |
|---|---|---|
| 1 | inner diamond `1.8` | — |
| 2 | inner diamond `1.8` | mid ring |
| 3 | inner `1.8` + four ticks `1.6` (lengthened inward to `5.2`) | mid ring |
| 4 | inner `1.8` + four studs `1.4` | mid ring, ticks |
| 5 | inner `1.8` + closed outer ring `1.4` | mid ring, ticks |

The shipped rank-5 chip has always drawn this rule — two paths, not six. The four other chips are
built to match it. Rationale: at 22px a stack of four ornaments is a smudge, and the rank is read
off *which* ornament is present, not how many.

### The numeral in a chip file is decorative

Every chip file carries its numeral at `font-size 17`. At the 22px ship size that renders at ~9px
and is not legible — **the silhouette carries the rank there, and that is the design.** The numeral
is in the file so the chip form can also be drawn at 40–64px in documentation and in the picker,
where it does read. Nothing should depend on it at 22.

## Two collisions at 22px — both open, neither fixed here

- **1 vs 2.** Rank 2's only ornament is the mid ring, and the chip is the one form that drops it,
  so 1 and 2 are a single silhouette. Rank 2 needs an ornament of its own that survives the chip.
  Acknowledged since R7.
- **3 vs 4.** Both put four marks at the cardinal points — ticks at radius `4.1–5.2`, studs at
  `1.2–4.4`. They separate on radius and on nub-vs-open-diamond, which is thinner than the
  separation 4-vs-5 got and has never been tested at size. **This is the same question 1-vs-2 asks
  and it has not been asked.** Candidate answers, cheapest first: lengthen rank 3's chip ticks to
  read as spokes rather than dots; rotate rank 4's studs to the diagonals; or give rank 3 the
  ornament rank 2 is also owed and re-derive the ladder. A Round 0 conversation.
