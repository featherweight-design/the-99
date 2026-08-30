import { describe, it, expect } from "vitest";
import { availabilityState } from "./availability";

describe("availabilityState", () => {
  it("is free when nothing claims the card", () => {
    expect(availabilityState({ owned: 4, free: 4, soft: 0 })).toBe("free");
  });

  // The partition's sharpest edge: hard claims are ALLOWED in the free state.
  // Four Sol Rings with three sleeved still leaves one free, and the player
  // sees nothing.
  it("is free when a hard claim still leaves a spare copy and no brew wants it", () => {
    expect(availabilityState({ owned: 4, free: 1, soft: 0 })).toBe("free");
  });

  it("is soft when a copy is free but an unfinished brew wants it", () => {
    expect(availabilityState({ owned: 2, free: 1, soft: 1 })).toBe("soft");
  });

  it("is hard when nothing is free, regardless of brews", () => {
    expect(availabilityState({ owned: 1, free: 0, soft: 0 })).toBe("hard");
    expect(availabilityState({ owned: 1, free: 0, soft: 3 })).toBe("hard");
  });

  it("is over when more finished decks want the card than are owned", () => {
    expect(availabilityState({ owned: 1, free: -2, soft: 0 })).toBe("over");
  });

  // The states annotate a card the player HAS. An unowned card is not "in use".
  it("is free when the card is not owned at all", () => {
    expect(availabilityState({ owned: 0, free: 0, soft: 0 })).toBe("free");
  });
});
