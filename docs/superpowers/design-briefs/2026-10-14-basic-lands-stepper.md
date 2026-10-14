# Basic lands +/− on the decklist row

Design brief, 2026-10-14. Asks for a small Design round on one control: a quick way to add or take away basic lands
from a deck's list without searching and pressing Add over and over. It is the first item in the Design queue
(priorities board, "Basic lands +/- on the decklist row"). No rulings are on record beyond the problem statement, so
this brief says what the code does today, what engineering proposes, and what Design owns.

## The problem

Today, changing a deck's basics is one copy per press, each press its own server round trip:

- **Add 5 Islands:** open the Add panel, type `Island`, press Add five times. About 7 actions. The search row stays
  addable after the first add because a basic stacks (`isBasicLand`), and nothing takes a count.
- **Remove 3 Islands:** press ✕ on the Island row three times. The ✕ is disabled while each removal is pending, so
  the third press waits on the second.
- **Swap 4 Plains for 4 Swamps** (the common edit when a mana base is rebalanced): eight presses on two surfaces.

Basics are the only cards a deck holds more than one of, and every deck has them. Staging, read-only, 2026-10-14:
41 of 41 decks hold basics, in 86 rows and 829 copies (every account on staging, the measurement account's copy of Hugh's decks included); the median row is 6 copies, the largest 35. **No basic row
on staging sits at 1 copy** (smallest is 2), so the minus-at-1 state is real but rare.

| Basic | Rows | Copies | Smallest | Largest |
|---|---|---|---|---|
| Mountain | 21 | 220 | 2 | 30 |
| Plains | 19 | 170 | 3 | 30 |
| Island | 19 | 161 | 3 | 35 |
| Forest | 14 | 140 | 3 | 28 |
| Swamp | 11 | 120 | 2 | 34 |
| Wastes | 2 | 18 | 9 | 9 |

No snow basics are held on staging.

## What exists today

All paths are on `main`; line numbers were read on 2026-10-14 and move.

**The list row** (`src/components/decks/decklist-row.tsx`)
- Rows are at least 44px tall on the phone and 34px on desktop (`:67`), 52px with a meta line (`:69`, `:71`).
- The count is a `×N` glyph after the name, drawn only above 1 and only when the draft has not changed it
  (`:196-204`). It is `aria-hidden`: the ✕ label carries the count. When the draft changed the count the row shows
  `1 → 2` instead (`:168-178`).
- The ✕ (`:836-853`) is a 44×44 target on the phone (13px glyph, the padding is the target) and shrinks to the glyph
  on desktop (`md:w-auto md:h-auto`). It calls `removeCardFromDeck` (`src/app/decks/actions.ts:475`), which is
  `removeOneCopy` (`src/lib/decks/remove-card.ts:13`): one copy off, the row deleted only at the last copy.
- Its labels are `Remove {name}` for one copy and `Remove one copy of {name}, {n} in deck` for a stack
  (`src/lib/copy/decks-builder.ts:317-321`). Commander rows have no ✕ (`:825-834`).
- A basic's row draws no shopping meta line (`:219`).

**Card view** (`src/components/decks/deck-card-tile.tsx`)
- `×N` in the caption (`:400-404`), with a copies clause in the tile's label (`:233-237`).
- The ✕ (`:516-533`) is the full tile height, 44px wide on the phone and 32px on desktop, shown on desktop only on
  hover or focus. Same action and labels as the list row.

**What a basic is**
- `isBasicLand(typeLine)` (`src/lib/decks/grouping.ts:149`) tests the type line for `Basic`, so snow basics count.
  It is the one hinge for stacking: the server adds a copy instead of ignoring the add, the search row stays
  addable, and the optimistic list merges the copy into the existing row.
- `BASIC_NAMES` (`src/lib/decks/catalog-basics.ts:7`) lists the six non-snow basics; `loadCatalogBasics()` (`:18`)
  is what the fill's basics step reads.

**How basics are written**
- `addCardToDeck(deckId, oracleId, { relock? })` (`src/app/decks/actions.ts:331`) adds one copy of a basic by
  upsert (`src/lib/decks/add-card.ts:125-130`). No quantity argument.
