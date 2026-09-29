import type { Availability } from "../decks/availability";
import { loadAvailability } from "../decks/availability-query";
import { loadCollectionPool } from "../recs/recommend";
import { buildPoolRollup, rollupFor, type PoolRollup } from "../recs/pool-rollup";
import { loadCandidates, type CandidateRow } from "./candidates";
import { readPrices, slotFor, type PriceAggRow, type PriceSlot } from "./price";
import { computeFit } from "../recs/score";
import { gapSlotFor, type GapSlot } from "../edhrec/gap-slot";
import { assignDiscoverySlugs } from "./slugs";
import {
  byFit, byNovelty, clearsFloor, floorPct, loadPlayedTags, nearestDeck, orderDeckSets,
  unplayedTags, type DeckTagSet,
} from "./novelty";

export type DiscoveryItem = {
  slug: string;
  name: string;
  colorIdentity: string[];
  artCropUri: string | null;
  /** `YYYY-MM-DD`, or null for an undated set. The rack's `Recently released`
      order reads it on the client; nothing on the server sorts by it, so the
      ranks the payload carries are unaffected. */
  releasedAt: string | null;
  /** How many decks EDHREC counted, or null where the index carried no figure.
      Read on the client twice: the row prints it, and the `Popularity` order
      ranks on it. Like `releasedAt`, nothing on the server sorts by it. */
  deckCount: number | null;
  /** Position in the active ordering, over every item this list carries — so a
      client-side colour filter never renumbers what it leaves behind. It is not
      a position in `candidateCount`: under `new`, the untagged and the
      below-floor are already gone, and `floorExcluded` counts the second group. */
  rank: number;
  price: PriceSlot;
  /**
   * The one stored sentence about how this commander's decks tend to play, or
   * null where none has been generated — which renders as NO PARAGRAPH rather
   * than as a placeholder.
   *
   * The largest single addition to this payload and the reason its byte guard
   * exists: every sentence is distinct, so the dictionary cannot fold them the
   * way it folds theme labels.
   */
  prose: string | null;
  /**
   * Which mechanics the reader has never built, decided on the SERVER as one
   * tagged union — never `labels.length === 0` re-read per surface. Both lanes
   * draw what they are given, which is what keeps the three states from being
   * re-derived and what gives the "decide on the classifier's output, not on
   * `tags.length`" ruling exactly one home.
   */
  gapSlot: GapSlot;
  /**
   * Fit. The row's headline, and the same figure `/commanders` and Commander
   * Details print — Ruling D.
   *
   * NORMALLY 0..`measurableTotal`, AND THAT IS NOT AN INVARIANT. `computeFit`
   * leaves the synergy ratio unclamped on purpose, and `edhrec_total` sits one
   * below the child-row count on 2 of 3,342 commanders — so a reader owning
   * every support card can read a point or two over. Clamping would fix the
   * bound and break the thing the bound is for, since `scoreCommander` has the
   * same exposure through the same data and the two surfaces have to agree.
   * Treat it as a figure to print, never as a bound to assert.
   *
   * Computed here by `computeFit` rather than shipped as its four inputs and
   * assembled on the client: one number is smaller than four, and a client that
   * assembles it is a second implementation of the arithmetic by definition.
   */
  score: number;
  /** What `score` is out of: 100, or 40 where synergy could not be measured —
      never rescaled (#333), so the row prints the denominator it was given. */
  measurableTotal: number;
  /**
   * Fit's three components, for the row's segmented bar.
   *
   * SHIPPED AGAIN after being dropped, on Hugh's ruling of 2026-09-17. The spec
   * cut the ratio bar and INDEX §D recorded `FitBar` as losing its last caller
   * on these rows — Fit's one number was meant to REPLACE the segments, under
   * the stated ruling "two sentences, three figures, and no table". Read on the
   * shipped row, the trade read the other way: the information improved and the
   * row got less interesting, with the band's right side empty where the
   * retired four-column grid used to be.
   *
   * No conflict with D1. Fit is collection arithmetic and the components are
   * the same three on both lanes, so nothing here is read off ownership.
   *
   * `fitSynergy` is null where synergy could not be measured, and `fitSegments`
   * draws two segments rather than three for it — the same distinction
   * `measurableTotal` carries, kept as a null rather than a zero because the
   * component is absent, not empty.
   */
  fitPool: number;
  fitRoles: number;
  fitSynergy: number | null;
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
  /** False when the price read failed. The rows still carry a `price` slot —
      `slotFor(undefined)` is `absent` — and the surface must OMIT the figure
      rather than draw that, because `absent` means the feed has never carried
      the printing. Cached with the payload, so the distinction survives the
      hour the wrong claim would otherwise be served for. */
  priceOk: boolean;
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

/**
 * The five of `computeFit`'s figures the row draws: the headline, its
 * denominator, and the three components the bar splits.
 *
 * `rankScore` is the one left behind — it is the list's ORDER, not a figure any
 * row prints, and #702 made it equal to `score` anyway.
 */
const pick = (fit: ReturnType<typeof computeFit>) => ({
  score: fit.score,
  measurableTotal: fit.measurableTotal,
  fitPool: fit.fitPool,
  fitRoles: fit.fitRoles,
  fitSynergy: fit.fitSynergy,
});

type AssembleInput = {
  candidates: CandidateRow[];
  playedTags: DeckTagSet[];
  prices: Map<string, PriceAggRow>;
  priceOk: boolean;
  rollup: PoolRollup;
  cardsRead: number;
  freePoolSize: number;
  sort: "fit" | "new";
  availOk: boolean;
};

export function assembleDiscovery(input: AssembleInput): DiscoveryList {
  return assembleDiscoveryWithIds(input).list;
}

/** `assembleDiscovery`, plus each row's oracle id in row order, for the server alone. */
export function assembleDiscoveryWithIds(input: AssembleInput): { list: DiscoveryList; oracleIds: string[] } {
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
      artCropUri: c.artCropUri,
      releasedAt: c.releasedAt,
      deckCount: c.deckCount,
      collectionSupport: c.collectionSupport,
      // SERVER-SIDE ONLY, and that is the distinction this map now draws. The
      // floor reads `collectionSupport`, `byFit` sorts on `ownedSupport` and
      // `computeFit` divides by `edhrecTotal` — none of which the row prints, so
      // they live on the enriched row and never reach `items`. Removing them
      // from HERE rather than from the projection is how a first attempt broke
      // the floor and both sorts at once.
      ownedSupport: c.ownedSupport,
      edhrecTotal: c.edhrecTotal,
      price: slotFor(input.prices.get(c.oracleId)),
      tagTotal: c.tags.length,
      unplayedLabels: unplayed.map((t) => t.label),
      unplayedCount: unplayed.length,
      nearestDeck: nearestDeck(c.tags, orderedDecks),
      supportPct: floorPct(c),
      prose: c.prose,
      // `played` holds tag slugs from every built deck, which is the same set
      // `unplayedTags` above is given — so the line and the list it came from
      // cannot order or filter the same tags differently.
      gapSlot: gapSlotFor(c.tags, c.deckCount, played),
      // Every input is already here: the rollup's two figures, and the
      // candidate's identity-restricted overlap against its stored total.
      ...pick(computeFit({
        poolSize: rollup.colorPoolSize,
        roleCounts: rollup.roleCounts,
        ownedSupport: c.ownedSupport,
        edhrecTotal: c.edhrecTotal,
      })),
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

  const list: DiscoveryList = {
    // Named rather than spread, because four of the enriched fields are spent
    // here and read by nothing downstream: `oracleId` is the two sorts' final
    // tiebreak, `collectionSupport` is what the floor decides on, and `counts`
    // and `imageUri` are the owned lane's, carried in by the shared rollup and
    // candidate shapes. They were about a quarter of a 2.6MB payload. Listing
    // what ships also means a field added to the enrichment has to be chosen.
    items: ordered.map((c, i) => ({
      slug: c.slug,
      name: c.name,
      colorIdentity: c.colorIdentity,
      artCropUri: c.artCropUri,
      releasedAt: c.releasedAt,
      deckCount: c.deckCount,
      rank: i + 1,
      price: c.price,
      prose: c.prose,
      gapSlot: c.gapSlot,
      score: c.score,
      measurableTotal: c.measurableTotal,
      fitPool: c.fitPool,
      fitRoles: c.fitRoles,
      fitSynergy: c.fitSynergy,
    })),
    candidateCount: input.candidates.length,
    cardsRead: input.cardsRead,
    freePoolSize: input.freePoolSize,
    bestPct,
    floorExcluded: excluded.length,
    poolExcluded,
    unmeasured: input.candidates.length - active.length - excluded.length,
    hasDecks: input.playedTags.length > 0,
    priceOk: input.priceOk,
    availOk: input.availOk,
    deckIdentities: input.playedTags.map((d) => d.colorIdentity),
    sort: input.sort,
  };
  return { list, oracleIds: ordered.map((c) => c.oracleId) };
}

/**
 * Was bumped when a deployment changed what this payload SAYS for unchanged rows.
 *
 * SINCE THE DEPLOYMENT JOINED EVERY `cacheForUser` KEY (`cache/deployment.ts`), a deploy
 * retires the old entry on its own, so a bump is no longer needed for that. The history
 * below is kept as the record; no new entry is owed.
 *
 * It rides in the cache key, so a bump files the answer under a new entry and
 * the old one is never asked for again. The tag cannot do this job: it is
 * dropped by the reader's own writes, so an entry assembled before the deploy
 * goes on being served — for up to the hour ceiling, to a reader who writes
 * nothing — without this module running at all.
 *
 * 2 — the candidate query now excludes a deck's PARTNER as well as its
 * commander, so a payload assembled by version 1 can still be offering a
 * commander the player has already built around.
 *
 * 3 — bumped for a WEAKER reason than its sibling in `commanders/rankings.ts`,
 * and the difference is worth stating rather than blurring. Ruling D moved every
 * Fit's synergy to the stored index, which changes what that payload SAYS. It
 * does not change this one: `ownedSupport` and `supportPct` come from
 * `loadCandidates`, which already counted `commander_support_cards` and is
 * untouched, and no other field moved either. So every warm entry is dropped
 * for no content difference — a deliberate cost, taken because the two caches
 * are dropped independently and a pair bumped half-way is the state nobody
 * thinks to check. If that trade ever looks wrong, the honest fix is to bump
 * this one when PR 3 changes the payload's shape, not to leave the pair
 * mismatched now.
 *
 * 7 — `allPlayed` carries the commander's top themes and a `capped` flag. A
 * warm v6 entry has neither, so every row in that state would draw a sentence
 * with no mechanic in it.
 *
 * 8 — moves with rankings' v11 for the meld rule (#712), for version 3's reason
 * and no stronger one: a melded card never had a `commander_support` row, so no
 * warm entry here holds one. The pair is bumped together because it is dropped
 * independently, and a pair bumped half-way is the state nobody thinks to check.
 *
 * 6 — Fit's three components come BACK, for the row's segmented bar (Hugh's
 * ruling, 2026-09-17). A warm version-5 entry has no `fitPool`, `fitRoles` or
 * `fitSynergy`, so every row would draw a bar with no segments in it.
 *
 * 5 — the row's shape again, and this time by SUBTRACTION: nine fields leave the
 * payload with the composition that drew them, and `roles` with `roleCounts`.
 *
 * A warm version-4 entry is the hazard, not those absences. It carries `keys`
 * naming fields this decoder still has cases for and rows positioned against
 * that older `keys` order — which decodes without crashing, into items whose
 * `score` and `gapSlot` sit at the wrong indices. The encoder ships `keys` with
 * the payload precisely so a decoder reads the order it was written with, and
 * that is exactly why a warm entry must never be read by new code: the order is
 * self-describing, the FIELD SET is not.
 *
 * `priceOk` is NOT the reason, and an earlier version of this comment said it
 * was. It shipped in #700, so a v4 entry already has it.
 *
 * 4 — taken for the reason version 3 named in advance.
 * The row's SHAPE moved: `prose`, `gapSlot`, `score` and `measurableTotal` are
 * new, and the encoder carries a `gapKinds` order beside `keys` and `roles`. A
 * warm version-3 entry decodes into items with no sentence, no gap slot and no
 * headline figure — every field the redesigned row is built to draw — so this
 * is the strongest kind of bump rather than the weakest: the old entry cannot
 * render the new row at all.
 *
 * 9 — the cached value is `{ encoded, oracleIds }` rather than the encoded list alone, so the
 * page can build `Printed in ▾`'s index aligned to the rows by position (decision 9). A warm
 * version-8 entry is the bare list, and reading `.encoded` off it would be undefined.
 */
const PAYLOAD_VERSION = 9;

/** The cache key a discovery payload is filed under: its sort, and the version
    of the code that produced it. */
export function discoveryKey(sort: string): string[] {
  return ["discovery", sort, `v${PAYLOAD_VERSION}`];
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
  return (await loadDiscoveryWithIds(userId, opts)).list;
}

/**
 * `loadDiscovery`, plus each row's oracle id in row order. The ids stay on the server: a row
 * ships no oracle id (it was a sizable share of the payload), and what needs one here is
 * `Printed in ▾`'s index, which the page builds beside the list and aligns by position.
 */
export async function loadDiscoveryWithIds(
  userId: string,
  opts: { sort: "fit" | "new" },
): Promise<{ list: DiscoveryList; oracleIds: string[] }> {
  const { collection, availability, availOk } = await loadDiscoveryPool(userId);
  // One oracle-id set, so the second support aggregate has nothing to add: the
  // ranked pool and the collection are the same pool.
  const candidates = await loadCandidates(
    userId,
    collection.map((c) => c.oracleId),
  );

  const [priceRead, playedTags] = await Promise.all([
    readPrices(candidates.map((c) => c.oracleId)),
    loadPlayedTags(userId),
  ]);

  return assembleDiscoveryWithIds({
    availOk,
    candidates,
    playedTags,
    prices: priceRead.prices,
    priceOk: priceRead.ok,
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
