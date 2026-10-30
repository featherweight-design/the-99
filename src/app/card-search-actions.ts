"use server";

import { requireUserId } from "../lib/auth";
import {
  loadCardSignals,
  searchAllCards,
  SIGNALS_LIMIT,
  withSignals,
  type CardSearchRow,
  type CardSignals,
} from "../lib/card-search/search";
import { isUuid } from "../lib/uuid";

/**
 * Card search's two reads (plan `2026-10-16-card-search.md`, PR A). Both are signed in and read only the reader's own rows
 * (lock 8). The bookmark is drawn for every reader (the wishlist's switch is retired).
 */

/** Up to 20 cards whose name matches, best first, each with the reader's signals. */
export async function searchAllCardsAction(query: unknown): Promise<CardSearchRow[]> {
  const userId = await requireUserId();
  if (typeof query !== "string") return [];
  const hits = await searchAllCards(query);
  if (hits.length === 0) return [];
  const signals = await loadCardSignals(userId, hits.map((h) => h.oracleId), { wishlist: true });
  return withSignals(hits, signals);
}

/**
 * The reader's signals for the recent cards, read fresh when the search opens (README call 5). At most
 * `SIGNALS_LIMIT` ids; anything that is not a card id is dropped rather than refused, since the list comes from
 * the browser's own storage.
 */
export async function cardSignalsAction(oracleIds: unknown): Promise<Record<string, CardSignals>> {
  const userId = await requireUserId();
  if (!Array.isArray(oracleIds)) return {};
  const ids = oracleIds.filter((id): id is string => typeof id === "string" && isUuid(id)).slice(0, SIGNALS_LIMIT);
  if (ids.length === 0) return {};
  const signals = await loadCardSignals(userId, ids, { wishlist: true });
  return Object.fromEntries(signals);
}
