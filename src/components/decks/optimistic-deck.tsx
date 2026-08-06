"use client";

import { createContext, useContext, useOptimistic } from "react";
import {
  isBasicLand,
  unresolvedCardCount,
  type DeckDetailCard,
  type DeckUnresolvedRow,
} from "../../lib/decks/grouping";

/**
 * Deck-wide optimistic card list.
 *
 * `use-deck-mutation` already made the clicked *button* answer instantly, but
 * the decklist, the counter strip and the All/Shopping tallies all still waited
 * on the server round-trip — so adding a card looked like nothing had happened
 * everywhere except the one control the user had stopped looking at.
 *
 * The override is dispatched inside the mutation's transition, which for a
 * revalidating server action ends when the new server HTML lands rather than
 * when the promise resolves. That is what makes the handoff seamless in both
 * directions: on success the optimistic row is replaced by the real one with no
 * intervening frame, and on failure React drops it with no explicit revert.
 */
type AddOptimisticCard = (card: DeckDetailCard) => void;
type RemoveOptimisticCard = (oracleId: string) => void;

type DeckEdit =
  | { kind: "add"; card: DeckDetailCard }
  | { kind: "remove"; oracleId: string };

/**
 * A failed removal has nowhere to draw itself: the prediction has already taken
 * the row out of the deck-wide list, so the row is unmounted by the time its own
 * `useDeckMutation` has a message, and it remounts clean when the transition
 * reverts. The reason has to be handed to something that outlives the row.
 */
type ReportRemoveFailure = (cardName: string) => void;

/** Putting a card to an unresolved line: the line goes, the card joins the 99. */
type ResolveOptimisticRow = (rowId: string, card: DeckDetailCard) => void;
type DeleteOptimisticRow = (rowId: string) => void;

const DeckEditContext = createContext<{
  add: AddOptimisticCard;
  remove: RemoveOptimisticCard;
  reportRemoveFailure: ReportRemoveFailure;
  resolveRow: ResolveOptimisticRow;
  deleteRow: DeleteOptimisticRow;
} | null>(null);

/**
 * Unresolved rows come through here rather than straight off the server props
 * so the builder has one card list and one unresolved count, from one place.
 * `total` is derived from both, and a count sourced separately from the list it
 * describes is exactly the mid-mutation disagreement deckCounts exists to
 * prevent.
 */
export function useOptimisticDeckCards(
  serverCards: DeckDetailCard[],
  serverUnresolvedRows: DeckUnresolvedRow[] = [],
) {
  const [cards, applyEdit] = useOptimistic(
    serverCards,
    (current, edit: DeckEdit) => {
      if (edit.kind === "remove") {
        // One click removes one copy: the server decrements while more than one
        // remains and only deletes the row on the last. Predicting the whole
        // stack would drop a deck from 99 to 90 and snap back on revalidation.
        const at = current.findIndex((c) => c.oracleId === edit.oracleId);
        if (at === -1) return current;
        if (current[at].quantity <= 1) return current.filter((_, i) => i !== at);
        const next = [...current];
        next[at] = { ...next[at], quantity: next[at].quantity - 1 };
        return next;
      }
      const { card } = edit;
      const at = current.findIndex((c) => c.oracleId === card.oracleId);
      if (at === -1) return [...current, card];
      // Mirrors the server, which increments quantity for the multi-copy
      // exception and no-ops for everything else. Predicting a second copy the
      // server won't write would show a count it never reaches.
      if (!isBasicLand(card.typeLine)) return current;
      const next = [...current];
      next[at] = { ...next[at], quantity: next[at].quantity + card.quantity };
      return next;
    },
  );
  // Resolve and delete both end with the line gone, so one edit covers both; a
  // resolve adds its card through the card reducer above in the same dispatch.
  const [unresolvedRows, dropRow] = useOptimistic(
    serverUnresolvedRows,
    (current, rowId: string) => current.filter((r) => r.id !== rowId),
  );

  const addOptimisticCard: AddOptimisticCard = (card) => applyEdit({ kind: "add", card });
  const removeOptimisticCard: RemoveOptimisticCard = (oracleId) =>
    applyEdit({ kind: "remove", oracleId });
  const resolveOptimisticRow: ResolveOptimisticRow = (rowId, card) => {
    dropRow(rowId);
    applyEdit({ kind: "add", card });
  };
  const deleteOptimisticRow: DeleteOptimisticRow = (rowId) => dropRow(rowId);

  return {
    cards,
    unresolvedRows,
    unresolvedCount: unresolvedCardCount(unresolvedRows),
    addOptimisticCard,
    removeOptimisticCard,
    resolveOptimisticRow,
    deleteOptimisticRow,
  };
}

export function AddOptimisticCardProvider({
  value,
  children,
}: {
  value: {
    add: AddOptimisticCard;
    remove: RemoveOptimisticCard;
    reportRemoveFailure: ReportRemoveFailure;
    resolveRow: ResolveOptimisticRow;
    deleteRow: DeleteOptimisticRow;
  };
  children: React.ReactNode;
}) {
  return <DeckEditContext.Provider value={value}>{children}</DeckEditContext.Provider>;
}

/**
 * Returns a no-op outside a provider. Add and remove controls render in
 * surfaces that have no deck list to update (and in tests that mount a row
 * alone) — those should still mutate, just without a local prediction.
 */
export function useAddOptimisticCard(): AddOptimisticCard {
  return useContext(DeckEditContext)?.add ?? noop;
}

export function useRemoveOptimisticCard(): RemoveOptimisticCard {
  return useContext(DeckEditContext)?.remove ?? noop;
}

export function useResolveOptimisticRow(): ResolveOptimisticRow {
  return useContext(DeckEditContext)?.resolveRow ?? noop;
}

export function useDeleteOptimisticRow(): DeleteOptimisticRow {
  return useContext(DeckEditContext)?.deleteRow ?? noop;
}

/**
 * Outside a provider nothing removes the row, so its own inline message is
 * still the right surface and this stays a no-op.
 */
export function useReportRemoveFailure(): ReportRemoveFailure {
  return useContext(DeckEditContext)?.reportRemoveFailure ?? noop;
}

function noop() {}
