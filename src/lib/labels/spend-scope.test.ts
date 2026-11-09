import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { familySpendScope } from "./spend-scope";

// The SQL half of one cap per run id across prompt versions; `familySpend`'s rule is in plan.test.ts.
describe("familySpendScope", () => {
  it("reads this version's rows OR this run id's rows under any version", () => {
    const q = new PgDialect().sqlToQuery(familySpendScope("weekly-2026-W45", "9"));
    // An OR of the two, never the version alone: reverting to `eq(promptVersion, …)` drops the run's half.
    expect(q.sql).toMatch(/"prompt_version" = \$1 or "card_label_batches"\."run_id" = \$2/);
    expect(q.params).toEqual(["9", "weekly-2026-W45"]);
  });
});
