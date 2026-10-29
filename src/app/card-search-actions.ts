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
import { requestSwitchEnv } from "../lib/switches/request";
import { isUuid } from "../lib/uuid";
import { wishlistEnabled } from "../lib/wishlist/flag";

/**
 * Card search's two reads (plan `2026-10-16-card-search.md`, PR A). Both are signed in and read only the reader's own rows
 * (lock 8). The bookmark is drawn only while the wishlist is on for the reader.
 */

/** Up to 20 cards whose name matches, best first, each with the reader's signals. */
export async function searchAllCardsAction(query: unknown): Promise<CardSearchRow[]> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (typeof query !== "string") return [];
  const hits = await searchAllCards(query);
  if (hits.length === 0) return [];
  const signals = await loadCardSignals(userId, hits.map((h) => h.oracleId), { wishlist: wishlistEnabled(env) });
  return withSignals(hits, signals);
}

/**
 * The reader's signals for the recent cards, read fresh when the search opens (README call 5). At most
 * `SIGNALS_LIMIT` ids; anything that is not a card id is dropped rather than refused, since the list comes from
 * the browser's own storage.
 */
export async function cardSignalsAction(oracleIds: unknown): Promise<Record<string, CardSignals>> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!Array.isArray(oracleIds)) return {};
  const ids = oracleIds.filter((id): id is string => typeof id === "string" && isUuid(id)).slice(0, SIGNALS_LIMIT);
  if (ids.length === 0) return {};
  const signals = await loadCardSignals(userId, ids, { wishlist: wishlistEnabled(env) });
  return Object.fromEntries(signals);
}
