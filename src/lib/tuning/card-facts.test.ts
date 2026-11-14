import { describe, expect, it } from "vitest";
import { briefText, unsupportedKeyword } from "./card-facts";

describe("briefText", () => {
  it("strips reminder text and joins the lines", () => {
    expect(briefText("Flying (This creature can't be blocked except by creatures with flying or reach.)\nGoad target creature.")).toBe("Flying / Goad target creature.");
  });

  it("is null for a card with no text, or only reminder text", () => {
    expect(briefText(null)).toBeNull();
    expect(briefText("")).toBeNull();
    expect(briefText("(This is only reminder text.)")).toBeNull();
  });

  it("cuts a long text at a word, near 160 characters", () => {
    const out = briefText("Whenever a creature you control attacks, draw a card then discard a card. ".repeat(6))!;
    expect(out.length).toBeLessThanOrEqual(161);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });
});

describe("unsupportedKeyword", () => {
  const ancestor = { keywords: ["Flying"], oracleText: "Flying\nWhenever Vengeful Ancestor attacks, goad target creature." };

  it("finds the invented keyword: 'a hasty flyer' on a card with Flying and Goad", () => {
    expect(unsupportedKeyword("A hasty flyer that pressures the table.", ancestor)).toBe("haste");
  });

  it("passes a keyword the card has, in its keywords or only in its text", () => {
    expect(unsupportedKeyword("A flyer that goads.", ancestor)).toBeNull();
    expect(unsupportedKeyword("Gives your creatures haste.", { keywords: [], oracleText: "Creatures you control have haste." })).toBeNull();
  });

  it("passes a denial and a keyword on other cards", () => {
    expect(unsupportedKeyword("It has no haste.", ancestor)).toBeNull();
    expect(unsupportedKeyword("It pairs with your lifelink creatures.", ancestor)).toBeNull();
    expect(unsupportedKeyword("Protects the flyers in your deck.", { keywords: [], oracleText: "Draw a card." })).toBeNull();
  });

  it("reads the ambiguous words only where they say the card has them", () => {
    const plain = { keywords: [], oracleText: "Draw a card." };
    expect(unsupportedKeyword("Helps the deck reach its goals, a flash of value.", plain)).toBeNull();
    expect(unsupportedKeyword("A creature with reach.", plain)).toBe("reach");
    expect(unsupportedKeyword("Comes with ward.", plain)).toBe("ward");
  });

  it("reads double strike as first strike, and an 'and' or comma before an ordinary word as prose", () => {
    expect(unsupportedKeyword("First strike makes it a strong attacker.", { keywords: ["Double strike"], oracleText: "Double strike" })).toBeNull();
    expect(unsupportedKeyword("Helps you reach 10 mana, and ward off removal, reach for more.", { keywords: [], oracleText: "Draw a card." })).toBeNull();
  });

  it("judges nothing when the card's facts were not read", () => {
    expect(unsupportedKeyword("A hasty flyer.", {})).toBeNull();
  });
});
