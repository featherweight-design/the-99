// The deck page's wave-1 reads run beside the deck row rather than after it, so none of them can
// lean on the deck row having proved the deck is the reader's: each must carry the owner in its
// own SQL. A component test receives the rows and cannot see this; the emitted SQL can.
import { describe, expect, it } from "vitest";

import { deckDetailReads } from "./read";

const reads = deckDetailReads("deck_1", "user_1");

describe("deckDetailReads", () => {
  it.each(["deck", "commanders", "cards", "unresolved"] as const)(
    "%s is scoped to the reader in its own SQL",
    (name) => {
      const q = reads[name].toSQL();
      // The QUALIFIED column: an unqualified `"user_id"` would bind to whatever table the query
      // reads first, which is the collision AGENTS.md records for correlated subqueries.
      expect(q.sql).toContain(`"decks"."user_id" = $`);
      expect(q.params).toContain("user_1");
      expect(q.params).toContain("deck_1");
    },
  );

  it("finds the commanders through the reader's own deck row, not through ids handed over", () => {
    const q = reads.commanders.toSQL();
    expect(q.sql).toContain(`inner join "decks"`);
    expect(q.sql).toContain(`"decks"."commander_oracle_id"`);
    expect(q.sql).toContain(`"decks"."partner_oracle_id"`);
  });
});
