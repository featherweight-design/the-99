import { describe, expect, it } from "vitest";
import { cleanQuantity, toLines, wishlistLinesQuery } from "./wishlist";
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

describe("toLines", () => {
  it("reads a line as got once the collection holds as many as wanted, and not before", () => {
    const at = new Date(0);
    const lines = toLines([
      { oracleId: "a", quantity: 2, owned: 1, addedAt: at },
      { oracleId: "b", quantity: 2, owned: 2, addedAt: at },
      { oracleId: "c", quantity: 1, owned: 0, addedAt: at },
    ]);
    expect(lines.map((l) => l.got)).toEqual([false, true, false]);
  });
});

describe("wishlistLinesQuery", () => {
  it("reads one owner's lines and only that owner's collection", () => {
    const { sql, params } = wishlistLinesQuery("owner").toSQL();
    expect(sql).toContain(`where "wishlist_items"."user_id" = $`);
    expect(sql).toContain(`where "collection_items"."user_id" = $`);
    expect(params.filter((p) => p === "owner")).toHaveLength(2);
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

  it("returns the card, the wanted count and got, never an owned count", () => {
    const q = friendWishlistQuery("viewer", "00000000-0000-0000-0000-000000000001");
    expect(Object.keys((q as unknown as { _: { selectedFields: object } })._.selectedFields)).toEqual(["oracleId", "quantity", "got"]);
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
