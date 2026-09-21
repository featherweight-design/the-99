import { countByType, type TypeCountable } from "../profile/fit";
import type { CompositionTargets } from "../profile/types";

/**
 * How far a deck is from its measured type composition, and which card closes the larger gap.
 *
 * Pure, and separated from `planFill` so the rule is testable without a pool, a database or a
 * commander. The fill's existing preference order is a named comparator too; this sits beside
 * it rather than inside the loop.
 *
 * WHY THE FILL NEEDS THIS AT ALL. Role floors and type targets are different axes, so they do
 * not contradict each other directly — they collide through the cards that satisfy both. In a
 * large collection ten ramp is ten mana rocks, because rocks rank highest on inclusion, while
 * the median commander wants eleven artifacts in the whole deck and 38% want fewer than ten.
 * The ramp slot alone can therefore spend the entire artifact budget, and an OVERSHOOT IS
 * PERMANENT: a later pass can add a missing creature, but nothing removes a surplus artifact.
 */

/** The seven axes a tie-break may read. */
const GAP_AXES = [
  "creature", "instant", "sorcery", "artifact", "enchantment", "planeswalker", "battle",
] as const;

type GapAxis = (typeof GAP_AXES)[number];

export type TypeDeficits = Map<GapAxis, number>;

/**
 * `target - have` per axis: positive is short, negative is over.
 *
 * THE THREE LAND AXES ARE EXCLUDED, and not as an oversight. `land` is decided by
 * `landTarget` and the land sweeps, which run on their own budget — letting it compete here
 * would have the role pass spending land slots. And `basic`/`nonbasic` sit WITHIN `land`
 * rather than beside it, so scoring them would count every land two or three times over.
 */
export function typeDeficits(
  targets: CompositionTargets | null,
  placed: CompositionTargets,
): TypeDeficits {
  const out: TypeDeficits = new Map();
  // No targets is no opinion, and an empty map makes the comparator below a no-op rather than
  // a tie-break over zeroes — which would quietly re-order the pool by type for a commander
  // nothing was measured for.
  if (!targets) return out;
  for (const axis of GAP_AXES) out.set(axis, targets[axis] - placed[axis]);
  return out;
}

/** The deck's own counts, through the profile's reader rather than a second copy of it. */
export function tallyTypes(rows: readonly TypeCountable[]): CompositionTargets {
  return countByType(rows);
}

/**
 * How much closing this card would help, on its BEST axis.
 *
 * A card carries several types, and an artifact creature closes the creature gap while
 * deepening the artifact surplus. It scores on the better of the two: the card is still a
 * creature, and refusing it to avoid a smaller surplus would leave the larger gap open.
 *
 * The FRONT FACE only, as everywhere else in this codebase — `Fell the Profane // Fell Mire`
 * is an Instant you cast.
 */
function bestGap(typeLine: string, deficits: TypeDeficits): number {
  // Defaulted: this is a comparator, and a row with no type line must sort neutrally rather
  // than throw. A crash inside a sort takes the whole surface down over an ordering.
  const front = (typeLine ?? "").split(" // ")[0].toLowerCase();
  let best = Number.NEGATIVE_INFINITY;
  for (const axis of GAP_AXES) {
    if (!new RegExp(`\\b${axis}\\b`).test(front)) continue;
    best = Math.max(best, deficits.get(axis) ?? 0);
  }
  // A card on none of the seven axes — a land, or a type nothing measures — has no claim
  // either way and must not sort above or below one that does.
  return best === Number.NEGATIVE_INFINITY ? 0 : best;
}

/**
 * A comparator preferring the card that closes the larger gap. Negative means `a` first.
 *
 * NEVER A VETO. The fill's role floors are met whatever this returns: it decides WHICH card
 * closes a role, never whether the role gets closed. A card that deepens every surplus is
 * still taken when it is the only thing that can fill the slot, because a deck short on ramp
 * is a worse outcome than a deck one artifact over.
 */
export function preferByTypeGap(
  a: { typeLine: string },
  b: { typeLine: string },
  deficits: TypeDeficits,
): number {
  if (deficits.size === 0) return 0;
  return bestGap(b.typeLine, deficits) - bestGap(a.typeLine, deficits);
}
