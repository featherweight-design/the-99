import type { ProfileRoleTargets } from "../profile/types";
import type { BuilderTabSpec } from "../../components/decks/builder-tabs";
import { addPanelCopy } from "../copy/decks-builder";
import { gameLogCopy } from "../copy/game-log";
import { deckVersioningCopy } from "../copy/deck-versioning";
import type { SynergyCard } from "../commanders/synergy-cards";
import type { DeckDetailCard } from "../decks/grouping";
import type { SearchResult } from "../../app/decks/[id]/search-action";
import type { DecklistCard } from "../decks/export-helpers";
import type { VersionSummary } from "../decks/versions";
import type { DeckListItem } from "../decks/read";
import type { DeckFolderWithCount } from "../decks/folders";
import type { ShelfCounts } from "../decks/folder-view";
import type { ContestedCard } from "../collection/summary-read";
import type { GameSummary } from "../decks/games";
import type { DraftRow } from "../decks/draft-state";
import type { DeckClaim } from "../decks/availability";
import type { OwnedLegalCommander } from "../decks/read";
import { deckImportCopy } from "../copy/deck-import";
import type { CommanderRowView } from "../../components/commanders/commander-row";
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
import { buildDeckProfile, type ProfileCardRow } from "../profile/build";
import type { BracketPopulation } from "../profile/types";
import { slotDeck } from "../bracket/slot";
import { COMBO_DETECTION, EXTRA_TURN_DETECTION, MLD_DETECTION } from "../bracket/rules";
import type { FitDeck } from "../swaps/fits";
import type { SheetGroup } from "../swaps/sheet-model";
import { drawbackText } from "../swaps/sheet-model";
import { swapToolsCopy } from "../copy/swap-tools";
import { emptyParams, type ChooseParams } from "../intake/params";
import type { ResultRow } from "../intake/rows";
import type { TrialFigures } from "../intake/trial";
import type { Candidate } from "../commander-change/candidates";
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

