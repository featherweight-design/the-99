import { ROLE_TARGETS } from "./roles";
import { wholeTarget } from "./score";

export type NonLandRole = keyof typeof ROLE_TARGETS;

/** The order a tie falls back on, and the order the coverage panels are drawn in. */
export const ROLE_ORDER: NonLandRole[] = ["ramp", "draw", "removal", "wipes"];

export type WeakestRole = {
  role: NonLandRole;
  have: number;
  target: number;
};

/**
 * The role the paragraph names as thinnest: the largest **proportional** shortfall,
 * `(target - have) / target`, not the largest absolute gap.
 *
 * The targets are not equal — on the fallback wipes asks for 3 where ramp asks for 10, and a
 * commander's measured targets differ by role too — so an absolute gap makes a collection two
 * board wipes short look healthier than one four cards short on ramp, when the wipes shortfall
 * is the one that stops a deck being fielded.
 *
 * Null when every role is at or past its target: there is no gap to name.
 *
 * The targets are the commander's own (`CommanderDetailScore.roleTargets`), rounded to whole
 * cards the way the fit score rounds them (`wholeTarget`), so the role this names is the one
 * the score docked. A target of 0 is always met: its decks run none of that role, so nobody is
 * short of it. It is skipped by name rather than left to the division, whose NaN or -Infinity
 * only happens to lose the comparison below.
 */
export function weakestRole(
  counts: Record<NonLandRole, number>,
  targets: Record<NonLandRole, number>,
): WeakestRole | null {
  let worst: WeakestRole | null = null;
  let worstShortfall = 0;

  for (const role of ROLE_ORDER) {
    const target = wholeTarget(targets[role]);
    if (target <= 0) continue;
    const have = counts[role];
    const shortfall = (target - have) / target;
    if (shortfall > worstShortfall) {
      worstShortfall = shortfall;
      worst = { role, have, target };
    }
  }

  return worst;
}
