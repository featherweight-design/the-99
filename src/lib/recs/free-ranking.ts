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

import { cache } from "react";
import { readEdhrecCache } from "../edhrec/client";
import { loadSupportLists } from "../edhrec/support-read";
import { loadRoleTargetsForCommanders } from "../profile/role-targets";
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
 * card sleeved into a committed deck is physically unavailable; soft claims do
 * not, because a brew is a list, not a stack of sleeves. That asymmetry is the
 * whole point of the two severities.
 *
 * BASIC LANDS ARE ALWAYS FREE HERE, and that is inherited rather than decided.
 * `loadAvailability` excludes basics from the model entirely, so they have no
 * row, and a card with no row is kept. The reason is in that query's header: a
 * committed deck holds thirty-odd Forests that almost nobody's collection row
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
 * The free pool for a whole collection, or null where the availability rollup
 * would not read.
 *
 * Memoised per request because two callers want the same pool on one render:
 * the free ranking, which needs it to order the list, and the commander detail
 * page, which needs it to score the one commander that list linked to. Without
 * this the rollup — the most expensive query on either path — runs twice for
 * one page. `loadCollectionPool` is already React-cached, so the collection
 * read is shared for free.
 *
 * Null rather than a throw: an unreadable rollup is not an error page, it is
 * the free mode being unavailable, and both callers have an honest answer for
 * that (a disabled toggle, and the canonical score).
 */
export const loadFreePool = cache(async function loadFreePool(
  userId: string,
): Promise<PoolCard[] | null> {
  const { collection } = await loadCollectionPool(userId);
  try {
    // Scoped to the collection: `freePool` reads the map for nothing else, so
    // narrowing returns strictly fewer rows for the same answer. It does not
    // make the rollup cheaper — every CTE in that query is keyed on the user.
    const availability = await loadAvailability(userId, {
      oracleIds: collection.map((c) => c.oracleId),
    });
    return freePool(collection, availability);
  } catch {
    return null;
  }
});

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
 * CARRIED from canonical, never recomputed — the same rule as slugs and `synergyState`
 * above, and load-bearing for the same reason those are.
 *
 * A row's art is the printing the player owns, which is a fact about their collection and
 * not about which pool it was scored against: it is identical in both modes. But this
 * function rebuilds its rows out of `loadCollectionPool`, whose `imageUri` and
 * `artCropUri` are ORACLE-level — so without this the free rows differ from canonical in
 * exactly those two fields, `toFreeDelta` reports them as changed, and pressing
 * `Free only` repaints every row with the oracle art while the owned printing's NAME
 * stays (the key is absent from a free row, so it is never diffed). One printing's name
 * over another's picture, which is the defect this whole line of work exists to end.
 */
function carryCanonicalArt(
  items: CommanderListItem[],
  canonical: CommanderListItem[],
): CommanderListItem[] {
  const byOracleId = new Map(canonical.map((c) => [c.oracleId, c]));
  return items.map((i) => {
    const canon = byOracleId.get(i.oracleId);
    if (!canon) return i;
    return {
      ...i,
      imageUri: canon.imageUri,
      artCropUri: canon.artCropUri,
      printedName: canon.printedName,
    };
  });
}

/**
 * Ranks the candidate set against the free pool, narrowed to the commanders the
 * player could actually build from today.
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
 * scores identical to the other mode, or a list short by a row nothing on
 * screen accounts for. A list deliberately narrowed to what is free is a
 * different thing and returns `ok: true`; the count line and the aside beneath
 * it are what make that narrowing legible.
 *
 * `canonical` is the "everything I own" list, and it is the source of everything
 * about a row except its score and its presence. The CANDIDATE SET, so this can
 * only ever narrow that list and never add to it. Slugs, because a commander
 * absent from it has no canonical slug and any invented one would 404.
 * `synergyState`, because only canonical can tell an EDHREC outage apart from a
 * commander EDHREC does not index. The score is this function's to compute
 * because the pool changes it; the row's presence is this function's to decide
 * because the pool is what the mode is about.
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

  // The CANDIDATE SET comes from `canonical` and from nothing else. Canonical has
  // already applied the two filters this function used to re-apply: commander
  // candidacy, and "you have already built this one". Re-applying them looks like
  // a belt-and-braces no-op and is not one. It is a second, later reading of the
  // decks table, so a canonical list a generation behind the decks would come
  // back short here for a reason the reader cannot see, and with no way to tell
  // that apart from the deliberate narrowing below.
  //
  // Candidacy is a property of the collection: a commander you own but have
  // sleeved is still a commander you could unsleeve, and `All my cards` is the
  // mode that says so. What free mode answers is narrower — what could you build
  // TODAY — and the commander is the one card it used to exempt from that
  // question. A commander sitting in another deck's 99 therefore ranked here as
  // though it were on the table.
  //
  // So `canonical` is the list being ITERATED, not a set the collection is
  // tested against. Each entry is paired with its pool card here because both
  // halves are needed below, and a lookup that has already succeeded should not
  // be repeated behind a `!`.
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
  let pool: PoolCard[];
  if (preloaded) {
    pool = freePool(collection, preloaded.availability);
  } else {
    const loaded = await loadFreePool(userId);
    if (loaded === null) return { items: [], ok: false };
    pool = loaded;
  }

  // Free mode ranks the free pool and LISTS FROM IT. One rule, and it needs no
  // second read or severity test of its own: every commander candidate is a
  // member of the collection `freePool` just filtered, so its own claim has
  // already been answered. A spare copy keeps it, a brew's soft claim keeps it,
  // and a card with no availability row keeps it.
  //
  // Applied HERE rather than beside the guard above, and the order is the whole
  // of the difference between the two. That guard answers "the collection no
  // longer holds this commander" — a divergence between two reads, which
  // disables the toggle. This answers "it is sleeved", which is the feature, and
  // leaves the toggle live over a shorter list. Folding them together would
  // disable the control for exactly the case it exists to show.
  const freeOracleIds = new Set(pool.map((c) => c.oracleId));
  const buildable = candidates.filter(({ card }) => freeOracleIds.has(card.oracleId));

  // Both reads, for the same split as canonical: the index scores, the live
  // cache supplies `inclusionByName` for the role chips. Ruling D.
  const [edhrecCache, supportLists, roleTargets] = await Promise.all([
    readEdhrecCache(buildable.map((c) => c.card.oracleId)),
    loadSupportLists(buildable.map((c) => c.card.oracleId)),
    loadRoleTargetsForCommanders(buildable.map((c) => c.card)),
  ]);
  const scored = buildable.map(({ card: commander, canon }) => {
    // The row holds unparsed JSON, so it has to go through parseEdhrecPayload
    // before it has `inclusionByName`. An unexpected shape degrades to nulls,
    // which only costs the role chips their figures — the score comes from the
    // index and is unaffected by a malformed cache row.
    const cached = edhrecCache.get(commander.oracleId);
    const parsed = cached ? parseEdhrecPayload(cached.payload) : null;
    return {
      ...scoreCommander({
        commander,
        collection: pool,
        roleTargets: roleTargets.get(commander.oracleId)!.targets,
        support: supportLists.get(commander.oracleId) ?? null,
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
  return { items: carryCanonicalArt(ranked.map(toListItem), canonical), ok: true };
}
