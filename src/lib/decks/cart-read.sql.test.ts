// The cart's deck read through Drizzle's own renderer. A correlated subquery in a single-table
// projection is exactly where Drizzle emits an unqualified outer column (AGENTS.md), and an
// unqualified `id` there would compare `deck_versions`' own ids and call every deck a brew.
import { describe, expect, it } from "vitest";
import { cartDecksQuery } from "./cart-read";

describe("cartDecksQuery", () => {
  it("keeps the outer decks.id qualified inside the brew test", () => {
    const { sql } = cartDecksQuery("user_1", ["00000000-0000-0000-0000-000000000001"]).toSQL();
    expect(sql).toContain('dv.deck_id = "decks".id');
    expect(sql).not.toMatch(/dv\.deck_id = "id"/);
  });
});
