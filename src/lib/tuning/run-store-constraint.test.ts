// The run's error class is checked by a constraint, and the panel draws its failure from that value
// alone. `locked_only` (Locked, F10) must be in BOTH the table the app writes through and the
// migration that builds it, or a run whose every cut was locked fails its own write.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { deckSuggestionRuns } from "../../db/schema";
import type { ErrorClass } from "./run-store";

const CLASSES: ErrorClass[] = ["upstream_busy", "timeout", "malformed", "ungrounded", "interrupted", "locked_only"];

describe("deck_suggestion_runs_error_class_check", () => {
  it("allows every ErrorClass, locked_only included, in the schema", () => {
    const check = getTableConfig(deckSuggestionRuns).checks.find((c) => c.name === "deck_suggestion_runs_error_class_check")!;
    const text = new PgDialect().sqlToQuery(check.value).sql;
    for (const c of CLASSES) expect(text).toContain(`'${c}'`);
  });

  it("and in the migration that adds it", () => {
    const sql = readFileSync("drizzle/0062_tuning_locked_only.sql", "utf8");
    for (const c of CLASSES) expect(sql).toContain(`'${c}'`);
  });
});
