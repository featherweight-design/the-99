# Where an added copy goes

Design brief, 2026-10-11. Asks for a small Design round on one line and one new choice. When a copy of a card a deck
needs reaches the collection, the app says which deck it went to and lets the player send it elsewhere, or keep it
free. The rules are already correct; what is missing is any sign of them at the moment they act. Hugh scoped it on
2026-10-11 and ranked it after Tokens and Precons, so this is a brief only. This brief says what Hugh closed, what the
code does today, what engineering proposes, and what Design owns.

## Rulings 2026-10-11 (Hugh, closed)

Source: the priorities board, "WHERE AN ADDED COPY GOES". Not reopened here.

1. **The trigger.** Hugh added a Sol Ring and it silently went to a deck by seniority. Later, removing it warned
   `pulled from HD - Thorin` with no earlier sign that Thorin held it. The rules were right; the visibility was not.
2. **Say where it goes.** When an added copy is one a deck needs, the surface says so, in the form
   `Sol Ring goes to HD - Thorin, which needs one · Change`. Three places: **Add Cards**, **I got it**, and the
   **upload summary**.
3. **Change opens the deck chooser.** Every deck that needs the card, brews included (as built in #1442).
4. **A new choice, `Keep it free`.** A copy that no deck counts. Decks that need the card still show it missing and
   it stays on Shopping. This one is a claim-model change, about the size of #1442.

## What exists today

All paths are on `main`; line numbers were read on 2026-10-11 and move.

**The claim model: who holds a copy**
- `src/lib/decks/allocate.ts:20` `allocate(owned, claimants)`: reservations first (`granted`), then what is left
  down the seniority queue in `(since, deckId)` order. A brew sits behind every committed deck and reads what the
  queue leaves **without taking it** (`:30-35`), so two brews both read the same spare copy as theirs.
  `allocateClaims` (`:52`) is the pair every caller wants: it sorts brews last and calls `allocate`.
- `src/lib/decks/availability-query.ts:233` `owned` (basic lands excluded), `:283` `reservation_wants` and `:307`
  `reservations`: a reservation is capped at the deck's list ask and again at the supply still unallocated when its
  turn comes. This SQL is where supply is netted against reservations; `owned` itself leaves it unreduced (`:590-591`).
- `src/lib/decks/availability.ts:125` `holdsCopy`: a claim holds a copy when its deck is committed, or when it is a
  brew the player gave one to.
- `src/db/schema.ts:1017` `card_assignments (user_id, oracle_id, deck_id, copies, created_at)`, primary key on the
  first three. `deck_id` is `not null` and references `decks` with cascade, so **a copy kept free cannot be a row
  here as the table stands**.

**Giving a copy to a deck**
- `src/lib/decks/assign.ts:55` `assignCopyFor(userId, oracleId, deckId)`: one toggle. Serialised per card by an
  advisory lock (`:74`), then the deck row is locked. It refuses `target-is-commander` (`:128`), `no-supply-left`
  (`:184`, `:208`) or `claimant-no-longer-asks`. **One authored reservation per card, whatever the supply**
  (`:195`): a second pick moves the first rather than adding to it. The write is `:216`.
- `src/app/decks/assignment-actions.ts:28` `assignCopy` is the request-facing half; it revalidates every claimant's
  page and the import receipt (`revalidateClaims`) and returns the redrawn `ContestedCard`.
- `src/lib/decks/prune-assignments.ts:37` `pruneOrphanAssignments`: a reservation dies when its deck stops claiming
  the card (a commit without it, a list edit on a brew, a proxy). Called from `versions.ts:273`,
  `prune-proxies.ts:88` and `app/decks/actions.ts:710`.

**The chooser, today**
- `src/components/decks/contested-card-row.tsx:133` `ContestedCardRow`, with the `radiogroup` at `:403` (one
  checked option means "you chose this deck"; `aria-checked` is the whole authorship model) and the `assignCopy`
  call at `:224`. Its one door in the app is the upload summary, `src/components/collection/arrivals-summary.tsx:275`.
- `src/lib/collection/summary-read.ts:49` `ContestedCard` (`owned`, `ownedBefore`, `arrived`, `claimants[]`) and
  `:146` `loadContestedCard`. A card appears only when it passes `isContested` (`:86`): demand above supply and at
  least two claimants holding a copy. **A card that one deck needs, and that an add covers, is not contested and
  gets no row today.**

**The three places a copy arrives**
- **Add Cards:** `src/app/collection/edit-actions.ts:102` `addToCollection`, drawn by
  `src/components/collection/add-cards-sheet.tsx`. Its saved state (`:92`, set at `:257`) holds `copies`, `cards`
  and `entryId` only. It says how many copies were added, never where one went.
- **I got it:** `src/app/decks/mark-bought-actions.ts:47` `markBought` writes the same collection change, with the
  deck the player bought for as its `source`. `src/lib/decks/mark-bought.ts:23` `receiptFacts` already diffs the
  allocation before and after and returns `tookCopy`: the other decks a bought copy went to instead. It
  deliberately never names a brew by its soft share (`:30-32`), because naming it would say a copy went to several
  decks at once. This is the precedent for the new line, and the first thing to reuse.
- **The upload summary:** the contested rows above. They name the claimants and let the player pick.

**The removal warning**
- `src/lib/collection/write.ts:366` `committedShortfalls` and `:398` `newlyShort` give the pre-save warning
  (`wouldShort`, `:186`) naming the committed decks a lowering would leave short.
- `pulled from {deck}` is a different act (a card pulled out of a deck's list), at
  `src/lib/copy/deck-versioning.ts:225` and `src/components/decks/update-diff-row.tsx:582`. Hugh's quote joined the
  two; Design should know they are different mechanisms with the same words.

## What engineering proposes

These are the claim-model owner's leans, written from the code as read on 2026-10-11. The plan confirms or changes
each before Design draws against it.

1. **The line is a before/after diff, never a stored fact.** The deck an added copy goes to is what
   `allocateClaims` returns after the change minus what it returned before. `allocateClaims` takes only
   `{ owned, claims }`, so the before state is the same claims at the old `owned`. `receiptFacts` is that diff
   already; the three surfaces share one helper rather than three versions of the sentence.
2. **The line names committed decks that newly hold a copy, and brews only by what they were given** (`granted`),
   as `receiptFacts` does. Reason in the open question below.
3. **Change reuses `assignCopyFor` and the radiogroup chooser unchanged.** It is not a new write path. #1442 already
   let a brew take a copy. Any deck that needs the card is offered; a deck that does not claim it is not.
4. **`Keep it free` is a supply subtraction, not a reservation to a deck.** `card_assignments` cannot hold a row with
   no deck (see above), and a sentinel deck id would cascade, join and prune wrongly. Engineering's lean is one new
   table keyed `(user_id, oracle_id)` with a count of copies held back. It must NOT be subtracted from `owned`:
   the query deliberately returns true `owned` unreduced (`availability-query.ts:590-591`, the `owned <= 0`
   guard's input), and a kept-free copy has to keep reading as owned (lock 6). The model needs a separate
   **allocatable supply** (owned less copies kept free), fed to `allocate`/`allocateClaims` (today they take
   `{ owned, claims }`, so the contract is extended), to `free`, and to `assignCopyFor`'s supply count
   (`assign.ts:150-182`), while display keeps reading `owned`. Whether that is the right shape is an open
   engineering question, not Design's.
5. **Every reader of "how many copies are spoken for" is in scope for `Keep it free`.** At least the claim SQL,
   `assignCopyFor`, `committedShortfalls` and the removal warning, Shopping rows (`shopping.ts`), the roll-up
   (`shopping-rollup.ts`) and so the cart, `receiptFacts`, and `pruneOrphanAssignments`. The plan must list them by
   grep; `fill.ts`, `proxies.ts` and `printings.ts` also read `collection_items` and need checking.
6. **A copy kept free is not a deck's.** A deck that needs the card still reads it missing, with the copy shown
   as owned but set aside. No verdict word and no warning color.
7. **The edge to guard:** a free count above what the collection holds. A removal that lowers `owned` below
   `held back` must lower the free count first and say so, or the claim arithmetic goes negative.

## What Design owns

- **The line:** its wording, weight and place on each of the three surfaces, at 900 and 390. It must stay one line
  where it can and say `Change` as an action, not a link to a page.
- **What it says when there is no single answer:** two or more decks newly covered, a copy that covered nothing
  (every asking deck was already held), a copy that went to a deck the player chose earlier, and a copy that went
  to a brew only (see Open question 1).
- **Change:** how the chooser opens from each of the three surfaces (inline, sheet, popover), what it lists, and the
  state where only one deck needs the card.
- **`Keep it free`:** where it sits in the chooser, how a card with a copy set aside reads on the deck, on Shopping
  and in the summary, and how the player takes the copy back.
- **Copy.** Every string goes through `/copy-review`. The working strings above are Hugh's, not final.
- **The About entry:** below.

## Open questions

1. **A spare copy and several brews.** Hugh's Sol Ring (staging, below) has 17 owned, 17 committed decks each asking
   for one, and three brews also asking. The 18th copy is read as covering **all three brews at once**, because a
   brew's claim is soft and takes nothing from another brew. So "goes to HD -Thorin" is not a fact the model can
   produce for three brews on one spare; it would have to be a rule (the oldest brew? none named?). Engineering
   leans to naming nothing for a soft share and saying the copy covers the brews that ask, with `Change` offering
   each. Design: draw that, and the case where exactly one brew needs the card.
2. **Does `Keep it free` apply to one copy or to all?** A player who owns four and keeps one free is a count, not a
   switch. The draft assumes a count of copies, a single control per card.
3. **Does a free copy survive a re-upload?** A replace can lower and raise `owned`. Engineering lean: the count
   persists and is capped by what is owned; Design decides what the player sees when it is capped.
4. **Does `Keep it free` show on the deck that needed the card?** Engineering lean: yes, as owned but set aside,
   because otherwise the deck reads the same as one that simply does not own it.
5. **On I got it, is the line redundant with `tookCopy`?** The receipt already says another deck took the copy.
   Design: one sentence or two, and whether `Change` belongs on the receipt at all given Undo.

## Fixtures (staging, read-only, figures as of 2026-10-11)

Account `user_3GkZrrTwOJBdqUpq6GambP0BC8w`. Read with `neon.branch_id` of staging; nothing was written.

- **Sol Ring:** 17 owned. Needed by 20 decks: 17 committed (each asks for 1) and 3 brews (`HD - Kratos`,
  `HD - Gishath`, `HD -Thorin`; the last is spelled without a space on staging). No `card_assignments` row on any.
  So the committed decks hold all 17 and the three brews are short, which is the state the cart brief calls the
  owned-but-held case.
- **To draw the adding case:** the 18th Sol Ring would cover all three brews at once (Open question 1). Draw the
  hand-built case where exactly one deck is short, and the case where the added copy is not needed by anyone.
- Hugh's demo (a Sol Ring going to `HD - Thorin`) is not the state staging holds today: no reservation exists and
  three brews are short. Do not draw it as a fixture of today; draw from the states above.

## The About entry owed

A new capability (`Keep it free`) and a changed surface, so an entry is owed in the same round. It batches with the
All-decks cart line's entries at the end of that launch, per the rule that a multi-round line bumps `ABOUT_VERSION`
once. The plan names it as a task. Design draws it on the per-entry artboard in
`design/design_handoff_the99_about/`.

## Paths

- `src/lib/decks/allocate.ts`, `src/lib/decks/assign.ts`, `src/lib/decks/prune-assignments.ts`
- `src/lib/decks/availability.ts`, `src/lib/decks/availability-query.ts`
- `src/lib/decks/mark-bought.ts`, `src/app/decks/mark-bought-actions.ts`, `src/app/decks/assignment-actions.ts`
- `src/lib/collection/summary-read.ts`, `src/lib/collection/write.ts`, `src/app/collection/edit-actions.ts`
- `src/components/decks/contested-card-row.tsx`, `src/components/collection/arrivals-summary.tsx`,
  `src/components/collection/add-cards-sheet.tsx`
- `src/db/schema.ts` (`card_assignments`)

## Deliverable

A handoff in `design/design_handoff_the99_added_copy/`: the line on Add Cards, I got it and the upload summary at 900
and 390, in each state in "What Design owns"; Change opening the chooser from each; `Keep it free` in the chooser, on
a deck, on Shopping and in the summary; the `STATES` rows and design-table sections they add; and the About entry on
the per-entry artboard.
