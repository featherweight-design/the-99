import type { Role } from "../recs/roles";
import type { ManaCurve } from "../decks/stats";

/**
 * The Deck Profile — the app's first object for "what is this deck, characterized".
 *
 * The app could score COMMANDERS against a collection and had no object for a finished deck,
 * so every question a player actually asks about one had nowhere to be answered from. This
 * holds WHAT IS TRUE about a deck; every verdict — the bracket slot, the skeleton fit, the
 * push check, the upgrade path — is a pure function reading it.
 *
 * COMPOSABLE FACT-GROUPS, from the start. Ownership, price and play-data groups arrive as
 * sibling keys in later sub-projects, and nothing about the loader, the fingerprint or the
 * cache key changes when they do.
 *
 * Every field is a plain object, array or scalar. The cached form is JSON, so a `Map` comes
 * back as `{}` and a `Date` as a string — neither may appear here.
 *
 * Pure: no database imports, client-safe.
 */

export type CardRef = { oracleId: string; name: string };

/**
 * A deck row, as every verdict over this profile needs it.
 *
 * Carried ON the object rather than passed beside it, because a consumer holding a CACHED
 * profile has no other way to get these rows — re-reading `deck_cards` itself would be
 * unsynchronised with the fingerprint the profile was filed under, so an edit between the
 * two would compare new counts against an old profile's targets and staples. Every verdict
 * is a pure function over this object, and that is only true if the object is sufficient.
 */
export type ProfileCard = {
  oracleId: string;
  name: string;
  typeLine: string;
  cmc: number;
  quantity: number;
};

/** Which classifier claimed a flag. A reader disputing a verdict is owed this. */
export type FlagSource = "spellbook_sweep" | "oracle_rule";
export type FlaggedCardRef = CardRef & { sources: FlagSource[] };

export type ComboRef = {
  variantId: string;
  /** The `uses` — two, for everything the slot counts. */
  cards: CardRef[];
  produces: string[];
  /** Spellbook's opinion about which table a combo suits. Reported, NEVER a rule. */
  bracketTag: string;
  /** At least one piece sits in the command zone. */
  usesCommander: boolean;
};

export type ProfileCounts = {
  /** Every card the deck holds, commanders included. */
  total: number;
  nonland: number;
  land: number;
  basics: number;
};

export type ProfileRoles = {
  /**
   * `classifyRoles` over the 99 PLUS both commanders — they are castable cards and the stats
   * loader already folds them in, so excluding them here would make two surfaces disagree
   * about the same deck.
   */
  counts: Record<Role, number>;
  /** The cards behind each count. A count with no cards is an assertion nobody can check. */
  cards: Record<Role, CardRef[]>;
};

export type ProfileColours = {
  /** The commanders' colour identity, alphabetical. */
  identity: string[];
  /**
   * The union of colour identities over the deck's LAND rows — an approximation of what the
   * mana base can produce. Colour identity counts activation costs, so `Exotic Orchard` reads
   * as colourless here. Labelled approximate wherever it is drawn.
   */
  producibleColors: string[];
  /**
   * Colours the deck's nonland MANA COSTS ask for that no land can produce.
   *
   * "Needs" is the WUBRG letters in nonland `manaCost` pips, not colour identity — an
   * activation-cost-only colour is not a cast-time need. A HYBRID pip is unproducible only
   * when NO half is producible: `{W/U}` in a Plains deck needs nothing, and reporting U there
   * would manufacture a disagreement out of a card the deck can cast.
   */
  unproducible: string[];
};

export type CompositionTargets = {
  land: number; basic: number; nonbasic: number; creature: number; instant: number;
  sorcery: number; artifact: number; enchantment: number; planeswalker: number; battle: number;
};

export type StapleRef = CardRef & {
  /** How many commanders in this condition recommend it. */
  commanders: number;
  /** Its denominator — stored, never recomputed at read time. */
  commanderTotal: number;
  avgInclusion: number;
  weightedRank: number;
};

export type ProfileSkeleton = {
  /**
   * The measured standard, and WHERE IT CAME FROM, travelling together.
   *
   * The discriminant lives on the same object as the data it describes, so there is no state
   * in which a target exists with no provenance or a provenance names an absent target. Null
   * means no target was derivable at all, and the surface says so rather than showing a zero.
   */
  composition: {
    of: "commander" | "pair" | "identity" | "count";
    targets: CompositionTargets;
    averageCurve: Record<string, number> | null;
  } | null;
  /** The floor's bucket. Always present, even when no composition was found. */
  condition: string;
  staples: StapleRef[];
  /** The denominator behind all of it. */
  commanderDeckCount: number | null;
};