- `removeCardFromDeck(deckId, oracleId)` takes one copy off. No quantity argument.
- The only writes that move many copies at once are bulk paths: the fill's basics step, which splits basics by
  colour identity (`src/lib/decks/fill.ts:145-159`), `restoreAutoCards` and `undoFillPass`. Improve my mana
  (`src/lib/tuning/mana-help.ts`) can trade a basic for a staple.
- `validateCardForDeck` (`src/lib/decks/add-validation.ts:46-64`) checks legality, colour identity and "is
  commander". There is **no 99-card cap**: going over is a working state.

**Draft, count and Shopping**
- Every add and removal writes the deck's draft (`deck_cards`). Committing is its own step (`commitDeckVersion`,
  `actions.ts:1377`; the review page `src/app/decks/[id]/changes/page.tsx`; the commit sheet). A basic stepper
  writes the draft like any other edit and needs no commit of its own.
- Since #628, basics are rows in the draft diff with their counts (`draft-shape.ts`, `draft-state.ts:304-317`).
- Basics are free and always owned: never on Shopping (`src/lib/decks/shopping.ts:29-33`, `:61`), free in the
  draft's buy list (`draft-diff.ts:85-117`), never checked against other decks or priced (`draft-state.ts:337-356`),
  and their own slice in the money stats (`stats-money.ts:58-59`). **A basic stepper moves no money figure and no
  Shopping count.** It moves only the deck's card count.
- Over the limit, the count reads `/ 99` (98 for a partner pair) with a `+N` figure and
  `{Words} over the ninety-nine. Cut {n} and it is legal.` (`overCopy`, `decks-builder.ts:396-470`). There is no
  under-99 warning, only the progress figure.

**Steppers already shipped**
- `src/components/collection/add-line.tsx:152-172`: − / count / + with a typed count field (`:223`). Buttons 44×44
  on the phone and 28×28 on desktop, labelled `Fewer` and `More` (`collection-edit.ts:250-251`); minus disabled at 1.
- `src/components/decks/got-it-confirm.tsx:391-411`: buttons 44px on the phone and 32px on desktop, count box at
  least 48/44px wide, capped at `MARK_BOUGHT_MAX`.
- Neither is a shared component, and no handoff puts a stepper on a deck row.

## What engineering proposes

These are leans from the code as read on 2026-10-14. The plan confirms or changes each before Design draws against
them.

1. **One new write: set a basic's count.** `setBasicQuantity(deckId, oracleId, n)` writes an absolute count in one
   transaction (the deck row locked first, then the card row, the order every deck write takes), refuses a card that
   is not a basic, and deletes the row at 0. Absolute rather than +1/−1, so a burst of presses collapses to the last
   value and a retry is harmless.
2. **Presses are optimistic and coalesced.** The count moves on every press; the write goes once the presses stop
   (a short settle), carrying the final count. One round trip for "+5", not five. A write in flight does not block a
   further press.
3. **Basics only.** The control appears on rows `isBasicLand` accepts. Every other card stays singleton and keeps its
   ✕. A commander is never a basic in practice; its row keeps no control either way.
4. **The stepper reuses the shipped stepper's metrics** (44px phone targets; 28 or 32px on desktop), rather than a
   third size. Lifting one of the two inline steppers into a shared component is engineering's call in the plan.
5. **Reads need no change.** The draft diff, the count, `overCopy` and Shopping already handle any quantity of a
   basic.

## Constraints

- **Minimum 0.** A count never goes below 0. Whether 0 removes the row or keeps it is Design's call (below); a row
  kept at 0 must not count toward the deck or show in the draft diff as a card.
- **No maximum from the rules.** A deck may hold any number of basics. The ceiling is the deck size: past 99 (98 for
  a pair) the deck reads over, as it does today, and the stepper does not refuse the press. A typed count still
  needs a sane cap (the 99 the deck could hold is the obvious one).
- **Colour identity.** An off-identity basic is illegal (`validateCardForDeck`). A stepper on an existing row never
  meets this; any surface that offers basics the deck does not hold yet (a basics panel) offers only the identity's
  basics, plus Wastes for a colourless identity.
- **Hit targets.** 44×44 on the phone for each of − and +. The phone row already spends 44px on its ✕; the stepper
  replaces it on basic rows rather than sitting beside it.
