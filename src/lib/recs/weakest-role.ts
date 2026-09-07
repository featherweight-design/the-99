import { ROLE_TARGETS } from "./roles";

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
 * The targets are not equal — wipes asks for 3 where ramp asks for 10 — so an absolute
 * gap makes a collection two board wipes short look healthier than one four cards short
 * on ramp, when the wipes shortfall is the one that stops a deck being fielded.
 *
 * Null when every role is at or past its target: there is no gap to name.
 */
export function weakestRole(counts: Record<NonLandRole, number>): WeakestRole | null {
  let worst: WeakestRole | null = null;
  let worstShortfall = 0;

  for (const role of ROLE_ORDER) {
    const target = ROLE_TARGETS[role];
    const have = counts[role];
    const shortfall = (target - have) / target;
    if (shortfall > worstShortfall) {
      worstShortfall = shortfall;
      worst = { role, have, target };
    }
  }

  return worst;
}
