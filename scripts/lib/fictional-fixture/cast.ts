// The named cast of the fictional fixture (landing plan step F, Design's addendum A1): the three decks the landing demo
// is shot on and the cards each must hold. Names live here; `readCast` (catalog.ts) resolves them to oracle ids from the
// CATALOG, and `collection.ts` / `decks.ts` take the resolved ids, so every rule below is PURE and testable on a fake catalog.
//
//   played  Ashling, the Limitless    mono-red elementals, 99 rows, 97 owned and 2 to buy (Jeska's Will, Soulbright Flamekin)
//   over    Giada, Font of Hope       mono-white Angels, 101 rows, holds Sol Ring, only three answers
//   under   Zimone, Mystery Unraveler Simic lands, 96 rows, Forest-heavy
//
// Design's boards call the player Sam; the fixture's player stays Wren Calloway (names.ts).
import type { DeckRole } from "./rng";

/** The three decks the cast builds, and the commander each is built around. */
export const CAST_ROLES = ["played", "over", "under"] as const;
export type CastRole = (typeof CAST_ROLES)[number];

export const CAST_COMMANDERS: Record<CastRole, string> = {
  played: "Ashling, the Limitless",
  over: "Giada, Font of Hope",
  under: "Zimone, Mystery Unraveler",
};

/**
 * The colors each deck's cards (and its basics) are drawn in. The catalog's color identity for Ashling is all five
 * colors, so the list's own palette is stated here instead of read from the commander.
 */
export const CAST_PALETTE: Record<CastRole, readonly string[]> = { played: ["R"], over: ["W"], under: ["G", "U"] };

/** Owned, a single copy, and in no deck: the three commanders Sam can build, and the free cards the demo's tools point at. */
export const FREE_CARDS = [
  "Jace, Multiverse Architect",
  "Y'shtola, Night's Blessed",
  "Tam, the Possibility",
  "Swords to Plowshares", // the shared card: fits Giada, held by no deck
  "Tatyova, Benthic Druid",
  "Retreat to Coralhelm",
  "Exploration",
  "Growth Spiral",
  "Yavimaya Coast", // the staple Mana Balance offers for a Forest
] as const;
/** Never owned: Top off's buy candidates on Zimone. */
export const NOT_OWNED = ["Aesi, Tyrant of Gyre Strait", "Scute Swarm", "Avenger of Zendikar"] as const;

/**
 * The card Collection's "In use" mark is shot on (`[data-availability='hard']`, the first one on screen): owned in one copy,
 * held by Played, which is sleeved, so no copy is free. It sorts among the first few cards of the collection A to Z, so it is
 * drawn inside the first screen on a phone (six rows) and on a desktop. Colorless, so any deck's palette admits it. Named
 * here because the generic fill would only happen to put an early-alphabet card in Played, and a catalog refresh would move it.
 */
export const TAKEN_CARD = "Aang's Journey";

/** Cards a deck takes first, from the free pool. Owned unless the deck's buys name them. */
export const MUSTS: Record<CastRole, readonly string[]> = {
  played: ["Fury", "Flamekin Harbinger", "Gamble", "Smokebraider", TAKEN_CARD],
  over: ["Healer's Hawk", "Thran Dynamo"],
  under: [],
};
/** The unowned cards Ashling lists, to buy: a Game Changer and a creature with a cheaper stand-in. */
export const PLAYED_BUYS = ["Jeska's Will", "Soulbright Flamekin"] as const;
/**
 * The buy Alex has a spare copy of (a friend's spare glyph on Played's Shopping row, the frame `friend-spares`). It is one of
 * Played's two buys, so Played still has exactly two buy rows: a spare is another way to get a card, never a copy
 * the account owns. It is the creature's row, not the Game Changer's: the creature is 15c, so it has no cheaper stand-in, and
 * the stand-in glyph stays on Jeska's Will. The two glyphs sit on two rows, so the frames `friend-spares` and `stand-ins`
 * (and the regions `spare` and `standins`) never measure one box.
 */
