import { isLandFace } from "../cards/facet";
import { curveBucket } from "../decks/stats";
import type {
  CompositionTargets,
  DeckProfile,
  ProfileCard,
  StapleRef,
} from "./types";

/**
 * A deck against the measured skeleton for its condition.
 *
 * THE FOUR FUNCTIONAL ROLES APPEAR HERE NOW, and the rule that kept them out has ended rather
 * than been waived. It read "no functional roles appear here, and that is structural", and its
 * reason was that `ROLE_TARGETS` (10 ramp, 10 draw, 8 removal, 3 wipes) are ASSERTED constants
 * nobody measured, while the type targets are averages over thousands of real decklists —
 * mixing them would launder the asserted numbers through the measured ones' credibility.
 *
 * Since the role pass the four are DERIVED per commander, per pair and per bucket, from the
 * same index the type targets come from. The old rule has no subject left.
 *
 * THE NARROWER RULE THAT SURVIVES IT: a fit may carry a role target only with `measured`
 * beside it. A deck whose chain ended at `flat` is still being compared to the asserted
 * baseline, and a reader shown that figure without being told cannot tell it from one taken
 * over eight hundred decklists. That is the whole hazard the old rule was built against, and
 * it is now a per-row fact rather than a whole-module prohibition.
 *
 * Pure: no database, client-safe.
 */

export type TypeFit = {
  type: keyof CompositionTargets;
  have: number;
  target: number;
  /** `have - target`. Negative is short of the standard, positive is over it — a FACT, not
   *  an instruction. Nothing here says which direction is better. */
  delta: number;
};

/** One functional role against its target. `delta` is `have - target`, so NEGATIVE is short
 *  and POSITIVE is over — the same direction as `TypeFit`, and a FACT rather than an
 *  instruction: nothing here says which is better. */
export type RoleFit = {
  role: "ramp" | "draw" | "removal" | "wipes";
  have: number;
  target: number;
  delta: number;
  /**
   * Whether this target was DERIVED from decklists or is the asserted baseline.
   *
   * False means the chain ended at `flat`. Carried per row rather than inferred from the
   * basis, because a surface drawing one role is not holding the skeleton — and a figure that
   * cannot say which it is has the old module-wide prohibition's whole problem.
   */
  measured: boolean;
};

export type CurveFit = {
  buckets: { cmc: number; have: number; average: number; delta: number }[];
};

export type SkeletonFit = {
  /** Where the targets came from. `none` when no composition was derivable at all. */
  basis: "commander" | "pair" | "identity" | "count" | "none";
  types: TypeFit[];
  /** Null when the composition carried no curve. A deck cannot be compared to a curve
   *  nobody measured, and an empty bucket list would read as a flat one. */
  curve: CurveFit | null;
  /** The four, in `ramp → draw → removal → wipes` order. Always present: the role chain ends
   *  at the asserted baseline rather than at null, so there is always something to compare. */
  roles: RoleFit[];
  /** WHICH rung served the roles. `measured` on each row answers "derived or asserted"; this
   *  answers "derived from what", which is what a reader needs to tell a commander's own
   *  figures from a bucket's — and whether `coverage.thinCondition` is about them. */
  roleBasis: "commander" | "pair" | "identity" | "count" | "flat";
  missingStaples: StapleRef[];
  presentStaples: StapleRef[];
  coverage: {
    commanderDeckCount: number | null;
    /** THIS COMMANDER's deck count is below `THIN_DECK_COUNT`. */
    thin: boolean;
    /**
     * A bucket serving THIS SKELETON was derived from a below-bar population.
     *
     * Deliberately not "the bucket the role targets came from": the role chain can stop at the
     * commander or pair rung while the TYPE targets still come from a thin identity or count
     * row, and the caveat is true of the skeleton either way. `roleBasis` below says which
     * rung served the roles, so a surface drawing one role can tell whether the caveat is
     * about the figure it is showing.
     */
    thinCondition: boolean;
  };
};

/**
 * Below this many tracked decks, the averages behind a commander's skeleton rest on a small
 * sample and the surface says so.
 *
 * THE VALUE IS MEASURED; THE PERCENTILE IS A CONVENTION, and pretending otherwise would be
 * the same sin as an asserted constant with better clothes. Read off the shipped index on
 * 2026-09-20 over the 3,279 commanders with `synergy_state = 'ok'`: minimum 1, p5 11,
 * **p10 27**, p25 140, median 767, p90 7,762, maximum 52,883. The bottom decile is a chosen
 * round number; 27 is what the data puts there.
 *
 * Re-measure when the index is rebuilt against a materially different catalog, and move the
 * date with the figure.
 */
export const THIN_DECK_COUNT = 27;

/** EDHREC's own curve keys run past 7 — `"9"` is on a real pair page. `manaCurve` caps at
 *  CURVE_MAX, so the tail has to be folded before anything is compared or every deck reports
 *  a phantom gap at the top. */
export function foldCurve(raw: Record<string, number>): Map<number, number> {
  const folded = new Map<number, number>();
  for (const [key, value] of Object.entries(raw)) {
    const parsed = Number(key);
    if (!Number.isFinite(parsed)) continue;
    const bucket = curveBucket(parsed);
    folded.set(bucket, (folded.get(bucket) ?? 0) + value);
  }
  return folded;
}

/** The ten axes in their reporting order. Exported so a surface ordering by something else —
 *  the bulk controls order by how far short each axis is — has a DETERMINISTIC tie-break to
 *  fall back on rather than whatever order an array happened to arrive in. */
export const TYPE_ORDER: (keyof CompositionTargets)[] = [
  "land", "basic", "nonbasic", "creature", "instant",
  "sorcery", "artifact", "enchantment", "planeswalker", "battle",
];

