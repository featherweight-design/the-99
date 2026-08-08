# Journey lifecycle — Add panel addendum (#182)

Gate 5 for the addendum run. One journey is new here: removing a card from the decklist and
putting it back (#179 + #185). Everything else in the addendum is placement or affordance
work on journeys already walked in `journey-lifecycle-add-panel.md`.

**Where this was run.** Through `BuilderShell` in the component suite
(`src/components/decks/decklist-row.test.tsx`), not a browser. That is the seam the journey
actually lives at: the undo receipt is decklist state, and every failure mode below is a
state-lifetime bug that a browser would show no more clearly than the tree does. The
viewport half — the 44px ✕ target, the phone undo control's height — is geometry, asserted
against the design table and re-checked in the run's cold-eyes browser capture.

## Journey E — remove a card, then undo

| Pass | Result | Evidence |
|---|---|---|
| Forward | ✅ | The last copy's row is replaced in place by the receipt; deck, group and tab counts all decrement in the same frame as the click. |
| Reverse | ✅ | `Undo` re-adds through the same `addCardToDeck` the suggestion tile calls; the row returns and the counts come back. A refused undo states itself in the row and withdraws the control rather than leaving a dead button. |
| Repeat | ❌ → ✅ | **Found a shipping bug.** See below. |
| Resume | ✅ | The receipt survives a tab switch to Consider and back, because it is decklist state rather than row state. It also survives the deck reaching zero cards — the empty state is suppressed while a slot is spent, which is the removal hardest to recover from. |

### The repeat-pass bug

Remove a card → undo → remove the same card again. The second removal drew no receipt, and
the row it should have replaced was gone for good.

The row read its own mutation state (`applied` from `useDeckMutation`) as a second trigger
for the receipt, alongside the decklist's spent slot. That state never returns to false, and
React reuses the row instance under `key={card.oracleId}`, so after an undo the row was
permanently keyed to a removal that had been taken back — drawing the receipt over a card
that was in the deck, then hiding the row outright.

This is the exact shape Gate 5 exists for: correct on every forward pass, correct in
reverse, and wrong only on the third move. Four of the file's other tests exercised this
journey and none of them could see it.

Fixed by deleting the row-level trigger. The decklist's optimistic removal already takes the
row out, and its spent slot already draws the receipt, so the row's own copy was both
redundant and the longer-lived of the two.

## Harness note

Holding a mutation mid-flight is how several of these tests observe an optimistic override,
and an override left unsettled outlives its test — React keeps it alive across the unmount
and the next tree inherits a card list it never asked for. That made the repeat pass fail or
pass depending on which tests ran before it. The suite now settles every outstanding
deferred in `afterEach`. Worth carrying into any future test that holds a server action
open.
