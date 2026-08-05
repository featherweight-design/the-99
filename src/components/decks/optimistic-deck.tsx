"use client";

import { createContext, useContext, useOptimistic } from "react";
import { isBasicLand, type DeckDetailCard } from "../../lib/decks/grouping";

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

const DeckEditContext = createContext<{
  add: AddOptimisticCard;
  remove: RemoveOptimisticCard;
} | null>(null);

export function useOptimisticDeckCards(serverCards: DeckDetailCard[]) {
  const [cards, applyEdit] = useOptimistic(
    serverCards,
    (current, edit: DeckEdit) => {
      if (edit.kind === "remove") {
        // The server drops the whole entry rather than decrementing, including
        // for a stack of basics, so the prediction does the same.
        return current.filter((c) => c.oracleId !== edit.oracleId);
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
  const addOptimisticCard: AddOptimisticCard = (card) => applyEdit({ kind: "add", card });
  const removeOptimisticCard: RemoveOptimisticCard = (oracleId) =>
    applyEdit({ kind: "remove", oracleId });
  return { cards, addOptimisticCard, removeOptimisticCard };
}

export function AddOptimisticCardProvider({
  value,
  children,
}: {
  value: { add: AddOptimisticCard; remove: RemoveOptimisticCard };
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

function noop() {}
