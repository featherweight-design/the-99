import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { helpReadWhere } from "./mana-help-read";

describe("the help read History reopens", () => {
  it("is the reader's own help read on this deck, by its id", () => {
    const q = new PgDialect().sqlToQuery(helpReadWhere("count-1", "deck-1", "user-1")!);
    expect(q.sql).toContain(`"deck_tool_counts"."id" = $1`);
    expect(q.sql).toContain(`"deck_tool_counts"."deck_id" = $2`);
    expect(q.sql).toContain(`"deck_tool_counts"."user_id" = $3`);
    expect(q.sql).toContain(`"deck_tool_counts"."tool" = $4`);
    expect(q.params).toEqual(["count-1", "deck-1", "user-1", "mana_help"]);
  });
});
