"use server";

import { sanitizeDeckScope } from "../lib/combos/deck-scope-param";
import type { BrowseCard } from "../lib/collection/browse";
import { loadCardDetail } from "../lib/collection/card-detail";
import { requireUserId } from "../lib/auth";
import { perfRoute } from "../lib/perf/timing";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Card detail for any oracle id, owned or not. Surfaces that list cards carry only the id,
 * so the modal's data is fetched on click rather than shipped with the page — a deck of 99
 * cards would otherwise send 99 cards' printings to the client for the one the user opens.
 *
 * Route-agnostic on purpose: it takes an oracle id and nothing else, and the commander
 * detail page's role lists open the same modal the deck builder does.
 */
export async function getCardDetail(
  oracleId: string,
  /**
   * The cards of the deck the modal was opened from, if any — what makes `in this deck`
   * sayable in the combo block and its scope line renderable.
   *
   * SENT BY THE CLIENT, and only ever used to CLASSIFY partners the reader already sees:
   * every id is checked against the combo index, never trusted as a claim about the deck.
   * A crafted list can therefore make the block say `in this deck` about a card the deck
   * does not hold, which shows that reader a wrong word about their own deck and nothing
   * else — no other reader's data is reachable through it, and the partner list itself is
   * derived from the card and the caller's own collection.
   */
  deckOracleIds?: readonly string[],
): Promise<BrowseCard | null> {
  // `measure:load`'s spans (PERF_TIMING=1 only; a pass-through otherwise).
  const perf = perfRoute("getCardDetail");
  const userId = await perf.timed("auth", () => requireUserId());
  // Server actions are reachable via crafted requests; a non-uuid would reach Postgres as a
  // cast error rather than a miss.
  if (!UUID.test(oracleId)) return null;
  // SHAPE-CHECKED AND CAPPED. This is a public endpoint and the argument is new; see
  // `sanitizeDeckScope`, which is where the rule lives so a test can call it rather than
  // restate it.
  const scoped = sanitizeDeckScope(deckOracleIds);
  return perf.timed("loadCardDetail", () => loadCardDetail(userId, oracleId, scoped));
}
