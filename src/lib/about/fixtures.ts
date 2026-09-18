import type { DiscoveryItem } from "../discovery/list";
import type { PriceSlot } from "../discovery/price";
import type { LaneParams } from "../commanders/lane-params";
import type { FitLegendSegment } from "../../components/commanders/fit-legend";
import type { CommanderListItem } from "../recs/recommend";
import type { ReadySlice } from "../recs/ready-to-build";
import type { ReceiptCounts } from "../commanders/in-use";
import { identityGradient } from "../collection/gradients";
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
/**
 * §3 draws SIX cells of the base run, in collector order: four owned and two
 * missing. Six is the drawn count and it is load-bearing — the figure's whole
 * subject is that a missing card is DASHED AND DIMMED RATHER THAN HIDDEN, and
 * a strip that is half missing reads as a gap rather than as a run with holes
 * in it.
 *
 * Identities vary so the art placeholders differ; a mono-coloured strip would
 * say the gradient is decoration rather than the card's identity.
 */
/**
 * Stand-in art for a set cell, as an inline SVG data URI.
 *
 * `SetCell` renders `imageUriSmall` and draws NOTHING when it is null — on the
 * real page that field is always populated, so a null fixture makes six empty
 * boxes and reads as a broken figure rather than as a set. A reference page
 * must not fetch six card images to illustrate a completion ratio, so the
 * fixture supplies the identity gradient the collection grid already uses for
 * a card with no art.
 *
 * Fed through `imageUriSmall` rather than painted behind the cell, because the
 * cell's own art box is `--surface-sunken` and would cover anything behind it —
 * and because going through the route's own path means a missing cell dims and
 * desaturates this exactly as it would dim real art.
 */
