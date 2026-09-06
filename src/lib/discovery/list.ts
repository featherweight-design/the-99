import type { Availability } from "../decks/availability";
import { loadAvailability } from "../decks/availability-query";
import { freePool } from "../recs/free-ranking";
import { loadCollectionPool } from "../recs/recommend";
import { buildPoolRollup, rollupFor, type PoolRollup } from "../recs/pool-rollup";
import type { ReceiptCounts } from "../commanders/in-use";
import type { RoleName } from "../recs/score";
import { loadCandidates, type CandidateRow } from "./candidates";
import { loadPrices, slotFor, type PriceAggRow, type PriceSlot } from "./price";
import { assignDiscoverySlugs } from "./slugs";
import {
  byFit, byNovelty, clearsFloor, floorPct, loadPlayedTags, nearestDeck, orderDeckSets,
  unplayedTags, type DeckTagSet,
} from "./novelty";

export type DiscoveryItem = {
  oracleId: string;
  slug: string;
  name: string;
  colorIdentity: string[];
  imageUri: string | null;
  /** Position in the active ordering, over every item this list carries — so a
      client-side colour filter never renumbers what it leaves behind. It is not
      a position in `candidateCount`: under `new`, the untagged and the
      below-floor are already gone, and `floorExcluded` counts the second group. */
  rank: number;
  owned: boolean;
  ownedSupport: number;
  edhrecTotal: number | null;
  colorPoolSize: number;
  roleCounts: Record<RoleName, number>;
  counts: ReceiptCounts;
  price: PriceSlot;
  tagTotal: number;
  unplayedLabels: string[];
  unplayedCount: number;
  nearestDeck: { deckName: string; sharedLabels: string[]; extraShared: number } | null;
  floorPct: number | null;
};

export type DiscoveryList = {
  items: DiscoveryItem[];
  /** Every candidate this scope found, counted before any exclusion — the
      novelty sort's two, and the client's colour filter. `items.length` is the
      same number under `fit` and a smaller one under `new`. */
  candidateCount: number;
  /** Collection size the subtitle reads against. */
  cardsRead: number;
  /** Highest floor percentage among candidates the floor excluded — the number
      `empty.floorBody` needs so 30% does not read as arbitrary. Null when the
      floor excluded nothing, or when no candidate had a denominator. */
  bestPct: number | null;
  /** How many tagged candidates the floor removed. An empty `items` under
      `new` means "everything is untagged" when this is 0 and "the floor took
      them all" when it is not — the empty states render a different thing for
      each, and `bestPct` alone cannot tell them apart. */
  floorExcluded: number;
  hasDecks: boolean;
  /** False when the availability read failed. The ranking still stands, but under
      `avail: "free"` it scored the whole collection: `freePool` keeps ids the map
      is missing, so a failed read is indistinguishable from a fully free pool
      unless this flag is read alongside it. */
  availOk: boolean;
  /** One entry per built deck, its commander's colour identity. The filtered
      built clause counts against it; nothing else reads it. */
  deckIdentities: string[][];
  sort: "fit" | "new";
};

