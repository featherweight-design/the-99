import { describe, expect, it } from "vitest";
import { feedCopy } from "./feed";

const rest = feedCopy.home.offer.rest;

describe("the offer line's kinds (announcements call 3)", () => {
  it("names one, two or three kinds in full, capitalized", () => {
    expect(rest(["new sets"])).toBe("New sets.");
    expect(rest(["new sets", "combos you can make"])).toBe("New sets and combos you can make.");
    expect(rest(["new sets", "price drops on your wishlist", "trade matches"])).toBe("New sets, price drops on your wishlist and trade matches.");
  });

  it("names the first three, then 'and more', past three", () => {
    expect(rest(["new sets", "price drops on your wishlist", "trade matches", "combos you can make"])).toBe(
      "New sets, price drops on your wishlist, trade matches and more.",
    );
  });
});
