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
import type { ChooseParams } from "../intake/params";
import type { Reading } from "../../components/decks/deck-profile-state";
import type { BenchmarksWire } from "../benchmarks/wire";
import type { DeckProfile } from "../profile/types";
import type { StoredReading } from "../profile/stored";
import type { SynopsisState } from "../synopsis/read";
import type { TuningState } from "../tuning/state";
import type { ResultsPage } from "../intake/rows";
import type { TrialFigures } from "../intake/trial";
import { shortName, type ReadDeck } from "../intake/the-read";

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

/** Step 3, Help me choose: a settled read's results, drawn read-only (`ChooseResultsView`). */
export type DemoChoose = {
  /** The wish the read answered ("Anything else?", shown read-only). */
  words: string;
  /** The results page the read ordered: the rows with their reasons, the order, the counts. */
  page: ResultsPage;
  /** A deck commander's oracle id to the short name a reason draws it by. */
  deckNames: Record<string, string>;
  /** Theme slug to its label, for the order line. */
  themeLabels: Record<string, string>;
  /** Each row's ownership figures (the "N of the 99 are in the binder" line), by commander oracle id. */
  trials: Record<string, { state: "ready"; figures: TrialFigures } | { state: "failed" }>;
};

export function projectChoose(input: {
  params: ChooseParams;
  page: ResultsPage;
  decks: readonly ReadDeck[];
  themes: readonly { slug: string; label: string }[];
  trials: Record<string, TrialFigures | null>;
}): DemoChoose {
  const { params, page, decks, themes, trials } = input;
  const shown = new Set(page.rows.map((r) => r.oracleId));
  return {
    words: params.words,
    page,
    deckNames: Object.fromEntries(decks.map((d) => [d.commanderOracleId, shortName(d.commander)])),
    themeLabels: Object.fromEntries(themes.map((t) => [t.slug, t.label])),
    // A row whose fill failed (null) draws as failed, as the list does: never as zero.
    trials: Object.fromEntries(
      [...shown].map((id) => [id, trials[id] ? ({ state: "ready", figures: trials[id]! } as const) : ({ state: "failed" } as const)]),
    ),
  };
}

/** Step 5, Analysis: the played deck's stored reading as the panel draws it (`AnalysisPanel`'s `Reading`). */
export type DemoAnalysis = { deckId: string; reading: Reading };

export function projectAnalysis(input: { deckId: string; stored: StoredReading; benchmarks: BenchmarksWire | null }): DemoAnalysis {
  const { deckId, stored, benchmarks } = input;
  const profile: DeckProfile = stored.profile;
  return {
    deckId,
    // The panel's own shape: the instant as ISO text, and the benchmarks held with the reading.
    reading: { profile, analyzedAt: stored.analyzedAt.toISOString(), fresh: stored.fresh, versionNumber: stored.versionNumber, benchmarks },
  };
}

/** Step 5, the Overview: the played deck's stored overview state (`SynopsisOverview`'s `SynopsisState`). */
export type DemoOverview = { deckId: string; state: SynopsisState };

export function projectOverview(input: { deckId: string; state: SynopsisState }): DemoOverview {
  if (!input.state.synopsis) throw new Error(`projectOverview: deck ${input.deckId} has no stored overview`);
  return { deckId: input.deckId, state: input.state };
}

/** Step 6, Suggested changes: the stored v2 run, whole (`readTuningState` for that run). The run's props are made from it in the host. */
export type DemoSuggested = { deckId: string; runId: string; state: TuningState };

export function projectSuggested(input: { deckId: string; runId: string; state: TuningState }): DemoSuggested {
  const { deckId, runId, state } = input;
  if (state.items.length === 0) throw new Error(`projectSuggested: run ${runId} on deck ${deckId} has no lines`);
  return { deckId, runId, state };
}
