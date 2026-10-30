import { describe, expect, it } from "vitest";

import { db } from "../../db";
import { deckSuggestionRuns } from "../../db/schema";
import { runChargeStatus, runUnits } from "./run-charge";

describe("a run's charge, read from its own model_calls row", () => {
  it("aliases model_calls and qualifies the run's column on both subqueries (a bare `id` would match every row)", () => {
    const q = db.select({ id: deckSuggestionRuns.id, units: runUnits, status: runChargeStatus }).from(deckSuggestionRuns).toSQL().sql;
    expect(q).toContain(`(select mc.units from "model_calls" mc where mc.id = "deck_suggestion_runs".model_call_id)::int`);
    expect(q).toContain(`(select mc.status from "model_calls" mc where mc.id = "deck_suggestion_runs".model_call_id)`);
  });
});
