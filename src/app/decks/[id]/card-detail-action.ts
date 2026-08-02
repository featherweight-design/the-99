"use server";

import type { BrowseCard } from "../../../lib/collection/browse";
import { loadCardDetail } from "../../../lib/collection/card-detail";
import { requireUserId } from "../../../lib/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Card detail for any oracle id, owned or not. Deck surfaces carry only the id, so the
 * modal's data is fetched on click rather than shipped with the page — a deck of 99 cards
 * would otherwise send 99 cards' printings to the client for the one the user opens.
 */
export async function getCardDetail(oracleId: string): Promise<BrowseCard | null> {
  const userId = await requireUserId();
  // Server actions are reachable via crafted requests; a non-uuid would reach Postgres as a
  // cast error rather than a miss.
  if (!UUID.test(oracleId)) return null;
  return loadCardDetail(userId, oracleId);
}
