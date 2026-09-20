import { isLandFace } from "../cards/facet";
import { CURVE_MAX } from "../decks/stats";
import type {
  CompositionTargets,
  DeckProfile,
  ProfileCard,
  StapleRef,
} from "./types";

/**
 * A deck against the measured skeleton for its condition.
 *
 * NO FUNCTIONAL ROLES APPEAR HERE, and that is structural rather than an omission.
 * `ROLE_TARGETS` (10 ramp, 10 draw, 8 removal, 3 wipes) are ASSERTED constants — a design
 * baseline nobody measured — while these type targets are averages over thousands of real
 * decklists. Mixing them into one fit would launder the asserted numbers through the
 * measured ones' credibility, and a reader shown both in one table cannot tell which is
 * which. `ROLE_TARGETS` is deliberately not imported.
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
  missingStaples: StapleRef[];
  presentStaples: StapleRef[];
  coverage: { commanderDeckCount: number | null; thin: boolean };
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
    const bucket = Math.min(Math.max(Math.round(parsed), 0), CURVE_MAX);
    folded.set(bucket, (folded.get(bucket) ?? 0) + value);
  }
  return folded;
}

const TYPE_ORDER: (keyof CompositionTargets)[] = [
  "land", "basic", "nonbasic", "creature", "instant",
  "sorcery", "artifact", "enchantment", "planeswalker", "battle",
];

/**
 * The deck's own counts on the composition's ten axes.
 *
 * `basic` and `nonbasic` are WITHIN land rather than beside it, which is how EDHREC reports
 * them — so the three do not sum to the deck, and a reader adding them would double-count
 * every land.
 */
function countByType(cards: readonly ProfileCard[]): CompositionTargets {
  const counts: CompositionTargets = {
    land: 0, basic: 0, nonbasic: 0, creature: 0, instant: 0,
    sorcery: 0, artifact: 0, enchantment: 0, planeswalker: 0, battle: 0,
  };
  for (const card of cards) {
    // THE FRONT FACE, through `isLandFace`, and never `includes("land")` on the whole line.
    // Two failures in one: `Fell the Profane // Fell Mire` is an Instant that is played as
    // one, and 83 catalog rows carry a land on the back face alone — counting those would
    // make this table disagree with `counts.land` and `curve.lands` on the same object. And
    // without a word boundary `Lander Rizzi` reads as a land.
    if (isLandFace(card.typeLine)) {
      counts.land += card.quantity;
      if (/^basic\b/.test(card.typeLine.trim().toLowerCase())) counts.basic += card.quantity;
      else counts.nonbasic += card.quantity;
    }
    // The other types read the front face too, for the same reason: 79 cards carry
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

  const deckCount = profile.skeleton.commanderDeckCount;
  return {
    basis: composition?.of ?? "none",
    types,
    curve,
    missingStaples,
    presentStaples,
    coverage: {
      commanderDeckCount: deckCount,
      // Null is the THINNEST data there is — no page at all — and must not read as thick
      // merely because there is no figure to compare.
      thin: deckCount === null || deckCount < THIN_DECK_COUNT,
    },
  };
}
