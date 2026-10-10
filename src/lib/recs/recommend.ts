import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems } from "../../db/schema";
import { ownedCardsWhere } from "../collection/owned-cards";
import { commanderSlug } from "../edhrec/slug";
import { readEdhrecCache, resolveEdhrecData } from "../edhrec/client";
import { supportOverlap } from "../edhrec/support-overlap";
import { loadSupportLists } from "../edhrec/support-read";
import { loadRoleTargetsForCommanders } from "../profile/role-targets";
import { loadPoolRoleBasis, type LabelCheck } from "./pool-role-basis";
import type { ProfileRoleTargets } from "../profile/types";
import { scoringSynergyState, type SynergyState } from "./synergy-state";
import { committedSupport, readCommittedDecks, withCommitted } from "../decks/committed";
import {
  commanderPool,
  isCommanderCandidate,
  scoreCommander,
  type CommanderScore,
  type PoolCard,
  type RoleCard,
  type RoleName,
} from "./score";
import { receiptsPreview } from "./format";

export type RankedCommander = CommanderScore & { slug: string; synergyState: SynergyState };

/**
 * What the detail page scores, which is a ranked commander plus the one figure
 * only that page asks for. The list compute does not pay for it: no list surface
 * names a deck.
 */
export type CommanderDetailScore = RankedCommander & {
  committedSupport: { count: number; topDeck: string | null };
  /**
   * The name printed on the copy the player owns, where it differs. Applied by the page
   * through `withOwnedCardArt`, not by the scorer — see the note at that call site.
   * Absent for a commander they do not own, which on this page is an ordinary case:
   * `/discover` links here too.
   */
  printedName?: string | null;
  /**
   * The role targets the score was graded against, and where they came from. Role Coverage
   * and "Why this commander" read the same ones, so the page cannot grade the fit against one
   * standard and draw its role panels against another.
   */
  roleTargets: ProfileRoleTargets;
};

/**
 * Slim payload for the client-side list view. The full RankedCommander carries
 * heavy detail-only fields (oracleText, roleCards, overlapMissing) that the
 * list never renders — stripping them keeps the serialized RSC payload small.
 */
export type CommanderListItem = Pick<
  RankedCommander,
  | "oracleId"
  | "slug"
  | "name"
  | "typeLine"
  | "colorIdentity"
  | "colorPoolSize"
  | "roleCounts"
  | "edhrecOwnedCount"
  | "edhrecTotal"
  | "fitPool"
  | "fitRoles"
  | "fitSynergy"
  | "synergyState"
  | "score"
  | "rankScore"
  | "measurableTotal"
  | "imageUri"
  | "artCropUri"
> & {
  /** Preformatted receipts line — overlapOwned can be large, so only the
      rendered preview string ships to the client. */
  receipts: string;
  /**
   * The name printed on the copy the player owns, where it differs from the oracle
   * card's. Null when they own no copy of this commander, or when the copy they own
   * prints the oracle name — which is almost every printing.
   *
   * Never set by this module, and not by `getRankedList` either — both answer out of the
   * catalog, and which printing the player holds is a different question. It is applied
   * at the DRAW, through `withOwnedCardArt`: `loadCommanderRankings` for the whole
   * `/commanders` lane, Home for its ready slice alone. Anything reading a ranked item
   * and expecting this field has to enrich it first; a shared loader doing it for
   * everyone is what made Home pay a printings join for rows it never draws.
   *
   * Optional for the reason the deck payloads' twin is: fixtures across the suite build
   * these literals without touching the catalog, and absent means null.
   */
  printedName?: string | null;
};

export function toListItem(r: RankedCommander): CommanderListItem {
  return {
    oracleId: r.oracleId,
    slug: r.slug,
    name: r.name,
    typeLine: r.typeLine,
    colorIdentity: r.colorIdentity,
    colorPoolSize: r.colorPoolSize,
    roleCounts: r.roleCounts,
    edhrecOwnedCount: r.edhrecOwnedCount,
    edhrecTotal: r.edhrecTotal,
    receipts: receiptsPreview(r.overlapOwned),
    fitPool: r.fitPool,
    fitRoles: r.fitRoles,
    fitSynergy: r.fitSynergy,
    synergyState: r.synergyState,
    score: r.score,
    rankScore: r.rankScore,
    measurableTotal: r.measurableTotal,
    imageUri: r.imageUri,
    artCropUri: r.artCropUri,
  };
}

