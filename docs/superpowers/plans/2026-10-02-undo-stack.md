# Undo stacks across removals (H29)

Plan, 2026-10-02. For Hugh's approval: not merged until he rules.

Hugh's walk note (intake H29): "Undo stacks across several removals (no row shifts); locked after
leaving the page or committing."

## 1 · What ships today

**One receipt at a time.** Removing a card from the deck page leaves a receipt in its place,
`{name} removed · Undo` (`UndoRow` in `decklist-row.tsx`, `deck-card-undo-tile.tsx` in card view).
The builder shell holds it as ONE slot, `spentSlot` (`builder-shell.tsx:754`):

- **The next removal replaces it.** `markSpent` sets the slot to the newly removed card
  (`builder-shell.tsx:844-848`), so removing a second card turns the first receipt back into
  nothing. The first card can then only come back by adding it again. That is the gap Hugh hit.
- **Only a single copy leaves a receipt.** `markSpent` keeps the slot only for `quantity <= 1`; a
  stack that loses one copy shows its new count instead, which is its own receipt.
- **It is client state and nothing else.** Nothing about it is stored. It is cleared by Undo
  landing, by the next removal, or by the shell unmounting, and "never by a timer" (the comment at
  `builder-shell.tsx:750-753`).
- **Undo is an add.** `useSpentSlotUndo` (`spent-slot-undo.ts`) calls `addCardToDeck` with
  `relock: true`, optimistically since #1114. A refusal is held on the shell keyed on the card,
  under a `removal` generation, so a late answer for an overtaken receipt is dropped
  (`optimistic-deck.tsx`, `UndoSpentSlot`).
- **No row shifts already, for one receipt.** The decklist lists the spent card among the visible
  cards (`decklist.tsx:531-537`), so the grouping sorts it into the place the card held. The
  receipt draws in that place, and nothing below it moves.

**The review screen's `Put back`** (`/decks/[id]/changes`, #593 and #598) is a different door: it
restores a cut against the committed version, reads from the draft diff, and needs nothing here.
H29 is about the deck page's receipts.

## 2 · The change

**`spentSlot` becomes `spentSlots`: a list, one receipt per removed card, each drawn in its own
card's place.**

- **Each removal adds a receipt** rather than replacing the last. Every receipt keeps its own Undo;
  pressing one puts back that card only. They are independent rather than a last-in-first-out
  stack: a reader who removed three cards and wants the second one back presses that row. No
  "undo all" is proposed.
- **No row shifts, by the same rule as today.** The decklist lists every spent card among the
  visible cards, so each receipt sorts into its card's place. Undoing one turns its receipt back
  into the live row, in the same place. Nothing else on the list moves.
- **Refusals per card.** `undoFailure` and the `removal` generation become per-receipt: a map keyed
  on the oracle id, each with the generation of its own removal. Today a refusal is dropped when ANY
  newer removal has bumped the one counter (`reportUndoFailure`, `builder-shell.tsx:914-918`); with
  several receipts that would let removing card B silence card A's refusal. The new rule: a refusal
  is dropped only when THAT card has been removed again since its undo was pressed (its own
  generation moved), or its receipt is gone.
- **A refused removal drops only its own receipt.** `reportRemoveFailure`
  (`builder-shell.tsx:919-924`) clears the whole slot today and receives only the card's name. It
  takes the oracle id instead and drops that card's receipt alone; the other receipts stand.
- **Settling per card.** Today's `slotLanded` check (the card seen gone, then seen back) runs per
  receipt, so one undo landing does not take the others away.
- **Stacks unchanged.** Removing one copy of a stack still leaves the stack and its count, with no
  receipt, and a basics row keeps its own quantity control. When the LAST copy goes, the receipt
  appears as today.
- **A cap.** Proposed: none. Every receipt is a removed card the deck no longer counts, and the
  receipts clear the moment the reader leaves. If Hugh wants one, the oldest receipt drops first.
- **Announcements unchanged.** Each removal announces itself with `undo available`, and each undo
  announces its card back.
