import type { BrowseCard } from "../collection/browse";
import { MAX_DECK_SCOPE } from "../combos/deck-scope-param";
import { decodeCardDetail } from "./card-detail-wire";

/**
 * The card modal's PREFETCH, from the browser: `GET /api/card-detail`. See the route for why
 * this is a request and not a server action — a hover prefetch must not queue ahead of the
 * reader's own writes.
 *
 * A missing card is `null`, which the provider treats as a read that found nothing; any other
 * failure throws, which it treats as a read that failed. The two are kept apart because the
 * provider forgets a missing card and keeps what is painted over a failed one.
 */
export async function fetchCardDetail(
  oracleId: string,
  deckOracleIds?: readonly string[],
): Promise<BrowseCard | null> {
  const params = new URLSearchParams({ id: oracleId });
  // Capped HERE, where the route refuses a longer list with a 400: nothing stops a draft growing
  // past a legal deck's size, and one that has must still open its cards. The ids past the cap
  // only lose `in this deck` on their partners, which is what the action's `sanitizeDeckScope` does.
  if (deckOracleIds?.length) params.set("scope", deckOracleIds.slice(0, MAX_DECK_SCOPE).join(","));
  const res = await fetch(`/api/card-detail?${params}`, { headers: { accept: "application/json" } });
  if (res.status === 404) return null;
  // A redirect is the proxy sending a signed-out reader to sign in: HTML, not a card.
  if (!res.ok || res.redirected) throw new Error(`card detail ${res.status}`);
  return decodeCardDetail<BrowseCard | null>(await res.text());
}
