# States — the push line and the upgrade path

Three sets that do not share a namespace: the atom (`p*`), the upgrade path (`u*`), and the host
matrix.

## §A The atom — `p1`–`p12`

| # | `BracketDelta` | Drawn | Marks | Label |
|---|---|---|---|---|
| p1 | `moves` · massLandDenial | one sentence: movement, then the rule | `[1,2] → [4,5]` | `IF YOU ADD THIS` |
| p2 | `moves` · extraTurns, bracket 1 | one sentence | `[1,2] → [2]` | same |
| p3 | `moves` · twoCardCombos | combo named, then the movement | `from → to` | same |
| p4 | `moves` · the loop clause | the loop leads, then the movement | `[3] → [4,5]` | same |
| p5 | `counts` · moved | two clauses, count first | `from → to` | same |
| p6 | `counts` · not moved | one clause, the count | none | same |
| p7 | `counts` · `combos` non-empty | p5 or p6 + a third `--fact` line | as p5/p6 | + `COMBO CHANGES` |
| p8 | `unquantified` | figure + why it is unscored + *doesn't move* | none | `REPORTED, NOT SCORED` |
| p9 | `ruleless` | figure + no limit + the coverage clause | none | `A FACT, NOT A LIMIT` |
| p10 | `inert` · `to` is `[4,5]` | combo named + *no lower bracket left* | none | `A COMBO, AND NO CHANGE` |
| p11 | `inert` · deck at 3, no coverage | combo named + *nothing searches for either half* | none | same |
| p12 | `none` | **nothing renders.** No slot, no rule, no height | — | — |

**Tile density (p1–p11):** mark (moves/counts-that-moved only) + one clause of ≤3 words. p12 draws
nothing. The sentence is in the card detail modal.

**Not states:** a loading atom (the delta is synchronous over data the page holds), an error atom
(a profile that failed to build has no analysis tab either), and a *stale* atom (the row re-renders
with the deck).

## §B The upgrade path — `u1`–`u8`

| # | Condition | Drawn |
|---|---|---|
| u1 | closed | the climb's lower rung, unchanged, + `what would have to go →` |
| u2 | `items` with one count rule | rule label, *any N of these M*, candidates |
| u3 | `candidates === removeCount` | the cards named, no *any* |
| u4 | `items` with a combo | *Either half breaks it* + the pair + what it produces |
| u5 | several items, with a card in two of them | all items as returned + the overlap sentence in the foot |
| u6 | `items: []` | *Nothing would have to go* + the declaration hand-off |
| u7 | `blocked` on a count | cuttable candidates + commander on a dashed edge + the plain blocked sentence + nearest reachable target |
| u8 | `blocked` on a combo, every piece a commander | *Both halves are in your command zone*, same shape as u7 |

**Target selection:** the brackets below the deck's reading, as chips. A deck reading `[1,2]` shows
Exhibition alone; a deck reading `[2]` shows Exhibition; a deck reading `[4,5]` shows all three.
**There is never a chip for 4 or 5.**

## §C Host matrix

| Host | Atom density | Slot position | 390 |
|---|---|---|---|
| Quick add result row | sentence | below the row's line, inside its box | 52px meta row, atom unchanged |
| Consider tile | clause + mark | tile foot, above the Add | same, 2-up grid |
| Top-off candidate row | sentence, indented to the name column | below the row's line | 52px meta row, atom unchanged |
| Top-off commit bar | **none** | — | — |
| Analysis tab | **none** | — | — |
| `/commanders/[slug]` synergy row | **none** (no profile) | — | — |

## §C2 Fact marks

Independent of the atom's state, and present whenever a card is drawn: **bolt** (game changer),
**stripped peak** (mass land denial), **turn again** (extra turns), **the lemniscate** (two-card
infinite), **drawn up** (tutor). **16×16, `--fact`, bare.**

| Where | Placement |
|---|---|
| Card row (quick add, top-off) | own line **above the name**, ownership dot leading |
| Consider tile | own line above the name, dot leading; **no mana pips on a tile** |
| The atom's sentence, the path's candidates | inline, following the name |

A card wears every mark true of it (Underworld Breach is bolt *and* lemniscate; a loop combo's
halves are lemniscate *and* turn again). p12's silent row wears none and keeps the dot's line, and
so does any candidate that fires no rule. `aria-hidden`; the facts are in the accessible name.

**The fact shapes' labels carry their own mark:** `ruleless` → drawn up, `unquantified` → turn
again, `inert` → the lemniscate.

## §D Interaction

- The atom is **not interactive**. Card names inside it carry the dotted underline and open the card
  — the same affordance as everywhere else, and the only one it has.
- The atom is part of the row's accessible description, never a live-region announcement.
- The path is a disclosure: `aria-expanded`, `aria-controls`, local state, no focus move, not
  persisted.