export type BracketPopulation = {
  counts: Record<"1" | "2" | "3" | "4" | "5", number>;
  /**
   * The sum — about a fifth of `deckCount`, because only 22.4% of decks declare a bracket.
   * Carried explicitly: a reader shown "5,055 decks" who believes it is out of 50,478 has
   * been misled by us.
   */
  declaredTotal: number;
  deckCount: number | null;
  of: "commander" | "pair";
};

/**
 * What was actually CHECKED, per fact — provenance rather than a badge.
 *
 * All three detections are partial, so a binary flag would have one possible value and a
 * field that always says the same thing trains readers to skip it. The strings live beside
 * the classifiers they describe and are re-measured when a classifier changes.
 */
export type DetectionCoverage = {
  massLandDenial: { sources: number; basis: string; knownMisses?: readonly string[] };
  extraTurn: { sources: number; basis: string };
  twoCardCombos: { sources: number; basis: string };
};

export type ComboReach = {
  /** Every tutor the deck holds. Drawn as a fact; NO bracket rule counts them. */
  tutors: CardRef[];
  /** Tutors that can search out a piece of a combo this deck assembles. */
  reaches: { tutor: CardRef; combo: ComboRef; piece: CardRef }[];
};

export type Bracket = 1 | 2 | 3 | 4 | 5;

export type ProfileBrackets = {
  gameChangers: CardRef[];
  massLandDenial: FlaggedCardRef[];
  extraTurns: FlaggedCardRef[];
  twoCardCombos: ComboRef[];
  comboReach: ComboReach;
  /** Absent, not zero, for the 27 commanders EDHREC has no counts for. */
  population: BracketPopulation | null;
  detection: DetectionCoverage;
  /** What the player told us. NEVER inferred and never defaulted. */
  declared: Bracket | null;
};

/**
 * Legality is its own group, UNDER all five brackets rather than inside the system.
 *
 * WotC's own text gives B4 and B5 "no restrictions (other than the banned list)" — a banned
 * card does not move a deck's bracket, it makes the deck illegal. And `cards.commander_legal`
 * answers it completely and locally, where the combo upstream knows about a quarter of the
 * catalog.
 */
export type ProfileLegality = {
  banned: CardRef[];
  /** Outside the commanders' colour identity. Free once the group exists, and `deck_cards`
   *  has no identity constraint — a commander swap can silently render cards in the 99
   *  illegal. */
  identityViolations: CardRef[];
};

/** Null today, deliberately — see `buildDeckProfile`. */
export type ProfileThemes = { themes: { slug: string; label: string }[] };

export type DeckProfile = {
  deckId: string;
  /**
   * Both commanders, or one. Carried because the commanders-are-cards rule has a CONVERSE
   * that verdicts need: they are cards you cannot remove. `upgradePath` must never offer a
   * commander as a card to cut, and nothing else on this object can tell one from a
   * `deck_cards` row once the loader has unioned them.
   */
  commanderOracleIds: string[];
  /** Over the deck's OWN inputs. Not the catalog generation: `cacheForUser` injects that into
   *  the key itself, and repeating it would file one input twice. */
  fingerprint: string;
  /** Every row the deck holds, commanders included and deduped — the same list every count
   *  on this object was computed from. */
  cards: ProfileCard[];
  counts: ProfileCounts;
  roles: ProfileRoles;
  curve: ManaCurve;
  colours: ProfileColours;
  skeleton: ProfileSkeleton;
  brackets: ProfileBrackets;
  legality: ProfileLegality;
  /**
   * ALWAYS NULL in this sub-project.
   *
   * #724 measured the problem precisely: the app answers "what does this player play" from
   * each deck's COMMANDER's tag list, so a Kenrith deck carries Group Hug and Reanimator
   * whether or not a single card supports them — 76.3% of rows on the reference account.
   * Filling this with commander tags would propagate that exact false claim into a new
   * object, on a surface that did not previously make it, and it would then have to be
   * unpicked from every consumer. A null reads as absent; a wrong theme list does not.
   */
  themes: ProfileThemes | null;
};
