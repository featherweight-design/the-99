# Undo a removal — design

**Issue:** none — see below · **Date:** 2026-09-13 · **Status:** design Green (R3), plan below

## Problem

A deck's draft accumulates removals until it is committed. There is exactly one way to reverse
them and it reverses all of them: `Discard`, which returns the whole draft to the last committed
version behind a confirm. Cutting one card by mistake therefore costs either the mistake or
every other change in the draft.

`Pull it` is not the reversal. It pulls a card out of *another* deck, which is a different act on
a different column. And `Undo` on the deck page (#185) is a shortcut, not a record: it holds one
removal, skips quantity moves, and dies on reload.

What is missing is a per-row reversal that lives as long as the draft does.

## The design, in one line

One brass `Put back` link on every row under `Going out · N` on `/decks/[id]/changes`, for as
long as the draft exists. It always succeeds. Nothing else on any surface changes.

Source of truth: `design/design_handoff_the99_undo_removal/` at R3 — README, `STATES-restore.md`,
`READINESS.md`, and the copy file. The canvas is `The 99 - Undo Removal (R3) - standalone.html`.

**On the issue number.** The handoff calls this #390 throughout. In this repository #390 is
"Allocation receipt renders only from the Collections page", closed and unrelated, and no open
issue covers undo-a-removal. The handoff folder is the reference; nothing has been filed, because
filing one is the product owner's call rather than this plan's. **#185 is correct** — "Design: no
undo after removing a card from a deck" — and is the receipt this feature deliberately leaves
alone.

## Decisions taken

Recorded so they are not re-litigated during implementation. The full reasoning is in the
handoff's decisions log; these are the ones that constrain code.

1. **`Put back` always succeeds.** One variant, no guard branch, no tag, no disabled state, no
   absent-control case. A restore is an *add*, and adds in this app never refuse on claims — they
   price them. `DeckAddRejection` (`src/lib/decks/add-validation.ts:22`) is three values, and all
   three are closed for a row under `Going out`: the card was in this deck's committed list, so
   legality and colour identity already passed, and a commander is not a `deck_cards` row so it
   never appears in that column. Refusing a restore would make it stricter than adding the same
   card from the deck page one route away.
2. **Another deck holding the copy does not gate it.** The marker informs; the deck is taking back
   a copy it already owns.
3. **#185 is untouched.** `decklist-row.tsx` and `deck-card-undo-tile.tsx` do not change. The two
   features are not subsets of each other: #185 holds one removal at the moment of the tap;
   `Going out` holds every cut until commit. Two surfaces, two words, deliberately.
4. **A quantity move restores whole.** `Swamp 9 → 7` puts both copies back in one tap. There is no
   per-copy restore.
5. **The restored row leaves the list**, because the list is derived from `draftDiff.removes` and
   the card is no longer in it. It does not enter `Coming in`: the draft returns to *no change* on
   that card.
6. **No money moves, in any case.** A restored card is in neither list, so the buy figures cannot
   see it — and there is nothing to buy, because the deck already holds the card. The money block
   is scoped to `draftDiff.adds` (`draft-state.ts:320`) independently of that.
7. **Optimistic.** The row leaves on tap. With no refusal to draw, there is nothing the row has to
   stay alive for, and a disabled control on an action that cannot fail is ceremony.
8. **A transport failure is not a refusal.** The row returns and the shipped `MutationError` states
   it. Nothing was decided; trying again is the whole remedy.
9. **The cap is a status, not a refusal.** A restore may take a deck to 102/99 and the shipped
   over-99 count simply moves.
10. **Focus goes to the group heading the row left**, never to the next row's control — which would
    put a live restore under a finger that has just used one.
11. **No bulk restore, no selection, no "restore all", no motion, no expiry warning.** Nothing
    expires; only #185's shortcut does.

## Two errata carried from the audit

The handoff is Green and these are implementation facts it states slightly wrong. Neither changes
a drawn state.

**E1 · The restore needs a quantity, so it is not `addCardToDeck` unwrapped.** R3 says the restore
is "`addCardToDeck` unwrapped, the same call #185's undo makes". That call adds exactly one copy —
`quantity + 1` for a basic, `onConflictDoNothing` otherwise (`actions.ts:614`) — so it cannot
satisfy decision 4. Calling it twice is two non-atomic writes each firing `revalidateClaims`. A
thin wrapper is needed, taking the row's own `from` figure. It bites only where `to > 0`, which in
practice means basics: `isBasicLand` (`grouping.ts:114`) is the only thing that lets
`deck_cards.quantity` climb.

**E2 · "No client state" undersells it.** The optimism of decision 7 needs `useOptimistic` over the
out rows plus an error keyed by oracle id. `review-changes.tsx` has no optimistic write today —
the neighbouring `PullControl` is deliberately non-optimistic, holding local `pending` and `error`
with the row staying put. `Put back` is the first optimistic write on that surface. Small and
standard, but it must not be built by re-rendering a stale server list.

## What is not in scope

- `Going out` windowing. Versioning's gap 2 predates this feature: a 300-row paste was already
  slow and now has 300 handlers. A follow-up, not a blocker.
- The two undo vocabularies (`Undo` on the deck page, `Put back` one route away). Both correct,
  the seam ratified at R2.
- `review.lede` — "nothing here is a decision except the pulls" is now wrong by one. Flagged by
  Design as a ratification question, not a Design call. Not edited here.
