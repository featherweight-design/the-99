import { UPGRADE_UNITS } from "../precons/upgrade/constants";

/** Credits one guided run costs, flat: the same two as Upgrade this precon, no Overview (Hugh, 2026-11-21). Reserved whole, refunded whole. */
export const GUIDED_UNITS = UPGRADE_UNITS;

/** The three pools a run can add from (G4): what the player owns, anything up to the per-card cap, or anything within a total budget. */
export const POOL_MODES = ["owned", "cap", "budget"] as const;
export type PoolMode = (typeof POOL_MODES)[number];

/** A short or failed run's line, and its tile's, stays this long (it has no "seen" mark to retire it): derived from the run's start, never stored. */
export const GUIDED_LINE_HOURS = 24;

/** The total a budget run may be given, in cents: the sheet and the start both refuse outside it. */
export const BUDGET_MIN_CENTS = 100;
export const BUDGET_MAX_CENTS = 500_000;