export const ALEX_SPARE = PLAYED_BUYS[1];
/** Fury is a proxy on Played (a card already in the deck, marked printed). */
export const PLAYED_PROXY = "Fury";
/** Lotus Cobra: owned, one copy, sleeved in the versioned deck (which is built Green for it). */
export const LOTUS = "Lotus Cobra";
/**
 * One copy, listed by two decks. `over` is a deck that asks for the card the senior deck already holds: Sol Ring is
 * wanted by Ashling (sleeved, senior, keeps it) and by Giada (a draft). Arcane Signet is held by Ashling and also wanted
 * by the fresh draft, so it draws the availability marker on Ashling's list without a purchase.
 */
export const OVERCOMMITTED: readonly { card: string; roles: readonly DeckRole[] }[] = [
  { card: "Sol Ring", roles: ["played", "over"] },
  { card: "Arcane Signet", roles: ["played", "fresh"] },
];
/** The card "Which deck needs it most?" is pressed on. */
export const SHARED = "Swords to Plowshares";

/**
 * Decks built with no non-land mana source: a Forest-heavy lands deck whose Green and Blue counts then come from its lands
 * alone, so the Mana Balance read (23 Green sources against 15 Blue) is the lands' and a swap of Forests for Islands moves it.
 */
export const NO_SOURCES: readonly CastRole[] = ["under"];

/**
 * Decks whose spells share no double-pip pattern: a `{G}{G}` or `{U}{U}` cost is allowed once per pattern (`2GG`, `3UU`),
 * never twice. Mana Balance reads a color's Needed off the tightest pattern two copies share, so a single copy of each
 * keeps it at a single pip's Karsten figure (19) and leaves Forests to spare for Islands.
 */
export const SPARSE_PIPS: readonly CastRole[] = ["under"];

/** Decks held to a few answers (removal and wipes), by role: Giada has three, so Which deck sends Swords to Plowshares there. */
export const ANSWER_CAP: Partial<Record<CastRole, number>> = { over: 3 };

/** Zimone's basic land split is fixed (not drawn): Forests carry the deck, Islands are the surplus the tool swaps for. */
export const UNDER_ISLANDS = 8;

/** Every card the cast names, for one lookup. */
export function castNames(): string[] {
  return [
    ...Object.values(CAST_COMMANDERS), ...FREE_CARDS, ...NOT_OWNED, ...Object.values(MUSTS).flat(), ...PLAYED_BUYS, LOTUS,
    ...OVERCOMMITTED.map((o) => o.card), SHARED,
  ].filter((n, i, all) => all.indexOf(n) === i);
}

/** The cast after `readCast`: oracle ids in place of names. */
export type Cast = {
  commanders: Record<CastRole, string>;
  palette: Record<CastRole, readonly string[]>;
  /** Owned in one copy and never put in a deck by the planner (the free cards, the three unbuilt commanders). */
  free: string[];
  notOwned: string[];
  musts: Record<CastRole, string[]>;
  playedBuys: string[];
  /** The one of `playedBuys` Alex has spare. */
  alexSpare: string;
  proxy: string;
  lotus: string;
  overcommitted: { oracleId: string; roles: DeckRole[] }[];
  shared: string;
  islands: number;
  /** Every id the cast names, so nothing generic (the missing staples, the history additions) draws one. */
  all: string[];
};

export function resolveCast(idOf: ReadonlyMap<string, string>): Cast {
  const id = (name: string): string => {
    const v = idOf.get(name);
    if (!v) throw new Error(`the catalog has no card named ${name}`);
    return v;
  };
  const ids = (names: readonly string[]) => names.map(id);
  const commanders = Object.fromEntries(CAST_ROLES.map((r) => [r, id(CAST_COMMANDERS[r])])) as Record<CastRole, string>;
  const musts = Object.fromEntries(CAST_ROLES.map((r) => [r, ids(MUSTS[r])])) as Record<CastRole, string[]>;
  const overcommitted = OVERCOMMITTED.map((o) => ({ oracleId: id(o.card), roles: [...o.roles] }));
  const free = ids(FREE_CARDS);
  return {
    commanders, palette: CAST_PALETTE, free, notOwned: ids(NOT_OWNED), musts, playedBuys: ids(PLAYED_BUYS), alexSpare: id(ALEX_SPARE),
    proxy: id(PLAYED_PROXY), lotus: id(LOTUS), overcommitted, shared: id(SHARED), islands: UNDER_ISLANDS,
    all: castNames().map(id),
  };
}
