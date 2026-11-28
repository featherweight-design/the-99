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

describe("a rolled trade match's line (Cart on your wishlist Q1, board N1)", () => {
  const line = feedCopy.home.line.tradeMatchRolled;
  it("names two cards then how many more, or both of a pair", () => {
    expect(line(["Sai", "Ghalta", "Miku", "Zada"], 4)).toBe("Sai, Ghalta and 2 more. On your wishlist.");
    expect(line(["Miku", "Captain America"], 2)).toBe("Miku and Captain America. On your wishlist.");
  });
  it("counts a card the catalog lost in the more, and says only the wishlist with no name left", () => {
    expect(line(["Sai"], 3)).toBe("Sai and 2 more. On your wishlist.");
    expect(line([], 2)).toBe("On your wishlist.");
  });
});
