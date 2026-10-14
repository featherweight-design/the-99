# DENSITY — the longer name

**The measured answer to "what gives", and the finding that reframes the question.**
Sibling to `design_handoff_the99_card_surfaces/DENSITY-four-hundred-pixels.md`, whose ledger this
one continues. Every figure is derived from the geometry that handoff ships, not re-measured from
scratch.

## The name block, derived

**R3 — this section is re-derived from scratch.** R1's figures were wrong: they subtracted the
row's fixed spend twice, producing a 96px desktop name block that nothing in the geometry supports
and that a measurement of the drawing contradicts (194px). Every number below is one subtraction
from one usable width, and the surfaces are ranked at the end.

**Method.** `usable = width − pane padding − row padding`. Every child except the name block is
`flex-none`, so `name block = usable − Σ(fixed children) − Σ(gaps)`. The count sits *inside* the
name block, so the text gets the block minus the count and its gap. Worst case throughout:
`none free` in the availability slot (62px), count present (18px + 9px gap = 27px).

### Desktop row, 400px

| | px |
|---|---|
| row width | 400 |
| row padding 9 + 9 | −18 |
| **usable** | **382** |
| ownership dot | −7 |
| cost track (fixed) | −40 |
| availability `none free` | −62 |
| ✕ | −32 |
| gaps, 10 × 4 | −40 |
| **name block** | **201** |
| count `×2` + its gap | −27 |
| **name text** | **174** |

### Phone rows

Pane padding 16 + 16, row padding 8 + 8, pips on the meta line so no cost track, ✕ at 44.
Fixed spend is `7 + 62 + 44 + gaps 9×3 = 140` at both widths.

| | 390 | 320 |
|---|---|---|
| row width | 358 | 288 |
| usable | 342 | 272 |
| fixed spend | −140 | −140 |
| **name block** | **202** | **132** |
| count + gap | −27 | −27 |
| **name text** | **175** | **105** |

### Tile captions

| Tile | derivation | caption |
|---|---|---|
| deck, 148 desktop | 148 − 16 pad − 32 ✕ − 6 gap | **94** |
| deck, 159 phone | 159 − 16 pad − 44 ✕ − 6 gap | **93** |
| collection, 148 | 148 − 16 pad (no ✕) | **132** |
| deck, 148 — **R2, ✕ in the art corner** | 148 − 16 pad | **132** |
| deck, 159 — **R2, ✕ in the art corner** | 159 − 16 pad | **143** |

## The finding — reissued in R3

**Character advance, measured rather than estimated.** `Battle of Olympus` renders at **108px** at
13.5px in Plex Sans: 17 characters, **6.35px per character**. Scaled: **5.88px** at the 12.5px phone
row, **5.64px** at the 12px caption.

**Every surface, ranked by how much name it holds:**

| Surface | name px | chars | `Battle of Olympus` |
|---|---|---|---|
| **deck tile, 159 phone** | **93** | **~16** | **clips** |
| **deck tile, 148 desktop** | **94** | **~17** | **clips — marginal** |
| phone row 320, count | 105 | ~18 | fits, 5px spare |
| phone row 320, no count | 132 | ~22 | fits |
| collection tile, 148 | 132 | ~23 | fits, 36px spare |
| deck tile 148, **R2 geometry** | 132 | ~23 | fits |
| deck tile 159, **R2 geometry** | 143 | ~25 | fits |
| **desktop row, count** | **174** | **~27** | fits, 66px spare |
| phone row 390, count | 175 | ~30 | fits, 75px spare |
| desktop row, no count | 201 | ~32 | fits |
| phone row 390, no count | 202 | ~34 | fits |

**Three things follow, and they replace R1's headline.**

**1 · The deck tile caption is the tightest block on the feature, by 11px over the next surface —
and it is the only place the spec's canonical example clips.** R1 said desktop; R1's desktop figure
was an arithmetic error. The R2 tile ruling was reached for the right reason and now has the right
number under it.

**2 · Neither row is in trouble on the canonical example.** The desktop row holds ~27 characters and
the roomiest phone row ~34. **The tight row is 320 with a count, at ~18** — which is the phone, and
which means **#467's instinct to rule the phone row was not wrong**; it simply ruled the wrong phone
width, and its truncation turns out to live on the Add panel besides.

**3 · The ordering is not width-monotonic.** 320 with a count (105px) is tighter than the 400px
desktop row (174px), because the phone row spends 44px on a touch-target ✕ and 62px on availability
out of a much smaller budget. **The surface to design for is the one with the least name, not the
one with the fewest pixels.**

## Where 32 characters bites

The `Chalice of the Unfathomable Deep` fixture — **a length fixture, not a real printing.**

