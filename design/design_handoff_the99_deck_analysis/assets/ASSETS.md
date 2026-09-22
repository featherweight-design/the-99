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

## The chip form draws one ornament per rank, chosen to survive 22px

**This is the rule as amended in R9, and it is the rule the files draw.** It is *not* cumulative.
The chip sheds every ornament below the rank's own — and where the rank's own ornament does not
survive 22px, **the chip draws it at the chip's own radius rather than dropping it.** That second
clause is the R9 change; the older wording ("keep only the newest ornament, the chip sheds the mid
ring") dropped rank 2's only ornament and left rank 2 with nothing to draw.

| rank | chip draws | sheds |
|---|---|---|
| 1 | inner diamond `1.8` | — |
| 2 | **the ring alone at radius `16.5`, `1.8` — no inner diamond** | the core |
| 3 | inner `1.8` + **four spokes `1.5`, vertex → rim (`8.5`→`3.2` on each axis)** | mid ring |
| 4 | inner `1.8` + four studs `1.4` | mid ring, ticks |
| 5 | inner `1.8` + closed outer ring `1.4` | mid ring, ticks |

Every chip is two paths or fewer, plus the numeral. Rationale: at 22px a stack of four ornaments is
a smudge, and the rank is read off *which* ornament is present, not how many. Ranks 1, 4 and 5 are
byte-identical to what shipped; **all five full marks are untouched.**

### The numeral in a chip file is decorative

Every chip file carries its numeral at `font-size 17`. At the 22px ship size that renders at ~9px
and is not legible — **the silhouette carries the rank there, and that is the design.** The numeral
is in the file so the chip form can also be drawn at 40–64px in documentation and in the picker,
where it does read. Nothing should depend on it at 22 — **and after R9 nothing has to: every chip
silhouette is now unique.** Rank 2's chip has more room for its numeral than any other, not less.

## Both 22px collisions are closed — R9

**1 vs 2 — rank 2's chip is the ring alone.** Read the rule consistently and rank 2's *newest*
ornament is the mid ring, so the chip keeps the ring and drops the core, not the other way round.
Drawn at the chip's own radius (`16.5`, not the full mark's `14.1`) so the two lone diamonds sit
**43% apart in linear size**: at 22px rank 1 floats inside the box with a wide margin, rank 2 fills
it. There is exactly room for two distinguishable diamond radii in a 22px box, and this uses both.

**3 vs 4 — rank 3's ticks become spokes.** The shipped tick was `1.1` units long, which at 22px is
0.6px: four dots, and rank 4's studs are also four dots. The spoke runs from the core's vertex out
to the rim — `5.3` units, attached to the core — so **rank 3 bridges core and rim and rank 4 does
not**: four detached studs with the gap intact. That is a topology difference, not a radius one.

Rejected: rotating rank 4's studs to the diagonals (it breaks family with the full mark, which puts
them at the cardinals) and re-deriving the ladder (it moves all five full marks to fix two chips).

**The label is not the fix, and stays optional.** Pairing every chip with its bracket name would
have made both collisions moot, but it changes what the chip is for: the chip exists so a rank can
be read where there is no room for a word — the deck-tile footer beside `StatusPillBadge`. The
declaration's chips still carry their names, for reading, not for disambiguation.

## Sizes — this file is normative

Full mark **26 / 36 / 44**; chip **22**; below 20px the numeral alone. Any other trio quoted
elsewhere is a *demonstration* row, not a ship size: the Declaration canvas draws the set at
40 / 28 / 22 to show the form large, at the picker size, and at ship size. 28 is not a ship size.
