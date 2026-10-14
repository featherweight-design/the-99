# The cost track — an amendment request to card-rows

**Not this handoff's component, and — as of R2 — not this handoff's dependency either.** `CostPips`
belongs to `design_handoff_the99_card_rows/` (Q2) and R5's pip rules. Hugh has confirmed the
overlap is changing for card rows; this file is material for that round.

**R2 correction, stated first, because it changes what this document is.** R1.2 claimed versioning
mounted `CostPips` on two new surfaces and so surfaced the shingling. The canvas did not actually
draw `CostPips` — it drew a mana-value numeral, which is a different figure (see the gap report's
blocker). **The canvas is corrected to `CostPips`' real output**, which means versioning's rows are
untouched by whatever card-rows decides. This request stands on its own merits, not on versioning's.

## The complaint

On the shipped decklist row the numeral badge and the colour pips shingle: the track is fixed at
40px, pips overlap from the third at −5px, and the first pip crops the numeral. Two consequences,
one cosmetic and one not:

1. **The numeral is clipped**, so a 5-drop and a 6-drop are distinguished by the sliver of glyph
   the first pip leaves visible.
2. **Two pips of the same colour read as one.** `Mana Drain` (`{U}{U}`) and a hypothetical `{U}`
   are the same picture. That is not polish — those are two different costs, and the track exists
   to tell them apart.

**Only the second is load-bearing**, and no cap rule affects it.

## The proposal

| | Shipped | Proposed |
|---|---|---|
| Track width | 40px fixed (34px on `card-search-row`) | **110px desktop / 76px phone**, fixed, right-aligned |
| Pip size | **12px desktop, 13px phone meta line** | **11px desktop / 10px phone** |
| Pip spacing | −5px (shingled from the third) | **+3px desktop / +2px phone** |
| Numeral | inside the stack, cropped | **first, then a 4px gap** — and **conditional**: absent when the cost has no generic component |
| Cap | a `cap` prop | **kept** — 5 desktop, 3 phone |
| Overflow | shingle | a mono `+n` in `--fg-faint` — a count, never a pip |

Note the phone pip **shrinks** (13px → 10px). The phone change is not a widening; it trades pip
size for separation.

## The cap — R1.2 was wrong, and the no-cap ruling rested on it

R1.2 argued that five pips is the ceiling "by the rules of the format", so no overflow behaviour
needed specifying. **That confused colour identity with symbols in a cost.** Identity caps at five;
a mana cost repeats colour symbols freely. Progenitus is a legal commander at
`{W}{W}{U}{U}{B}{B}{R}{R}{G}{G}` — ten slots:

```
10 × 11px + 9 × 3px = 137px   (desktop, uncapped — overflows a 110px track)
10 × 10px +  9 × 2px = 118px  (phone, uncapped — overflows a 76px track)
```

`cost-pips.test.tsx:101` already asserts against that exact string, so the repo's own tests cover
the case the previous draft said could not arise. **`cap` cannot be dropped**, and the shingle-free
track is not the same proposal once it needs an overflow rule.

### Capped arithmetic

```
desktop, cap 5:  18 + 4 + (5 × 11) + (4 × 3) + 3 + 14  =  106px  →  110px track
phone,   cap 3:  17 + 4 + (3 × 10) + (2 × 2) + 3 + 13  =   71px  →   76px track
```

(numeral disc + gap + pips + inter-pip gaps + gap + `+n`.) Progenitus renders five pips and `+5`
on desktop, three and `+7` on phone. **The cap is read from the shipped prop, not re-declared by
this document** — if card-rows prefers 4 desktop, the track narrows accordingly and nothing else
in the proposal moves.

## Blast radius — five surfaces, not two

R1.2's table named two. `CostPips` also mounts in three more:

| Surface | Effect |
|---|---|
| `decks/decklist-row.tsx` | Track widens into existing whitespace at both widths. |
| `decks/card-search-row.tsx` | **Desktop slot is 34px, not 40px**, and it is `hidden md:flex` — **there is no phone track to un-shingle**. R1.2's before/after described neither the shipped width nor the shipped breakpoint. Widening 34px → 110px on the row the floor called tightest is the one that needs measuring first. |
| `decks/top-off-list.tsx:138` | A row; same trade as the decklist. |
| `decks/suggestion-tile.tsx` | **A tile, not a row.** |
| `decks/deck-card-tile.tsx` | **A tile, not a row.** |
| `collection/rows-view.tsx` | **Untouched.** Identity pips on a grid, a different affordance; R5's ring rules are not in scope. |

**Two of the five are tiles**, whose width budget is not the deck page's whitespace. Card-rows
should rule with that in front of them.

## Where the width came from, corrected

The type column, on the diff surfaces — but the figure differs per variant: `DiffRowOut` is
`w-[120px]` and `DiffRowIn` / `DiffRowUnnamed` are `w-[150px]`. So R1.2's "net −30px" is right for
the removes column and **understates the adds column by 30px**. Neither figure changes a decision.

## What this handoff needs, either way

**Nothing.** Versioning's rows mount `CostPips` exactly as shipped and inherit whatever it becomes.

## One traced value to settle

The screenshot's black pip reads as a **dusty pink**, where the brand sheet's B is `#5B5566`. The
canvas draws the brand value throughout. If the shipped pink is deliberate, **the brand sheet's
WUBRG table is what needs correcting** — it is supposed to be final.
