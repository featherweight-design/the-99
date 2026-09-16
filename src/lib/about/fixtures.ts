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

// The browse figure's chips live in `components/about/browse-chips.tsx`, not
// here. `FilterChip` requires an `onRemove` handler and the chip is a client
// component, so a fixture built in this module would hand a function across the
// server/client boundary — which React refuses, and which no unit test in this
// repository can see.

/** Role counts against their baselines — one short, one at, one over. */
// Against ROLE_TARGETS { ramp: 10, draw: 10, removal: 8, wipes: 3 }: ramp over,
// draw and removal at, wipes short. ONE gap, because the entry's line is "a 1/3
// on board wipes tells you what to fix" — two gaps teach a different sentence.
export const ROLE_COUNTS = { ramp: 12, draw: 10, removal: 8, wipes: 1 };

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
// `overCommitted: 0` deliberately. The entry's caption is about exactly this:
// "the middle figure keeps its colour at zero — it is the row that would be red
// if it were not nought". A figure of 4 draws the red and never shows the state
// the sentence describes.
export const COMMITMENTS = { inUse: 312, overCommitted: 0 };
export const COMMITMENTS_TOTAL_CARDS = 1284;
export const SHOPPING = {
  byDeck: new Map<string, { copies: number; cents: number; pricedCopies: number }>(),
  total: { copies: 23, cents: 12_440, pricedCopies: 21 },
};

// The decklist's orders live in `components/about/figures.tsx`, built from
// `DECK_SORT_LABELS` — retyping "Name", "Mana value" and "Price" here gave this
// page its own copy of the sort vocabulary, and a rename would have left the
// figure stale while every test passed.

/**
 * The five cards the `browse` figure draws, taken from the R4 canvas so the
 * specimen and the drawing agree card for card. One of each of the three
 * rarities the canvas shows, and the copy counts are what make the `×N` badge
 * mean something — a grid where every cell reads `×1` says nothing about the
 * badge being a count.
 *
 * `HOB` is the set the figure's own `The Hobbit` chip filters to, which is the
 * point: the chip above and the captions below have to describe the same
 * result or the figure is showing an unfiltered grid under a filter.
 */
export const BROWSE_CELLS: {
  name: string;
  copies: number;
  rarity: string;
  /** Feeds the route's own `identityGradient`; these five are mono-green. */
  colorIdentity: string[];
}[] = [
  { name: "Attercop", copies: 4, rarity: "common", colorIdentity: ["G"] },
  { name: "Beorn the Fierce", copies: 1, rarity: "mythic", colorIdentity: ["G"] },
  { name: "Beorn, Reluctant Host", copies: 5, rarity: "common", colorIdentity: ["G"] },
  { name: "Beorn's Hospitality", copies: 1, rarity: "uncommon", colorIdentity: ["G"] },
  { name: "Boughside Wanderers", copies: 4, rarity: "common", colorIdentity: ["G"] },
];

/** The set code those five share, drawn in every caption beside the rarity. */
export const BROWSE_SET_CODE = "HOB";

/**
 * The two rows §3 draws for the issue inspector, one of each KIND — a name we
 * could not match, and a line we could not read. The entry's whole point is
 * that those read differently and are labelled differently, so a fixture of
 * two unmatched rows would illustrate the opposite.
 *
 * `Mox Dimaond` is the canvas's own misspelling and is deliberate: it is what
 * makes the row a misspelling rather than a printing nobody stocks.
 */
export const ISSUE_UNMATCHED = { name: "Mox Dimaond", setCode: "VMA", line: 907, quantity: 1 };
export const ISSUE_PARSE_ERROR = { line: 412, reason: "no printing" };

/**
 * The replace summary's own figures, from §3. Before and after are BOTH
 * printed, which is key line 1 — a change you can check rather than one you
 * are asked to believe.
 */
export const REPLACE_SUMMARY = {
  before: 4910,
  after: 5132,
  noLongerOwned: 61,
  unaffectedDecks: 11,
};

/**
 * One row per SECTION of the replace summary, because the entry's key lines
 * say what the sections are and that a row is a CARD carrying the deck that
 * wanted it — not a deck carrying a count.
 *
 * The R4 canvas draws deck rows with per-deck lines, and this deliberately
 * does not follow it: the shipped summary has three sections of card rows, the
 * entry's own captions describe THAT, and a figure built from the drawing
 * contradicted the three lines printed directly beneath it. Where the canvas
 * and the surface disagree about something the surface owns, the surface wins.
 *
 * One row per section rather than several, because what the figure has to
 * teach is that the three sections are different ANSWERS — a fourth row in any
 * one of them adds length and no meaning.
 */
export const REPLACE_ROWS: {
  section: "cleared" | "still" | "short";
  card: string;
  deck: string;
  reason?: string;
}[] = [
  { section: "cleared", card: "Cultivate", deck: "Kinnan Ramp" },
  { section: "still", card: "Smothering Tithe", deck: "Atraxa Counters", reason: "not in the new list" },
  { section: "short", card: "Arcane Signet", deck: "Preston Tokens", reason: "2 decks want 1 copy" },
];

/** The four doors a collection arrives through, in §3's order. */
export const IMPORT_SOURCES = ["Moxfield", "Archidekt", "Deckbox", "ManaBox"];