/** The minimum a row needs to be counted by type. Widened from `ProfileCard` so the fill can
 *  tally its own candidates through this function rather than a second copy of these rules —
 *  the front-face reading below is subtle enough that two versions of it would drift. */
export type TypeCountable = { typeLine: string; quantity: number };

/**
 * The deck's own counts on the composition's ten axes.
 *
 * `basic` and `nonbasic` are WITHIN land rather than beside it, which is how EDHREC reports
 * them — so the three do not sum to the deck, and a reader adding them would double-count
 * every land.
 */
export function countByType(cards: readonly TypeCountable[]): CompositionTargets {
  const counts: CompositionTargets = {
    land: 0, basic: 0, nonbasic: 0, creature: 0, instant: 0,
    sorcery: 0, artifact: 0, enchantment: 0, planeswalker: 0, battle: 0,
  };
  for (const card of cards) {
    // THE FRONT FACE, through `isLandFace`, and never `includes("land")` on the whole line.
    // Two failures in one: `Fell the Profane // Fell Mire` is an Instant that is played as
    // one, and 83 of the 35,572 CATALOG rows carry a land on the back face alone (82 of the
    // 31,830 commander-legal ones) — counting those would
    // make this table disagree with `counts.land` and `curve.lands` on the same object. And
    // without a word boundary `Lander Rizzi` reads as a land.
    if (isLandFace(card.typeLine)) {
      counts.land += card.quantity;
      if (/^basic\b/.test(card.typeLine.trim().toLowerCase())) counts.basic += card.quantity;
      else counts.nonbasic += card.quantity;
    }
    // The other types read the front face too, for the same reason: 79 catalog rows carry
    // `Creature` on the back alone, and a substring sweep puts `Treasure Map // Treasure
    // Cove` on both the artifact and the land axes.
    const front = card.typeLine.split(" // ")[0].toLowerCase();
    for (const key of [
      "creature", "instant", "sorcery", "artifact", "enchantment", "battle", "planeswalker",
    ] as const) {
      if (new RegExp(`\\b${key}\\b`).test(front)) counts[key] += card.quantity;
    }
  }
  return counts;
}

export type CountableCard = {
  oracleId: string;
  typeLine: string;
  cmc: number;
  quantity: number;
};

/**
 * Takes the profile ALONE. The rows it needs travel on the object — see `ProfileCard` — so a
 * consumer holding a cached profile never re-reads `deck_cards` to call this, which would be
 * unsynchronised with the fingerprint the profile was filed under.
 */
export function fitSkeleton(profile: DeckProfile): SkeletonFit {
  const composition = profile.skeleton.composition;
  const have = countByType(profile.cards);

  const types: TypeFit[] = composition
    ? TYPE_ORDER.map((type) => ({
        type,
        have: have[type],
        target: composition.targets[type],
        delta: have[type] - composition.targets[type],
      }))
    : // No target, so no delta anyone could act on — but the deck's own counts are still
      // true, and reporting them against a target of 0 would invent a surplus everywhere.
      [];

  let curve: CurveFit | null = null;
  if (composition?.averageCurve) {
    const average = foldCurve(composition.averageCurve);
    curve = {
      buckets: profile.curve.buckets.map((bucket) => {
        const avg = average.get(bucket.cmc) ?? 0;
        return { cmc: bucket.cmc, have: bucket.copies, average: avg, delta: bucket.copies - avg };
      }),
    };
  }

  const held = new Set(profile.cards.map((c) => c.oracleId));
  const missingStaples: StapleRef[] = [];
  const presentStaples: StapleRef[] = [];
  for (const staple of profile.skeleton.staples) {
    (held.has(staple.oracleId) ? presentStaples : missingStaples).push(staple);
  }

  const roleOrder = ["ramp", "draw", "removal", "wipes"] as const;
  const roleTargets = profile.skeleton.roleTargets;
  const measured = roleTargets.of !== "flat";
  const roleHave = measured ? profile.roles.excludingCommanders : profile.roles.counts;
  const roles: RoleFit[] = roleOrder.map((role) => ({
    role,
    // WHICH POPULATION DEPENDS ON WHICH TARGET, and `ProfileRoles` states the rule: the
    // 99-only view exists to match EDHREC's support lists, which never contain the commander,
    // so comparing `counts` against a derived target reports a phantom surplus on every deck
    // led by a card that classifies as one of the four.
    //
    // The ASSERTED baseline is not one of those lists. `ROLE_TARGETS` is a design figure for a
    // DECK, and a deck is a hundred cards including the one in the command zone — so dropping
    // a role-bearing commander there would under-count the deck against a target that always
    // meant to include it. One flag decides both, since `measured` is a property of the chain
    // rather than of a row.
    have: roleHave[role],
    target: roleTargets.targets[role],
    // `have - target`, so a deck holding one wipe against a MEASURED target of 0 reads +1.
    // That is a surplus and must read as one: 390 commanders measure exactly 0 wipes, and
    // calling it a shortfall would be the flat target's error wearing a measured number's
    // authority — the precise failure the old module-wide rule existed to prevent.
    delta: roleHave[role] - roleTargets.targets[role],
    measured,
  }));

  const deckCount = profile.skeleton.commanderDeckCount;
  return {
    basis: composition?.of ?? "none",
    types,
    curve,
    roles,
    roleBasis: roleTargets.of,
    missingStaples,
    presentStaples,
    coverage: {
      commanderDeckCount: deckCount,
      // Null is the THINNEST data there is — no page at all — and must not read as thick
      // merely because there is no figure to compare.
      thin: deckCount === null || deckCount < THIN_DECK_COUNT,
      thinCondition: profile.skeleton.thinCondition,
    },
  };
}
