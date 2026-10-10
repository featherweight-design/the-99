import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { cancellableRun } from "./run-store";

describe("a Stop", () => {
  it("finds only a pending run of its own tool, on its own deck, for its own reader", () => {
    const q = new PgDialect().sqlToQuery(cancellableRun("run-1", "deck-1", "user-1", "proposed_cuts")!);
    expect(q.sql).toContain(`"deck_suggestion_runs"."tool" = $4`);
    expect(q.sql).toContain(`"deck_suggestion_runs"."status" = $5`);
    expect(q.params).toEqual(["run-1", "deck-1", "user-1", "proposed_cuts", "pending"]);
  });
});