export function cellArt(identity: string[]): string {
  const g = identityGradient(identity);
  const stops = [...g.matchAll(/(#[0-9a-f]{6})\s*(\d+%)?/gi)].map(([, hex, at], i, all) => ({
    hex,
    at: at ?? (i === 0 ? "0%" : i === all.length - 1 ? "100%" : "50%"),
  }));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 63 88" preserveAspectRatio="none">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0.62" y2="1">` +
    stops.map((s) => `<stop offset="${s.at}" stop-color="${s.hex}"/>`).join("") +
    `</linearGradient></defs><rect width="63" height="88" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const SET_CELLS: Cell[] = [
  {
    scryfallId: "f0000000-0000-4000-8000-000000000001",
    oracleId: "a0000000-0000-4000-8000-000000000001",
    collectorNumber: "1",
    name: "Long-Bodied Grey Dog",
    imageUriSmall: cellArt(["W"]),
    colorIdentity: ["W"],
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
    collectorNumber: "2",
    name: "Old Thrush",
    imageUriSmall: cellArt(["U"]),
    colorIdentity: ["U"],
    rarity: "common",
    booster: true,
    isVariant: false,
    owned: true,
    byName: false,
    foilOnly: false,
  },
  {
    scryfallId: "f0000000-0000-4000-8000-000000000003",
    oracleId: "a0000000-0000-4000-8000-000000000003",
    collectorNumber: "3",
    name: "Troop of Ponies",
    imageUriSmall: cellArt(["G"]),
    colorIdentity: ["G"],
    rarity: "uncommon",
    booster: true,
    isVariant: false,
    owned: true,
    byName: false,
    foilOnly: false,
  },
  {
    scryfallId: "f0000000-0000-4000-8000-000000000004",
    oracleId: "a0000000-0000-4000-8000-000000000004",
    collectorNumber: "4",
    name: "Belladonna Took",
    imageUriSmall: cellArt(["W"]),
    colorIdentity: ["W"],
    rarity: "rare",
    booster: true,
    isVariant: false,
    owned: true,
    byName: false,
    foilOnly: false,
  },
  {
    scryfallId: "f0000000-0000-4000-8000-000000000005",
    oracleId: "a0000000-0000-4000-8000-000000000005",
    collectorNumber: "5",
    name: "Bilbo's Gambit",
    imageUriSmall: cellArt(["U"]),
    colorIdentity: ["U"],
    rarity: "rare",
    booster: true,
    isVariant: false,
    owned: false,
    byName: false,
    foilOnly: false,
  },
  {
    scryfallId: "f0000000-0000-4000-8000-000000000006",
    oracleId: "a0000000-0000-4000-8000-000000000006",
    collectorNumber: "6",
    name: "Bofur, Reliable Guardian",
    imageUriSmall: cellArt(["W"]),
    colorIdentity: ["W"],
    rarity: "uncommon",
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

/**
 * The three printings §3 draws, with the collector numbers it draws them with.
 *
 * The MARKS are the app's, not the canvas's. §3 labels the filled diamond "the
 * printing you own"; the picker has never meant that — `printing-region.tsx`
 * draws ✓ for `Your pick` and ◇ for `Shown now`, which #653 already established
 * when sixteen captions were corrected against the app. The canvas's layout is
 * right and its legend is stale, so the layout transfers and the meaning does
 * not.
 */
export const PRINTING_ROWS: { set: string; collector: string; state: "picked" | "shown" | "plain" }[] = [
  { set: "Commander Masters", collector: "0412", state: "picked" },
  { set: "Double Masters", collector: "0332", state: "shown" },
  { set: "Ravnica Allegiance", collector: "0176", state: "plain" },
];

/**
 * One contested arrival: two committed decks, one copy between them.
 *
 * This is the part of the replace summary the About figure was missing
 * entirely. §3 predates the surface — `about.ts` already carries Design's own
 * ⚠ note that #639/#643 landed after their last read of `main` — so the
 * drawing has deck rows where the shipped summary has three money sections
 * plus THIS, the one control on the page a reader can act on.
 *
 * The two tests the receipt itself applies: demand above supply, and at least
 * two committed claimants. A shortage with one claimant is a purchase, not a
 * choice, so a fixture with one deck would draw no chooser at all.
 *
 * `since` is what orders the queue and what the row stamps, so the two decks
 * carry different ones — equal stamps would make the seniority rule invisible.
 */
export const CONTESTED_ARRIVAL = {
  oracleId: "about-contested",
  // Deliberately NOT a name used by REPLACE_ROWS above. The first version
  // reused `Smothering Tithe` and both deck names, so every assertion about
  // this row was satisfied by the money sections and passed with the chooser
  // deleted.
  cardName: "Dockside Extortionist",
  arrived: 1,
  fromImport: true,
  ownedBefore: 0,
  owned: 1,
  claimants: [
    {
      deckId: "about-deck-atraxa",
      deckName: "Muldrotha Value",
      quantity: 1,
      commanderCopies: 0,
      // ZERO. `ContestedCardRow` reads `granted > 0` as an AUTHORED
      // selection and draws the deck checked and accented — which would show
      // a reservation the player made, where this figure's subject is the
      // DEFAULT the seniority rule produces before anyone chooses.
      granted: 0,
      since: Date.UTC(2026, 2, 14),
      versionNumber: 3,
      // The senior deck holds the one copy that arrived; the other gets none.
      // Both at 1 would draw no contention for the chooser to resolve.
      allocated: 1,
    },
    {
      deckId: "about-deck-kinnan",
      deckName: "Yuriko Ninjas",
      quantity: 1,
      commanderCopies: 0,
      granted: 0,
      since: Date.UTC(2026, 7, 2),
      versionNumber: 1,
      allocated: 0,
    },
  ],
  brewNames: [],
};

/** §3's own figures for the set head and its cost strip. */
export const SET_HEAD = {
  code: "HOB",
  name: "The Hobbit",
  released: "2026-08-14",
  have: 162,
  base: 208,
  percent: 78,
  extras: 113,
  cells: 321,
  yours: 171,
  missing: 150,
  costPriced: 45,
  costMissing: 46,
  costUnpriced: 1,
  cost: "$188.66",
  sendCount: 46,
};

/**
 * The two commanders §3 draws on Home's `Ready to build`, and the slice around
 * them.
 *
 * Built as real `CommanderListItem`s so `ReadyToBuild` can be mounted whole —
 * it draws the heading, the card pair, the more-above line and the route to
 * the lane, which is the entry's whole composition. The figure it replaces was
 * three mark-and-meaning rows that named the two figures and showed neither.
 *
 * `artCropUri` is null on purpose. A reference page must not fetch commander
 * art, and `HeroCommander` falls back to the identity gradient — which is what
 * the canvas draws for these two anyway.
 *
 * The pair is deliberately UNLIKE: one three-colour, one two, and different
 * scores, because a pair of near-identical cards teaches nothing about what
 * the figures on them mean.
 */
function readyCommander(
  name: string,
  slug: string,
  typeLine: string,
  colorIdentity: string[],
  score: number,
  pool: number,
): CommanderListItem {
  return {
    oracleId: `about-${slug}`,
    slug,
    name,
    typeLine,
    colorIdentity,
    colorPoolSize: pool,
    roleCounts: ROLE_COUNTS,
    edhrecOwnedCount: 61,
    edhrecTotal: 99,
    fitPool: 15,
    fitRoles: 25,
    fitSynergy: 33,
    synergyState: "ok",
    score,
    rankScore: score,
    measurableTotal: 100,
    imageUri: null,
    artCropUri: null,
    receipts: "",
  };
}

export const READY_SLICE: ReadySlice<CommanderListItem> = {
  shown: [
    readyCommander(
      "Preston Garvey, Minuteman",
      "preston-garvey-minuteman",
      "Legendary Creature — Human Soldier",
      ["G", "R", "W"],
      73,
      1615,
    ),
    readyCommander(
      "Kotis, Sibsig Champion",
      "kotis-sibsig-champion",
      "Legendary Creature — Zombie Warrior",
      ["U", "B"],
      71,
      1204,
    ),
  ],
  // The floor is the lowest score actually SHOWN behind the pair, so the count
  // is checkable against the lane — key line 3's whole subject.
  moreCount: 7,
  floor: 68,
};

/** Fitting cards a finished deck already sleeves, per commander. */
export const READY_IN_USE = new Map<string, ReceiptCounts>([
  ["about-preston-garvey-minuteman", { inUse: 620, wantedByBrew: 0 }],
  // ZERO, and that is the point: the second clause is ABSENT at zero, which is
  // key line 2. A pair where both cards carry it cannot show the absence.
  ["about-kotis-sibsig-champion", { inUse: 0, wantedByBrew: 0 }],
]);

/**
 * The three parts of a fit score, with the points and weights §3 draws:
 * 15/15, 25/25, 33/60. Synergy carries the largest weight and is the one the
 * fixture leaves SHORT — three full segments would draw a bar with no
 * remainder and say nothing about what the track's empty tail means.
 */
export const FIT_LEGEND: FitLegendSegment[] = [
  { key: "pool", points: 15, weight: 15 },
  { key: "roles", points: 25, weight: 25 },
  { key: "synergy", points: 33, weight: 60 },
];

/**
 * The two lanes' rack state, as §3 draws each.
 *
 * `owned` carries `avail: "free"` — the Build from choice IS this entry's
 * caption ("Build from chooses the pool the scores are read against"), so a
 * rack resting on the default would draw the control and never the state that
 * makes it mean something.
 *
 * Both carry a colour and `match: "exact"`, because `Any` and `Exactly` are
 * the same control in two positions and a rack with no colours chosen shows
 * neither as chosen.
 */
export const LANE_OWNED: LaneParams = {
  q: "",
  colors: ["g", "r", "w"],
  match: "exactly",
  avail: "free",
  order: "fit",
};

export const LANE_DISCOVER: LaneParams = {
  q: "",
  colors: ["u", "b"],
  match: "contains",
  avail: "all",
  order: "popularity",
};

/**
 * A lane row, as the reader meets it. §3 draws neither lane's ROW — only the
 * rack above it — so a reader of those two entries saw the controls and never
 * the thing they filter. Hugh asked for the row on 2026-09-18; it is the one
 * addition on this page that is not transcribed from the canvas, and it goes
 * on the Design list rather than being quietly adopted.
 *
 * The two differ deliberately, because the entries do. `/commanders` scores a
 * commander you OWN and its row carries a price; `/discover` ranks one you do
 * not, and prints counts rather than a score — so the discover fixture's price
 * is `absent`, which draws no slot at all rather than a dash.
 *
 * `artCropUri` is null: a reference page must not fetch commander art, and the
 * row falls back to the identity gradient.
 */
function laneRow(
  slug: string,
  name: string,
  colorIdentity: string[],
  rank: number,
  score: number,
  deckCount: number,
  price: PriceSlot,
  prose: string,
): DiscoveryItem {
  return {
    slug,
    name,
    colorIdentity,
    artCropUri: null,
    releasedAt: "2026-02-14",
    deckCount,
    rank,
    ownedSupport: 61,
    edhrecTotal: 99,
    colorPoolSize: 1615,
    roleCounts: ROLE_COUNTS,
    price,
    tagTotal: 6,
    unplayedLabels: [],
    unplayedCount: 0,
    nearestDeck: null,
    prose,
    // `allPlayed` — the row's second line. A fixture with unplayed mechanics
    // would draw a list of them instead, which is a different state and not
    // the one either entry is about.
    gapSlot: { kind: "allPlayed" },
    score,
    measurableTotal: 100,
    supportPct: 62,
  };
}

export const LANE_ROW_OWNED = laneRow(
  "hearthhull-the-worldseed",
  "Hearthhull, the Worldseed",
  ["B", "G", "R"],
  2370,
  57,
  31169,
  { kind: "priced", cents: 15 },
  "Hearthhull decks accelerate mana through land plays, then usually convert that land-dense board into sacrifice fodder, burn payoffs, or a devastating land-destruction lock.",
);

export const LANE_ROW_DISCOVER = laneRow(
  "abuelo-ancestral-echo",
  "Abuelo, Ancestral Echo",
  ["U", "W"],
  6,
  71,
  1278,
  { kind: "absent" },
  "Abuelo decks blink artifacts and creatures, and tend to layer enter-the-battlefield triggers into a snowballing engine of tokens and lifegain.",
);
