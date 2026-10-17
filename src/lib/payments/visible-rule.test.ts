import { describe, expect, it } from "vitest";
import { readerSeesCredits, readerSeesOffers } from "./visible-rule";

describe("readerSeesCredits", () => {
  it("is every combination, and false only with the switch off, nothing held, nothing ever bought and no return", () => {
    for (const switchOn of [true, false]) for (const held of [true, false]) for (const everBought of [true, false]) for (const returning of [true, false]) {
      expect(readerSeesCredits({ switchOn, held, everBought, returning })).toBe(switchOn || held || everBought || returning);
    }
  });
});

describe("readerSeesOffers", () => {
  it("follows the switch alone: holdings and purchases never open a sale", () => {
    expect(readerSeesOffers({ switchOn: true })).toBe(true);
    expect(readerSeesOffers({ switchOn: false })).toBe(false);
  });
});
