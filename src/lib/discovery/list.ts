import type { Availability } from "../decks/availability";
import { loadAvailability } from "../decks/availability-query";
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
  /** `YYYY-MM-DD`, or null for an undated set. The rack's `Recently released`
      order reads it on the client; nothing on the server sorts by it, so the
      ranks the payload carries are unaffected. */
  releasedAt: string | null;
  /** Position in the active ordering, over every item this list carries — so a
      client-side colour filter never renumbers what it leaves behind. It is not
      a position in `candidateCount`: under `new`, the untagged and the
      below-floor are already gone, and `floorExcluded` counts the second group. */
  rank: number;
  ownedSupport: number;
  /** The same count over the whole collection, which is what the novelty floor
      is decided on. It rides on the item because the floor is applied here,
      over the enriched rows, and a floor that read `ownedSupport` would move
      with whatever pool the ranking was scoped to. Equal to `ownedSupport`
      unless the ranking is scoped to a smaller pool. */
  collectionSupport: number;
  edhrecTotal: number | null;
  colorPoolSize: number;
  roleCounts: Record<RoleName, number>;
  /** Null when the availability read failed. The rollup would report zeros in
      that case, and a zero here is a claim — "nothing you own is committed" —
      that a failed read cannot support. */
  counts: ReceiptCounts | null;
  price: PriceSlot;
  tagTotal: number;
  unplayedLabels: string[];
  unplayedCount: number;
  nearestDeck: { deckName: string; sharedLabels: string[]; extraShared: number } | null;
  /** This commander's own support percentage — `ownedSupport` over
      `edhrecTotal`. Named for what it measures rather than for the threshold it
      is measured against: `floorPct` is the threshold, and the two figures
      appear in the same sentence. */
  supportPct: number | null;
};

export type DiscoveryList = {
  items: DiscoveryItem[];
  /** Every candidate this scope found, counted before any exclusion — the
      novelty sort's two, and the client's colour filter. `items.length` is the
      same number under `fit` and a smaller one under `new`. */
  candidateCount: number;
  /** Collection size the subtitle reads against. */
  cardsRead: number;
  /** Cards in the pool this ranking actually scored — now always `cardsRead`,
      because the lane scores against the whole collection. Kept as its own
      field only while the pool empty state still reads it. */
  freePoolSize: number;
  /** Highest floor percentage among candidates the floor excluded — the number
      `empty.floorBody` needs so 30% does not read as arbitrary. Null when the
      floor excluded nothing, or when no candidate had a denominator. */
  bestPct: number | null;
  /** How many candidates the floor measured and removed. An empty `items` under
      `new` means "nothing had a distance to measure" when this is 0 and "the
      floor took them all" when it is not — the empty states render a different
      thing for each, and `bestPct` alone cannot tell them apart. */
  floorExcluded: number;
  /** Of `floorExcluded`, how many would have cleared the floor against the whole
      collection. Always 0: the whole collection is the only pool this lane
      scores, so there is no narrower one for the floor to have judged them by. */
  poolExcluded: number;
  /** Candidates the floor could not measure at all — no tags, or no EDHREC
      denominator. Neither ranked nor floor-excluded, and the third term the
      exclusion line needs for `candidateCount - items - floorExcluded -
      unmeasured` to come to zero. Always 0 under `fit`, which excludes nothing. */
  unmeasured: number;
  hasDecks: boolean;
  /** False when the availability read failed. The ranking still stands — it never
      depended on availability — but the receipt counts do, and an empty map
      reports them as zeros rather than as unknown unless this flag is read
      alongside them. */
  availOk: boolean;
  /** One entry per built deck, its commander's colour identity. The filtered
      built clause counts against it; nothing else reads it. */
  deckIdentities: string[][];
  sort: "fit" | "new";
};

