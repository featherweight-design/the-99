import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

const execute = vi.hoisted(() => vi.fn());
vi.mock("../../db", () => ({ db: { execute } }));

import { cleanQuantity, loadWishlist, wantFloor } from "./wishlist";

describe("loadWishlist", () => {
  it("runs the owner's union and maps each row, source and deck ids included", async () => {
    execute.mockResolvedValueOnce({ rows: [
      { oracle_id: "o1", scryfall_id: null, quantity: "4", owned: "1", added_at: "2026-11-27T10:00:00Z", source: "hand", deck_ids: ["d1", "d2"] },
      { oracle_id: "o2", scryfall_id: "s2", quantity: 2, owned: 0, added_at: "2026-11-26T10:00:00Z", source: "deck", deck_ids: null },
    ] });
    const lines = await loadWishlist("owner");
    const { sql } = new PgDialect().sqlToQuery(execute.mock.calls[0][0]);
    expect(sql).toContain(`full join (select ss.*`);
    expect(lines).toEqual([
      { oracleId: "o1", scryfallId: null, quantity: 4, owned: 1, addedAt: new Date("2026-11-27T10:00:00Z"), source: "hand", deckIds: ["d1", "d2"] },
      { oracleId: "o2", scryfallId: "s2", quantity: 2, owned: 0, addedAt: new Date("2026-11-26T10:00:00Z"), source: "deck", deckIds: [] },
    ]);
  });
});

describe("cleanQuantity", () => {
  it("takes a whole number from 1 to 99, as a number or a form string", () => {
    expect([1, 99, "3", " 7 "].map(cleanQuantity)).toEqual([1, 99, 3, 7]);
  });
  it("refuses everything else", () => {
    expect([0, 100, 1.5, -1, "", "x", null, undefined, NaN].map(cleanQuantity)).toEqual(Array(9).fill(null));
  });
});

describe("wantFloor", () => {
  it("floors a step down on an unmet line at one more than held, so the line stays", () => {
    // Want 4, the collection grew to 3 while the screen still read 1: − sends 3, and the line stands at 4.
    expect(wantFloor(3, 3, 4)).toBe(4);
    expect(wantFloor(1, 1, 2)).toBe(2);
  });
  it("lets a step down above the floor through", () => {
    expect(wantFloor(2, 1, 3)).toBe(2);
  });
  it("leaves a first want, and a line the collection already reaches, to the collected rule", () => {
    expect(wantFloor(1, 1, null)).toBe(1);
    expect(wantFloor(2, 3, 2)).toBe(2);
  });
});
