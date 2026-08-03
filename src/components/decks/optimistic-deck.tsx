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

const AddOptimisticCardContext = createContext<AddOptimisticCard | null>(null);

export function useOptimisticDeckCards(serverCards: DeckDetailCard[]) {
  const [cards, addOptimisticCard] = useOptimistic(
    serverCards,
    (current, card: DeckDetailCard) => {
      const at = current.findIndex((c) => c.oracleId === card.oracleId);
      if (at === -1) return [...current, card];
      // Basic lands are the one card a deck may hold copies of: the server
      // increments quantity for them and no-ops for everything else. Predicting
      // a second copy of a non-basic would show a count the server never reaches.
      if (!isBasicLand(card.typeLine)) return current;
      const next = [...current];
      next[at] = { ...next[at], quantity: next[at].quantity + card.quantity };
      return next;
    },
  );
  return { cards, addOptimisticCard };
}

export function AddOptimisticCardProvider({
  value,
  children,
}: {
  value: AddOptimisticCard;
  children: React.ReactNode;
}) {
  return (
    <AddOptimisticCardContext.Provider value={value}>
      {children}
    </AddOptimisticCardContext.Provider>
  );
}

/**
 * Returns a no-op outside a provider. Add buttons render in surfaces that have
 * no deck list to update (and in tests that mount a row alone) — those should
 * still add the card, just without a local prediction.
 */
export function useAddOptimisticCard(): AddOptimisticCard {
  return useContext(AddOptimisticCardContext) ?? noop;
}

function noop() {}
