// The second commander score (#43) — the same ranking function over the pool a
// player could actually build from today.
//
// This score is NOT persisted. `commander_scores` is keyed on collection
// generation, and availability changes on every deck mutation, so storing it
// there would need a whole second invalidation axis for a score most players
// never ask for. It is computed on demand, only for `?avail=free`, out of
// whatever the EDHREC cache already holds. `scoreCommander` is a pure function
// of its pool, so the second score is the same function over a smaller array:
// zero extra network calls.

import { readEdhrecCache } from "../edhrec/client";
import { parseEdhrecPayload } from "../edhrec/parse";
import { type Availability } from "../decks/availability";
import { loadAvailability } from "../decks/availability-query";
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
 *
 * BASIC LANDS ARE ALWAYS FREE HERE, and that is inherited rather than decided.
 * `loadAvailability` excludes basics from the model entirely, so they have no
 * row, and a card with no row is kept. The reason is in that query's header: a
 * finished deck holds thirty-odd Forests that almost nobody's collection row
 * matches, so counting them would push every mature deck into `over`. Scoring
 * treats basics as unlimited, which is how players treat them.
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
 * Reads the EDHREC cache but never the network. The cache is usually warm, since
 * the canonical ranking filled it — but not guaranteed to be: `getRankedList`
 * can serve persisted scores without touching EDHREC at all, and those rows
 * expire on their own schedule. A miss is therefore an ordinary outcome, and it
 * scores with a null fitSynergy rather than triggering a second fanout. Never
 * add a fetch here to close that gap: this path exists to be free.
 *
 * `ok: false` means no trustworthy second ranking could be produced — either the
 * availability read failed, or canonical named a commander the collection no
 * longer holds. The caller must then disable the toggle rather than serve
 * scores identical to the other mode, or a list one row short.
 *
 * `canonical` is the "everything I own" list, and it is the source of everything
 * about a row except its score. Membership, so that flipping the toggle can only
 * ever reorder the list the player is already looking at. Slugs, because a
 * commander absent from it has no canonical slug and any invented one would 404.
 * `synergyState`, because only canonical can tell an EDHREC outage apart from a
 * commander EDHREC does not index. The score is the one thing this function is
 * entitled to compute, because the score is the only thing the pool changes.
 *
 * `preloaded` lets a caller that has already made these two reads hand them over
 * instead of paying for them twice. It must be the SAME pair: an availability
 * map read against a different collection would score rows this function then
 * treats as free by default, because a card with no row is kept. `/commanders`
 * loads both for the receipt clause, which renders in either mode.
 */
export async function rankFree(
  userId: string,
  canonical: CommanderListItem[],
  preloaded?: {
    collection: PoolCard[];
    availability: Map<string, Availability>;
  },
): Promise<{ items: CommanderListItem[]; ok: boolean }> {
  // Slugs come only from the canonical list, so an empty one can only ever
  // produce an empty ranking. `ok` is still true: nothing failed, there is just
  // nothing to rank, and the toggle should stay live rather than read as an
  // outage.
  if (canonical.length === 0) return { items: [], ok: true };

  const collection =
    preloaded?.collection ?? (await loadCollectionPool(userId)).collection;

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
  //
  // So `canonical` is the list being ITERATED, not a set the collection is
  // tested against. The two produce the same intersection today; the difference
  // is which list is in charge, and this one reads the way the rule above is
  // stated. Each entry is paired with its pool card here because both halves are
  // needed below, and a lookup that has already succeeded should not be repeated
  // behind a `!`.
  const poolByOracleId = new Map(collection.map((c) => [c.oracleId, c]));
  const candidates = canonical.flatMap((canon) => {
    const card = poolByOracleId.get(canon.oracleId);
    return card ? [{ card, canon }] : [];
  });

  // Iterating canonical guarantees this function never ADDS a row; failing
  // closed here is what stops it dropping one. A commander canonical names but
  // the collection no longer holds has no free score to compute, and the two
  // lists can genuinely diverge: canonical may be served from scores persisted
  // against an earlier collection generation, while the pool above is read
  // fresh. Rather than serve a list that is quietly one row shorter, report the
  // same failure as an unreadable availability rollup, and let the caller
  // disable the toggle. A disabled control is honest; a vanishing commander is
  // not.
  //
  // Checked BEFORE the availability read, which is the expensive one: the
  // answer is already fully determined by two reads that have both returned.
  if (candidates.length !== canonical.length) return { items: [], ok: false };

  // Scoped to the pool, and the pool has to be loaded first for that reason.
  // `collection` is already the commander-legal subset, and `freePool` reads the
  // map for nothing else, so narrowing here returns strictly fewer rows for the
  // same answer. It does not make the rollup itself cheaper — every CTE in that
  // query is keyed on the user, not on this list.
  let availability: Map<string, Availability>;
  if (preloaded) {
    availability = preloaded.availability;
  } else {
    try {
      availability = await loadAvailability(userId, {
        oracleIds: collection.map((c) => c.oracleId),
      });
    } catch {
      return { items: [], ok: false };
    }
  }

  const pool = freePool(collection, availability);

  const cache = await readEdhrecCache(candidates.map((c) => c.card.oracleId));
  const scored = candidates.map(({ card: commander, canon }) => {
    // The row holds unparsed JSON, so it has to go through parseEdhrecPayload
    // before it has topCards. An unexpected shape degrades to an empty list,
    // which scoreCommander reads as a null fitSynergy.
    const cached = cache.get(commander.oracleId);
    const parsed = cached ? parseEdhrecPayload(cached.payload) : null;
    return {
      ...scoreCommander({
        commander,
        collection: pool,
        edhrecTopCards: parsed?.topCards ?? null,
        inclusionByName: parsed?.inclusionByName ?? null,
      }),
      // CARRIED from canonical, never recomputed — the same rule as slugs, and
      // for a sharper reason. Both modes read the same cache, so a miss here is
      // a miss there too; but only canonical knows WHY it missed. Recomputing it
      // from a bare cache read cannot distinguish an outage from a commander
      // EDHREC does not index, so a list built during an outage would relabel
      // every `degraded` as `absent` on flipping to free — taking the Retry
      // button away at exactly the moment it is the useful control.
      synergyState: canon.synergyState,
    };
  });
  scored.sort(byScoreThenOracleId);

  const ranked: RankedCommander[] = carryCanonicalSlugs(scored, canonical);
  return { items: ranked.map(toListItem), ok: true };
}