- **Empty state.** A deck emptied by removals keeps showing its receipts, as `isEmpty` does for one
  slot today (`builder-shell.tsx`: `!spentSlot`).
- **The groups mark every receipt.** `DecklistGroup` takes one `spentOracleId`
  (`decklist-group.tsx:22`) and uses it in its counts and in the row's and tile's `spent` flag; it
  takes a set instead, so a group with two receipts marks both and counts neither.

## 3 · "Locked after leaving the page or committing"

**Both are already the receipt's lifetime, and nothing is stored to lock.** The receipts live in
the builder shell's state, which dies when the shell unmounts. Committing happens only on the
review screen (`review-changes.tsx` mounts `CommitSheet`), so a commit always follows leaving the
deck page; the header's `Commit as v1` offer routes there too. A reader who comes back to the deck
page finds no receipts, which is "locked".

**A discard is the third way a draft ends, and it does not leave the page.** The pending banner's
Discard (`discard-draft.tsx`) refreshes in place, so the shell stays mounted. A card removed from
the draft and then discarded stays absent, so its receipt never settles and keeps offering an Undo
that re-adds a card the discard took out. That is latent today for the one slot; with a list it
would apply to every removal at once. So **a discard clears every receipt**, the same way leaving
the page does: the draft the receipts describe has gone.

What "locked" must NOT mean is a stored undo log: none exists, and persisting one would make a
receipt outlive the draft it describes. After a commit the removed card is out of the new version,
and bringing it back is an ordinary add on the next draft. The plan states this rule and keeps it.

## 4 · Interplay

- **The draft.** Each removal is already a draft write (`deck_cards`); each undo is an add. A stack
  of receipts is several of those, no different from today one at a time.
- **Pulls and releases.** A removal from the deck page writes no `pull_releases` row; a pull from
  another deck does, and a card back in the draft cancels its own release by any path (the
  `all_claims` limit). So undoing a card a pull released needs nothing new.
- **Locks.** `relock: true` already revives a dormant lock per card.
- **Clear auto.** Its sweep keeps its own receipt (`sweptRows`) and does not mark slots. A sweep
  while removal receipts stand leaves them standing.
- **Shopping filter.** A receipt shows under Shopping only when its card is a shopping card
  (`isShoppingCard`), per receipt, as today.

## 5 · Design?

**No drawing needed.** The receipt is the shipped `UndoRow` and `UndoTile`; several at once is the
same component in several places, with no new state, control or string. Logic plus existing
affordances.

**About entry.** The `undo-removal` entry says "the row turns into an undo", which stays true.
Proposed: no new entry, since this changes how long an existing receipt lasts rather than adding a
capability. Hugh decides, including whether the caption should say several can stand at once.

## 6 · Proof

**Unit.** `builder-shell` / `decklist-row` tests: two removals leave two receipts; undoing the
first keeps the second; a refusal on one does not mark the other; a refusal for card A survives a
removal of card B, and is dropped when card A itself is removed again; a refused removal drops its
own receipt and leaves the others; a discard clears every receipt; removing one copy of a stack leaves no receipt; unmounting the shell clears all.

**Browser, at 390x844 and 1300x900, list and card view.** A probe removes three cards from one
group, reads each receipt's top edge against the row it replaced (no row shifts: every other row's
top unchanged), undoes the middle one and reads the other two still standing, then navigates away
and back and reads no receipts. Mutations that must fail it: the slot reverted to a single value
(the first receipt vanishes), settling keyed globally (one undo clears all), and the receipts
appended at the end of the group instead of sorted into place (rows shift).

## 7 · PR boundaries

One PR: `builder-shell.tsx`, `optimistic-deck.tsx` (`UndoSpentSlot` per card), `spent-slot-undo.ts`,
`decklist.tsx` (a list of spent cards), `decklist-group.tsx` (a set of spent ids), the discard's
clear, the tests and the probe. Under ~500 lines.

## 8 · For Hugh

1. Independent receipts (press any one), or strictly last-in-first-out? Proposed: independent.
2. A cap on how many receipts stand at once? Proposed: none.
3. The About caption: unchanged, or a line saying several can stand at once.
