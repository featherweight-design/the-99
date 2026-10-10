import { isLandFace } from "../cards/facet";
import { isBasicLand } from "../decks/grouping";
import { recommendedMix, ROLE_ORDER, type MixRole } from "../decks/mix";
import { curveBucket } from "../decks/stats";
import { fitSkeleton } from "../profile/fit";
import type { DeckProfile } from "../profile/types";

/**
 * Proposed cuts, tier 1 (tuning roadmap, sub-project 4): for a deck over 100 cards, which cards to
 * take out first, each with ONE reason a reader can check against a figure the app already shows.
 * Pure and client-safe: no database, no model call. The caller assembles its inputs.
 *
 * FOUR SIGNALS, each a counted fact:
 *  - inclusion — how often EDHREC's decks for this commander run the card, or that its list
 *    (`listed` cards long) does not carry the card at all;
 *  - role surplus — the card fills only roles the deck already holds more of than the target the
 *    roles strip draws (`recommendedMix`, the same population rule as `buildEvidencePack`);
 *  - curve crowding — the card's mana value bucket holds more copies than the commander's average
 *    deck (`fitSkeleton`'s curve);
 *  - bracket — the card is a Game Changer, mass land denial, an extra turn or a two-card combo piece.
 *
 * HARD FILTERS, not penalties: a commander and a locked card are never candidates, whatever they
 * score (the never-cut convention Suggested changes enforces).
 *
 * THIN DATA RUNS ANYWAY (ruling 6): with no EDHREC list the inclusion signal is absent and the
 * result says so in `missing`, as it does for asserted role targets and an absent average curve.
 * Nothing here refuses.
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

/** One counted fact. Every number in it is a figure the app can show beside the card. */
export type CutReason =
  | { kind: "inclusion"; pct: number; deckCount: number | null }
  | { kind: "offList"; listed: number; deckCount: number | null }
  | { kind: "roleSurplus"; role: MixRole; have: number; target: number }
  | { kind: "curve"; cmc: number; have: number; average: number }
  | { kind: "bracket"; flag: BracketFlag; count: number };

export type CutCandidate = {
  oracleId: string;
  name: string;
  quantity: number;
  /** The strongest signal: the one reason shown. */
  reason: CutReason;
  /** Every signal that argued for the cut, strongest first. `reason` is the first. */
  signals: CutReason[];
  /** The card fills a role the deck is at or under target on, so cutting it opens a gap. */
  opensGap: MixRole | null;
  score: number;
};

export type MissingSignal = "inclusion" | "roleTargets" | "curve";

export type ProposedCuts = {
  /** Total cards, commanders included (ruling 4). */
  total: number;
  /** How many cards over 100. Zero means Proposed cuts is not offered. */
  over: number;
  /** Ranked, best cut first. Empty when `over` is 0. */
  candidates: CutCandidate[];
  /** Signals the ranking had to go without, so a surface can name them (ruling 6). */
  missing: MissingSignal[];
};

export const DECK_SIZE = 100;

/**
 * How much each signal weighs. Inclusion leads because it is the one signal specific to this
 * commander; role and curve are the deck's shape against that commander's average; a bracket flag
 * is a fact worth naming more than a reason to cut, so it weighs least. These are the first-draft
 * weights, not yet measured; the eval harness reports recall against them before any tuning.
 */
export const CUT_WEIGHTS = { inclusion: 0.45, role: 0.3, curve: 0.15, bracket: 0.1 } as const;

/** Cutting a card from a role at or under target costs this much score: a demotion, not a filter,
 *  because an over deck may have to cut into a short role. */
const GAP_PENALTY = 0.3;

