import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { okCutsRunWhere, reapableCutsRuns } from "./cuts-read";

describe("reaping Proposed cuts runs", () => {
  it("touches only the reader's own pending runs of this tool on this deck, past the cutoff", () => {
    const q = new PgDialect().sqlToQuery(reapableCutsRuns("deck-1", "user-1", new Date("2026-10-10T12:00:00Z"))!);
    expect(q.sql).toContain(`"deck_suggestion_runs"."user_id" = $3`);
    expect(q.params.slice(0, 4)).toEqual(["deck-1", "proposed_cuts", "user-1", "pending"]);
    expect(q.sql).toContain(`"deck_suggestion_runs"."created_at" <`);
  });
});

describe("the ok run the panel reads", () => {
  it("reads a run named by id only when it is the reader's own ok Proposed cuts run on this deck", () => {
    const q = new PgDialect().sqlToQuery(okCutsRunWhere("deck-1", "user-1", "run-9")!);
    expect(q.sql).toContain(`"deck_suggestion_runs"."deck_id" = $1`);
    expect(q.sql).toContain(`"deck_suggestion_runs"."user_id" = $3`);
    expect(q.sql).toContain(`"deck_suggestion_runs"."id" = $5`);
    expect(q.params).toEqual(["deck-1", "proposed_cuts", "user-1", "ok", "run-9"]);
  });

  it("reads the newest ok run when none is named", () => {
    const q = new PgDialect().sqlToQuery(okCutsRunWhere("deck-1", "user-1", null)!);
    expect(q.sql).not.toContain(`"deck_suggestion_runs"."id" =`);
    expect(q.params).toEqual(["deck-1", "proposed_cuts", "user-1", "ok"]);
  });
});
