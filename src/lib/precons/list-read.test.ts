import { describe, expect, it } from "vitest";
import { ownedPreconCards } from "./list-read";

describe("ownedPreconCards", () => {
  // The correlated subquery must compare the precon card to the COLLECTION row, never to itself.
  it("qualifies the collection's oracle id inside the subquery", () => {
    const { sql } = ownedPreconCards("user_1").toSQL();
    expect(sql).toContain(`pc.oracle_id = "collection_items"."oracle_id"`);
  });
});
