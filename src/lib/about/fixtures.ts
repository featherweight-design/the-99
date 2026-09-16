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
import type { Cell } from "../sets/completion";
import type { FilterChip } from "../../components/ui/filter-chassis";
import { collectionChassisCopy } from "../copy/collection";

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
/** The headline the lane prints beside the bar. */
export const FIT_FULL_SCORE = 73;
export const FIT_DEGRADED_SCORE = 27;

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
  /** Four symbols of the track's five slots — 5 × 12 + 4 × 3 = 72, which is
   *  why COST_TRACK is 72. Drawn at that track rather than unbounded, so the
   *  figure has the geometry a decklist row gives it. */
  crowded: "{2}{B}{B}{B}",
  simple: "{1}{G}",
  /** Costless: the one card that draws the marker box on a decklist row. */
  none: null,
  /** Two printed costs on one piece of stock — a modal DFC, where the back
   *  face is castable and the modal is the only surface drawing both. */
  twoFaced: "{2}{B} // {B}",
};

export const CARDS = {
  owned: "Sol Ring",
  removed: "Rhystic Study",
  twoFaced: "Delver of Secrets",
  proxied: "Mana Crypt",
};

/**
 * Set-completion cells: owned, owned-by-name, owned-in-foil, and missing. The
 * four a reader has to tell apart on a set page, and the reason that grid is
 * worth a figure at all — the gaps ARE the page.
 */
export const SET_CELLS: Cell[] = [
  {
    scryfallId: "f0000000-0000-4000-8000-000000000001",
    oracleId: "a0000000-0000-4000-8000-000000000001",
    collectorNumber: "12",
    name: "Attercop",
    imageUriSmall: null,
    colorIdentity: [],
    rarity: "common",
    booster: true,
    isVariant: false,
    owned: true,
    byName: false,
    foilOnly: false,
  },
  {
    scryfallId: "f0000000-0000-4000-8000-000000000002",
    oracleId: "a0000000-0000-4000-8000-000000000002",
    collectorNumber: "13",
    name: "Beorn the Fierce",
    imageUriSmall: null,
    colorIdentity: [],
    rarity: "common",
    booster: true,
    isVariant: false,
    owned: true,
    byName: true,
    foilOnly: false,
  },
  {
    scryfallId: "f0000000-0000-4000-8000-000000000003",
    oracleId: "a0000000-0000-4000-8000-000000000003",
    collectorNumber: "14",
    name: "Beorn, Reluctant Host",
    imageUriSmall: null,
    colorIdentity: [],
    rarity: "common",
    booster: true,
    isVariant: false,
    owned: true,
    byName: false,
    foilOnly: true,
  },
  {
    // The one the entry is about: not owned, so it draws dashed and dimmed and
    // carries a price an owned cell never does.
    scryfallId: "f0000000-0000-4000-8000-000000000004",
    oracleId: "a0000000-0000-4000-8000-000000000004",
    collectorNumber: "15",
    name: "Case of the Filched Falcon",
    imageUriSmall: null,
    colorIdentity: [],
    rarity: "common",
    booster: true,
    isVariant: false,
    owned: false,
    byName: false,
    foilOnly: false,
  },
];

/** Two narrowings, one of which collapsed several values into a count. */
export const BROWSE_CHIPS: FilterChip[] = [
  // `onRemove` is required by the chip and is a no-op here: a specimen is
  // inert, and the figure's subject is that the control EXISTS and is
  // per-dimension, not what pressing it does.
  {
    key: "colour",
    // From the collection's own derivation, not retyped: a rename in
    // `collectionFilterCopy` must reach this figure, and a literal here would
    // leave the specimen stale while still mounting the real chip.
    label: collectionChassisCopy.chip.colours(1),
    dots: ["var(--success)"],
    onRemove: () => {},
  },
  { key: "set", label: "The Hobbit", onRemove: () => {} },
];

/** Role counts against their baselines — one short, one at, one over. */
export const ROLE_COUNTS = { ramp: 12, draw: 8, removal: 8, wipes: 1 };

/**
 * Two axes at the far ends of the log: one the deck keeps winning on, one that
 * keeps letting it down. Seven games, which clears PATTERN_MIN — below it the
 * cell takes no colour, and a figure of two games would teach the neutral state
 * while the caption talked about findings.
 */
export const GAME_AXES = [
  { key: "card_flow" as const, worked: 1, hurt: 5, net: -4 },
  { key: "interaction" as const, worked: 5, hurt: 1, net: 4 },
];
export const GAME_COUNT = 7;

/** Home's three figures: one with a denominator, one that keeps its colour at
 *  zero, and a shop trip. */
export const COMMITMENTS = { inUse: 312, overCommitted: 4 };
export const COMMITMENTS_TOTAL_CARDS = 1284;
export const SHOPPING = {
  byDeck: new Map<string, { copies: number; cents: number; pricedCopies: number }>(),
  total: { copies: 23, cents: 12_440, pricedCopies: 21 },
};

/** The decklist's orders, paired with what each one is for. */
export const DECK_SORT_ROWS: [string, string][] = [
  ["By role / By type", "the list is always in sections — that is how a deck is short"],
  ["Name", "and the order you pick applies inside them"],
  ["Mana value", "curve up or curve down"],
  ["Price", "offered on the shopping filter only, where money is the question"],
];
