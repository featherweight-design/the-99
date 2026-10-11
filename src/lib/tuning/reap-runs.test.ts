import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { REAPER_CUTOFF_MS } from "./limits";
import { reapableReaderRuns } from "./reap-runs";

describe("reapableReaderRuns", () => {
  it("names this deck, this reader, pending runs past the cutoff, and nothing else", () => {
    const now = new Date("2026-10-11T12:00:00Z");
    const q = new PgDialect().sqlToQuery(reapableReaderRuns("deck", "me", now)!);
    expect(q.sql).toBe('("deck_suggestion_runs"."deck_id" = $1 and "deck_suggestion_runs"."user_id" = $2 and "deck_suggestion_runs"."status" = $3 and "deck_suggestion_runs"."created_at" < $4)');
    expect(q.params.slice(0, 3)).toEqual(["deck", "me", "pending"]);
    expect(new Date(q.params[3] as string).getTime()).toBe(now.getTime() - REAPER_CUTOFF_MS);
  });
});