| Surface | name px | 32 chars ≈ | shown |
|---|---|---|---|
| deck tile, 159 | 93 | 180 | ~16 chars |
| deck tile, 148 | 94 | 180 | ~17 |
| phone row 320, count | 105 | 188 | ~18 |
| deck tile 148, R2 | 132 | 180 | ~23 |
| desktop row, count | 174 | 203 | ~27 |
| phone row 390, count | 175 | 188 | ~30 |

**Every surface clips a 32-character name.** That is what makes call 2 a ruling rather than a
width-by-width judgement: there is no width at which the problem disappears, so the answer has to be
one rule.

## What was considered as payment, and why nothing could pay

| Candidate | Returns | Refused because |
|---|---|---|
| the count `×2` | 27px | it is a fact the row exists to carry; a row that omits a field is worse than a name that ends in an ellipsis |
| the availability slot | 44px | the floor's own slot — never empty on an unowned card (card-rows FLOOR) |
| the buy tag | 0px | **already spent** — card-surfaces R2 collapsed it to a bare `$` on the All tab |
| the 40px cost track | 40px | fixed so adjacent rows' pips land on one vertical line; a variable track is the failure `card-search-row`'s fixed slot exists to prevent |
| the ✕ | 12px desktop | already at the 32px icon-only floor; card-surfaces raised it *to* 32 for this reason |
| wrapping to two lines | all of it | one taller row shunts the ninety-eight below it; row height may change only at a group boundary |
| **nothing on the tile** | — | the tile caption has no siblings to take from at all, only the ✕ — which is why call 3 moves it |

**The row was fully spent before this addendum arrived.** That is why call 2 is a shrink-order
ruling and not a re-layout: there is no pixel left to move, so the only honest design work is
deciding *which* thing degrades and *how* gracefully.

## The tile is the tightest surface — reissued in R2

**R1 had this backwards.** It rested on `grid-view.tsx` clamping the caption to two lines. It does
not: `deck-card-tile.tsx:186` and `collection/grid-view.tsx:88` are single-line truncate, and the
only `WebkitLineClamp: 2` in the tree is `suggestion-tile.tsx:296`, the Consider tile — a
different surface with a different caption. **There is no free second line, and the tile caption is
narrower than the row's name block.**

### As shipped

| Tile | caption width | `Battle of Olympus` (96px at 12px) | 32-char fixture (180px) |
|---|---|---|---|
| deck, 148 desktop | 148 − 16 pad − 32 ✕ − 6 gap = **94px** | **clips — marginal** | clips, ~17 shown |
| deck, 159 phone | 159 − 16 pad − 44 ✕ − 6 gap = **93px** | **clips** | clips, ~16 shown |
| collection, 148 | 148 − 16 pad = **132px** (no ✕) | fits — 36px spare | clips, ~23 shown |

**93–94px is the tightest block on the feature** — 11px under the next surface (phone 320 with a
count, 105px) and 80px under the desktop row. The spec's own canonical example clips on the deck
tile at both widths, and **nowhere else at all**.

### With the ✕ moved to the art corner (README call 3)

| Tile | caption width | `Battle of Olympus` | 32-char fixture |
|---|---|---|---|
| deck, 148 desktop | **132px** | fits — 36px spare | clips, ~23 shown |
| deck, 159 phone | **143px** | fits — 47px spare | clips, ~25 shown |
| collection, 148 | 132px — unchanged | fits | clips, ~23 shown |

**38–50px for one control that had two free corners beside it.** It also makes the two tiles agree
on caption geometry, so one ladder describes both.

### Why not the clamp

A clamp buys ~12 characters and costs the grid its equal-height read — the property that makes grid
view worth choosing over list view. Two ways to pay, both bad: **let the height vary**, and the grid
goes ragged wherever one long name lands; or **reserve two lines**, and every tile in the app grows
~16px to accommodate a handful of cards. The row was refused a wrap for the shunting cost; the tile
is refused a clamp for the alignment cost. **Different reason, same conclusion, and now one ladder
covers both surfaces.**

## The modal header's 23px

The oracle line costs **23px** of header height when it renders: 13.5px text at line-height 1.2
(16px) plus the 5/6px gap, with the 10px gap to the type line replacing the shipped 6px.

| Sheet | header before | header after | of sheet height |
|---|---|---|---|
| 390 phone | 62px (title 25 + gap 6 + type 17 + pad) | **85px** | +23px of ~640 |
| desktop | 78px | **101px** | +23px, no scroll change |

**It is charged only to cards that have a printed name**, which is why the line is absent rather
than reserved. A reserved empty line would spend the same 23px on every card in the app to say
nothing on all but a handful.
