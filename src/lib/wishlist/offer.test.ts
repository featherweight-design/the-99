import { describe, expect, it, vi } from "vitest";

vi.mock("./sync", () => ({ setWishlistSync: vi.fn() }));

import { dismissWishlistOfferWrite, offerCount } from "./offer";

const need = (deckId: string, oracleId: string, quantity = 1) => ({ deckId, oracleId, quantity }) as never;

describe("offerCount (plan F7)", () => {
  it("counts each card once across decks, and leaves out skipped cards and rows with nothing to buy", () => {
    expect(offerCount([need("d1", "a"), need("d2", "a", 2), need("d1", "b"), need("d2", "c", 0), need("d1", "s")], new Set(["s"]))).toBe(2);
  });
  it("is 0 with no needs", () => {
    expect(offerCount([], new Set())).toBe(0);
  });
});

describe("dismissWishlistOfferWrite", () => {
  it("writes the stamp only while it is null, so a second ✕ never fires the stamp trigger", () => {
    const { sql, params } = dismissWishlistOfferWrite("u1").toSQL();
    expect(params).toContain("u1");
    expect(sql).toContain(`on conflict ("user_id") do update set "wishlist_offer_dismissed_at" = now()`);
    expect(sql).toMatch(/ where "user_prefs"\."wishlist_offer_dismissed_at" is null$/);
  });
});
