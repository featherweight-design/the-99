// The second commander score (#43) — the same ranking function over the pool a
// player could actually build from today.
//
// This score is NOT persisted. `commander_scores` is keyed on collection
// generation, and availability changes on every deck mutation, so storing it
// there would need a whole second invalidation axis for a score most players
// never ask for. It is computed on demand, only for `?avail=free`, out of the
// EDHREC cache the canonical ranking has already warmed. `scoreCommander` is a
// pure function of its pool, so the second score is the same function over a
// smaller array: zero extra network calls.

import { readEdhrecCache, type EdhrecFetchResult } from "../edhrec/client";
import { parseEdhrecPayload } from "../edhrec/parse";
import { type Availability } from "../decks/availability";
import { loadAvailability } from "../decks/availability-query";
import { synergyStateFrom } from "./synergy-state";
import {
  byScoreThenOracleId,
  loadCollectionPool,
  toListItem,
  type CommanderListItem,
  type RankedCommander,
} from "./recommend";
import { scoreCommander, type PoolCard } from "./score";

/**
 * The pool a player could build from right now. Hard claims subtract because a
 * card sleeved into a finished deck is physically unavailable; soft claims do
 * not, because a brew is a list, not a stack of sleeves. That asymmetry is the
 * whole point of the two severities.
 */
export function freePool(
  collection: PoolCard[],
  availability: Map<string, Availability>,
): PoolCard[] {
  return collection.filter((c) => {
    const a = availability.get(c.oracleId);
    return a === undefined || a.free > 0;
  });
}

/**
 * Attaches each item's canonical slug, matched on oracleId.
 *
 * Slugs must NOT be regenerated per ranking mode. `finalizeRecommendations`
 * assigns dedup suffixes in rank order, so two commanders sharing a slug base
 * would swap slugs when the order changes — breaking detail links and the two
 * rank maps. An item with no canonical entry is dropped rather than given an
 * invented slug that would 404.
 *
 * Generic over T so the unit test can pass bare `{ oracleId }` objects.
 */
export function carryCanonicalSlugs<T extends { oracleId: string }>(
  scored: T[],
  canonical: { oracleId: string; slug: string }[],
): (T & { slug: string })[] {
  const slugByOracleId = new Map(canonical.map((c) => [c.oracleId, c.slug]));
  return scored.flatMap((s) => {
    const slug = slugByOracleId.get(s.oracleId);
    return slug ? [{ ...s, slug }] : [];
  });
}

/**
 * Ranks the same candidate set against the free pool.
 *
 * Reads the EDHREC cache but never the network. The "everything I own" list has
 * already been computed by getRankedList before this runs, so the cache is warm
 * by construction; a candidate missing from it scores with a null fitSynergy
 * rather than triggering a second fanout. `ok: false` means the availability
 * read failed — the caller must then disable the toggle rather than serve
 * scores identical to the other mode.
 *
 * `canonical` is the "everything I own" list, and it is the only source of both
 * membership and slugs. Membership, so that flipping the toggle can only ever
 * reorder the list the player is already looking at. Slugs, because a commander
 * absent from it has no canonical slug and any invented one would 404 — the
 * persisted list can be a generation behind the collection.
 */
export async function rankFree(
  userId: string,
  canonical: CommanderListItem[],
): Promise<{ items: CommanderListItem[]; ok: boolean }> {
  // Slugs come only from the canonical list, so an empty one can only ever
  // produce an empty ranking. `ok` is still true: nothing failed, there is just
  // nothing to rank, and the toggle should stay live rather than read as an
  // outage.
  if (canonical.length === 0) return { items: [], ok: true };

  const known = new Set(canonical.map((c) => c.oracleId));

  const { collection } = await loadCollectionPool(userId);

  // Scoped to the pool, and the pool has to be loaded first for that reason.
  // `collection` is already the commander-legal subset, and `freePool` reads the
  // map for nothing else, so narrowing here returns strictly fewer rows for the
  // same answer. It does not make the rollup itself cheaper — every CTE in that
  // query is keyed on the user, not on this list.
  let availability: Map<string, Availability>;
  try {
    availability = await loadAvailability(userId, {
      oracleIds: collection.map((c) => c.oracleId),
    });
  } catch {
    return { items: [], ok: false };
  }

  // Membership comes from `canonical` and from nothing else, because the toggle
  // re-ranks a list — it must never add or drop a row. Canonical has already
  // applied both of the filters this function used to re-apply: commander
  // candidacy, and "you have already built this one". Re-applying them looks
  // like a belt-and-braces no-op and is not one. It is a second, later reading
  // of the decks table, so a canonical list a generation behind the decks would
  // come back SHORTER here than in the other mode, and the player would watch a
  // commander vanish on flipping a control that promises only to rescore.
  //
  // Candidacy is a property of the collection, not of the pool: a commander you
  // own but have sleeved is still a commander you could unsleeve. Only the pool
  // it is SCORED against shrinks.
  const candidates = collection.filter((c) => known.has(c.oracleId));
  const pool = freePool(collection, availability);

  const cache = await readEdhrecCache(candidates.map((c) => c.oracleId));
  const scored = candidates.map((commander) => {
    const cached = cache.get(commander.oracleId);
    // The row holds unparsed JSON, so it has to go through parseEdhrecPayload
    // before it has topCards. `unreachable` is false even on a miss: a miss here
    // is an absence, not an outage — the canonical list already resolved this
    // same candidate set, so anything reachable is already cached.
    const result: EdhrecFetchResult = {
      data: cached ? parseEdhrecPayload(cached.payload) : null,
      unreachable: false,
    };
    return {
      ...scoreCommander({
        commander,
        collection: pool,
        edhrecTopCards: result.data?.topCards ?? null,
      }),
      synergyState: synergyStateFrom(result),
    };
  });
  scored.sort(byScoreThenOracleId);

  const ranked: RankedCommander[] = carryCanonicalSlugs(scored, canonical);
  return { items: ranked.map(toListItem), ok: true };
}
