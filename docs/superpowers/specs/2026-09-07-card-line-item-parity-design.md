# Card line item parity — design brief

## The problem

A card line item — one row standing for one Magic card in a list — is built seven times
in this app, and the seven do not agree about what a reader is told. Some of that
disagreement is purposeful: a decklist row is read while shopping, a collection row while
browsing, and they are right to lead with different things. Some of it is drift nobody
chose. Eng cannot tell the two apart from the code, which is why this is a design brief
rather than a refactor ticket.

The question this brief asks Design to answer: **which differences between card rows are
load-bearing, and which are accidents to be removed?**

## What a reader sees today

Verified against the current build, 2026-09-07.

| Row | Name | Qty | Mana pips | Type line | Set / rarity | Availability | Price | Ownership dot |
|---|---|---|---|---|---|---|---|---|
| `collection/rows-view.tsx` | yes | yes | yes | yes | yes | yes | — | — |
| `decks/decklist-row.tsx` | yes | yes | — | — | — | yes | yes | yes |
| `decks/card-search-row.tsx` | yes | — | — | yes | — | yes | — | — |
| `decks/unresolved-row.tsx` | yes | yes | — | — | — | — | — | — |
| `decks/update-diff-row.tsx` | yes | — | — | yes | — | — | yes | yes |
| `commanders/synergy-row.tsx` | yes | — | — | yes | — | — | — | yes |

Two things stand out without needing a design opinion:

- **Mana cost appears in exactly one row.** The collection browse row draws pips
  (`rows-view.tsx:5`); no other card row does, including the add-panel search row where a
  reader is choosing between candidate cards.
- **The ownership dot is drawn by two different components.** `decklist-row.tsx:12`
  imports the shared `ui/ownership-dot.tsx`; `synergy-row.tsx:33` defines a private one.
  They disagree: the shared dot draws an unowned card as a **dashed** hollow circle, the
  private one as a **solid** hollow circle, and the private one adds a third colour for
  committed cards (`--avail-hard-fg`) that the shared dot has no concept of.

## What eng has already settled, and is not asking about

- **Click behaviour is being unified separately and needs no design call.** Three rows
  currently give a reader no way to open the card modal at all
  (`card-search-row.tsx` has no click handler; `update-diff-row.tsx` and
  `unresolved-row.tsx` bind their only button to a disclosure). Every card name will open
  the modal through the one existing mechanism. That is a defect fix against existing
  behaviour, not a new design.
- **The card modal itself is being made identical across surfaces**, including its
  availability section, per `docs/superpowers/design-tables/card-availability.md` row 1.5.

## Open for Design to call

1. **Is there a core set of elements every card row must carry?** Name and availability
   are the obvious candidates. If so, which rows are currently missing them, and does the
   floor apply to the narrow utility rows (`unresolved`, `update-diff`) or only to the
   browsing rows?

2. **Should mana pips generalise, or stay a collection-browse affordance?** They cost
   horizontal room, which is scarcest on the surfaces that lack them.

3. **Which ownership dot is correct?** Dashed or solid for unowned, and does the
   committed-card third colour belong in the shared component — i.e. is it a state every
   surface should show, or a synergy-specific reading?

4. **Density.** The rows do not share a height or radius (44px/34px at radius 6, 7 and 8
   across the set). If a shared row shell is the answer, Design should say what the
   canonical metrics are rather than eng picking the most common value.

## Not in scope

Commander rows (`commanders/discovery-row.tsx`) — those stand for a commander, not a
card, and correctly navigate to a commander page instead of opening a card modal.