- **Keyboard.** Each button is a real button, reachable by Tab, with the count's change announced. A typed field, if
  Design picks one, commits on Enter and on blur and restores the old value on Escape.
- **Screen reader.** Each button's label names the card and the result, in the spirit of today's
  `Remove one copy of {name}, {n} in deck`. The count is spoken once per settled change (a polite live region), not
  once per press.
- **Pending and refused.** While the coalesced write is in flight the row shows the new count; if it is refused, the
  count returns to the last saved value and the row says so in the shipped refusal shape,
  `We couldn’t change that. The deck is unchanged.` (verb for `/copy-review` to settle; the shape is
  `We couldn’t <verb> that. The deck is unchanged.`).
- **Card view and list view both get it**, at 390 and at desktop, in the same PR.

## Locked

Nothing beyond the problem statement. No Hugh ruling exists on this item yet.

## Open for Design to call

1. **Which control.** Options to consider:
   - **A stepper on basic rows only:** − count + in place of the ✕ and the `×N`.
   - **Tap the count for an input:** the `×N` becomes a button that opens a small number field (or a popover with
     the field and − / +).
   - **A basics panel:** one surface listing the identity's basics with a count each, reached from the lands group
     header or the Add panel, so a rebalance (4 Plains out, 4 Swamps in) is one place. It is also the only option
     that adds a basic the deck does not hold yet without searching.
   These can combine (a stepper on the row and a panel for the rebalance); say which, and why.
2. **What − at 1 does.** Remove the row (today's ✕ behavior), or hold the row at 0 for the visit so a mis-press is
   one + away. Disable − at 0 either way.
3. **Card view.** A tile has no room for a three-part stepper at 390. Draw where the control lives on a tile: on the
   tile, under it, or the count-as-button route only.
4. **Desktop reveal.** The ✕ shows on hover or focus on desktop. Draw whether the stepper is always visible on basic
   rows or follows the same reveal.
5. **The draft's `1 → 2` change marker.** While a stepper is moving, draw how the changed count reads against the
   committed one.

## States to draw

At 390 and desktop, in list view and Card view:

- **Idle:** a basic row at a typical count (6 Islands).
- **At 0:** if the row is kept at 0 (Open question 2); otherwise the moment of removal.
- **At 1:** what − offers.
- **At the size limit:** the deck at 99, and one press over (`+1`, the over line as shipped).
- **Pending save:** the count moved, the write in flight.
- **Refused save:** the count back at its saved value, with the refusal line.
- **Focus:** each button's focus ring, and the typed field if chosen.

## Fixtures (staging, read-only)

Any deck on staging holds basics. For a large stack, the 35-Island deck; for a rebalance, a two-colour deck with both
basics at 15 or more; for the minus-at-1 state, hand-build it (no staging row is at 1).

## The About entry

**No bump.** This makes an existing edit faster; it adds no capability a reader has to discover, and a reader meets
the control on the row they already edit. If Design adds a basics panel, it is worth one key line on the existing
`deck-page` entry (`src/lib/copy/about.ts`, `id: 'deck-page'`) as an ordinary edit at whatever version comes next.
Hugh decides whether a feature owes an entry and may overrule this.

## Copy

Every string goes through `/copy-review`: the button labels, the screen-reader announcement, the refusal verb and
anything a basics panel says. The working strings above are placeholders.

## Paths

- `src/components/decks/decklist-row.tsx`, `src/components/decks/deck-card-tile.tsx`
- `src/app/decks/actions.ts` (`addCardToDeck`, `removeCardFromDeck`)
- `src/lib/decks/add-card.ts`, `src/lib/decks/remove-card.ts`, `src/lib/decks/add-validation.ts`
- `src/lib/decks/grouping.ts` (`isBasicLand`), `src/lib/decks/catalog-basics.ts`
- `src/lib/decks/draft-state.ts`, `src/lib/decks/shopping.ts`
- `src/lib/copy/decks-builder.ts`
- `src/components/collection/add-line.tsx`, `src/components/decks/got-it-confirm.tsx` (shipped steppers)

## Deliverable

A handoff in `design/design_handoff_the99_basics_stepper/`: the chosen control on a basic row in list view and Card
view at 390 and desktop, every state above, the answer to each open question, and the `STATES` rows and design-table
sections they add.
