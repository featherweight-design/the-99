// Settings › Wishlist's reads and the one write behind the picker tick and the deck ⋯ menu's Keep off my wishlist
// (cart on your wishlist, call 1 and M1): the per-deck count's definition, and the UPDATE's SQL.
import { describe, expect, it } from "vitest";
import { offWishlistUpdate, toBuyByDeck } from "./sync-settings";
import type { DeckBuyRow } from "../decks/availability-query";

const need = (deckId: string, oracleId: string, quantity = 1) => ({ deckId, oracleId, quantity }) as DeckBuyRow;

describe("toBuyByDeck", () => {
  it("counts distinct cards per deck, less the cards taken off the synced set", () => {
    const counts = toBuyByDeck(
      [need("d1", "a"), need("d1", "a", 2), need("d1", "b"), need("d1", "skip"), need("d2", "a"), need("d2", "none", 0)],
      new Set(["skip"]),
    );
    expect(counts.get("d1")).toBe(2);
    expect(counts.get("d2")).toBe(1);
  });

  it("draws no entry for a deck whose every card is skipped or already owned", () => {
    const counts = toBuyByDeck([need("d1", "skip"), need("d2", "x", 0)], new Set(["skip"]));
    expect(counts.has("d1")).toBe(false);
    expect(counts.has("d2")).toBe(false);
  });
});

describe("offWishlistUpdate", () => {
  it("sets the flag alone, with the owner, the ids and the change in its WHERE", () => {
    const { sql, params } = offWishlistUpdate("user_1", ["d1", "d2"], true).toSQL();
    expect(sql).toMatch(/^update "decks" set "off_wishlist" = \$1 where/);
    expect(sql).not.toMatch(/last_edited_at/);
    expect(sql).toMatch(/"decks"\."user_id" = \$2/);
    expect(sql).toMatch(/"decks"\."id" in \(\$3, \$4\)/);
    expect(sql).toMatch(/"decks"\."off_wishlist" <> \$5/);
    expect(params).toEqual([true, "user_1", "d1", "d2", true]);
  });
});