export type RecommendResult = {
  results: RankedCommander[];
  degraded: boolean;
  uniqueCardsRead: number;
  candidateCount: number;
  /**
   * True when the list was counted by the classifier only because the label read FAILED with the
   * switch on. It is served, but a writer must not persist it: `commander_scores` records no
   * basis, so a stored fallback would outlive the outage (labels-everywhere PR 5). Absent on
   * every other result.
   */
  labelFallback?: true;
  /** What the label sets were read as, handed to `persistScores` so it can drop a write whose labels moved. */
  labelCheck?: LabelCheck;
};

/**
 * Orders by `rankScore`, which is now the same number the card prints: `scoreCommander`
 * sets `rankScore` equal to `score` for every commander. The two used to differ for a
 * commander EDHREC does not index, whose 40-point score was rescaled to 100 here so that a
 * gap in our data would not demote it. Because the weights are 15 + 25 + 60, that rescale
 * touched no other commander, and it handed the top of the list to the ones we know least
 * about. Retired 2026-09-16; the field stays because it is a persisted column that
 * `loadScores` orders by in SQL.
 *
 * oracleId breaks ties so the compute order matches `rank_score desc, oracle_id`
 * in loadScores/findScoredCommander. Without it, tied commanders (common after
 * rounding) could swap places between a fresh compute and a persisted read,
 * moving both their rank and their dedup slug suffix. Comparing the canonical
 * UUID strings matches Postgres' byte ordering — the dashes sit at fixed offsets.
 */
export function byScoreThenOracleId(
  a: { rankScore: number; oracleId: string },
  b: { rankScore: number; oracleId: string },
): number {
  if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
  if (a.oracleId === b.oracleId) return 0;
  return a.oracleId < b.oracleId ? -1 : 1;
}

/**
 * Pure post-processing step: assigns unique slugs in rank order and wraps
 * counts. Exported for unit testing without a live database.
 */
/**
 * SLUG STABILITY, and the one migration it cost.
 *
 * Suffixes are assigned in rank order over every candidate, BUILT ONES INCLUDED,
 * which is what decouples a slug from deck state: building a deck around one of
 * two same-named commanders no longer renumbers the other, and deleting that deck
 * does not renumber it back. The slug moves only when the score moves.
 *
 * The writer before this one excluded built commanders before scoring, so a
 * collision group's suffixes depended on which of its members had decks. Those
 * sets are all condemned by `SCORE_WRITER_CURRENT`, so every slug is recomputed
 * once — and inside a collision group a link made before that recompute can now
 * name a different member, or a built one, which has no page and 404s.
 *
 * MEASURED, because the size of that is the whole question: on the production
 * catalog there are ZERO commander-legal names carried by more than one oracle
 * id, and zero inside any collection in the database. The group this can reach is
 * empty today. It is written down rather than engineered around because a
 * redirect would have to guess which member of a collision group an old link
 * meant, and guessing is what the dedup exists to prevent.
 */
export function finalizeRecommendations(
  results: (CommanderScore & { synergyState: SynergyState })[],
  uniqueCardsRead: number,
  candidateCount: number,
): Omit<RecommendResult, "degraded"> {
  const seen = new Map<string, number>();
  const ranked: RankedCommander[] = results.map((r) => {
    const base = commanderSlug(r.name);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return { ...r, slug: n === 1 ? base : `${base}-${n}` };
  });
  return { results: ranked, uniqueCardsRead, candidateCount };
}

/**
 * The scoring pool for one user. Extracted so the detail page can score a
 * single commander without re-running the whole fanout.
 *
 * Request-scoped, the same way `getRankedList` and `getCollectionStats` are.
 * `/commanders` needs the pool for the receipt clause on every load, and on the
 * recompute path `recommendCommanders` needs it too, so without this a cold load
 * paid for the same query twice. It is a pure read of one user's collection with
 * no writer inside a request, so a cached one cannot go stale mid-render.
 */
