// `/collection`'s cached list, read by the page AND by `/api/collection-fields` (list payload plan,
// PR 4). One loader rather than two calls to `cacheForUser`, because the data cache keys an entry
// on the function it wraps as well as its key parts: two call sites would be two entries, and the
// fields route would build the whole list again instead of reading the one the page filed.
//
// The heaviest read on the page by an order of magnitude, which is why it is the one cached across
// visits. The key is history: since the deployment joined every `cacheForUser` key
// (`cache/deployment.ts`), a deploy retires the previous build's entry on its own; see the record
// kept beside the page's read of it.
import { createHash } from "node:crypto";
import { cacheForUser } from "../cache/user-lists";
import { loadBrowseCards, type BrowseListCard } from "./browse";

/**
 * The list, and the VERSION of it: a hash of what the list holds, so the page and every fields
 * batch read from one list carry the same version, and a batch read from a list that has moved
 * since (a write in between) carries another. Missing ids cannot show that, because a moved list
 * holds the same cards with different fields: a printing picked on another device keeps the oracle
 * id and moves the art, which a merge would put under the old caption.
 *
 * Derived from the CONTENTS, never stamped at build time. A list over the data cache's per-entry
 * ceiling is never stored and is rebuilt on every request, and a stamp would then differ on every
 * read of an unchanged list: every batch would read as stale and the page would refresh forever.
 * The database's row order cannot move it either: the read orders nothing, so the cards are sorted
 * by oracle id and each card's set counts by set code, which come out of its printings in whatever
 * order they were read.
 */
const byKey = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export function collectionVersion(cards: readonly BrowseListCard[]): string {
  const canonical = [...cards]
    .sort((a, b) => byKey(a.oracleId, b.oracleId))
    .map((c) => ({ ...c, setCounts: [...c.setCounts].sort((a, b) => byKey(a[0], b[0])) }));
  return createHash("sha1").update(JSON.stringify(canonical)).digest("base64url").slice(0, 16);
}

export function loadCollectionList(userId: string) {
  return cacheForUser(userId, ["browse-5"], async () => {
    const cards = await loadBrowseCards(userId);
    return { cards, version: collectionVersion(cards) };
  });
}
