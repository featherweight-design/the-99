import { sql } from "drizzle-orm";

import { deckSuggestionRuns, modelCalls } from "../../db/schema";

/**
 * What a tuning run was actually charged, read from its own `model_calls` row (`deck_suggestion_runs.model_call_id`,
 * the unit `startRun` reserved). History's tier and the results' receipts say THIS, never the current price applied to
 * the requested count: a v2 run of 11 made before 2 credits applied was charged 1, and says so.
 *
 * Each is a correlated subquery in the projection of a single-table select of `deck_suggestion_runs`, so both sides
 * are aliased and qualified (AGENTS.md: Drizzle renders a bare column there, and `id` would resolve against
 * `model_calls`). Pinned by `run-charge.test.ts`.
 */
export const runUnits = sql<number>`(select mc.units from ${modelCalls} mc where mc.id = ${deckSuggestionRuns}.model_call_id)::int`;

/** The run's unit's status: `reserved` while it runs, then `spent` or `refunded`. */
export const runChargeStatus = sql<ChargeStatus>`(select mc.status from ${modelCalls} mc where mc.id = ${deckSuggestionRuns}.model_call_id)`;

export type ChargeStatus = "reserved" | "spent" | "refunded";

/** What a run's unit says: its credits and how it settled. */
export type RunCharge = { units: number; status: ChargeStatus };
