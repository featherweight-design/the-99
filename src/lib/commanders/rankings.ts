// Everything `/commanders` reads to draw its list, assembled in one place so it
// can be cached as one thing.
//
// The two rankings and the receipt counts are cached together rather than
// separately because the free ranking ships as a diff against the canonical
// list — `FreeRankingDelta.order` holds indices INTO it. Two entries with
// separate lifetimes could be filled from different snapshots, and a delta
// indexing a list it was not computed against does not fail loudly: it renames
// rows. One entry, one snapshot.

import type { Availability } from "../decks/availability";
import { loadAvailability } from "../decks/availability-query";
import { toFreeDelta, type FreeRankingDelta } from "../recs/free-delta";
import { rankFree } from "../recs/free-ranking";
import { getRankedList } from "../recs/ranked-list";
import { loadCollectionPool } from "../recs/recommend";
import type { CommanderListItem } from "../recs/recommend";
import { loadSupportMeta } from "../edhrec/support-read";
import { gapSlotFor, type GapSlot } from "../edhrec/gap-slot";
import { loadPlayedTags } from "../discovery/novelty";
import { readPrices, slotFor, type PriceSlot } from "../discovery/price";

/**
 * A list item plus the four things the shared row draws that the SCORE does not
 * carry.
 *
 * All four are commander-level rather than per-reader, which is why they are
 * joined on here instead of stored on `commander_scores`: one sentence and one
 * tag list serve every player, and a per-user copy would be rewritten on every
 * upload. `gapSlot` is the exception that proves the rule — it is decided from
 * commander-level tags against THIS reader's built decks, so it is computed
 * here, once, rather than being re-derived by the row.
 */
export type CommanderRowItem = CommanderListItem & {
  prose: string | null;
  gapSlot: GapSlot;
  deckCount: number | null;
  price: PriceSlot;
};

export type CommanderRankings = {
  items: CommanderRowItem[];
  degraded: boolean;
  uniqueCardsRead: number;
  candidateCount: number;
  freeRanking: FreeRankingDelta | null;
  availOk: boolean;
  /** False when the price read failed — see `readPrices`. The rows still carry
      an `absent` slot, and the surface must omit the figure rather than draw
      it: `absent` means the feed has never carried the printing, which a lost
      read has no standing to say. */
  priceOk: boolean;
};

/**
 * Bumped when a deployment changes what this payload SAYS for unchanged rows.
 *
 * It rides in the cache key, so a bump is a new entry and the old one is simply
 * never asked for again. The tag is not enough on its own: it is dropped by the
 * reader's own writes, and a payload assembled before the deploy would otherwise
 * go on being served — for up to the hour ceiling, to a reader who writes
 * nothing — without this module running at all. `commander_scores`' own staleness
 * check lives behind `loadScores`, which a cache hit never reaches.
 *
 * 2 — built commanders are no longer dropped from the persisted score set, so a
 * list assembled by version 1 can be short a commander whose deck has since been
 * deleted.
 *
 * 3 — free mode now lists from the free pool rather than only ranking against
 * it, so version 2's `freeRanking` holds commanders whose own card a finished
 * deck has sleeved. The payload's SHAPE is unchanged and so are the reader's
 * rows — which is the whole problem, because the tag is dropped by the reader's
 * own writes and nothing here is a write. Only the cached RESULT moved. Without
 * this bump a warm entry keeps serving the old free list, and the defect this
 * release fixes survives the deploy for up to the hour ceiling for every reader
 * who does not write.
 *
 * 4 — every Fit's synergy now comes from the stored commander index rather than
 * the live EDHREC payload (Ruling D). Same shape again, and this time the FIGURE
 * moved: `probe:fit-parity` measured the two sources disagreeing on 20 of 95
 * commanders. A warm version-3 entry would keep printing the live-derived score
 * beside a detail page printing the index-derived one, which is the exact
 * disagreement the change removes.
 *
 * 5 — `SCORE_WRITER_CURRENT` moved to 4, so rows a version-3 writer left behind
 * are now refused. THE ROWS DID NOT CHANGE AND THE VERDICT ON THEM DID, which
 * is this version's own trigger read literally: a warm entry assembled by the
 * previous deployment was built from rows this deployment will not rank, and
 * `loadScores`' `< 4` check is exactly the thing a cache hit never reaches. The
 * writer bump alone therefore protects database misses only — during the
 * rollout a version-3 deployment can cache a payload built from a write that
 * landed after a rebuild's clear, and the new deployment would go on serving it
 * for up to the hour ceiling to every reader who writes nothing.
 *
 * 6 — the list is ordered by the printed figure now: `rank_score` no longer rescales a
 * no-synergy score from 40 back to 100, so untracked commanders stop taking the top of
 * the list. Same trigger as 5, one step on: the ROWS behind a warm entry are refused by
 * `SCORE_WRITER_CURRENT` 5, and a cache hit never reaches that check — so without this a
 * reader who writes nothing keeps being served the old order for up to the hour ceiling.
 *
 * 7 — the owned lane's rows now carry the play-style sentence, the gap slot and
 * the two figures the row prints, so a warm version-6 entry is missing every
 * field the redesigned row draws. Bumped in the same release as its sibling in
 * `discovery/list.ts`, which is the discipline version 3 of THAT constant asked
 * for: the two caches are dropped independently, and a pair bumped half-way is
 * the state nobody thinks to check.
 *
 * 8 — the shared row ships, and `priceOk` rides with it. A warm version-7 entry
 * has no such field, so a failed price read would decode as `undefined` and the
 * row would draw `absent` — the claim that the feed has never carried the
 * printing, which is exactly what this release stops it saying.
 *
 * 6 AND 7 ARE TWO RELEASES, not one renumbered. #702 took 6 while this branch
 * was in review and both had claimed it; taking 6 here would have left every
 * reader whose entry was written by #702 being served a payload with no
 * sentence, no gap slot and no headline figure, because the key would have
 * matched.
 */
