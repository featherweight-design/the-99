import { UPGRADE_UNITS } from "../precons/upgrade/constants";

/** Credits one guided run costs, flat: the same two as Upgrade this precon, Overview included (READINESS Y4). Reserved whole, refunded whole. */
export const GUIDED_UNITS = UPGRADE_UNITS;

/** The three pools a run can add from (G4): what the player owns, anything up to the per-card cap, or anything within a total budget. */
export const POOL_MODES = ["owned", "cap", "budget"] as const;
export type PoolMode = (typeof POOL_MODES)[number];
