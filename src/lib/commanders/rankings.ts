// Everything `/commanders` reads to draw its list, assembled in one place so it
// can be cached as one thing.
//
// The two rankings and the receipt counts are cached together rather than
// separately because the free ranking ships as a diff against the canonical
// list — `FreeRankingDelta.order` holds indices INTO it. Two entries with
// separate lifetimes could be filled from different snapshots, and a delta
// indexing a list it was not computed against does not fail loudly: it renames
// rows. One entry, one snapshot.

import { receiptCountsByCommander, type ReceiptCounts } from "./in-use";
import type { Availability } from "../decks/availability";
import { loadAvailability } from "../decks/availability-query";
import { toFreeDelta, type FreeRankingDelta } from "../recs/free-delta";
import { rankFree } from "../recs/free-ranking";
import { getRankedList } from "../recs/ranked-list";
import { loadCollectionPool } from "../recs/recommend";
import type { CommanderListItem } from "../recs/recommend";

export type CommanderRankings = {
  items: CommanderListItem[];
  degraded: boolean;
  uniqueCardsRead: number;
  candidateCount: number;
  /** `receiptCountsByCommander`'s map as entries: the cache stores its payload
      as JSON, and a Map comes back from that as `{}`. The page rebuilds the map
      before handing it to the view. */
  receipts: [string, ReceiptCounts][];
  freeRanking: FreeRankingDelta | null;
  availOk: boolean;
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
 */
const PAYLOAD_VERSION = 5;

/** The cache key this payload is filed under, version included. */
export const commanderRankingsKey = ["commander-rankings", `v${PAYLOAD_VERSION}`];

export async function loadCommanderRankings(userId: string): Promise<CommanderRankings> {
  const { items, degraded, uniqueCardsRead, candidateCount } = await getRankedList(userId);

  // No candidates means the page draws its empty state, which reads none of
  // what follows. The pool query is the expensive one and is skipped rather
  // than made and discarded.
  if (candidateCount === 0) {
    return {
      items, degraded, uniqueCardsRead, candidateCount,
      receipts: [], freeRanking: null, availOk: true,
    };
  }

  // The receipt's second clause renders in BOTH ranking modes, so this read is
  // unconditional — gating it on `?avail=free` would strip the clause from the
  // default view, which is the one most players never leave. One rollup for the
  // whole page, shared across every commander.
  const { collection } = await loadCollectionPool(userId);
  let receipts: [string, ReceiptCounts][] = [];
  let availability: Map<string, Availability> | null = null;
  let availOk = true;
  try {
    availability = await loadAvailability(userId, {
      oracleIds: collection.map((c) => c.oracleId),
    });
    receipts = [...receiptCountsByCommander(items, collection, availability)];
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

  return { items, degraded, uniqueCardsRead, candidateCount, receipts, freeRanking, availOk };
}
