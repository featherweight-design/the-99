# The cost track — an amendment request to card-rows

**Not this handoff's component.** `CostPips` belongs to `design_handoff_the99_card_rows/` (Q2)
and R5's pip rules. This file is the proposal, the arithmetic and the blast radius; the ruling is
theirs. **Deck versioning does not depend on it** — the new surfaces inherit whatever `CostPips`
is on the day they ship.

## The complaint

On the shipped decklist row the numeral badge and the colour pips shingle: the track is fixed at
40px, pips overlap from the third at −5px, and the first pip crops the numeral. Two consequences,
one cosmetic and one not:

1. **The numeral is clipped**, so a 5-drop and a 6-drop are distinguished by the sliver of glyph
   the first pip leaves visible.
2. **Two pips of the same colour read as one.** `1U` and `1UU` are the same picture. That is not
   polish — those are two different costs, and the track exists to tell them apart.

## The proposal

| | Shipped | Proposed |
|---|---|---|
| Track width | 40px fixed | **90px desktop / 76px phone**, fixed, right-aligned |
| Pip size | 12px | **11px desktop / 10px phone** |
| Pip spacing | −5px (shingled from the third) | **+3px desktop / +2px phone** |
| Numeral | inside the stack, cropped | **first, then a 4px gap**, then the pips |
| Cap | five slots, then a generic `+n` | **no cap needed** |
| Overflow | shingle | **cannot occur** |

### Why no cap and no overflow rule

A Commander deck's colour identity is **at most five colours, by the rules of the format**, and a
card in it cannot carry a coloured symbol outside that identity. So five pips is not a common case
to design around — it is the **ceiling**. The widest row that can exist is a five-colour card with
no generic cost:

```
5 × 11px + 4 × 3px = 67px   (inside a 90px track)
5 × 10px + 4 × 2px = 58px   (inside a 76px phone track)
```

The shingle was a solution to a constraint (fit five slots into 40px). Remove the constraint and
the shingle has no job.

### Where the width came from

**The type column.** Grouping rows by type — which this handoff adopts from the deck page for
every diff and version surface — deletes a 120px per-row type label from `update-diff-row` and
never introduces one on the version row. Net furniture on those rows is **−30px**, and the name is
wider than it was.

On `decklist-row` the 50px is whitespace the two-column layout already has: at 1180px each column
is ~560px against names that rarely exceed 200px.

## Blast radius

`CostPips` ships in two places (per card-rows Q2):

| Surface | Effect |
|---|---|
| `decks/card-search-row.tsx` | Track widens 40px → 90px. At 375px this is the row the floor called tightest: it carries `×1 owned` / `not owned` in words. **Check this one first** — if the phone search row cannot afford 36px, the phone track stays shingled and the desktop track widens alone. That is an acceptable split because the desktop row is where the ambiguity is actually read. |
| `decks/decklist-row.tsx` | Track widens into existing whitespace at both widths. |
| `collection/rows-view.tsx` | **Untouched.** That is identity pips on a grid, a different affordance, and R5's ring rules are not in scope. |

## What this handoff needs, either way

Nothing. The versioning surfaces draw a cost track because the feedback asked for mana cost on
diff and version rows, and they draw it at whatever metrics `CostPips` carries. If card-rows
declines the amendment, the new rows shingle like the old ones and every other decision in this
handoff stands.

## One traced value to settle

The screenshot's black pip reads as a **dusty pink**, where the brand sheet's B is `#5B5566`. The
canvas draws the screenshot's hue in the "shipped" column and the brand value in the "proposed"
column, so the difference is visible side by side. If the shipped pink is deliberate, **the brand
sheet is what needs correcting** — the WUBRG table is supposed to be final.
