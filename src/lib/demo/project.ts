// The landing demo's projections (plan 2026-11-08-public-landing-demo.md, "The demo's data"): what the exporter does to a
// signed-in page's own reads before they are committed. Each one takes what a loader returned and gives the props the
// drawing half takes, nothing else: no database, no request, no host callback. Pure, so each is tested on synthetic input
// and the exporter (`scripts/demo-export.mts`) is only the loaders and the file write around them.
//
// A projection never invents a figure: every number and string in its result is one the loader gave.

import type { BrowseListCard } from "../collection/browse";
import { filterCards, sortCards } from "../collection/browse";
import { parseBrowseParams } from "../collection/window";
import type { AvailabilitySummary } from "../cards/availability";
import { rankMap } from "../commanders/rank-maps";
import type { CommanderRankings, CommanderRowItem } from "../commanders/rankings";

/** Step 1, Sam's (Wren's) collection: the first window of the grid, and the two counts the place head prints. */
export type DemoCollection = {
  /** Cards owned, copies counted (the grid's `totalCards`). */
  totalCards: number;
  /** Distinct cards owned. */
  uniqueCards: number;
  /** Distinct sets the cards come from (the place head's "312 sets"). */
  setCount: number;
  /** The first window, in the page's default order, each carrying the availability the markers read. */
  cards: BrowseListCard[];
};

export function projectCollection(input: {
  cards: BrowseListCard[];
  /** The page's `loadAvailability` read, or null where it failed (the markers then draw nothing). */
  availability: Map<string, AvailabilitySummary> | null;
  stats: { totalCards: number; uniqueCards: number };
  /** How many cards the demo shows. */
  window: number;
}): DemoCollection {
  const { cards, availability, stats, window } = input;
  // The page's own order for an address with no query: `parseBrowseParams` over nothing, then its filter and sort.
  const params = parseBrowseParams(() => null, availability !== null);
  const joined = cards.map((c) => ({ ...c, availability: availability?.get(c.oracleId) ?? null }));
  const shown = sortCards(filterCards(joined, params.filters), params.sort, params.direction).slice(0, window);
  const sets = new Set<string>();
  for (const c of cards) for (const [code] of c.setCounts) sets.add(code);
  return { totalCards: stats.totalCards, uniqueCards: stats.uniqueCards, setCount: sets.size, cards: shown };
}

/** Step 2, the commanders the player can build: the top rows, each at its place in the whole ranking. */
export type DemoCommanders = {
  /** Every commander the ranking holds (the head's "58 commanders"). */
  total: number;
  rows: CommanderRowItem[];
  /** Each row's place in the WHOLE ranking, which the cut rows do not carry (`CommandersList`'s `rankBySlug`). */
  rankBySlug: Map<string, number>;
};

export function projectCommanders(input: { rankings: CommanderRankings; window: number }): DemoCommanders {
  const { rankings, window } = input;
  const rows = rankings.items.slice(0, window);
  const all = rankMap(rankings.items);
  return { total: rankings.items.length, rows, rankBySlug: new Map(rows.map((r) => [r.slug, all.get(r.slug)!])) };
}