const PAYLOAD_VERSION = 8;

/** The cache key this payload is filed under, version included. */
export const commanderRankingsKey = ["commander-rankings", `v${PAYLOAD_VERSION}`];

export async function loadCommanderRankings(userId: string): Promise<CommanderRankings> {
  const { items, degraded, uniqueCardsRead, candidateCount } = await getRankedList(userId);

  // No candidates means the page draws its empty state, which reads none of
  // what follows. The pool query is the expensive one and is skipped rather
  // than made and discarded.
  if (candidateCount === 0) {
    // `items` is empty here, so it satisfies the row type without enrichment —
    // and the three reads below are skipped rather than made against an empty
    // id list.
    return {
      items: [], degraded, uniqueCardsRead, candidateCount,
      freeRanking: null, availOk: true, priceOk: true,
    };
  }

  // THE RECEIPT COUNTS LEFT WITH THE ROW. `ReceiptLine` drew them, and D1 cut
  // it: a claim about which decks hold a commander's cards is read off
  // ownership, and one component now serves an owned lane and an unowned one.
  // `receiptCountsByCommander` itself stays — Home still calls it.
  //
  // The availability read does NOT leave with them: `rankFree` needs it, which
  // is why this is still unconditional and why `availOk` still means something.
  const { collection } = await loadCollectionPool(userId);
  let availability: Map<string, Availability> | null = null;
  let availOk = true;
  try {
    availability = await loadAvailability(userId, {
      oracleIds: collection.map((c) => c.oracleId),
    });
  } catch {
    // Fail soft: the list, the scores and the ranking are all unaffected. Only
    // the clause and `What's free` are lost, and the toggle says so itself.
    availOk = false;
  }

  // Both rankings ship in every render, whichever mode is asked for, so the
  // toggle is a client-side swap between two lists rather than a round trip.
  // This costs no extra query: `rankFree` re-scores the same `items` against the
  // collection and availability already read above, which also makes the receipt
  // and the free ranking describe one snapshot of the decks rather than two.
  //
  // Shipped as a diff against `items` rather than as a second full list: the two
  // are the same commanders, so most of a second copy is the same names, slugs
  // and image URLs sent twice. See `free-delta.ts`.
  let freeRanking: FreeRankingDelta | null = null;
  if (availOk && availability) {
    const free = await rankFree(userId, items, { collection, availability });
    freeRanking = free.ok ? toFreeDelta(items, free.items) : null;
    if (!freeRanking) availOk = false;
  }

  // The row's four commander-level fields, read AFTER the free ranking so the
  // ranking work is done against the shape it was written for. `rankFree` and
  // `toFreeDelta` key on scores and indices and read none of these, so
  // enriching before them would only widen what they copy.
  //
  // Three reads in parallel, all REUSED rather than re-derived — the price and
  // played-tag reads are the discover lane's own, and a second spelling of
  // either would be free to disagree with the lane it was copied from.
  //
  // The price read is the SOFT one. `readPrices` reports a transient feed or
  // database failure instead of throwing, because every row already draws
  // without a price and nothing else here does: taking the whole
  // recommendations page down over the cheapest figure on it would be the wrong
  // trade. What it does NOT do is hide the failure — `priceOk` rides in the
  // payload so the surface omits the figure rather than drawing `absent`, which
  // would be a claim that the feed has never carried the printing.
  //
  // The other two are hard: without the tag sets the gap line would claim the
  // reader plays nothing, and without the metadata every row loses its
  // sentence.
  const oracleIds = items.map((i) => i.oracleId);
  const [meta, playedTags, priceRead] = await Promise.all([
    loadSupportMeta(oracleIds),
    loadPlayedTags(userId),
    readPrices(oracleIds),
  ]);
  const played = new Set(playedTags.flatMap((d) => [...d.slugs]));

  const rows: CommanderRowItem[] = items.map((item) => {
    // A commander with no `commander_support` row is scored but unindexed. Its
    // gap slot is `noMechanics` — decided by `gapSlotFor` from an empty tag
    // list rather than spelled out here, so the three states keep one author.
    const m = meta.get(item.oracleId);
    return {
      ...item,
      prose: m?.prose ?? null,
      gapSlot: gapSlotFor(m?.tags ?? [], m?.deckCount ?? null, played),
      deckCount: m?.deckCount ?? null,
      price: slotFor(priceRead.prices.get(item.oracleId)),
    };
  });

  return {
    items: rows, degraded, uniqueCardsRead, candidateCount, freeRanking, availOk,
    priceOk: priceRead.ok,
  };
}