export const loadCollectionPool = cache(async function loadCollectionPool(
  userId: string,
): Promise<{ collection: (PoolCard & { layout: string | null })[]; uniqueCardsRead: number }> {
  const owned = await db
    .selectDistinctOn([cards.oracleId], {
      oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
      oracleText: cards.oracleText, keywords: cards.keywords,
      colorIdentity: cards.colorIdentity, commanderLegal: cards.commanderLegal,
      imageUri: cards.imageUri, artCropUri: cards.artCropUri, manaCost: cards.manaCost,
      // Read by isCommanderCandidate, which refuses a melded card (#712).
      layout: cards.layout,
    })
    .from(collectionItems)
    .innerJoin(cards, eq(collectionItems.oracleId, cards.oracleId))
    // Not commanderLegalOnly: uniqueCardsRead below counts the whole
    // collection, so legality is filtered in JS rather than in SQL.
    .where(ownedCardsWhere(userId, { commanderLegalOnly: false }))
    // Postgres requires DISTINCT ON expressions to lead the ORDER BY.
    .orderBy(cards.oracleId);

  // Score against commander-legal cards only, matching the deck-suggestion and
  // search pools — banned/not-legal cards must not inflate pool size, role
  // counts, or EDHREC overlap.
  return { collection: owned.filter((c) => c.commanderLegal), uniqueCardsRead: owned.length };
});

/** One card as a `PoolCard`, for a commander outside the player's collection. */
async function loadPoolCard(oracleId: string): Promise<PoolCard | null> {
  const [row] = await db
    .select({
      oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
      oracleText: cards.oracleText, keywords: cards.keywords,
      colorIdentity: cards.colorIdentity, imageUri: cards.imageUri,
      artCropUri: cards.artCropUri, manaCost: cards.manaCost,
      // Read by isCommanderCandidate, which refuses a melded card (#712).
      layout: cards.layout,
    })
    .from(cards)
    // Commander legality is part of the lookup, not a later check: the pool this
    // card joins is already filtered to commander-legal cards, so a banned or
    // non-legal oracle id must read as "no such commander" rather than score.
    .where(and(eq(cards.oracleId, oracleId), eq(cards.commanderLegal, true)))
    .limit(1);
  // Two different questions, and both have to be asked. `commanderLegal` is
  // format legality — an Instant carries it — while `isCommanderCandidate` is
  // whether the card can be the commander at all. A crafted URL naming a legal
  // non-commander would otherwise render as one, and spend an EDHREC resolve
  // finding that out.
  if (!row || !isCommanderCandidate(row)) return null;
  return row;
}

export async function recommendCommanders(
  userId: string,
): Promise<RecommendResult> {
  const { collection, uniqueCardsRead } = await loadCollectionPool(userId);

  // EVERY commander candidate the collection holds, built ones included. The
  // "what should I build next" exclusion is the READ's, in `getRankedList`, and
  // it must not be applied here: this result is what `persistScores` writes, and
  // that write deletes every row it does not name. Filtering first therefore
  // evicted a commander from `commander_scores` the moment a deck was built
  // around it — and because a warm store short-circuits the recompute, deleting
  // that deck never brought it back. Only a fresh CSV upload, which clears the
  // table outright, did.
  //
  // Scoring a handful of built commanders costs their EDHREC resolves, and those
  // are already in the same cache read below.
  const candidates = collection.filter(isCommanderCandidate);

  // One cache read for the whole fanout — a per-commander SELECT here meant
  // ~196 round-trips on every compute, warm or cold.
  // The live read still happens, for `inclusionByName` and for `synergyState`:
  // the role chips keep the fresher figures, and an EDHREC outage still has to
  // be describable. What moved to the index is the SCORE — Ruling D.
  // The labels are read first: the targets follow the basis they come back under.
  const { basis, roleSets, fellBack, labelCheck } = await loadPoolRoleBasis(collection);
  const [edhrecCache, supportLists, roleTargets] = await Promise.all([
    readEdhrecCache(candidates.map((c) => c.oracleId)),
    loadSupportLists(candidates.map((c) => c.oracleId)),
    loadRoleTargetsForCommanders(candidates, basis),
  ]);

  // Fetch EDHREC data with bounded concurrency: sequential awaits would make
  // cold loads with dozens of candidates exceed the page's time budget.
  const CONCURRENCY = 5;
  const results: (CommanderScore & { synergyState: SynergyState })[] = [];
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const scored = await Promise.all(
      candidates.slice(i, i + CONCURRENCY).map(async (commander) => {
        const result = await resolveEdhrecData(
          commander.oracleId, commander.name, edhrecCache.get(commander.oracleId),
        );
        const support = supportLists.get(commander.oracleId) ?? null;
        const scored = scoreCommander({
          commander, collection,
          roleTargets: roleTargets.get(commander.oracleId)!.targets,
          roleSets,
          support,
          inclusionByName: result.data?.inclusionByName ?? null,
        });
        return {
          ...scored,
          // Keyed off the FIGURE, not off a second reading of the index, so the
          // pair `commander_scores` constrains cannot come apart however
          // `scoreCommander` decides a total is usable.
          synergyState: scoringSynergyState(result, scored.fitSynergy !== null),
        };
      }),
    );
    results.push(...scored);
  }
  results.sort(byScoreThenOracleId);

  // DERIVED FROM THE ROWS, by the same rule `loadScores` uses
  // (`store.ts:243` — rows whose `synergyState` is "degraded"), so the cold
  // response and the warm one cannot describe the same list differently.
  //
  // It used to be set on any `result.unreachable` during the fanout, and after
  // Ruling D that became a lie: an outage no longer costs an indexed commander
  // its synergy, because the figure comes from the stored index. A cold load
  // during an outage would raise the banner — "receipts are hidden, this score
  // is out of 40" — over rows that scored out of 100 and carry receipts, and
  // then the banner would vanish once the set persisted, because `loadScores`
  // asks the rows. One rule, asked in one place, cannot do that.
  const degraded = results.some((r) => r.synergyState === "degraded");

  const finalized = finalizeRecommendations(results, uniqueCardsRead, candidates.length);
  return {
    ...finalized, degraded,
    ...(fellBack ? { labelFallback: true as const } : {}),
    ...(labelCheck ? { labelCheck } : {}),
  };
}

