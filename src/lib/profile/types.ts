import type { Role } from "../recs/roles";
import type { ManaCurve } from "../decks/stats";
import type { ProfilePlay } from "./play";

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
  /** Scryfall's own, e.g. `normal`, `modal_dfc`, `transform`, `split`. Carried because the
   *  type line alone cannot tell a playable land back from one that only ever flips. */
  layout: string;
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
  /**
   * What it costs to EXECUTE the combo once both pieces are out — not to cast them.
   *
   * THREE STATES, and the surface must draw all three. A number above 0 is a cost; **0 means
   * the combo is free**, which is the more dangerous reading and the one a blank slot would
   * destroy; null means upstream told us nothing. Measured 2026-09-21: 41% of variants carry
   * a cost, 59% are free, and the field is set on every record — so null here is rare and is
   * genuinely "unknown", never "free".
   */
  manaValueNeeded: number | null;
  /** The same cost in pips (`{2}`), where upstream sent them. Null wherever the cost is 0. */
  manaNeeded: string | null;
  /** The ordered execution steps, newline-separated. Set on every variant in the sample. */
  steps: string | null;
  /**
   * What must already be true for the combo to work ("You control at least five creatures with
   * different powers"). Set on 64%, and the line that answers "does this work in MY deck".
   */
  notablePrerequisites: string | null;
};

export type ProfileCounts = {
  /** Every card the deck holds, commanders included. */
  total: number;
  nonland: number;
  land: number;
  basics: number;
  /**
   * True lands PLUS cards that could take a land drop instead of being cast.
   *
   * A SECOND figure beside `land`, never a replacement: `land` stays exclusive so the ten type
   * axes still sum to the deck and a reader adding them is not double-counting. A spell//land
   * modal DFC is one card playable either way, so a deck holding two of them has a land count
   * and a land-drop count, and they are different numbers.
   *
   * Only `modal_dfc` contributes. A `transform` card with a land back is cast as its front face
   * and flips later, so it can never be a land drop — see `playableAsLand`.
   */
  landCapable: number;
};

export type ProfileRoles = {
  /**
   * `classifyRoles` over the 99 PLUS both commanders — they are castable cards and the stats
   * loader already folds them in, so excluding them here would make two surfaces disagree
   * about the same deck.
   */
  counts: Record<Role, number>;
  /**
   * The same classification over the 99 ALONE.
   *
   * It exists because the measured role targets were derived from EDHREC's support lists,
   * which never contain the commander itself — so comparing `counts` against one of those
   * targets reads a phantom surplus on every deck led by a draw engine, a removal creature or
   * a ramp commander. `counts` still folds them in, deliberately, because the stats loader
   * does and two surfaces disagreeing about the same deck is worse.
   *
   * Use this ONLY against a measured target. Anywhere else, `counts` is the deck.
   */
  excludingCommanders: Record<Role, number>;
  /** The cards behind each count. A count with no cards is an assertion nobody can check. */
  cards: Record<Role, CardRef[]>;
};

export type ProfileColours = {
  /**
   * The commanders' colour identity, in WUBRG order — the order every colour list on this
   * object uses, and the order the app draws pips in everywhere else.
   *
   * NOT alphabetical, which an earlier version of this comment said while the code ordered
   * WUBRG. The stored arrays are alphabetical, which is presumably where the claim came
   * from, and a consumer relying on it would have mis-ordered every multi-colour identity.
   */
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

/**
 * The four functional targets and WHERE THEY CAME FROM, on the same object for the same reason
 * the composition's basis is: there is no state in which a target exists with no provenance.
 *
 * `flat` is its own rung rather than a null, because `ROLE_TARGETS` is a real answer — the
 * asserted baseline this whole sub-project exists to replace, and a deck falling back to it is
 * being told something true about what it is being measured against.
 */
export type ProfileRoleTargets = {
  of: "commander" | "pair" | "identity" | "count" | "flat";
  targets: { ramp: number; draw: number; removal: number; wipes: number };
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
  /**
   * The four functional targets, resolved down the SAME chain as the composition but
   * INDEPENDENTLY of it.
   *
   * Two rungs, not one: a commander indexed before the role pass existed carries a composition
   * and four nulls, and folding the two would drag its whole skeleton to `flat` over figures
   * that are perfectly good. Never null — the chain ends at `ROLE_TARGETS`.
   */
  roleTargets: ProfileRoleTargets;
  /**
   * `labels` when this profile counted its roles by the cards' LABELS and graded them against
   * `label_*` targets (`LABEL_ROLE_COUNTS_ENABLED`, labels-everywhere PR 8). ABSENT means the
   * classifier and `avg_*`, which is every profile built or stored before the switch existed, so
   * a reader choosing a flat fallback (`recommendedMix`) picks the one that matches its counts.
   * Written only when `labels`, so a switched-off profile is byte-identical to today's.
   */
  roleBasis?: "labels";
  /** The floor's bucket. Always present, even when no composition was found. */
  condition: string;
  /**
   * The bucket this row came from was derived from FEWER commanders than a ratified floor
   * requires, and a surface showing its figures owes the player that context.
   *
   * `thinCondition`, NOT `thin`: `SkeletonFit.coverage.thin` already exists and means something
   * else entirely — that THIS COMMANDER's deck count is below `THIN_DECK_COUNT`. Two
   * differently-sourced `thin`s on one object is a trap, so the names differ.
   */
  thinCondition: boolean;
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
  // `methods` rather than a `sources` count: a number cannot say what it counted, and the one
  // that used to sit here was read as "community-maintained lists" and shipped as a claim we
  // could not support. See `MLD_DETECTION.methods`.
  massLandDenial: { methods: readonly string[]; basis: string; knownMisses?: readonly string[] };
  extraTurn: { methods: readonly string[]; basis: string };
  twoCardCombos: { methods: readonly string[]; basis: string };
};

export type ComboReach = {
  /** Every tutor the deck holds. Drawn as a fact; NO bracket rule counts them. */
  tutors: CardRef[];
  /**
   * Every SEARCH that can find a piece of a combo this deck assembles, keyed `tutor` for
   * history. Since 2026-09-22 that includes a land-only search, which is NOT a tutor and is not
   * in `tutors` above: Crop Rotation finds Dark Depths. So a reader wording a reach must not
   * call its finder a tutor. The lean and the upgrade path say "this deck can find".
   */
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
  // NO `declared` HERE, deliberately. What the player told us is not a property of the
  // deck's cards, and the profile is a CACHED document keyed on a fingerprint over them —
  // so carrying it meant a declaration retired the whole cache and forced a rebuild of the
  // flags, combos, staples, composition and population, none of which can have moved.
  // Measured at 630ms median and 2.2s on the largest deck, to recompute a page of figures
  // that are identical either side of the press. It is handed to `slotDeck` at the draw
  // instead, where the two lines that read it live.
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
  /** The cards behind the gap between `counts.land` and `counts.landCapable`. A figure with no
   *  cards is an assertion nobody can check. */
  landCapableCards: CardRef[];
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
  /**
   * The play-data group (`./play.ts`). NEVER present in the cached or stored document: the
   * fingerprint is over the deck's cards, so a group filed under it would go stale on the next
   * logged game. A consumer composes it at the read — `{ ...profile, play: buildPlayGroup(games) }`
   * — and nothing that builds, caches or stores a profile sets it. Optional, so every existing
   * profile and every stored row is still one, and it moves neither PROFILE_VERSION nor either
   * fingerprint.
   */
  play?: ProfilePlay | null;
};
