# States — the push line and the upgrade path (R2)

Three sets that do not share a namespace: the atom (`p*`), the upgrade path (`u*`), and the host
matrix. **Precedence, top to bottom: `moves`, `counts`, `inert`, `ruleless`, `unquantified`,
`none`.**

## §A The atom — `p1`–`p14`

The slot label is **`IF YOU ADD THIS`, mono 9px `--fg-muted` uppercase `.14em`** on every shape
that draws one. Not `--fg-disabled`: at 9px on `--surface` that measures 1.71:1.

| # | `BracketDelta` | Drawn | Bracket marks | Label |
|---|---|---|---|---|
| p1 | `moves` · massLandDenial | one sentence: movement, then the rule | `[1,2] → [4,5]` | `IF YOU ADD THIS` |
| p2 | `moves` · extraTurns, bracket 1 | one sentence | `[1,2] → [2]` | same |
| p3 | `moves` · twoCardCombos | combo named, then the movement | `from → to` | same |
| p4 | `moves` · the loop clause | the loop leads, then the movement | `[3] → [4,5]` | same |
| p5 | `counts` · moved | two clauses, count first, **binding bracket** | `from → to` | same |
| p6 | `counts` · not moved | one clause, the count, **binding bracket** | none | same |
| p7 | `counts` · `combos` non-empty | p5 or p6 + a third `--fact` line | as p5/p6 | + `COMBO CHANGES` |
| p8 | `inert` · `to` is `[4,5]` | combo named + *no lower bracket left* | none | `A COMBO, AND NO CHANGE` |
| p9 | `inert` · `to` is `[3]` | combo named + *nothing searches for either half* | none | same |
| p10 | `inert` · `to` is `[4]` | combo named + *a combo you can already assemble sets this bracket* | none | same |
| p11 | `ruleless` · no coverage | figure + no limit + *and yours can't, yet* | none | `A FACT, NOT A LIMIT` |
| p12 | `ruleless` · coverage present | figure + no limit + *already counted in this bracket* | none | same |
| p13 | `unquantified` · binding bracket 2–3 | figure + the chaining rule + *doesn't move* | none | `REPORTED, NOT SCORED` |
| p14 | `unquantified` · binding bracket 4–5 | figure + *no such rule up here* + *doesn't move* | none | same |
| — | `none` | **nothing renders.** No slot, no rule, no height | — | — |

**Branches, all from data the row holds:** p8/p9/p10 from `to`; p11/p12 from the coverage flag the
verdict block already reads; p13/p14 from `to[0] >= 4`; p5/p6 from `to` against the profile's
`permits`.

**Tile clause (p1–p14):** bracket mark, where there is one, + ≤3 words. `none` draws nothing.

**Not states:** a loading atom (the delta is synchronous over data the page holds), an error atom,
a *stale* atom (the row re-renders with the deck).

## §B The upgrade path — `u1`–`u8`

| # | Condition | Drawn |
|---|---|---|
| u1 | closed | the climb's lower rung (*To downgrade your deck*) + `what would have to go →` |
| u2 | `items` with one count rule | rule label, *any N of these M*, candidates |
| u3 | `candidates === removeCount` | the cards named, no *any* |
| u4 | `items` with a combo | *Either half breaks it* + the pair + what it produces |
| u5 | several items, a card in two of them | all items as returned + the overlap sentence in the foot |
| u6 | `items: []` | *Nothing would have to go* + the declaration hand-off |
| u7 | `blocked` on a count | cuttable candidates + commander on a dashed edge + the plain blocked sentence + nearest reachable target |
| u8 | `blocked` on a combo, every piece a commander | *Both halves are in your command zone*, same shape as u7 |

**Target selection:** the brackets below the deck's reading, as chips. **Never a chip for 4 or 5.**

## §C Host matrix

| Host | Atom density | Slot position | 390 |
|---|---|---|---|
| Quick add result row | sentence | below the row's line, inside its box | 52px meta row, atom unchanged |
| Consider tile | clause | tile foot, above the Add | same, 2-up grid |
| Top-off candidate row | sentence, indented to the name column | below the row's line | 52px meta row, atom unchanged |
| Top-off commit bar | **none** | — | — |
| Analysis tab | **none** | — | — |
| `/commanders/[slug]` synergy row | **none** (no profile) | — | — |

## §C2 Fact marks — five glyphs, 16×16

**bolt** (game changer), **stripped peak** (mass land denial), **turn again** (extra turns),
**lemniscate** (two-card infinite), **drawn up** (tutor). All **16×16, `--fact`, bare**.

| Where | Placement |
|---|---|
| Card row (quick add, top-off) | inline after the name, per Round 1's rule |
| Prose (the atom's sentence, the path's candidates) | after the name |
| Consider tile | own line above the name, ownership dot leading, no pips on the art |
| A fact shape's label | the shape's own glyph precedes the label |

A card wears every mark true of it (Underworld Breach is bolt *and* lemniscate; a loop combo's
halves are lemniscate *and* turn again). A card that fires no rule wears none. `aria-hidden`.

**Sequencing:** the lemniscate and drawn-up are Round 2 design; if they land later, they appear at
call sites that already exist with no other change.

## §D Interaction

- The atom is **not interactive**. Card names inside it carry the dotted underline and open the
  card.
- The atom is part of the row's accessible description, never a live-region announcement.
- The path is a disclosure: `aria-expanded`, `aria-controls`, local state, no focus move, not
  persisted.