/**
 * Full score for a single commander, for the detail page. Costs one collection
 * query plus one EDHREC resolve instead of the ~196 the fanout would do.
 * Returns null when the oracle id names no commander-legal card — either
 * because no card carries that id, or because the card it names cannot be a
 * commander. Both are "no such commander" to this page.
 *
 * `pool` is the set of cards the commander is SCORED against, defaulting to the
 * whole collection. The detail page passes the free pool when it was reached
 * from a free-ranked list, so the figure it draws is the figure that list drew
 * — the same rule `rankFree` follows, and the reason it is a parameter rather
 * than a mode this function resolves: availability belongs to the route that
 * read the URL, and importing it here would close a cycle back through
 * free-ranking.
 *
 * Candidacy still comes from the collection, never from the pool: a commander
 * you own but have sleeved is still a commander you could unsleeve.
 */
export async function scoreOneCommander(
  userId: string,
  oracleId: string,
  slug: string,
  pool?: PoolCard[],
): Promise<CommanderDetailScore | null> {
  const { collection } = await loadCollectionPool(userId);
  // A discovery commander is by definition one the player may not own, so a
  // collection miss is an ordinary case here rather than a 404. The pool and the
  // role logic are unaffected: `commanderPool` already excludes the commander
  // itself, and a commander outside the collection was never in the pool.
  const commander =
    collection.find((c) => c.oracleId === oracleId) ?? (await loadPoolCard(oracleId));
  if (!commander) return null;

  // The collection's labels, whichever pool is scored: a free pool is a subset of it.
  const { basis, roleSets } = await loadPoolRoleBasis(collection);
  const [edhrecCache, supportLists, roleTargets] = await Promise.all([
    readEdhrecCache([oracleId]),
    loadSupportLists([oracleId]),
    loadRoleTargetsForCommanders([commander], basis),
  ]);
  const support = supportLists.get(oracleId) ?? null;
  const targets = roleTargets.get(oracleId)!;
  const [result, committed] = await Promise.all([
    resolveEdhrecData(oracleId, commander.name, edhrecCache.get(oracleId)),
    readCommittedDecks(userId),
  ]);
  const scored = scoreCommander({
    commander, collection: pool ?? collection,
    roleTargets: targets.targets,
    roleSets,
    support,
    inclusionByName: result.data?.inclusionByName ?? null,
  });

  // Marked here rather than inside `scoreCommander`: this is the only caller
  // that draws card rows, so the ranked list does not pay for the aggregate.
  const roleCards = Object.fromEntries(
    Object.entries(scored.roleCards).map(([role, cards]) => [role, withCommitted(cards, committed)]),
  ) as Record<RoleName, RoleCard[]>;

  // Ownership, not availability, so this overlap is taken over the collection
  // even in free mode. `scored.overlapOwnedIds` is the free pool's, and a card
  // sleeved into a committed deck is exactly what that pool leaves out — asking
  // it which decks hold these cards could only ever answer "none".
  const ownedOverlapIds =
    pool && support
      ? supportOverlap(support, commanderPool(commander, collection)).oracleIds
      : scored.overlapOwnedIds;

  return {
    ...scored,
    roleCards,
    slug,
    synergyState: scoringSynergyState(result, scored.fitSynergy !== null),
    committedSupport: committedSupport(ownedOverlapIds, committed),
    roleTargets: targets,
  };
}
