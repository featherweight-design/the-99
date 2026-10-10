import { isLandFace } from "../cards/facet";
import { GAME_CHANGER_LIMIT } from "../bracket/rules";
import { isBasicLand } from "../decks/grouping";
import { recommendedMix, ROLE_ORDER, type MixRole } from "../decks/mix";
import { curveBucket } from "../decks/stats";
import { fitSkeleton } from "../profile/fit";
import { producesInfiniteTurns } from "../spellbook/combo-features";
import type { Bracket, DeckProfile } from "../profile/types";

/**
 * Proposed cuts, the FACTS layer (tuning roadmap, sub-project 4; Hugh's model-first ruling,
 * 2026-10-09). For a deck over 100 cards: the counted facts about it and about each card that could
 * come out. Pure and client-safe: no database, no model call, and NO RANKING. The tier-1 ranking was
 * scored against the cuts Hugh actually made and found 17% of them, 1.1x chance, so the order lives
 * only in `scripts/eval/lib/cuts-ranking.mts`, where the eval reproduces that baseline.
 *
 * What these facts are for: the hub draws the deck-level ones (roles over target, curve crowding,
 * bracket flags, what is missing) and the model is told all of them, so a cut it proposes can cite a
 * figure the app can show.
 *
 * HARD FILTERS: a commander and a locked card are never in `cards`, whatever their facts say (the
 * never-cut convention Suggested changes enforces).
 *
 * THIN DATA RUNS ANYWAY (ruling 6): with no EDHREC list the inclusion fact is absent and `missing`
 * says so, as it does for asserted role targets and an absent average curve. Nothing refuses.
 */

export type CutSupport = {
  /** EDHREC's decks for this commander (or pair), when the page carried a count. */
  deckCount: number | null;
  /** How many cards the commander's support list holds: the denominator of "not on the list". */
  listed: number;
  /** Inclusion percent (0 to 100) per listed card. A listed card with no figure maps to null. */
  inclusion: ReadonlyMap<string, number | null>;
};

export type BracketFlag = "gameChanger" | "massLandDenial" | "extraTurn" | "combo";

export type CardCutFacts = {
  oracleId: string;
  name: string;
  quantity: number;
  /** The commander's decks that run this card, or that its list does not carry at all. Null where
   *  no figure applies: no list, a basic land, or a listed card with no figure. */
  inclusion: { kind: "pct"; pct: number } | { kind: "offList" } | null;
  /** The roles the card fills (the text classifier's, as the roles strip counts them). */
  roles: MixRole[];
  /** Set only when EVERY role the card fills is over its target: the smallest surplus among them. */
  roleSurplus: { role: MixRole; have: number; target: number } | null;
  /** The first role the card fills that the deck is at or under target on: cutting it opens a gap. */
  opensGap: MixRole | null;
  /** Set when the card's mana value bucket holds more copies than the commander's average deck. */
  curve: { cmc: number; have: number; average: number } | null;
  /** Bracket flags the card carries that bear on the declared bracket. */
  flags: BracketFlag[];
};

export type RoleFact = { role: MixRole; have: number; target: number };
export type CurveFact = { cmc: number; have: number; average: number };

export type MissingSignal = "inclusion" | "roleTargets" | "curve";

export type CutFacts = {
  /** Total cards, commanders included (ruling 4). */
  total: number;
  /** How many cards over 100. Zero means Proposed cuts is not offered. */
  over: number;
  /** Signals the facts had to go without, so a surface can name them (ruling 6). */
  missing: MissingSignal[];
  /** EDHREC's support list the inclusion facts came from. Null with no list. */
  support: { deckCount: number | null; listed: number } | null;
  /** Every role against its target, measured on the population the target was derived for. */
  roles: RoleFact[];
  /** The commander's average curve against the deck's, per mana value bucket. Null with no average. */
  curve: CurveFact[] | null;
  /** The flags that bear on the declared bracket, each with the cards carrying it. */
  brackets: { flag: BracketFlag; cards: { oracleId: string; name: string }[] }[];
  /** Each card that could come out. Empty when `over` is 0. In the deck's own order. */
  cards: CardCutFacts[];
};

export const DECK_SIZE = 100;