export function assembleDiscovery(input: {
  candidates: CandidateRow[];
  playedTags: DeckTagSet[];
  prices: Map<string, PriceAggRow>;
  rollup: PoolRollup;
  cardsRead: number;
  freePoolSize: number;
  sort: "fit" | "new";
  availOk: boolean;
}): DiscoveryList {
  const played = new Set(input.playedTags.flatMap((d) => [...d.slugs]));
  const orderedDecks = orderDeckSets(input.playedTags);

  const withSlugs = assignDiscoverySlugs(input.candidates);

  const enriched = withSlugs.map((c) => {
    const unplayed = unplayedTags(c.tags, played);
    const rollup = rollupFor(input.rollup, c);
    return {
      ...rollup,
      // The rollup counts an empty availability map as zero committed cards,
      // which is the right answer when the read succeeded and the wrong one when
      // it failed. The pool size and role counts do not depend on availability
      // and stand either way; only the receipt counts are unknown.
      counts: input.availOk ? rollup.counts : null,
      oracleId: c.oracleId, slug: c.slug, name: c.name,
      colorIdentity: c.colorIdentity, imageUri: c.imageUri,
      releasedAt: c.releasedAt,
      ownedSupport: c.ownedSupport,
      collectionSupport: c.collectionSupport,
      edhrecTotal: c.edhrecTotal,
      price: slotFor(input.prices.get(c.oracleId)),
      tagTotal: c.tags.length,
      unplayedLabels: unplayed.map((t) => t.label),
      unplayedCount: unplayed.length,
      nearestDeck: nearestDeck(c.tags, orderedDecks),
      supportPct: floorPct(c),
    };
  });

  // The novelty sort excludes on two different failures: a commander with no
  // distance to measure (ruling 5), and one whose distance the player could not
  // act on (ruling 4). Both leave the list; only the second feeds `bestPct`.
  //
  // A tagged commander with no EDHREC denominator is the first kind, not the
  // second — the parser yields tags from a page whose card list can be missing,
  // and a floor that cannot be measured was never cleared or missed. Counting it
  // as floor-excluded would leave `floorExcluded > 0` with a null `bestPct`, and
  // the floor empty state would promise a nearest miss it cannot name.
  const measurable = (c: { tagTotal: number; supportPct: number | null }) =>
    c.tagTotal > 0 && c.supportPct != null;

  const active =
    input.sort === "new"
      ? enriched.filter((c) => measurable(c) && clearsFloor(c))
      : enriched;

  const excluded =
    input.sort === "new"
      ? enriched.filter((c) => measurable(c) && !clearsFloor(c))
      : [];
  // Every member has a `supportPct` by construction; the null branch is the
  // narrowing, not a case.
  const bestPct = excluded.reduce<number | null>(
    (best, c) =>
      c.supportPct == null ? best : best == null ? c.supportPct : Math.max(best, c.supportPct),
    null,
  );

  // The sub-group of the floor-excluded that a full-collection ranking would
  // have kept — and there can no longer be one. The floor is now decided on
  // `collectionSupport`, so a row it excluded was excluded against everything
  // the player owns: the narrowed pool has no rows left to take. Zero rather
  // than a filter that can only ever return zero, so the reason is readable
  // instead of having to be re-derived from `clearsFloor`'s argument.
  const poolExcluded = 0;

  const ordered = [...active].sort(input.sort === "new" ? byNovelty : byFit);

  return {
    items: ordered.map((item, i) => ({ ...item, rank: i + 1 })),
    candidateCount: input.candidates.length,
    cardsRead: input.cardsRead,
    freePoolSize: input.freePoolSize,
    bestPct,
    floorExcluded: excluded.length,
    poolExcluded,
    unmeasured: input.candidates.length - active.length - excluded.length,
    hasDecks: input.playedTags.length > 0,
    availOk: input.availOk,
    deckIdentities: input.playedTags.map((d) => d.colorIdentity),
    sort: input.sort,
  };
}

/**
 * The pool a discovery ranking scores against: the whole collection, always.
 *
 * The discover lane has no availability control — availability was documented as
 * scoring-only but the novelty floor read whichever pool it selected, so the
 * choice silently removed rows. One pool, one owner, no way to ask for another.
 *
 * Exported because slug resolution needs the same pool the list ranked against
 * but not the rest of the list's work: a rank derived from a different pool
 * would have the detail page and the row it was reached from disagree.
 */
export async function loadDiscoveryPool(userId: string) {
  const { collection } = await loadCollectionPool(userId);

  let availability = new Map<string, Availability>();
  let availOk = true;
  try {
    availability = await loadAvailability(userId, {
      oracleIds: collection.map((c) => c.oracleId),
    });
  } catch {
    // Fail soft, exactly as the owned scope does: the receipt clause is lost,
    // the ranking is not. `availOk` is what stops the loss being silent — an
    // empty map counts every owned card as uncommitted, which is a claim rather
    // than an absence of one.
    availOk = false;
  }

  return { collection, availability, availOk };
}

/**
 * The discover ranking, scored against everything the player owns.
 *
 * Only the active sort is computed. The owned scope ships both of its rankings
 * so its toggle is a client swap; at 3,334 rows two payloads is the wrong trade,
 * and the handoff already permits a sort flip to be a fetch.
 */
export async function loadDiscovery(
  userId: string,
  opts: { sort: "fit" | "new" },
): Promise<DiscoveryList> {
  const { collection, availability, availOk } = await loadDiscoveryPool(userId);
  // One oracle-id set, so the second support aggregate has nothing to add: the
  // ranked pool and the collection are the same pool.
  const candidates = await loadCandidates(
    userId,
    collection.map((c) => c.oracleId),
  );

  const [prices, playedTags] = await Promise.all([
    loadPrices(candidates.map((c) => c.oracleId)),
    loadPlayedTags(userId),
  ]);

  return assembleDiscovery({
    availOk,
    candidates,
    playedTags,
    prices,
    rollup: buildPoolRollup(collection, availability),
    cardsRead: collection.length,
    freePoolSize: collection.length,
    // Ruling 8's gate, applied here rather than at the route: novelty measures
    // distance from what you have built, and `playedTags` is already the answer
    // to whether anything has been. Asking the route to check would mean a second
    // read of `decks` on every discovery request.
    sort: playedTags.length > 0 ? opts.sort : "fit",
  });
}