export function assembleDiscovery(input: {
  candidates: CandidateRow[];
  ownedOracleIds: Set<string>;
  playedTags: DeckTagSet[];
  prices: Map<string, PriceAggRow>;
  rollup: PoolRollup;
  cardsRead: number;
  sort: "fit" | "new";
  availOk: boolean;
}): DiscoveryList {
  const played = new Set(input.playedTags.flatMap((d) => [...d.slugs]));
  const orderedDecks = orderDeckSets(input.playedTags);

  const withSlugs = assignDiscoverySlugs(input.candidates);

  const enriched = withSlugs.map((c) => {
    const unplayed = unplayedTags(c.tags, played);
    const owned = input.ownedOracleIds.has(c.oracleId);
    return {
      ...rollupFor(input.rollup, c),
      oracleId: c.oracleId, slug: c.slug, name: c.name,
      colorIdentity: c.colorIdentity, imageUri: c.imageUri,
      owned,
      ownedSupport: c.ownedSupport,
      edhrecTotal: c.edhrecTotal,
      price: slotFor(input.prices.get(c.oracleId), owned),
      tagTotal: c.tags.length,
      unplayedLabels: unplayed.map((t) => t.label),
      unplayedCount: unplayed.length,
      nearestDeck: nearestDeck(c.tags, orderedDecks),
      floorPct: floorPct(c),
    };
  });

  // The novelty sort has two exclusions and they are different failures:
  // an untagged commander has no distance to measure (ruling 5), and a
  // commander below the floor has a distance the player could not act on
  // (ruling 4). Both leave the list; only the second feeds `bestPct`.
  const active =
    input.sort === "new"
      ? enriched.filter((c) => c.tagTotal > 0 && clearsFloor(c))
      : enriched;

  const excluded =
    input.sort === "new"
      ? enriched.filter((c) => c.tagTotal > 0 && !clearsFloor(c))
      : [];
  const bestPct = excluded.reduce<number | null>(
    (best, c) =>
      c.floorPct == null ? best : best == null ? c.floorPct : Math.max(best, c.floorPct),
    null,
  );

  const ordered = [...active].sort(input.sort === "new" ? byNovelty : byFit);

  return {
    items: ordered.map((item, i) => ({ ...item, rank: i + 1 })),
    candidateCount: input.candidates.length,
    cardsRead: input.cardsRead,
    bestPct,
    floorExcluded: excluded.length,
    hasDecks: input.playedTags.length > 0,
    availOk: input.availOk,
    deckIdentities: input.playedTags.map((d) => d.colorIdentity),
    sort: input.sort,
  };
}

/**
 * The pool a discovery ranking scores against, under one `avail`.
 *
 * Exported because slug resolution needs the same pool the list ranked against
 * but not the rest of the list's work: a rank derived from a different pool
 * would have the detail page and the row it was reached from disagree.
 */
export async function loadDiscoveryPool(userId: string, avail: "all" | "free") {
  const { collection } = await loadCollectionPool(userId);

  let availability = new Map<string, Availability>();
  let availOk = true;
  try {
    availability = await loadAvailability(userId, {
      oracleIds: collection.map((c) => c.oracleId),
    });
  } catch {
    // Fail soft, exactly as the owned scope does: the clause and `What's free`
    // are lost, the ranking is not. `availOk` is what stops the loss being
    // silent — `freePool` keeps ids the map is missing, so an empty map under
    // `avail: "free"` ranks the whole collection while looking like a free pool.
    availOk = false;
  }

  const scored = avail === "free" ? freePool(collection, availability) : collection;
  return { collection, availability, scored, availOk };
}

/**
 * `avail: "free"` swaps the owned oracle-id set for the free pool's and changes
 * nothing else — the free ranking is the same question asked of a smaller pool,
 * the way `rankFree` already treats it. It re-ranks and it does not annotate:
 * `ScoreDelta` has no place under discovery, because there is no `score /100`
 * for it to be a delta of.
 *
 * Only the active (sort, avail) pair is computed. The owned scope ships both
 * rankings so its toggle is a client swap; at 3,334 rows two payloads is the
 * wrong trade, and the handoff already permits a sort flip to be a fetch.
 */
export async function loadDiscovery(
  userId: string,
  opts: { sort: "fit" | "new"; avail: "all" | "free" },
): Promise<DiscoveryList> {
  const { collection, availability, scored, availOk } =
    await loadDiscoveryPool(userId, opts.avail);
  const candidates = await loadCandidates(userId, scored.map((c) => c.oracleId));

  const [prices, playedTags] = await Promise.all([
    loadPrices(candidates.map((c) => c.oracleId)),
    loadPlayedTags(userId),
  ]);

  return assembleDiscovery({
    availOk,
    candidates,
    ownedOracleIds: new Set(collection.map((c) => c.oracleId)),
    playedTags,
    prices,
    rollup: buildPoolRollup(scored, availability),
    cardsRead: collection.length,
    sort: opts.sort,
  });
}
