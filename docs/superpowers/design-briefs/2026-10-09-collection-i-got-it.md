# "I got it" on Shopping, sub-project 4

Design brief, 2026-10-09, for the collection home epic
(`docs/superpowers/plans/2026-10-06-collection-home-roadmap.md`). Engineering and Design.

This is its own Design round (roadmap ruling 12), drawn after the sub-project 1+2 handoff
(`design/design_handoff_the99_collection_edit/`, merged in #1308) and small by design: one new
control on a Shopping row, and a small confirm step. Sub-project 3, deck-specific printings,
has its own brief (`docs/superpowers/design-briefs/2026-10-09-collection-deck-printings.md`) and
is out of scope here.

## What this is

A player buys a card the deck's Shopping list asked for. They press **I got it** on that row,
confirm which printing, finish and quantity they received, and the card joins their collection.
Nothing else changes by hand: the deck's usual buy marks follow from the collection, the way they
do after any other collection change.

## Rulings carried, not reopened

- **Ruling 4.** "I got it" asks printing, foil and quantity at mark time, preset to the price the
  row already shows.
- **Ruling 11 (Hugh, 2026-10-08).** Sub-project 4 is decoupled from deck printings. It defaults
  to the printing behind the Shopping price, and ships right after sub-project 2. When
  sub-project 3 lands, a deck's chosen printing becomes the better default. That is an
  improvement to this control, never a prerequisite for it.
- **Ruling 12.** This round is separate from 1+2 and from 3.
- **Ruling 9.** Behind its own switch, `SHOPPING_MARK_BOUGHT_ENABLED`. No paid model calls.
  About entries are batched at the end of the launch, so this brief asks for none.

## What exists today

- **The Shopping row.** `src/components/decks/decklist.tsx` draws the Shopping filter and
  composes each row from `DecklistRow` (`src/components/decks/decklist-row.tsx`), which takes
  `inShopping`. A Shopping row has its own shell, `ROW_SHELL_SHOPPING`, with a minimum height of
  52px on phone and 34px from `lg`. It carries the buy tag (`src/components/decks/buy-tag.tsx`),
  the EDHREC figure line, and, when the deck's swap tools are on, an `over $X` ring and the door
  to stand-ins. A commander can be a Shopping row too (`commanderShoppingRows` in
  `src/lib/decks/shopping.ts`), at one copy.
- **Who is on the list.** `isShoppingCard` (`src/lib/decks/shopping.ts`) puts a card on Shopping
  when the player owns none of it, or owns copies that committed decks already claim ("spoken
  for"). Basics and proxied cards are never on it. The same predicate drives the price strip's
  total and the Mana Pool basket link, so a change to the list changes both.
- **The price on the row.** `loadPrices` (`src/lib/decks/price-query.ts`) picks one printing per
  card: in stock, real non-foil stock before foil-only, then cheapest. The row shows that
  printing's figure, or `sold out`, or a bare `buy` when the card has never been stocked. The
  price fact carries the amounts and a date and does not carry which printing it came from. The
  brief needs that printing, and engineering has to expose it. It changes nothing Design draws.
- **The shop link.** The Mana Pool link carries card names and quantities only
  (`src/lib/manapool/links.ts`). Nothing about a printing reaches the shop, which is why the
  player tells the app afterwards what actually arrived.
- **No control exists** to mark a Shopping row bought.

## What pressing it writes

The write goes through the one collection write path
(`docs/superpowers/plans/2026-10-09-collection-write-path.md`, `applyCollectionChange` in
`src/lib/collection/write.ts`). "I got it" is an **edit** that raises one holding, with the
source `shopping:<deck id>`.

- **One press writes one holding:** the card, the printing, the finish, and the quantity. Same
  shape as an upload row or a hand-added card (ruling 3).
- **If the player already holds that exact printing and finish,** the quantity is added to it.
  Otherwise it becomes a new holding. Both read as "added".
- **One press is one history entry,** tagged as coming from Shopping. The sub-project 1+2 handoff
  already drew that tag, ghosted for later (`From Shopping` in its history list). This round
  makes it real.
- **It does not touch the deck,** the player's art preference for the card, or any other deck.
  The collection is the only thing that changes.
- **Condition is not asked.** A new holding has no condition, as any hand-added card. A holding
  the player already had keeps the condition it has: raising its count never erases it.
- **The write sets the new count, so it says what the player saw.** An `edit` sets a holding's
  count rather than adding to it (`planEdit` in `src/lib/collection/write.ts`). "I got it"
  therefore always sends the count on screen as the one it expects (`staleEdits`), and the
  stale outcome is a required state, not an option. Without it, a second tab that raised the same
  holding after the confirm opened would be overwritten and a purchased copy lost.

## The printing it records

- **Preset:** the printing behind the price on the row. Non-foil when the printing has a non-foil
  price. Otherwise foil when it has a foil price, otherwise etched, the same order the row's own
  price figure uses (`priceOf` in `src/lib/decks/price.ts`).
- **No printing behind the price** (a card never stocked, or a row showing a bare `buy`): the
  preset is the card's default printing, the same one the Add cards sheet presets.
- **Changeable.** The player may have received a different printing than the cheapest one. The
  change goes through the existing printing picker, `PrintingRegion`
  (`src/components/cards/printing-region.tsx`), as the Add cards sheet does, not a second picker.
  The 1+2 handoff gives that component a "choose" role that writes no art preference and withholds
  the "shown now" badge. This control uses it as drawn there.
- **It is the player's word.** The app does not know what the shop shipped. The confirm shows the
  preset as a starting point, never as a claim.

## Quantity

- **Preset:** what the row still needs. A Shopping row that is there because the card is unowned
  needs the deck's ask. A spoken-for row needs the shortfall.
- **Above 1** is a normal case (a card the deck asks several of, or a player buying a spare).
  One press writes one holding with that quantity, and one history entry.
- **Fewer than needed:** the row stays, now needing the remainder.
- **More than needed:** allowed. The extra copies are simply owned.
- **Upper bound and the stepper's feel** are Design's call.

## The receipt, and undo

- **A receipt confirms the write** and says what was added, to which printing and finish, with a
  way to see the entry in History. Where it appears (on the row, a toast, the confirm itself) is
  Design's call, as long as it survives the row moving (see below) and is announced to screen
  readers.
- **Undo is a revert of that history entry.** It is the same Undo the 1+2 handoff draws for a
  removed row. Undoing it lowers the collection, so it goes through the short-deck warning
  (§E of the 1+2 handoff) exactly like any other lowering: the copy just added may be the one a
  committed deck now counts on. The warning is the same component with the verb of the source.
- **History is the long-lived record.** The receipt may go away. The entry stays for the 90 days
  every entry stays.
- **A double press applies once.** The write is idempotent per press, so a second tap on a slow
  connection does not add two. Design draws the pending state so the second tap feels unnecessary.

## What happens to the row and the deck's buy marks

The collection changed, so the claim model re-reads. Nothing marks a deck by hand.

- **Usually the row leaves Shopping,** the deck's buy mark clears for that card, the price
  strip's total drops, and the Mana Pool basket link loses the card, because all three read the
  same list.
- **Not always.** Copies go to decks by seniority. If a more senior committed deck is also short
  of the card, the new copy can be claimed by that deck, and this deck's row stays on Shopping,
  now as spoken for. The receipt must not tell the player the deck is done when it is not.
  Design draws this outcome beside the clean one.
- **Partial** (fewer than needed): the row stays with a smaller need.
- **The row must not jump under the reader's finger.** Leaving the list follows the same rule as
  a removed Collection row in the 1+2 handoff (§D): a same-size placeholder, no reflow.
- **The price strip and other decks** that list the same card update with the next read, the way
  they do after any collection change. Nothing here needs a special case.

## The surfaces

Each ships at phone and desktop width in the same PR.

### A. The control on the row

**Where:** every Shopping row on the deck page, including a commander's. It must fit
`ROW_SHELL_SHOPPING` without raising the row, beside the buy tag, the figure line, the `over $X`
ring and the door to stand-ins, which can all be present on one row.

**States to draw:** at rest on a plain row; on a row with every neighbor present; on a spoken-for
row; on a commander row; on a row whose price reads `sold out` or a bare `buy` (the control does
not depend on a price); focus and press; pending; disabled while a write is in flight.

### B. The confirm step

**What it asks:** printing, finish, quantity, each preset (see above), and a primary action to
confirm. Whether it is a popover, a small sheet, or an inline expansion is Design's call, as is
whether the phone and desktop share one form.

**States to draw:** the preset state; a changed printing; foil-only card; a card with one printing
only; quantity above 1; quantity above what is needed; a preset with no printing behind the
price; a write that comes back **stale** (the holding's count changed in another tab, so the
confirm redraws with the current count and the quantity re-based on it, and the player confirms
again); a failed write (nothing
changes, the row stays); cancel (nothing changes).

### C. The receipt and undo

**States to draw:** the receipt after a clean removal of the row; after a result that leaves the
row on the list (spoken for, or partial); undo in flight; undo that raises the short-deck warning;
undo that completes; undo that fails.

### D. The history entry

The tag the 1+2 handoff drew ghosted becomes live. One line per press. Whether the entry names
the deck it came from (the source carries the deck's id) is Design's call, along with what it
reads when that deck has since been deleted.

### E. Switch off

With `SHOPPING_MARK_BOUGHT_ENABLED` off, no control renders and the Shopping row is exactly
`main`'s. The control also needs `COLLECTION_EDIT_ENABLED` on, since it writes through that path
and shows up in its History. With either off, reserve no slot for it. Nothing for Design to draw
beyond confirming the row is unchanged.

## Locked

- The control lives on the existing Shopping row. No new page, tab or list.
- One press, one row, one holding, one history entry. No "mark all bought".
- It writes to the collection only, through `applyCollectionChange`, as an `edit` with source
  `shopping:<deck id>`.
- Printing, finish and quantity are asked, and all three are preset. Condition is not asked.
- The preset printing is the one behind the Shopping price, with the Add cards default as the
  fallback. It does not wait for deck-specific printings.
- Printing choice uses the existing `PrintingRegion`, not a second picker.
- Undo is a revert and passes through the short-deck warning.
- The row and the buy marks follow the claim model. The control never sets them.
- The write always sends the count the player saw, and a stale answer is drawn.
- Phone and desktop in the same PR. No new tokens, no new dependencies.
- Copy in this brief describes intent only. Strings go through `/copy-review`.

## Open for Design to call

1. Where the control sits on the row at phone and at `lg`, given the buy tag, the figure line,
   the `over $X` ring and the stand-in door, and how it reads as one action rather than a second
   buy tag.
2. The form of the confirm step (popover, sheet or inline) and whether phone and desktop differ.
3. How the printing is shown and changed inside the confirm, using `PrintingRegion` in its
   choose role, and how the preset reads as a suggestion rather than a fact.
4. Quantity: stepper or field, its upper bound, and how "more than the row needs" reads.
5. The receipt: where it lives, how long it lasts, how it survives the row leaving, and what it
   says when the row stays because a senior deck claimed the copy.
6. How Undo and its short-deck warning present from the receipt.
7. The History entry for this kind: whether it names the deck, and its deleted-deck form.
8. The row's transition when it leaves Shopping, without reflow.
