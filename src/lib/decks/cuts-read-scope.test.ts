import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { reapableCutsRuns } from "./cuts-read";

describe("reaping Proposed cuts runs", () => {
  it("touches only the reader's own pending runs of this tool on this deck, past the cutoff", () => {
    const q = new PgDialect().sqlToQuery(reapableCutsRuns("deck-1", "user-1", new Date("2026-10-10T12:00:00Z"))!);
    expect(q.sql).toContain(`"deck_suggestion_runs"."user_id" = $3`);
    expect(q.params.slice(0, 4)).toEqual(["deck-1", "proposed_cuts", "user-1", "pending"]);
    expect(q.sql).toContain(`"deck_suggestion_runs"."created_at" <`);
  });
});
