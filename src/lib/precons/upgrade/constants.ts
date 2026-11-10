import { TUNING_MODEL } from "../../tuning/limits";

/**
 * "Upgrade this precon" (research 2026-11-10; Hugh's rulings of the same day). One model call per upgrade, checked in
 * code, repaired once. Every number here is a ruling or a measurement, named once so the staging measurement (PR 3) can
 * tune it.
 */

export const UPGRADE_MODEL = TUNING_MODEL;

/** Credits one run costs, flat (Hugh, 2026-11-10): reserved whole as `model_calls.units`, refunded whole. */
export const UPGRADE_UNITS = 2;

/** Swaps a run lands on: fewer than the floor after repair is the model's shortfall (refunded); the ceiling is the prompt's and the validator's. */
export const MIN_SWAPS = 12;
export const MAX_SWAPS = 18;

/** An added card costs at most this much, on its cheapest printing: a hard cap in code (the pool is filtered by it and the validator drops a line over it). */
export const CARD_CAP_CENTS = 1200;
/** What the prompt steers to: Hugh said "$10 to $12", so the cap is the ceiling and this is the preference. */
export const CARD_PREFER_CENTS = 1000;

/** A strategy is offered only when the deck's own cards back it with at least this many (orchestrator, 2026-11-10). */
export const MIN_BACKING = 5;
/** Strategies offered at most. */
export const MAX_STRATEGIES = 3;

/** Candidate cards sent, after the cap filter, by EDHREC inclusion. 80 measured at about 16.4k input tokens a call. */
export const POOL_MAX = 80;

/** Measured 2026-11-10 (single call, claude-sonnet-5-5): 16.4k tokens in on average, 2.05k out; ceilings leave room. */
export const UPGRADE_INPUT_CEILING_TOKENS = 24_000;
export const UPGRADE_MAX_TOKENS = 3_500;
/** The repair call answers only the missing swaps, so its reply is smaller. */
export const REPAIR_MAX_TOKENS = 2_000;
/** One deadline per call; the run is two calls at most. */
export const UPGRADE_CALL_DEADLINE_MS = 60_000;

/** The bracket the prompt aims the deck at (Hugh, 2026-11-10: "at least 3"). */
export const TARGET_BRACKET = 3;