/** All seven statuses, in the order `status.ts` defines them. */
export const STATUSES: StatusPill[] = [
  "New",
  "Draft",
  "Over",
  "Building",
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
/** The specimen commander's own measured targets, as the page reads them: past on ramp, at on
 *  draw (9.6 rounds to 10, as the fit score rounds it) and removal, two short on wipes. */
export const ROLE_TARGETS_MEASURED: ProfileRoleTargets = {
  of: "commander",
  targets: { ramp: 11, draw: 9.6, removal: 8, wipes: 3 },
};

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
/** A reason `parse.ts` actually emits (line 120), so the figure prints a row the inspector can. */
export const ISSUE_PARSE_ERROR = { line: 412, reason: `invalid quantity "x"` };

/**
 * The replace summary's own figures, from §3. Before and after are BOTH
 * printed, which is key line 1 — a change you can check rather than one you
 * are asked to believe.
 */
export const REPLACE_SUMMARY = {
  before: 4910,
  after: 5132,
  arrived: 283,
  left: 61,
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
 * Still short is not among them: the route draws that section with `ContestedCardRow`, never
 * a receipt row, so the figure draws it the same way below the other two.
 *
 * One row per section rather than several, because what the figure has to
 * teach is that the three sections are different ANSWERS — a fourth row in any
 * one of them adds length and no meaning.
 */
export const REPLACE_ROWS: {
  section: "cleared" | "still";
  card: string;
  deck: string;
  reason?: string;
}[] = [
  { section: "cleared", card: "Cultivate", deck: "Kinnan Ramp" },
  { section: "still", card: "Smothering Tithe", deck: "Atraxa Counters", reason: "not in the new list" },
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
  // Two weeks deep: 28 in the set, so 26 behind the pair. Hugh's own figures on staging, 2026-09-27.
  moreCount: 26,
  floor: 66,
};

/** Fitting cards a committed deck already sleeves, per commander. */
export const READY_IN_USE = new Map<string, ReceiptCounts>([
  ["about-preston-garvey-minuteman", { inUse: 620, wantedByDraft: 0 }],
  // ZERO, and that is the point: the second clause is ABSENT at zero, which is
  // key line 2. A pair where both cards carry it cannot show the absence.
  ["about-kotis-sibsig-champion", { inUse: 0, wantedByDraft: 0 }],
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
  printedIn: [],
};

export const LANE_DISCOVER: LaneParams = {
  q: "",
  colors: ["u", "b"],
  match: "contains",
  avail: "all",
  order: "popularity",
  printedIn: [],
};

/**
 * A lane row, as the reader meets it.
 *
 * §3 draws neither lane's ROW — only the rack above it — so a reader of those
 * two entries saw the controls and never the thing they filter. Hugh asked for
 * the row on 2026-09-18; it is the one addition on this page not transcribed
 * from the canvas, and it goes on the Design list rather than being quietly
 * adopted.
 *
 * ONE row serves both lanes since #708, so these differ only in their data —
 * which is the honest difference between the lanes and the reason there are
 * two fixtures rather than one. The discover row's price is `notStocked`,
 * because a commander nobody stocks still prints its deck count.
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
): CommanderRowView {
  return {
    slug,
    name,
    colorIdentity,
    artCropUri: null,
    rank,
    prose,
    // `allPlayed` — the row's second line. A fixture with unplayed mechanics
    // draws a list of them instead, which is a different state and not the one
    // either entry is about.
    //
    // It carries LABELS now: the state stopped claiming the reader plays every
    // mechanic and names the commander's own top themes instead, so a fixture
    // with none would draw a sentence with no mechanic in it — which is the
    // emptiness that made the old sentence worth replacing. `capped` is true
    // because a commander with only three eligible themes is the rare case:
    // the median carries 35, so the About specimen should draw the form almost
    // every row draws.
    gapSlot: {
      kind: "allPlayed",
      labels: ["Group Hug", "Politics", "Reanimator"],
      capped: true,
    },
    score,
    measurableTotal: 100,
    fitPool: 15,
    fitRoles: 25,
    fitSynergy: score - 40,
    deckCount,
    price,
    priceOk: true,
    href: `/commanders/${slug}`,
  };
}

export const LANE_ROW_OWNED = laneRow(
  "hearthhull-the-worldseed",
  "Hearthhull, the Worldseed",
  ["B", "G", "R"],
  2370,
  57,
  31169,
  // ABSENT, and not a choice. `CommanderRow` documents it: `/commanders`
  // lists commanders the reader OWNS, so its rows always pass an absent slot
  // and the lane reads no prices at all. A priced fixture here drew a figure
  // and a ManaPool stamp the route never ships — the same fault as giving the
  // lane the wrong row, one field down.
  { kind: "absent" },
  "Hearthhull decks accelerate mana through land plays, then usually convert that land-dense board into sacrifice fodder, burn payoffs, or a devastating land-destruction lock.",
);

export const LANE_ROW_DISCOVER = laneRow(
  "abuelo-ancestral-echo",
  "Abuelo, Ancestral Echo",
  ["U", "W"],
  6,
  71,
  1278,
  { kind: "notStocked" },
  "Abuelo decks blink artifacts and creatures, and tend to layer enter-the-battlefield triggers into a snowballing engine of tokens and lifegain.",
);


/**
 * The partner proposal, as the reader actually meets it.
 *
 * §3 draws two abstract halves and a row of union pips — a picture of nothing
 * the app renders. Hugh's ruling, 2026-09-18: partners are met on DECK IMPORT,
 * where a pasted list's second legend arrives as a proposal you can change or
 * remove, and on a deck's own header afterwards. `PartnerSlot` is that
 * proposal, and it is mounted rather than drawn.
 *
 * The names are §3's own pair from the import artboard, so the figure and the
 * drawing still agree about the example even though the composition does not.
 *
 * `imageUri` is null: a reference page fetches no card art.
 */
export const PARTNER_PROPOSAL = {
  primaryName: "Ishai, Ojutai Dragonspeaker",
  ability: { kind: "generic" } as const,
  partner: {
    name: "Bruse Tarl, Boorish Herder",
    colorIdentity: ["R", "W"],
    imageUri: null,
    // The ROUTE's own provenance line, not a retyped one: the caption is
    // finished by the caller on the real surface because only it knows whether
    // the partner came from the paste or was picked.
    caption: deckImportCopy.commander.proposed(2),
    // The ROUTE's name for it. `create-picker.tsx` builds this with
    // `proposedAria`, and a name typed here goes stale the moment that copy
    // is reworded — the caption two lines up already reads from the module
    // for exactly that reason.
    ariaLabel: deckImportCopy.commander.proposedAria("Bruse Tarl, Boorish Herder"),
  },
  // Not load-bearing while `partner` is set: the slot draws the proposal
  // either way, and mutating this to 0 fails nothing. Stated rather than left
  // looking like coverage. It matters only to the EMPTY state, which is a
  // different figure and not this entry's.
  pairableCount: 7,
};

/**
 * Three synergy rows, as a commander page draws them.
 *
 * The entry has NO canvas — it arrived with #683, after Design's last read of
 * `main` — so there is nothing to transcribe and the surface is the only
 * source. Its three key lines want three different rows, and one row can only
 * say one of them:
 *
 *   1. the dot is ownership and ONLY that. Two owned rows with different
 *      claims prove it: the dot does not move between them.
 *   2. the note counts copies and never names a deck.
 *   3. the synergy list PRICES what you do not own — so the third row is
 *      unowned and carries a figure, which no owned row ever does.
 *
 * All four owned readings are here because the caption names all four — "one
 * in a brew, none free, or short by however many copies" — and because the
 * FIRST of them draws nothing at all, which is the claim that a spare copy is
 * reported as silence. A fixture of owned rows alone would satisfy every
 * assertion about the dot and say nothing about the price.
 */
export const SYNERGY_ROWS: SynergyCard[] = [
  {
    oracleId: "about-syn-free",
    name: "Llanowar Elves",
    typeLine: "Creature — Elf Druid",
    facet: "creature",
    inclusionPct: 58,
    synergyPts: 3,
    imageUri: null,
    owned: true,
    committedTo: null,
    availability: AVAILABILITY[0].a,
    price: null,
    manaCost: "{G}",
  },
  {
    oracleId: "about-syn-soft",
    name: "Cultivate",
    typeLine: "Sorcery",
    facet: "spell",
    inclusionPct: 62,
    synergyPts: 4,
    imageUri: null,
    owned: true,
    committedTo: null,
    availability: AVAILABILITY[1].a,
    price: null,
    manaCost: "{2}{G}",
  },
  {
    oracleId: "about-syn-hard",
    name: "Arcane Signet",
    typeLine: "Artifact",
    facet: "artifact",
    inclusionPct: 71,
    synergyPts: 3,
    imageUri: null,
    owned: true,
    committedTo: null,
    availability: AVAILABILITY[2].a,
    price: null,
    manaCost: "{2}",
  },
  {
    oracleId: "about-syn-over",
    name: "Sol Ring",
    typeLine: "Artifact",
    facet: "artifact",
    inclusionPct: 88,
    synergyPts: 5,
    imageUri: null,
    owned: true,
    committedTo: null,
    availability: AVAILABILITY[3].a,
    price: null,
    manaCost: "{1}",
  },
  {
    oracleId: "about-syn-buy",
    name: "Smothering Tithe",
    typeLine: "Enchantment",
    facet: "enchantment",
    inclusionPct: 48,
    synergyPts: 6,
    imageUri: null,
    owned: false,
    committedTo: null,
    availability: null,
    price: PRICES[0].fact,
    manaCost: "{3}{W}",
  },
];


/**
 * A deck's own header: the name, its rename glyph, the identity pips, the
 * commander line, the status badge, the completion bar and its two actions.
 *
 * SINGLE-COMMANDER, so the denominator is 99 and the pips are Brago's own
 * Azorius identity. An earlier version of this comment claimed a PAIR — a 98
 * denominator and a union of two identities — while `partner` was null, so it
 * described a state the fixture has never drawn. §3's own deck is `HD -
 * Brago`, who has no partner.
 *
 * `artCropUri` is null. The figure draws no art band at all now (see
 * `DeckPageFigureBody`), and a reference page fetches no commander art either
 * way.
 */
/**
 * The four tabs, with the counts §3 draws.
 *
 * `games` carries NO count, and that is key line 2: a tab drops its count
 * rather than printing a nought, so a deck nobody has logged a game against
 * simply has no number beside Games. A fixture where every tab had a figure
 * would draw four alike and say nothing about the rule.
 */
export const DECK_TABS: BuilderTabSpec[] = [
  { id: "deck", label: addPanelCopy.tabs.deck, count: 99, accessibleName: "In deck, 99 cards" },
  { id: "consider", label: addPanelCopy.tabs.consider, count: 80, accessibleName: "Consider, 80 cards" },
  { id: "games", label: gameLogCopy.tab.label, accessibleName: gameLogCopy.tab.label },
  {
    id: "versions",
    label: deckVersioningCopy.history.tab,
    count: 1,
    accessibleName: `${deckVersioningCopy.history.tab}, 1 version`,
  },
];

export const DECK_SPINE = {
  deck: {
    id: "about-deck",
    name: "HD - Brago",
    commander: {
      oracleId: "about-brago",
      name: "Brago, King Eternal",
      colorIdentity: ["W", "U"],
      artCropUri: null,
    },
    partner: null,
  },
  counts: {
    // A FULL body. §3 draws this deck complete, and complete is the state
    // whose badge and bar agree most legibly — key line 1 is that the two are
    // one pair, which a half-built bar shows less plainly than a full one.
    built: 99,
    ownedCount: 99,
    toBuyCount: 0,
  },
  status: "Complete" as StatusPill,
  /** §3's own stamp on the header's right. */
  version: "v1 · committed 5 Sep 2026",
};

/**
 * `decklist-marks` — five real `deck_cards` rows, one per mark the entry names.
 *
 * The figure mounts `DecklistRow` itself, so every field here is one the row
 * actually reads. The order is the order the marks are introduced in the key
 * lines: the free row first, so the reader sees what "nothing in its way"
 * looks like before any mark at all.
 *
 * `cardTypeGroup` is deliberately never `"Lands"`. A row in the lands group
 * drops its meta line and takes the shorter shell, so a mixed fixture would
 * draw two row heights and read as a layout fault rather than as a set of
 * marks.
 */
export const DECKLIST_MARK_ROWS: DeckDetailCard[] = [
  {
    oracleId: "about-mark-free",
    name: CARDS.owned,
    typeLine: "Artifact",
    cardTypeGroup: "Artifacts",
    role: "ramp",
    cmc: 1,
    owned: true,
    quantity: 1,
    auto: false,
    manaCost: "{1}",
    printedName: null,
    printedSetCode: null,
    printedCollectorNumber: null,
    availability: AVAILABILITY[0].a,
  },
  {
    oracleId: "about-mark-soft",
    name: CARDS.removed,
    typeLine: "Enchantment",
    cardTypeGroup: "Enchantments",
    role: "draw",
    cmc: 3,
    owned: true,
    quantity: 1,
    // The one row that carries the auto tag. It is a fact about where the card
    // came from rather than an obstacle, which is the distinction the caption
    // draws — so it rides a row whose availability slot is occupied by a claim,
    // where the two can be seen not to be the same kind of thing.
    auto: true,
    manaCost: "{2}{U}",
    printedName: null,
    printedSetCode: null,
    printedCollectorNumber: null,
    availability: AVAILABILITY[1].a,
  },
  {
    oracleId: "about-mark-over",
    name: "Cyclonic Rift",
    typeLine: "Instant",
    cardTypeGroup: "Instants",
    role: "other",
    cmc: 7,
    owned: true,
    // Over-committed rows are where a count above one is ordinary, and the
    // entry's count line has nothing to point at without one.
    quantity: 2,
    auto: false,
    manaCost: "{6}{U}",
    printedName: null,
    printedSetCode: null,
    printedCollectorNumber: null,
    availability: AVAILABILITY[3].a,
  },
  {
    // The accent edge: a row the DRAFT touched. `PendingChangeProvider` keys on
    // oracle id, and `decklist-row.tsx` draws the edge as an inset 2px rule —
    // 3px of real border would shunt one row's contents sideways.
    oracleId: "about-mark-pending",
    name: "Swords to Plowshares",
    typeLine: "Instant",
    cardTypeGroup: "Instants",
    role: "removal",
    cmc: 1,
    owned: true,
    quantity: 1,
    auto: false,
    manaCost: "{W}",
    printedName: null,
    printedSetCode: null,
    printedCollectorNumber: null,
    availability: AVAILABILITY[0].a,
  },
  {
    oracleId: "about-mark-buy",
    name: "Dockside Extortionist",
    typeLine: "Creature — Goblin Pirate",
    cardTypeGroup: "Creatures",
    role: "ramp",
    cmc: 2,
    // `deckRowTag` answers `buy` on `!owned`, so this row draws the `$`.
    owned: false,
    quantity: 1,
    auto: false,
    manaCost: "{1}{R}",
    printedName: null,
    printedSetCode: null,
    printedCollectorNumber: null,
    availability: null,
  },
  {
    oracleId: "about-mark-proxy",
    name: CARDS.proxied,
    typeLine: "Artifact",
    cardTypeGroup: "Artifacts",
    role: "ramp",
    cmc: 0,
    // Not owned AND proxied: `deckRowTag` answers `proxy` first, so `P` takes
    // the slot `$` would otherwise have. The dot stays hollow, because `owned`
    // is a fact about the collection and `proxied` one about this deck's slot.
    owned: false,
    proxied: true,
    quantity: 1,
    auto: false,
    manaCost: "{0}",
    printedName: null,
    printedSetCode: null,
    printedCollectorNumber: null,
    availability: null,
  },
];

/**
 * `card-marks` — two decklist rows carrying three of the four bracket facts between them.
 *
 * TWO ROWS, because the order rule (`CARD_FACTS`) only shows on a card with two marks: Demonic
 * Tutor carries the Game Changer mark and the tutor mark, in that order. Time Warp carries one.
 * Mass land denial is on neither, so the figure's key names three facts rather than four: a
 * deck is a closed set, and `buildMarkKeyEntries` glosses only the marks its rows draw.
 *
 * Both owned and free, so no availability mark or buy tag competes with the facts.
 */
export const CARD_MARK_ROWS: DeckDetailCard[] = [
  {
    oracleId: "about-fact-demonic",
    name: "Demonic Tutor",
    typeLine: "Sorcery",
    cardTypeGroup: "Sorceries",
    role: "other",
    cmc: 2,
    owned: true,
    quantity: 1,
    auto: false,
    manaCost: "{1}{B}",
    printedName: null,
    printedSetCode: null,
    printedCollectorNumber: null,
    availability: AVAILABILITY[0].a,
    facts: ["gameChanger", "tutor"],
  },
  {
    oracleId: "about-fact-time-warp",
    name: "Time Warp",
    typeLine: "Sorcery",
    cardTypeGroup: "Sorceries",
    role: "other",
    cmc: 5,
    owned: true,
    quantity: 1,
    auto: false,
    manaCost: "{3}{U}{U}",
    printedName: null,
    printedSetCode: null,
    printedCollectorNumber: null,
    availability: AVAILABILITY[0].a,
    facts: ["extraTurns"],
  },
];

/**
 * `deck-analysis` — a Yuriko deck whose cards permit Optimized or cEDH, for the Analysis
 * tab's bracket box and its climb.
 *
 * A REAL PROFILE THROUGH THE REAL VERDICT. The profile is built by `buildDeckProfile` and the
 * verdict by `slotDeck`, never written by hand: a literal can hold a range the rules never
 * return, and the figure would then teach a deck that cannot exist. Five Game Changers pass
 * bracket 3's limit of three, which is what makes the range `[4, 5]`.
 *
 * UNANSWERED, where the handoff's fixture declared 4. Key line 1 is about the two chips under
 * the range, and an answered range draws its answer in their place, so the numeral would point
 * at a control the figure does not show.
 *
 * The population is the handoff's: 9,730 Yuriko decks declared a bracket and 3,884 of them said
 * Optimized. `analyzedAt` is fixed so the date line never moves between renders.
 */
const ANALYSIS_CARD = (oracleId: string, name: string, typeLine: string, cmc: number, manaCost: string): ProfileCardRow => ({
  oracleId,
  name,
  layout: "normal",
  typeLine,
  oracleText: null,
  keywords: [],
  cmc,
  colorIdentity: [],
  manaCost,
  quantity: 1,
  commanderLegal: true,
});

const YURIKO = ANALYSIS_CARD("about-yuriko", "Yuriko, the Tiger's Shadow", "Legendary Creature — Human Ninja", 3, "{1}{U}{B}");

const ANALYSIS_POPULATION: BracketPopulation = {
  counts: { "1": 120, "2": 1406, "3": 3320, "4": 3884, "5": 1000 },
  declaredTotal: 9730,
  deckCount: null,
  of: "commander",
};

const ANALYSIS_PROFILE = buildDeckProfile({
  deckId: "about-deck-analysis",
  fingerprint: "about",
  cards: [
    YURIKO,
    ANALYSIS_CARD("about-rhystic", "Rhystic Study", "Enchantment", 3, "{2}{U}"),
    ANALYSIS_CARD("about-rift", "Cyclonic Rift", "Instant", 2, "{1}{U}"),
    ANALYSIS_CARD("about-demonic", "Demonic Tutor", "Sorcery", 2, "{1}{B}"),
    ANALYSIS_CARD("about-vampiric", "Vampiric Tutor", "Instant", 1, "{B}"),
    ANALYSIS_CARD("about-mystical", "Mystical Tutor", "Instant", 1, "{U}"),
    ANALYSIS_CARD("about-diabolic", "Diabolic Intent", "Sorcery", 2, "{1}{B}"),
    ANALYSIS_CARD("about-merchant", "Merchant Scroll", "Sorcery", 2, "{1}{U}"),
    ANALYSIS_CARD("about-wishclaw", "Wishclaw Talisman", "Artifact", 2, "{1}{B}"),
    ANALYSIS_CARD("about-infiltrator", "Dimir Infiltrator", "Creature — Spirit", 2, "{U}{B}"),
    // Padded to a WHOLE deck, the probe fixtures' rule: Analyze runs only on a full 99
    // (`deckLegality`, `profile/stored.ts`), so a specimen short of one would show a reading the app
    // could never produce. Wastes, not a colored basic: colorless, so it moves no bracket or color
    // fact. 9 cards above plus 90 Wastes is the 99 under Yuriko.
    { ...ANALYSIS_CARD("about-wastes", "Wastes", "Basic Land", 0, ""), quantity: 90 },
  ],
  commanderOracleIds: [YURIKO.oracleId],
  identity: ["U", "B"],
  condition: "UB",
  composition: { pair: null, commander: null, identity: null, count: null },
  roles: { pair: null, commander: null, identity: null, count: null },
  thinCondition: false,
  staples: [],
  commanderDeckCount: null,
  population: ANALYSIS_POPULATION,
  mldFlags: new Map(),
  extraTurnFlags: new Map(),
  gameChangerIds: new Set(["about-rhystic", "about-rift", "about-demonic", "about-vampiric", "about-mystical"]),
  twoCardCombos: [],
  tutorIds: new Set([
    "about-demonic",
    "about-vampiric",
    "about-mystical",
    "about-diabolic",
    "about-merchant",
    "about-wishclaw",
    "about-infiltrator",
  ]),
  detection: {
    massLandDenial: MLD_DETECTION,
    extraTurn: EXTRA_TURN_DETECTION,
    twoCardCombos: COMBO_DETECTION,
  },
});

export const DECK_ANALYSIS = {
  profile: ANALYSIS_PROFILE,
  verdict: slotDeck(ANALYSIS_PROFILE),
  analyzedAt: "2026-09-25T12:00:00.000Z",
  /** The committed version the reading is pinned to. There is no version before it to compare. */
  version: 3,
};

/**
 * `roles` — one card per role, quantity-weighted so the strip's five cells
 * read the counts this entry wants to explain.
 *
 * `computeRoleCounts` sums `quantity` over `role` and reads nothing else, so
 * one row per role states the tally exactly. The counts are chosen to draw
 * every cell state the entry's caption names: Ramp OVER its number (12 of 10 —
 * "a role over its number is fine and says so by saying nothing"), Draw and
 * Removal exactly met, Wipes SHORT, and Land short of an advisory target,
 * whose `rec ~37` is where the range still speaks.
 */
export const ROLE_MIX_CARDS: DeckDetailCard[] = (
  [
    ["ramp", 12],
    ["draw", 10],
    ["removal", 8],
    ["wipes", 1],
    ["land", 35],
  ] as const
).map(([role, quantity]) => ({
  oracleId: `about-role-${role}`,
  name: role,
  typeLine: "",
  cardTypeGroup: "Other" as const,
  role,
  cmc: 0,
  owned: true,
  quantity,
  auto: false,
  manaCost: null,
  printedName: null,
  printedSetCode: null,
  printedCollectorNumber: null,
  availability: null,
}));

/**
 * `add-cards` — three Add-panel search results, one per reading the caption
 * makes.
 *
 * The figure mounts `QuickAddBar` with `search` returning this list, so every
 * field here is one the panel's row actually reads.
 *
 * The third row is the caption's whole second sentence: a card a COMMITTED
 * deck is holding. `AVAILABILITY[2]` is the hard claim — one copy owned, one
 * claimed, none free — and the row draws its marker and stays addable, rather
 * than being refused.
 */
export const ADD_RESULTS: SearchResult[] = [
  {
    oracleId: "about-add-owned",
    name: CARDS.owned,
    typeLine: "Artifact",
    cardTypeGroup: "Artifacts",
    role: "ramp",
    imageUri: null,
    manaCost: "{1}",
    cmc: 1,
    owned: true,
    ownedQty: 2,
    availability: AVAILABILITY[0].a,
    flavorName: null,
    // No card note on any of the three: this entry is about SEARCHING, and a note under
    // one row would put the bracket rules in a figure whose caption never mentions them —
    // the same reason `AddCardsFigureBody` passes an empty combo map.
    facts: null,
  },
  {
    oracleId: "about-add-unowned",
    name: "Dockside Extortionist",
    typeLine: "Creature — Goblin Pirate",
    cardTypeGroup: "Creatures",
    role: "ramp",
    imageUri: null,
    manaCost: "{1}{R}",
    cmc: 2,
    // The panel states OWNERSHIP on every result, and the two branches are
    // different sentences — `×N owned` against a bare `not owned` — so one row
    // has to be a card the player does not own or only one of them is drawn.
    //
    // This comment used to say "the dot is on every result", which was the
    // caption's claim before this rebuild found that the panel draws no dot at
    // all. Left standing it would have talked the next change into putting one
    // back.
    owned: false,
    ownedQty: 0,
    availability: null,
    flavorName: null,
    facts: null,
  },
  {
    oracleId: "about-add-held",
    name: CARDS.removed,
    typeLine: "Enchantment",
    cardTypeGroup: "Enchantments",
    role: "draw",
    imageUri: null,
    manaCost: "{2}{U}",
    cmc: 3,
    owned: true,
    ownedQty: 1,
    availability: AVAILABILITY[2].a,
    flavorName: null,
    facts: null,
  },
];


/**
 * `export` — the two lists the dialog's tabs draw.
 *
 * `buildDecklistText` folds these into the preview, and the preview prints a
 * `… N more` tail from the deck's own count — so the list is deliberately
 * short and the count it is measured against is the real 99.
 */
export const EXPORT_DECKLIST: DecklistCard[] = [
  { name: CARDS.owned, quantity: 1 },
  { name: "Cultivate", quantity: 1 },
  { name: CARDS.removed, quantity: 1 },
];

/**
 * What the Shopping tab holds, and the entry's first key line: the pill counts
 * the cards this deck has to buy, WHICH INCLUDES ONE YOU OWN whose every copy
 * another deck is already holding. Both cases are here, or the key line has
 * nothing to point at.
 */
export const EXPORT_SHOPPING: {
  name: string;
  role?: string;
  quantity: number;
  owned: boolean;
}[] = [
  { name: "Dockside Extortionist", quantity: 1, owned: false },
  { name: CARDS.removed, quantity: 1, owned: true },
];

/**
 * `shopping` — the two ways a card reaches the Shopping filter.
 *
 * `isShoppingCard` answers true for an unowned card outright, and for an OWNED
 * card whose availability reads `over` — every copy claimed by a committed
 * deck. The second is the caption's load-bearing sentence, and a fixture of
 * unowned rows alone would draw two buy tags and substantiate nothing.
 *
 * The second row's `availability` is therefore `AVAILABILITY[3]`, the over
 * state, and NOT the hard one: `availabilityState` reads `free` directly, and
 * `hard` with `free: 0` resolves to `hard` rather than `over`, which would
 * leave the row off the list it is here to be on.
 */
export const SHOPPING_ROWS: DeckDetailCard[] = [
  {
    oracleId: "about-shop-unowned",
    name: "Dockside Extortionist",
    typeLine: "Creature — Goblin Pirate",
    cardTypeGroup: "Creatures",
    role: "ramp",
    cmc: 2,
    owned: false,
    quantity: 1,
    auto: false,
    manaCost: "{1}{R}",
    printedName: null,
    printedSetCode: null,
    printedCollectorNumber: null,
    availability: null,
  },
  {
    oracleId: "about-shop-spoken",
    name: CARDS.removed,
    typeLine: "Enchantment",
    cardTypeGroup: "Enchantments",
    role: "draw",
    cmc: 3,
    owned: true,
    quantity: 1,
    auto: false,
    manaCost: "{2}{U}",
    printedName: null,
    printedSetCode: null,
    printedCollectorNumber: null,
    availability: AVAILABILITY[3].a,
  },
];

/**
 * `versions` — two committed versions for the rail, newest first, exactly as
 * `listVersions` returns them. `VersionRail` marks the first `current` from
 * its own index, so no field here states it.
 *
 * v1 carries `adds: 99` against no predecessor, which the rail renders as
 * `initial` rather than `+99`. v2's note is what makes the entry's second key
 * line legible: a version carries its own record, so a change can be read as
 * having helped rather than only as having happened.
 *
 * `gamesHeld` is on v1 alone, deliberately: the rail draws a tally only for a
 * version that is no longer current, because the current one is still
 * accumulating and a figure on it would be a count that has not finished.
 */
export const DECK_VERSIONS: VersionSummary[] = [
  {
    id: "about-v2",
    number: 2,
    committedAt: new Date("2026-09-05T00:00:00.000Z"),
    note: "Swapped the top end for two more two-drops.",
    commanderOracleId: "about-brago",
    partnerOracleId: null,
    commanderSince: new Date("2026-08-01T00:00:00.000Z"),
    partnerSince: null,
    cardCount: 99,
    adds: 4,
    removes: 4,
    manaValue: 2.8,
    gamesHeld: 0,
    commanderName: "Brago, King Eternal",
    partnerName: null,
  },
  {
    id: "about-v1",
    number: 1,
    committedAt: new Date("2026-08-01T00:00:00.000Z"),
    note: null,
    commanderOracleId: "about-brago",
    partnerOracleId: null,
    commanderSince: new Date("2026-08-01T00:00:00.000Z"),
    partnerSince: null,
    cardCount: 99,
    adds: 99,
    removes: 0,
    manaValue: 3.1,
    gamesHeld: 3,
    commanderName: "Brago, King Eternal",
    partnerName: null,
  },
];

/**
 * `resume` — three decks for Home's resume block, one per verb it can print.
 *
 * `ResumeDecks` chooses the verb from the three stamps rather than being told:
 * `touched.ts` ranks edited / committed / played, so a fixture states the
 * DATES and the block decides the words. The retired figure quoted all three
 * strings directly, which is the one arrangement that cannot go wrong and also
 * cannot be right — it would keep printing them after a rule change.
 *
 * The instants are stated relative to `RESUME_NOW`, which the figure passes as
 * the page's clock. A fixture reading the real clock would make every
 * screenshot of this page differ from the last for no reason.
 */
export const RESUME_NOW = new Date("2026-09-19T12:00:00.000Z");

const hoursBefore = (h: number) => new Date(RESUME_NOW.getTime() - h * 3_600_000);

export const RESUME_DECKS: DeckListItem[] = [
  {
    id: "about-resume-edited",
    name: "HD - Brago",
    createdAt: hoursBefore(24 * 40),
    commanderName: "Brago, King Eternal",
    commanderColorIdentity: ["W", "U"],
    commanderImageUri: null,
    commanderArtCropUri: null,
    partnerName: null,
    partnerColorIdentity: null,
    folderId: null,
    folderName: null,
    built: 99,
    ownedCount: 99,
    toBuyCount: 0,
    unresolvedCount: 0,
    // Edited two hours ago and committed yesterday, so `edited` wins — which
    // is the ranking, not a field.
    pendingChanges: 7,
    versionNumber: 2,
    lastPlayedAt: hoursBefore(24 * 6),
    lastEditedAt: hoursBefore(2),
    lastCommittedAt: hoursBefore(26),
    inUseElsewhere: 0,
    proxiedCount: 0,
    statusPill: "Complete",
    bracket: null,
  },
  {
    id: "about-resume-committed",
    name: "HD - Atraxa",
    createdAt: hoursBefore(24 * 90),
    commanderName: "Atraxa, Praetors' Voice",
    commanderColorIdentity: ["W", "U", "B", "G"],
    commanderImageUri: null,
    commanderArtCropUri: null,
    partnerName: null,
    partnerColorIdentity: null,
    folderId: null,
    folderName: null,
    built: 99,
    ownedCount: 86,
    toBuyCount: 13,
    unresolvedCount: 0,
    // Nothing pending, and the commit is STRICTLY newer than the edit —
    // `touchedBy` resolves a tie to `edited`, so equal stamps would print the
    // first deck's verb again and this row would prove nothing. A commit does
    // not stamp `last_edited_at` (see touch.ts), so an edit then a commit an
    // hour later is the ordinary shape of this.
    pendingChanges: 0,
    versionNumber: 4,
    lastPlayedAt: hoursBefore(24 * 9),
    lastEditedAt: hoursBefore(80),
    lastCommittedAt: hoursBefore(30),
    inUseElsewhere: 4,
    proxiedCount: 0,
    statusPill: "To buy",
    bracket: null,
  },
  {
    // A FOURTH, so the block draws its real 2x2 grid rather than a row of two
    // and an orphan. Home lays these out in two columns from the wide stop,
    // and an odd count photographs as a layout fault.
    id: "about-resume-committed-2",
    name: "HD - Kinnan",
    createdAt: hoursBefore(24 * 60),
    commanderName: "Kinnan, Bonder Prodigy",
    commanderColorIdentity: ["G", "U"],
    commanderImageUri: null,
    commanderArtCropUri: null,
    partnerName: null,
    partnerColorIdentity: null,
    folderId: null,
    folderName: null,
    built: 68,
    ownedCount: 68,
    toBuyCount: 0,
    unresolvedCount: 0,
    pendingChanges: 3,
    versionNumber: 1,
    lastPlayedAt: null,
    lastEditedAt: hoursBefore(4),
    lastCommittedAt: hoursBefore(24 * 12),
    inUseElsewhere: 2,
    proxiedCount: 0,
    statusPill: "Building",
    bracket: null,
  },
  {
    id: "about-resume-played",
    name: "HD - Korvold",
    createdAt: hoursBefore(24 * 120),
    commanderName: "Korvold, Fae-Cursed King",
    commanderColorIdentity: ["B", "R", "G"],
    commanderImageUri: null,
    commanderArtCropUri: null,
    partnerName: null,
    partnerColorIdentity: null,
    folderId: null,
    folderName: null,
    built: 99,
    ownedCount: 99,
    toBuyCount: 0,
    unresolvedCount: 0,
    // Played more recently than it was edited or committed.
    pendingChanges: 0,
    versionNumber: 3,
    lastPlayedAt: hoursBefore(48),
    lastEditedAt: hoursBefore(24 * 20),
    lastCommittedAt: hoursBefore(24 * 20),
    inUseElsewhere: 0,
    proxiedCount: 0,
    statusPill: "Complete",
    bracket: null,
  },
];

/**
 * `folders` — three shelves for the deck list's shelf line.
 *
 * `shelfSegments` builds the line from these: `All decks` first, the folders
 * in `listFolders`' own order, then `Unfiled` — which `showsUnfiled` omits
 * until the first folder exists, so a fixture with no folders would draw the
 * one segment and prove nothing about the caption's last sentence.
 *
 * The counts are stated rather than summed, because the line is given them:
 * `all` is every deck, `unfiled` the residue, and `byFolder` a figure per
 * shelf. They are made to add up — 3 + 2 + 4 = 9 — since a reader can check
 * that and the entry's whole claim is that every count is on screen at once.
 */
export const DECK_FOLDERS: DeckFolderWithCount[] = [
  { id: "about-folder-edh", name: "Pod night", createdAt: new Date("2026-06-01"), deckCount: 3 },
  { id: "about-folder-retired", name: "Retired", createdAt: new Date("2026-07-14"), deckCount: 2 },
];

export const SHELF_COUNTS: ShelfCounts = {
  all: 9,
  unfiled: 4,
  byFolder: new Map([
    ["about-folder-edh", 3],
    ["about-folder-retired", 2],
  ]),
};

/**
 * `reservations` — one contested card with two committed claimants.
 *
 * The row is the app's whole answer to this entry: two decks want the card,
 * one copy exists, and seniority decides until the player says otherwise.
 * `since` is what orders the list and draws the stamp, so the older claim is
 * the earlier instant — the default holder, stated as a DATE rather than as a
 * flag, because that is how the model decides it.
 *
 * `granted: 0` on both: nobody has overridden anything yet, which is the state
 * the caption's first clause describes. `allocated` is the allocation as it
 * stands, so the senior deck has the copy and the other reads short — the
 * caption's "the other reads as short either way".
 *
 * `fromImport` is FALSE. The same row is drawn on two surfaces and the flag is
 * what tells them apart: true would make `arrived` an arrival and print `1 new
 * copy`, which on a deck's own page tells the reader their collection turned
 * up this morning.
 */
export const CONTESTED_RESERVATION: ContestedCard = {
  oracleId: "about-contested",
  cardName: CARDS.removed,
  arrived: 1,
  fromImport: false,
  ownedBefore: 1,
  owned: 1,
  brewNames: [],
  claimants: [
    {
      deckId: "about-resume-edited",
      deckName: "HD - Brago",
      quantity: 1,
      commanderCopies: 0,
      granted: 0,
      since: new Date("2026-08-01T00:00:00.000Z").getTime(),
      versionNumber: 2,
      allocated: 1,
    },
    {
      deckId: "about-resume-committed",
      deckName: "HD - Atraxa",
      quantity: 1,
      commanderCopies: 0,
      granted: 0,
      since: new Date("2026-09-05T00:00:00.000Z").getTime(),
      versionNumber: 4,
      allocated: 0,
    },
  ],
};

/**
 * `log-findings` — a seven-game summary, with every part of the aggregate the
 * entry's key lines name.
 *
 * `GameFindings` draws a Fix bucket, a Keep bucket, and the Mixed line under a
 * rule — and the entry's second key line is about that last one ("anything
 * that has cut both ways is STATED rather than filed — one line, never a third
 * column"). A summary with an empty `mixed` draws no rule at all, so the key
 * line would point at nothing.
 *
 * Seven games clears PATTERN_MIN. Below it every cell is neutral and the panel
 * describes rather than finds, which is the state the caption's first key line
 * contrasts against — so a fixture under three games would teach the opposite.
 *
 * `marked` is NOT derivable from the tallies and is stated for that reason:
 * one game can contribute to several axes, so summing them overcounts.
 *
 * THREE axes per bucket, not two. The cell is a fixed 200px that wraps
 * (`game-log.md`, "200px wide desktop, wrapping"), so a bucket of two fills
 * 412px of the plate's ~700px and the figure reads as a broken layout rather
 * than as a panel. Three fill 624px. A real deck logs against EIGHT axes, so
 * two per bucket was also the unrepresentative case: Hugh reported the gap on
 * 2026-09-19 and this is the fixture answer to it, chosen over widening the
 * cell because that width is Design's and reaches the real Games tab.
 */
export const GAME_SUMMARY: GameSummary = {
  count: GAME_COUNT,
  marked: 5,
  record: { wins: 4, losses: 3, draws: 0 },
  // VOCABULARY ORDER, per `GameSummary.axes` — `GAME_AXIS_KEYS` is speed,
  // card_flow, mana, interaction, board, resilience, engine, closing. The
  // buckets below rank by strength instead; this flat list does not, because
  // it is what the N=1 panel draws and ranking one game would be a claim.
  axes: [
    { key: "speed", worked: 1, hurt: 4, net: -3 },
    { key: "card_flow", worked: 1, hurt: 5, net: -4 },
    { key: "mana", worked: 3, hurt: 0, net: 3 },
    { key: "interaction", worked: 5, hurt: 1, net: 4 },
    { key: "board", worked: 1, hurt: 3, net: -2 },
    { key: "resilience", worked: 2, hurt: 2, net: 0 },
    { key: "closing", worked: 4, hurt: 1, net: 3 },
  ],
  // STRONGEST FIRST, which is `sortAxes`: |net| descending, ties broken by
  // vocabulary order. -4, -3, -2 — not the order these were added in.
  fix: [
    { key: "card_flow", worked: 1, hurt: 5, net: -4 },
    { key: "speed", worked: 1, hurt: 4, net: -3 },
    { key: "board", worked: 1, hurt: 3, net: -2 },
  ],
  // 4, then 3 and 3 tied and broken by vocabulary order — mana is index 2,
  // closing index 7, so mana leads. Already right; stated so it stays right.
  keep: [
    { key: "interaction", worked: 5, hurt: 1, net: 4 },
    { key: "mana", worked: 3, hurt: 0, net: 3 },
    { key: "closing", worked: 4, hurt: 1, net: 3 },
  ],
  // Cut both ways, so it is the Mixed line rather than a third column.
  mixed: [{ key: "resilience", worked: 2, hurt: 2, net: 0 }],
};

/**
 * `review-and-commit` — the `Coming in` column of `/decks/[id]/changes`.
 *
 * Design's R5 picks this slice, and the reason is worth keeping: the route is
 * ~1,100 lines, and this column is the only part carrying the four-bucket
 * breakdown, `Pull it`, and both pull guards. The what-changed strip is the
 * deck page's mix strip folded over two lists, which `deck-page` documents;
 * the commit sheet and the discard confirm are consequences the caption names
 * in a clause each.
 *
 * THREE ROWS, ONE PER ANSWER AN ADD CAN GET:
 *
 * - `free` — the collection has a spare copy. No control, nothing to decide.
 * - `claimed` with a RELEASABLE holder — `releasableClaims` wants `mature`,
 *   `senior`, not `commander`, not `locked`, and all four have to be right or
 *   `pullCandidate` returns null and the row draws no control at all.
 * - `claimed` with a COMMANDER holder — the same bucket, and the guard instead:
 *   no route releases a commander, so the row draws the `commander` tag.
 *
 * Design drew the third row as a PENDING holder with a `deck has changes` tag.
 * That guard was retired on 2026-09-27, when a pull stopped committing its
 * source, so the row shows the guard that remains.
 */
const claim = (o: Partial<DeckClaim> & { id: string; name: string }): DeckClaim => ({
  quantity: 1,
  mature: true,
  senior: true,
  pending: false,
  commander: false,
  since: null,
  versionNumber: null,
  ...o,
});

const reviewRow = (
  o: Partial<DraftRow> & { oracleId: string; name: string; typeLine: string },
): DraftRow => ({
  cardTypeGroup: "Other",
  role: "other",
  cmc: 2,
  owned: true,
  quantity: 1,
  auto: false,
  manaCost: null,
  printedName: null,
  printedSetCode: null,
  printedCollectorNumber: null,
  availability: null,
  direction: "in",
  from: 0,
  to: 1,
  bucket: "free",
  shortfall: 0,
  ...o,
});

export const REVIEW_IN_ROWS: DraftRow[] = [
  reviewRow({
    oracleId: "about-rev-free",
    name: "Beast Within",
    typeLine: "Instant",
    cardTypeGroup: "Instants",
    manaCost: "{2}{G}",
    bucket: "free",
    availability: { owned: 2, hard: 0, soft: 0, free: 2, claims: [] },
  }),
  reviewRow({
    oracleId: "about-rev-pull",
    name: CARDS.removed,
    typeLine: "Enchantment",
    cardTypeGroup: "Enchantments",
    manaCost: "{2}{U}",
    bucket: "claimed",
    availability: {
      owned: 1,
      hard: 1,
      soft: 0,
      free: 0,
      claims: [claim({ id: "about-atraxa", name: "Atraxa Counters", versionNumber: 4 })],
    },
  }),
  reviewRow({
    oracleId: "about-rev-guard",
    name: "Kinnan, Bonder Prodigy",
    typeLine: "Legendary Creature — Elf Druid",
    cardTypeGroup: "Creatures",
    manaCost: "{G}{U}",
    bucket: "claimed",
    availability: {
      owned: 1,
      hard: 1,
      soft: 0,
      free: 0,
      // `commander` is what draws the guard instead of the control: no pull ever moves a copy
      // another deck holds as its commander. (A deck with a draft of its own used to be the guard
      // drawn here; since 2026-09-27 a pull joins that draft, so it guards nothing.)
      claims: [
        claim({ id: "about-kinnan", name: "Kinnan Ramp", commander: true, versionNumber: 2 }),
      ],
    },
  }),
];

/**
 * `new-deck` — three owned legends for the commander picker.
 *
 * `poolCount` is the figure beside each name: how many of the player's cards
 * are legal in that commander's colours. It is the `Pool` part of a fit score
 * read from the other side, which is the entry's second key line.
 */
export const CREATE_COMMANDERS: OwnedLegalCommander[] = [
  {
    oracleId: "about-preston",
    name: "Preston Garvey, Minuteman",
    colorIdentity: ["R", "G", "W"],
    imageUri: null,
    // Null rather than a Partner reminder: `PartnerSlot` is named in the
    // caption and not drawn, because it appears only for a commander with the
    // ability and would need a fourth row to explain itself.
    oracleText: null,
    poolCount: 1615,
  },
  {
    oracleId: "about-kotis",
    name: "Kotis, Sibsig Champion",
    colorIdentity: ["U", "B", "G"],
    imageUri: null,
    oracleText: null,
    poolCount: 1747,
  },
  {
    oracleId: "about-kinnan-cmd",
    name: "Kinnan, Bonder Prodigy",
    colorIdentity: ["U", "G"],
    imageUri: null,
    oracleText: null,
    poolCount: 1402,
  },
];

/**
 * `locked-cards` — Design's fixture: Lotus Petal and Ornithopter locked, Brainstorm not. Drawn
 * twice, at rest and in the Lock cards mode, so a locked row is seen both ways.
 *
 * Every row is owned and free, and none is in the lands group: a row carrying any other mark
 * would ask to be read beside a lock it has nothing to do with, and a lands row takes the shorter
 * shell (see `DECKLIST_MARK_ROWS`).
 */
export const LOCKED_ROWS: DeckDetailCard[] = (
  [
    ["about-lock-petal", "Lotus Petal", "Artifact", "Artifacts", "ramp", 0, "{0}", true],
    ["about-lock-ornithopter", "Ornithopter", "Artifact Creature — Thopter", "Creatures", "other", 0, "{0}", true],
    ["about-lock-brainstorm", "Brainstorm", "Instant", "Instants", "draw", 1, "{U}", false],
  ] as const
).map(([oracleId, name, typeLine, cardTypeGroup, role, cmc, manaCost, locked]) => ({
  oracleId,
  name,
  typeLine,
  cardTypeGroup,
  role,
  cmc,
  owned: true,
  quantity: 1,
  auto: false,
  manaCost,
  printedName: null,
  printedSetCode: null,
  printedCollectorNumber: null,
  availability: AVAILABILITY[0].a,
  locked,
}));

/**
 * `change-commander` — Design's fixture: the deck HD - Gishath (Naya, 64 of its cards counted,
 * mana value 8), one candidate the player owns with a free copy and one to buy.
 *
 * The two figures are deliberately in the opposite order to the groups: Mayael fits more of the
 * deck and still draws second, because owned candidates come first whatever their figure. That
 * is key line 3, and a fixture where the owned one also fitted better could not show it.
 */
export const CHANGE_COMMANDER: {
  deckName: string;
  current: { cmc: number; name: string };
  yours: Candidate;
  /** A candidate already in the 99: it moves to the command zone and Gishath takes its slot. */
  inDeck: Candidate;
  toBuy: Candidate;
} = {
  deckName: "HD - Gishath",
  current: { cmc: 8, name: "Gishath" },
  yours: {
    key: "about-marisi",
    halves: [
      {
        oracleId: "about-marisi",
        name: "Marisi, Breaker of the Coil",
        manaCost: "{2}{R}{G}{W}",
        cmc: 5,
        artCropUri: null,
        imageUri: null,
        inDeck: false,
        owned: true,
        availability: { owned: 1, hard: 0, soft: 0, free: 1, claims: [] },
        price: null,
      },
    ],
    fit: { n: 23, of: 64 },
    matched: [],
    deckCount: 1204,
  },
  inDeck: {
    key: "about-uril",
    halves: [
      {
        oracleId: "about-uril",
        name: "Uril, the Miststalker",
        manaCost: "{2}{R}{G}{W}",
        cmc: 5,
        artCropUri: null,
        imageUri: null,
        inDeck: true,
        owned: true,
        availability: { owned: 1, hard: 0, soft: 0, free: 1, claims: [] },
        price: null,
      },
    ],
    fit: { n: 19, of: 64 },
    matched: [],
    deckCount: 896,
  },
  toBuy: {
    key: "about-mayael",
    halves: [
      {
        oracleId: "about-mayael",
        name: "Mayael the Anima",
        manaCost: "{R}{G}{W}",
        cmc: 3,
        artCropUri: null,
        imageUri: null,
        inDeck: false,
        owned: false,
        availability: null,
        price: { cents: 240, foilCents: null, etchedCents: null, asOf: PRICES[0].fact.asOf },
      },
    ],
    fit: { n: 38, of: 64 },
    matched: [],
    deckCount: 2381,
  },
};

/**
 * `help-me-choose` — Design's fixture: a Dinosaurs theme and Regisaur Alpha as the card to build
 * around, under a $150 budget at bracket 2. Two results, each ordered by its weaker figure, which
 * is the one lit SETS RANK: Pantlaza's card figure (41%) ranks it above Gishath's (34%), although
 * Gishath fits the theme better and is the one the player owns. That is key lines 1 and 2 at once.
 *
 * Shares are fractions, as `rankCommanders` returns them; `figures()` turns them into the drawn
 * percentages, so the lit figure follows the shipped rule rather than being written down here.
 */
export const CHOOSE = {
  params: {
    ...emptyParams(),
    themes: ["dinosaurs"],
    card: "about-regisaur",
    budgetDollars: 150,
    bracket: 2,
    results: true,
  } satisfies ChooseParams,
  labels: { theme: () => "Dinosaurs", card: "Regisaur Alpha" },
  rows: [
    {
      row: {
        oracleId: "about-pantlaza",
        name: "Pantlaza, Sun-Favored",
        colorIdentity: ["R", "G", "W"],
        imageUri: null,
        artCropUri: null,
        mark: { kind: "buy", price: { kind: "priced", cents: 110 } },
        themeFits: [{ slug: "dinosaurs", share: 0.74 }],
        cardFit: 0.41,
        ownedSupport: 0,
        supportTotal: 0,
      } satisfies ResultRow,
      trial: { body: 99, owned: 38, buyCents: 11_200, unpricedCard: null } satisfies TrialFigures,
    },
    {
      row: {
        oracleId: "about-gishath",
        name: "Gishath, Sun's Avatar",
        colorIdentity: ["R", "G", "W"],
        imageUri: null,
        artCropUri: null,
        mark: { kind: "free" },
        themeFits: [{ slug: "dinosaurs", share: 0.81 }],
        cardFit: 0.34,
        ownedSupport: 0,
        supportTotal: 0,
      } satisfies ResultRow,
      trial: { body: 99, owned: 52, buyCents: 6_400, unpricedCard: null } satisfies TrialFigures,
    },
  ],
};

/**
 * `fits-your-decks` — Find a deck for it, opened on Ashnod's Altar: one deck it completes a combo in,
 * one whose sacrifice theme it joins, and one that already holds it.
 *
 * Not Design's card. The canvas draws Basalt Monolith joining an "artifacts" theme, and the shipped
 * themes (`src/lib/recs/themes.ts`) have none; Basalt Monolith joins no shipped theme at all, so its
 * theme row could not be drawn truthfully. Ashnod's Altar is a sacrifice outlet, which is a theme,
 * and it has a well-known combo partner, so both reasons are real. The rows keep the shipped order
 * (`shapeFits`): the combo first, then the theme.
 */
export const FITS = {
  card: { name: "Ashnod's Altar", imageUri: null, colorIdentity: [] as string[] },
  owned: 1,
  free: 1,
  rows: [
    {
      id: "about-fits-chainer",
      name: "HD - Chainer",
      commanders: ["Chainer, Nightmare Adept"],
      need: { role: "ramp", have: 9, target: 10 },
      reason: { kind: "combo", with: { oracleId: "about-nim-deathmantle", name: "Nim Deathmantle" } },
    },
    {
      id: "about-fits-korvold",
      name: "HD - Korvold",
      commanders: ["Korvold, Fae-Cursed King"],
      need: { role: "ramp", have: 7, target: 10 },
      reason: { kind: "theme", theme: "sacOutlet", n: 11 },
    },
  ] satisfies FitDeck[],
  holds: [{ id: "about-fits-tymna", name: "HD - Tymna + Thrasios", quantity: 1 }],
};

/**
 * `stand-ins` — Shopping's limit line over one row it marks, then the first group of that row's
 * stand-ins. Design's fixture: Plateau at $293.84 in HD - Gishath, six cards to buy with one over
 * the limit, and the same-type lands group. Design drew it eight long showing three; the sheet shows
 * `STAND_IN_GROUP_SHOWN` (five), so the group is six long and draws `Show all 6 lands`.
 *
 * The group's strings are the sheet's own builders (`swapToolsCopy.sheet`, `drawbackText`), so the
 * heading, the order note and each mana line are what the sheet would print for these lands.
 * Sacred Foundry's price is the condition itself, so it carries no separate cost (the copy's rule).
 */
const sheet = swapToolsCopy.sheet;
const WR = "white and red";
export const STAND_INS = {
  deckName: "HD - Gishath",
  shoppingCount: 6,
  overCount: 1,
  group: {
    heading: sheet.groupSameType("lands"),
    order: sheet.orderBestMana,
    noun: "lands",
    // In the order `rankStandIns` gives them (its `byLadder`): the rung first (untapped on a condition
    // or for life, then tapped), then synergy, which none of these carries, then free before priced,
    // cheapest first, then the name.
    rows: [
      { name: "Battlefield Forge", free: true, cents: null, body: [sheet.mana.line(WR, sheet.mana.untapped)], muted: [drawbackText({ kind: "damage", amount: 1, colors: [] }, ["W", "R"])] },
      { name: "Sacred Foundry", free: true, cents: null, body: [sheet.mana.line(WR, sheet.mana.untappedIf("you pay 2 life"))], muted: [] },
      { name: "Sunbaked Canyon", free: false, cents: 112, body: [sheet.mana.line(WR, sheet.mana.untapped)], muted: [drawbackText({ kind: "life", amount: 1, colors: [] }, ["W", "R"])] },
      { name: "Clifftop Retreat", free: false, cents: 150, body: [sheet.mana.line(WR, sheet.mana.untappedWith("a Mountain or a Plains"))], muted: [] },
      { name: "Wind-Scarred Crag", free: false, cents: 15, body: [sheet.mana.line(WR, sheet.mana.tapped)], muted: [] },
      { name: "Needle Spires", free: false, cents: 25, body: [sheet.mana.line(WR, sheet.mana.tapped)], muted: [] },
    ].map((r, i) => ({ oracleId: `about-stand-in-${i}`, imageUri: null, soft: 0, foilOnly: false, ...r })),
  } satisfies SheetGroup,
  /**
   * A SPELL's group beside the land one, because stand-ins key 3 is about spells and a lands-only
   * figure left it pointing at nothing (the About audit, 2026-09-26). Birds of Paradise ramps by
   * tapping for mana and flies; two mana elves keep the first job and lose the second. The words are
   * the sheet's own (`swapToolsCopy.sheet.job`), in the keeps / gains / loses form #1046 shipped:
   * `compare` set, `body` and `muted` empty. The lead names ramp by its kind, as `honestJobs` does,
   * and a job that is not a role (evasion) is a row's to lose but never the lead's.
   */
  spell: {
    card: "Birds of Paradise",
    jobs: sheet.job.tapsForMana,
    group: {
      heading: sheet.groupSameType("creatures"),
      order: sheet.orderMostShared,
      noun: "creatures",
      rows: [
        { name: "Llanowar Elves", free: false, cents: 25, compare: { type: null, keeps: [sheet.job.tapsForMana], gains: [], loses: [sheet.job.evasion] } },
        { name: "Elvish Mystic", free: false, cents: 30, compare: { type: null, keeps: [sheet.job.tapsForMana], gains: [], loses: [sheet.job.evasion] } },
      ].map((r, i) => ({ oracleId: `about-stand-in-spell-${i}`, imageUri: null, soft: 0, foilOnly: false, body: [], muted: [], ...r })),
    } satisfies SheetGroup,
  },
};
