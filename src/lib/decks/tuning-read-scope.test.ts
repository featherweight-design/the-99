import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { suggestedRunsOfDeck } from "./tuning-read";

describe("the panel's run reads", () => {
  it("scope a deck's runs to Suggested changes, so another tool's run on the deck is never its latest", () => {
    const q = new PgDialect().sqlToQuery(suggestedRunsOfDeck("deck-1")!);
    expect(q.sql).toContain(`"deck_suggestion_runs"."tool" = $2`);
    expect(q.params).toEqual(["deck-1", "suggested_changes"]);
  });
});
