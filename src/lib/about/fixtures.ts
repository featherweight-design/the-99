// The props every /about specimen is fed.
//
// One module, because the handoff's rule for a new entry is "add a fixture
// here and fork no component" (STATES-about-r3.md §G3). A figure that needed a
// component changed to serve it would be a figure teaching something the app
// does not do — which is the failure the whole page exists to avoid.
//
// Nothing here is read from a database. These are the smallest values that put
// a real component into the state the entry is describing, and they are
// deliberately recognisable rather than realistic: `Sol Ring` and `Rhystic
// Study` are cards a Commander player reads without stopping.

import type { Availability } from "../decks/availability";
import type { PriceFact, PriceState } from "../decks/price";
import { fitSegments } from "../recs/format";
import type { StatusPill } from "../decks/status";

/** The four availability states, in the order the plate draws them. */
export const AVAILABILITY: { key: string; a: Availability }[] = [
  // free — owned, nothing claiming. The marker renders null here, which is the
  // feature: a player whose collection covers their decks sees nothing new.
  { key: "free", a: { owned: 2, hard: 0, soft: 0, free: 2, claims: [] } },
  // soft — a deck with no committed version wants it. Real, not binding.
  { key: "soft", a: { owned: 1, hard: 0, soft: 1, free: 1, claims: [] } },
  // hard — a committed deck holds every copy.
  { key: "hard", a: { owned: 1, hard: 1, soft: 0, free: 0, claims: [] } },
  // over — more copies are asked for than exist. `free` is negative, and the
  // marker prints `short 2` from it rather than recomputing.
  { key: "over", a: { owned: 1, hard: 3, soft: 0, free: -2, claims: [] } },
];

/** The four buy-tag states, each a different claim about the feed. */
export const PRICES: { state: PriceState; fact: PriceFact }[] = (() => {
  // One instant for the whole module: a fixture that read the clock would make
  // every snapshot of this page differ from the last for no reason.
  const asOf = new Date("2026-09-01T00:00:00.000Z");
  return [
    { state: "priced", fact: { cents: 210, foilCents: null, etchedCents: null, asOf } },
    { state: "foilOnly", fact: { cents: null, foilCents: 640, etchedCents: null, asOf } },
    { state: "soldOut", fact: { cents: 4500, foilCents: null, etchedCents: null, asOf } },
    { state: "absent", fact: { cents: null, foilCents: null, etchedCents: null, asOf } },
  ];
})();

/** All six statuses, in the order `status.ts` defines them. */
export const STATUSES: StatusPill[] = [
  "Draft",
  "Building",
  "Over",
  "Unresolved",
  "To buy",
  "Complete",
];

/**
 * A fit score whose three parts sum to the figure beside them — the entry's
 * whole point is that the sum is checkable, so a fixture whose parts did not
 * add up would teach the opposite.
 */
export const FIT_FULL = fitSegments({
  fitPool: 15,
  fitRoles: 25,
  fitSynergy: 33,
  score: 73,
  measurableTotal: 100,
});

/**
 * The degraded pair: two segments, and a denominator of 40 rather than 100.
 * `measurableTotalFor` returns 40 or 100 and nothing between, so this is the
 * only other shape that exists.
 */
export const FIT_DEGRADED = fitSegments({
  fitPool: 12,
  fitRoles: 15,
  fitSynergy: null,
  score: 27,
  measurableTotal: 40,
});

/** Costs chosen to exercise the pip track rather than to be typical. */
export const COSTS = {
  /** Three pips past the second — the case the 72px track was widened for. */
  crowded: "{2}{B}{B}{B}",
  simple: "{1}{G}",
  /** Costless: the one card that draws the marker box on a decklist row. */
  none: null,
};

export const CARDS = {
  owned: "Sol Ring",
  removed: "Rhystic Study",
  twoFaced: "Delver of Secrets",
};
