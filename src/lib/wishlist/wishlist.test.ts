import { describe, expect, it } from "vitest";
import { cleanQuantity, wishlistLinesQuery } from "./wishlist";
import { friendWishlistQuery } from "../social/wishlist";
import { wishlistEnabled } from "./flag";

describe("cleanQuantity", () => {
  it("takes a whole number from 1 to 99, as a number or a form string", () => {
    expect([1, 99, "3", " 7 "].map(cleanQuantity)).toEqual([1, 99, 3, 7]);
  });
  it("refuses everything else", () => {
    expect([0, 100, 1.5, -1, "", "x", null, undefined, NaN].map(cleanQuantity)).toEqual(Array(9).fill(null));
  });
});

describe("wishlistLinesQuery", () => {
  it("reads one owner's lines and only that owner's collection", () => {
    const { sql, params } = wishlistLinesQuery("owner").toSQL();
    expect(sql).toContain(`where ("wishlist_items"."user_id" = $`);
    expect(sql).toContain(`where "collection_items"."user_id" = $`);
    expect(params.filter((p) => p === "owner")).toHaveLength(2);
  });

  it("leaves out a line the collection already reaches, rather than deleting it (G5)", () => {
    const { sql } = wishlistLinesQuery("owner").toSQL();
    // `n` is the owned subquery's alone: `wishlist_items` has no such column, so the bare name cannot collide.
    expect(sql).toContain(`and coalesce("n", 0) < "wishlist_items"."quantity")`);
    expect(sql).not.toMatch(/delete/i);
  });
});

describe("friendWishlistQuery", () => {
  const { sql, params } = friendWishlistQuery("viewer", "00000000-0000-0000-0000-000000000001").toSQL();

  it("joins the viewer's own friendship row to the wishlist's owner, in the same statement", () => {
    expect(sql).toContain(`inner join "friend_links" on ("friend_links"."friend_user_id" = "wishlist_items"."user_id" and "friend_links"."user_id" = $`);
    expect(params).toContain("viewer");
  });

  it("narrows to the friend named by public id", () => {
    expect(sql).toContain(`"social_profiles"."public_id" = $`);
  });

  it("returns the card and the wanted count, never an owned count or got", () => {
    const q = friendWishlistQuery("viewer", "00000000-0000-0000-0000-000000000001");
    expect(Object.keys((q as unknown as { _: { selectedFields: object } })._.selectedFields))
      .toEqual(["oracleId", "quantity", "name", "imageUri", "layout", "backImageUri"]);
  });

  it("leaves out a line the friend's collection already reaches (G5)", () => {
    expect(sql).toMatch(/where coalesce\("owned"\."n", 0\) < "wishlist_items"\."quantity"/);
  });

  it("joins the card from the catalog", () => {
    expect(sql).toContain(`inner join "cards" on "cards"."oracle_id" = "wishlist_items"."oracle_id"`);
  });
});

describe("wishlistEnabled", () => {
  it("is on only for exactly 'true'", () => {
    const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;
    expect([
      wishlistEnabled(env({ SOCIAL_WISHLIST_ENABLED: "true" })),
      wishlistEnabled(env({ SOCIAL_WISHLIST_ENABLED: "1" })),
      wishlistEnabled(env({})),
    ]).toEqual([true, false, false]);
  });
});