export function cutFacts(input: {
  profile: DeckProfile;
  locked: ReadonlySet<string>;
  /** Null when the commander has no usable EDHREC list. */
  support: CutSupport | null;
  /** The bracket the player declared for the deck, null if none. Decides which flags are facts. */
  declaredBracket: Bracket | null;
}): CutFacts {
  const { profile, locked, support, declaredBracket } = input;
  const total = profile.counts.total;
  const over = Math.max(0, total - DECK_SIZE);

  const mix = recommendedMix(profile.skeleton, profile.commanderOracleIds.length > 1);
  const curve = fitSkeleton(profile).curve;
  const missing: MissingSignal[] = [];
  if (!support) missing.push("inclusion");
  // `measured` covers the land cell too: basics are scored against it, so an asserted land target is disclosed.
  if (!mix.measured) missing.push("roleTargets");
  if (!curve) missing.push("curve");

  // The population the targets were derived for, as `buildEvidencePack` decides it: the 99 alone
  // against a measured target, the whole deck against the flat one. Land is never a commander.
  const roleHave = mix.rolesUsable ? profile.roles.excludingCommanders : profile.roles.counts;
  const have = (role: MixRole) => (role === "land" ? profile.roles.counts.land : roleHave[role]);
  const roles: RoleFact[] = ROLE_ORDER.map((role) => ({ role, have: have(role), target: mix.cells[role].target }));

  const base = {
    total, over, missing,
    support: support ? { deckCount: support.deckCount, listed: support.listed } : null,
    roles,
    curve: curve ? curve.buckets.map((b) => ({ cmc: b.cmc, have: b.have, average: b.average })) : null,
  };
  if (over === 0) return { ...base, brackets: [], cards: [] };

  const rolesOf = new Map<string, MixRole[]>();
  for (const role of ROLE_ORDER) {
    for (const card of profile.roles.cards[role] ?? []) {
      rolesOf.set(card.oracleId, [...(rolesOf.get(card.oracleId) ?? []), role]);
    }
  }

  const flags = bracketFlags(profile, declaredBracket);
  const commanders = new Set(profile.commanderOracleIds);

  const cards: CardCutFacts[] = [];
  for (const card of profile.cards) {
    if (commanders.has(card.oracleId) || locked.has(card.oracleId)) continue;

    // A basic land is on no support list and carries no inclusion figure that means anything, so it
    // is judged by the land count alone.
    let inclusion: CardCutFacts["inclusion"] = null;
    if (support && !isBasicLand(card.typeLine)) {
      if (support.inclusion.has(card.oracleId)) {
        const pct = support.inclusion.get(card.oracleId);
        if (pct != null) inclusion = { kind: "pct", pct };
      } else {
        inclusion = { kind: "offList" };
      }
    }

    // The card argues for a cut on role only when EVERY role it fills is over target.
    const mine = rolesOf.get(card.oracleId) ?? [];
    let opensGap: MixRole | null = null;
    let surplus: { role: MixRole; have: number; target: number; share: number } | null = null;
    for (const role of mine) {
      const target = mix.cells[role].target;
      const count = have(role);
      if (count <= target) {
        opensGap ??= role;
        continue;
      }
      const share = clamp01((count - target) / Math.max(target, 1));
      if (!surplus || share < surplus.share) surplus = { role, have: count, target, share };
    }

    // Lands are off the curve.
    let curveFact: CardCutFacts["curve"] = null;
    if (curve && !isLandFace(card.typeLine)) {
      const bucket = curve.buckets[curveBucket(card.cmc)];
      if (bucket && bucket.delta > 0) curveFact = { cmc: bucket.cmc, have: bucket.have, average: bucket.average };
    }

    cards.push({
      oracleId: card.oracleId,
      name: card.name,
      quantity: card.quantity,
      inclusion,
      roles: mine,
      roleSurplus: surplus && !opensGap ? { role: surplus.role, have: surplus.have, target: surplus.target } : null,
      opensGap,
      curve: curveFact,
      flags: flags.filter(([, ids]) => ids.has(card.oracleId)).map(([flag]) => flag),
    });
  }

  return {
    ...base,
    brackets: flags.map(([flag, ids]) => ({
      flag,
      cards: profile.cards.filter((c) => ids.has(c.oracleId)).map((c) => ({ oracleId: c.oracleId, name: c.name })),
    })).filter((b) => b.cards.length > 0),
    cards,
  };
}

/** The deck's bracket-flagged cards by flag, kept only where the flag bears on the declared bracket.
 *  The sets hold EVERY flagged card, a commander included, because the declared bracket counts a
 *  commander's flag; `cutFacts` keeps a commander off the per-card `flags` (it is never a
 *  candidate) but leaves it in the deck-level `brackets`. No declaration names every flag; a
 *  declared 4 or 5 permits all of them. */
function bracketFlags(profile: DeckProfile, declared: Bracket | null): [BracketFlag, ReadonlySet<string>][] {
  const b = profile.brackets;
  // Every piece, a commander's included: a combo of partner commanders is still a combo the declared
  // bracket counts. A commander is kept off the per-card flags below, where it is never a candidate.
  const piecesOf = (combos: typeof b.twoCardCombos) => new Set(combos.flatMap((c) => c.cards.map((card) => card.oracleId)));
  const combo = piecesOf(b.twoCardCombos);
  const all: [BracketFlag, ReadonlySet<string>][] = [
    ["gameChanger", new Set(b.gameChangers.map((c) => c.oracleId))],
    ["massLandDenial", new Set(b.massLandDenial.map((c) => c.oracleId))],
    ["extraTurn", new Set(b.extraTurns.map((c) => c.oracleId))],
    ["combo", combo],
  ];
  if (declared === null) return all;
  if (declared === 4 || declared === 5) return [];
  // 1 to 3, by `violationsFor`: bracket 1 forbids every flag; 2 forbids Game Changers, mass land
  // denial and combos; 3 allows extra turns and a Game Changer up to its allowance, and a combo only
  // when it is a loop (it produces infinite turns).
  const limit = GAME_CHANGER_LIMIT[declared];
  const bears: Record<Exclude<BracketFlag, "combo">, boolean> = {
    gameChanger: b.gameChangers.length > limit,
    massLandDenial: true,
    extraTurn: declared === 1,
  };
  const comboPieces = declared <= 2 ? combo : piecesOf(b.twoCardCombos.filter((c) => producesInfiniteTurns(c.produces)));
  return all.flatMap(([flag, ids]): [BracketFlag, ReadonlySet<string>][] => {
    if (flag === "combo") return [[flag, comboPieces]];
    return bears[flag] ? [[flag, ids]] : [];
  });
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
