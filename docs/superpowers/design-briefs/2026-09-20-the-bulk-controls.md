# The bulk controls — topping off with the concession stated

**Feature:** informed building (sub-project 2 of the deck-analysis suite)
**Spec:** `docs/superpowers/specs/2026-09-20-informed-building-design.md` §2.6
**Surface:** the top-off list on `/decks/[id]` — `src/components/decks/top-off-list.tsx`
**Status:** brief locked, awaiting Design

---

## 1. What changed underneath, and why the control has to move

Build now fills the **whole 99** rather than 68, against a composition measured per commander
rather than a flat target. That is shipping in PRs 1 through 7 and needs nothing from Design.

What it does to this surface: a freshly built deck usually has **no open slots**, so the top-off
list is not drawn at all. The list now appears when a deck is genuinely short — a thin
collection, a narrow colour identity, or a deck the player has cut cards out of. That is a
change of *occasion*, not of layout.

## 2. The failure this fixes

Reported by Hugh, 2026-09-20, in his own words:

> I was testing it and was short on creatures. What I could sleeve was non-Creature cards and
> would have left me with too few.

The single bulk control reads `Tick the N I can sleeve`. It narrows the pool to cards owned with
a free copy — correct — and then takes the **top N by synergy** within that. So it optimises
*what can I sleeve* rather than *what does this deck need*, and on that press it filled the
remaining slots with cards the deck was already over on, leaving no slots to fix the shortage.

The cause is a category error the suite has a ruling about: **constraints are filters on the
candidate pool, never the thing being optimised.**

## 3. The decision, locked

Hugh chose **two bulk actions, each labelled with its concession**, on 2026-09-20. Both run the
real fill over the open slots and differ **only in the pool**:

```
[ Fill from my collection — 12 cards ]   2 creatures short of the skeleton
[ Fill with the best — 12 cards      ]   4 to buy · $18.40
```

**Both figures are visible before either is pressed.** That is the whole point of the pair and
is the part that must survive: the player is choosing between two concessions, and a control
that reveals its cost only after the press has not offered a choice.

His reasoning, recorded because it overruled an earlier draft of this brief:

> As a deck builder, I want a full deck. If my collection doesn't meet the needs, I should know
> the concessions I'll have to make: either I pick cards from my collection that may not be
> recommended, or I buy the ones that are. This is helpful information.

An earlier draft had the collection-only action stop short and report the gap. That was
rejected: leaving a player at 93 cards when they asked for a deck is not a deck builder's
answer.

## 4. What already ships, and must not be redrawn

| already built | where |
|---|---|
| No facet filter — every candidate row is already shown | `top-off-list.tsx` |
| `BuyTag` and a price on every unowned row | `buy-tag.tsx` |
| `buyCount` and `buyMoney` for the ticked set | `top-off-list.tsx` |
| The fill **already buys** — unowned staples, returning `bought` | `planFill` |
| Per-pass undo, labelled, with `Undo these {n}` | `provenance-line.tsx`, `pass-mark.tsx` |

Lands are the only thing the fill never buys.

So the money half of the right-hand label is machinery that exists. What is new is a **second
control** and the two concession lines.

## 5. Open for Design to call

1. **The two labels.** Their wording is Design's, not eng's. The examples in §3 are placeholders
   showing the shape and the figures available, not proposed copy.
2. **The zero and unavailable states.** What the collection-only label says when it compromises
   nothing (it can close every gap), and what the buy label says when prices are missing — the
   price read is allowed to degrade and the row draws the absent case today.
3. **The phone layout.** Two controls now want a row that the quick-add dock already occupies at
   390px. `probe:last-slots` measures that bar's geometry and will need updating to match
   whatever lands.
4. **Whether the pair is two buttons at all.** A segmented control, a primary with a secondary,
   or a single button with a disclosed alternative are all open. The locked part is that both
   concessions are legible before the press.

## 6. What is NOT in this brief

- **The clear control.** An earlier revision asked Design to draw a three-way layered clear.
  That was deleted: the app already separates the fill by pass and already draws a per-pass
  undo, so the fill records its residual as its own pass and the shipped control does the rest.
- **The analysis tab.** Rounds 0 through 3 own it. Nothing here takes real estate there.
- **The Add panel.** Its within-shelf ordering changes, but no ink moves.
- **About entries.** Hugh ruled 2026-09-20 that entries for this whole sub-project are deferred
  to a follow-up once everything has shipped.

## 7. Acceptance

`probe:last-slots` already walks this list at 1300x900 and 390x844 and asserts the pinned
commit bar's geometry on the phone. It will need extending for whatever the pair becomes, and
the concession figures need reading **before** the press rather than after — a check that only
asserts post-press state would pass a build that reveals the cost too late.
