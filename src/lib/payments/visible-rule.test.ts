import { describe, expect, it } from "vitest";
import { readerSeesCredits, readerSeesOffers, readerSeesPause } from "./visible-rule";

describe("readerSeesCredits", () => {
  it("is every combination, and false only with the switch off, nothing held, nothing ever bought and no return", () => {
    for (const switchOn of [true, false]) for (const held of [true, false]) for (const everBought of [true, false]) for (const returning of [true, false]) {
      expect(readerSeesCredits({ switchOn, held, everBought, returning })).toBe(switchOn || held || everBought || returning);
    }
  });
});

describe("readerSeesCredits: a held plan", () => {
  it("keeps the page for a reader with the switch off, nothing held, bought or returning, who holds a live plan", () => {
    expect(readerSeesCredits({ switchOn: false, held: false, everBought: false, returning: false, planHeld: true })).toBe(true);
    expect(readerSeesCredits({ switchOn: false, held: false, everBought: false, returning: false, planHeld: false })).toBe(false);
    expect(readerSeesCredits({ switchOn: false, held: false, everBought: false, returning: false })).toBe(false);
  });
});

describe("readerSeesOffers and readerSeesPause", () => {
  it("draws offers only with the switch on and buying not paused; holdings and purchases never open a sale", () => {
    expect(readerSeesOffers({ switchOn: true, blocked: false })).toBe(true);
    expect(readerSeesOffers({ switchOn: true, blocked: true })).toBe(false);
    expect(readerSeesOffers({ switchOn: false, blocked: false })).toBe(false);
    expect(readerSeesOffers({ switchOn: false, blocked: true })).toBe(false);
  });

  it("draws the pause band exactly where a pause took the offers away, never with the switch off (B1, O2 to O4)", () => {
    for (const switchOn of [true, false]) for (const blocked of [true, false]) {
      expect(readerSeesPause({ switchOn, blocked })).toBe(switchOn && blocked);
      // Never both, and never neither while the switch is on.
      expect(readerSeesPause({ switchOn, blocked }) && readerSeesOffers({ switchOn, blocked })).toBe(false);
      if (switchOn) expect(readerSeesPause({ switchOn, blocked }) || readerSeesOffers({ switchOn, blocked })).toBe(true);
    }
  });
});