export function proposeCuts(input: {
  profile: DeckProfile;
  locked: ReadonlySet<string>;
  /** Null when the commander has no usable EDHREC list. */
  support: CutSupport | null;
}): ProposedCuts {
  const { profile, locked, support } = input;
  const total = profile.counts.total;
  const over = Math.max(0, total - DECK_SIZE);

  const mix = recommendedMix(profile.skeleton, profile.commanderOracleIds.length > 1);
  const curve = fitSkeleton(profile).curve;
  const missing: MissingSignal[] = [];
  if (!support) missing.push("inclusion");
  if (!mix.rolesUsable) missing.push("roleTargets");
  if (!curve) missing.push("curve");

  if (over === 0) return { total, over, candidates: [], missing };

  // The population the targets were derived for, as `buildEvidencePack` decides it: the 99 alone
  // against a measured target, the whole deck against the flat one. Land is never a commander.
  const roleHave = mix.rolesUsable ? profile.roles.excludingCommanders : profile.roles.counts;
  const have = (role: MixRole) => (role === "land" ? profile.roles.counts.land : roleHave[role]);

  const rolesOf = new Map<string, MixRole[]>();
  for (const role of ROLE_ORDER) {
    for (const card of profile.roles.cards[role] ?? []) {
      rolesOf.set(card.oracleId, [...(rolesOf.get(card.oracleId) ?? []), role]);
    }
  }

  const flags = bracketFlags(profile);
  const commanders = new Set(profile.commanderOracleIds);

  const candidates: CutCandidate[] = [];
  for (const card of profile.cards) {
    if (commanders.has(card.oracleId) || locked.has(card.oracleId)) continue;
    const scored: { reason: CutReason; weight: number }[] = [];

    // Inclusion. A basic land is on no support list and carries no inclusion figure that means
    // anything, so it is judged by the land count alone.
    if (support && !isBasicLand(card.typeLine)) {
      if (support.inclusion.has(card.oracleId)) {
        const pct = support.inclusion.get(card.oracleId);
        if (pct != null) {
          scored.push({
            reason: { kind: "inclusion", pct, deckCount: support.deckCount },
            weight: CUT_WEIGHTS.inclusion * (1 - clamp01(pct / 100)),
          });
        }
      } else {
        scored.push({
          reason: { kind: "offList", listed: support.listed, deckCount: support.deckCount },
          weight: CUT_WEIGHTS.inclusion,
        });
      }
    }

    // Roles. The card argues for a cut only when EVERY role it fills is over target; the smallest
    // surplus among them is the one a cut would spend.
    const roles = rolesOf.get(card.oracleId) ?? [];
    let opensGap: MixRole | null = null;
    let surplus: { role: MixRole; have: number; target: number; share: number } | null = null;
    for (const role of roles) {
      const target = mix.cells[role].target;
      const count = have(role);
      if (count <= target) {
        opensGap ??= role;
        continue;
      }
      const share = clamp01((count - target) / Math.max(target, 1));
      if (!surplus || share < surplus.share) surplus = { role, have: count, target, share };
    }
    if (surplus && !opensGap) {
      scored.push({
        reason: { kind: "roleSurplus", role: surplus.role, have: surplus.have, target: surplus.target },
        weight: CUT_WEIGHTS.role * surplus.share,
      });
    }

    // Curve. Lands are off the curve.
    if (curve && !isLandFace(card.typeLine)) {
      const bucket = curve.buckets[curveBucket(card.cmc)];
      if (bucket && bucket.delta > 0) {
        scored.push({
          reason: { kind: "curve", cmc: bucket.cmc, have: bucket.have, average: round1(bucket.average) },
          weight: CUT_WEIGHTS.curve * clamp01(bucket.delta / Math.max(bucket.average, 1)),
        });
      }
    }

    for (const [flag, ids] of flags) {
      if (ids.has(card.oracleId)) {
        scored.push({ reason: { kind: "bracket", flag, count: ids.size }, weight: CUT_WEIGHTS.bracket });
      }
    }

    const positive = scored.filter((s) => s.weight > 0).sort((a, b) => b.weight - a.weight);
    if (positive.length === 0) continue;
    const score = positive.reduce((sum, s) => sum + s.weight, 0) - (opensGap ? GAP_PENALTY : 0);
    candidates.push({
      oracleId: card.oracleId,
      name: card.name,
      quantity: card.quantity,
      reason: positive[0].reason,
      signals: positive.map((s) => s.reason),
      opensGap,
      score,
    });
  }

  candidates.sort((a, b) => b.score - a.score || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { total, over, candidates, missing };
}

/** The deck's bracket-flagged cards by flag. A combo piece is any card of a counted two-card combo
 *  that is not a commander, since a commander is never cut. */
function bracketFlags(profile: DeckProfile): [BracketFlag, ReadonlySet<string>][] {
  const b = profile.brackets;
  const commanders = new Set(profile.commanderOracleIds);
  const combo = new Set<string>();
  for (const c of b.twoCardCombos) {
    for (const card of c.cards) if (!commanders.has(card.oracleId)) combo.add(card.oracleId);
  }
  return [
    ["gameChanger", new Set(b.gameChangers.map((c) => c.oracleId))],
    ["massLandDenial", new Set(b.massLandDenial.map((c) => c.oracleId))],
    ["extraTurn", new Set(b.extraTurns.map((c) => c.oracleId))],
    ["combo", combo],
  ];
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
