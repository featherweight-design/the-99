# Basic lands stepper — build plan

2026-10-14. Brief: `docs/superpowers/design-briefs/2026-10-14-basic-lands-stepper.md`. Handoff:
`design/design_handoff_the99_basic_lands_stepper/` (R2, approved by Hugh 2026-10-14; readiness audit GREEN, same
folder's `READINESS.md`, whose six engineering resolutions d9 approved as Hugh's proxy). Build from
`design-tables/basic-lands-stepper.md` and README §R2 changes; README's R1 component notes and `STATES` S6's box
border are superseded.

## Goal

On a basic land row (`isBasicLand`), in list view and Card view, at 390 and desktop: `− count +` replaces the ✕ and
the `×N`. Every press moves the count at once; one save per settle writes the final figure.

## Two PRs, not stacked

The second opens after the first merges.

### PR 1 — the write (server only, about 6 files, ~300 lines)

- `src/lib/decks/set-basic-quantity.ts`: `setBasicQuantityFor(userId, deckId, oracleId, n)`.
  - Refuses a non-integer, a negative or a figure above `BASIC_QUANTITY_MAX` (999, a sanity bound, not a deck
    rule), and a card that is not a basic (`isBasicLand` on the catalog's type line). These are returned refusals
    (`{ ok: false, reason }`), written before any write.
  - One transaction, taking locks in the order every deck write takes them: the deck row `for update`, then the
    card row.
  - `n > 0`: upsert the row at `n` and clear `auto` (a deliberate count is a claim, as the keep control is;
    readiness item 4).
  - `n = 0`: delete the row, prune its proxy and leave its lock dormant, exactly as `removeOneCopy`'s last copy does. A typed
    0 is the only way here; the ✕ at 1 stays on `removeCardFromDeck` so #185's receipt and Undo hold.
  - `touchDeck` only when a row actually changed (the same rule `removeOneCopy` keeps: no stamp for a write that did
    not happen). An unchanged figure is a no-op returning ok.
- `src/app/decks/actions.ts`: `setBasicQuantity(deckId, oracleId, n)`. `requireUserId`, `requireDeck`, the write,
  then `revalidateClaims(deckId, userId)` as remove does. A basic moves no claim, but the deck page, its changes
  page and the list caches are what revalidate there.
- Tests: the pure refusal rules; the action's ownership and refusal paths with the db mocked as siblings do;
  `.toSQL()` where a statement needs it.
- `pnpm probe:basic-quantity` on a scratch branch: set 6 → 9 → 3, `auto` cleared, typed 0 removes the row and its
  proxy and lock, a non-basic refused with nothing written, a second account's deck refused. `docs/probes.md` row.

### PR 2 — the control (about 12 files, ~700 lines)

- `src/components/ui/count-stepper.tsx`: one control, two layouts (`row`, `band`), lifted from
  `collection/add-line.tsx:152-172`. It draws − / field / + and nothing else; the caller owns the count, the labels
  and what − does at 1. `add-line.tsx` moves onto it only if its metrics match exactly; otherwise it stays as is
  and the plan says so in the PR body.
- `src/components/decks/use-basic-count.ts`: the settle. Presses set an optimistic count at once (a new
  `setQuantity` action in `optimistic-deck.tsx`, absolute, so the header, the tab counts and the group heading move
  with the row); a timer (`SETTLE_MS`, 600) restarts on every press; on settle one `setBasicQuantity` carries the
  figure. A press while a write is out restarts the settle, and the next write carries the newer figure.
  - **Returned refusal**: the count returns to the last saved figure and the row's `MutationError` slot says the
    shipped shape (`We couldn’t change that. The deck is unchanged.`).
  - **Thrown write** (readiness item 2, `src/lib/copy/README.md` since #1746): it may have committed, so the row
    does not revert. It says the confirm shape and `router.refresh()` re-reads the true count.
  - The polite live region speaks once per settle, never per press.
- `decklist-row.tsx` and `deck-card-tile.tsx`: on `isBasicLand && !readOnly && !commander`, the stepper replaces
  the ✕ and the `×N`. At 1 the − slot is the shipped ✕ (`removeAria`, `handleRemove`, #185's receipt, focus to
  Undo). `from N` (`aria-hidden`) replaces the recount pair's right half on basic rows; the accent edge and the
  shipped recount descriptions stay. Desktop is always drawn, quiet at rest (`--border-dashed`, lifting to
  `--fg-body` on row hover and focus). The tile's band sits on a 70% `--bg` scrim across the art's foot.
  - **Lock cards mode** (readiness item 3): the stepper yields to the lock toggle, exactly as the ✕ does. A locked
    basic outside the mode keeps its lock mark left of the stepper.
  - **The field** (readiness item 5): Enter and blur commit, Escape restores, Arrow Up and Down step by one. A typed
    figure above 99 restores; Enter on an unchanged figure (one already above 99 by presses included) is a no-op.
    **The two bounds, together** (d9, 2026-10-14): the field accepts 0 to 99, so a typed 150 restores the saved
    figure and writes nothing; presses may climb past 99, and the server's `BASIC_QUANTITY_MAX` (999) is the only
    other bound, so a press past 999 is a returned refusal and the count returns to its saved figure.
- `src/lib/copy/decks-builder.ts`: `basicStepper` keys after `/copy-review` settles the placeholders (the
  six in the handoff's copy strings, the confirm-shape line, and a plural that does not read `Wastess`).
- **About**: one key line on `deck-page` (d9's instruction, 2026-10-14), an ordinary edit with **no
  `ABOUT_VERSION` bump**; re-pin the content hash in `about.test.ts`. `deck-page` has two keys, so a third fits the
  four-line cap. Wording through `/copy-review`.
- Tests: the stepper's labels, disabled-never, the ✕ at 1, the field's keys; the settle coalescing presses into
  one write (fake timers), a refusal reverting, a throw not reverting; the row and the tile drawing the stepper on
  a basic and the ✕ on a non-basic, a commander and a precon list; lock mode. Mutation-check each.
- `design-review` (property table → verify → confirm) against the R2 design table before opening.

## Out of scope

A basics panel (handoff G1, Hugh: not this round). Shopping, money and ownership (locks). Any 99-card cap (lock).

## Close-out

`feature-acceptance` on **staging**, at 1300 and 390, after PR 2 deploys: list and Card view, every state in
`STATES-stepper.md` §A (with the refusal and the confirm case forced, and lock mode), on the measurement account's
copy of Hugh's decks. Any write made on the walk is put back and verified by query. Report to d9.
