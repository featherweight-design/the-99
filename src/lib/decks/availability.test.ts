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

// Addendum 2 §6: a deck never claims a card against itself. The query hands
// back a `free` computed against a supply that already has this deck's copies
// removed, so the same numbers mean something different here.
describe("availabilityState, on a deck's own decklist (selfExcluded)", () => {
  const self = { selfExcluded: true } as const;

  // The whole point of the flag. Off-decklist these numbers are "hard".
  it("is free at free === 0, where the un-excluded vantage says hard", () => {
    expect(availabilityState({ owned: 1, free: 0, soft: 0 })).toBe("hard");
    expect(availabilityState({ owned: 1, free: 0, soft: 0 }, self)).toBe("free");
  });

  // Self-excluded `free === 0` is the comfortable reading, the same as `free > 0`
  // off-decklist — and there a soft claim still wins. A brew holding the copy is
  // the most severe thing true about it, so the soft state survives the vantage.
  it("is soft at free === 0 when a brew wants the card", () => {
    expect(availabilityState({ owned: 2, free: 0, soft: 3 }, self)).toBe("soft");
  });

  // And silent when nothing unfinished wants it, exactly as before.
  it("is free at free === 0 with no soft claims", () => {
    expect(availabilityState({ owned: 2, free: 0, soft: 0 }, self)).toBe("free");
  });

  // The hard branch is unreachable in this vantage. A real conflict goes
  // negative instead, so `over` must still fire.
  it("still reports over when another deck wants a copy that does not exist", () => {
    expect(availabilityState({ owned: 1, free: -1, soft: 0 }, self)).toBe("over");
  });

  // The flag must not swallow the states that are not about self-exclusion.
  it("leaves soft and free untouched", () => {
    expect(availabilityState({ owned: 2, free: 1, soft: 1 }, self)).toBe("soft");
    expect(availabilityState({ owned: 4, free: 3, soft: 0 }, self)).toBe("free");
  });

  // The guard reads TRUE owned, which the query never reduces, so it outranks
  // the flag exactly as it does everywhere else.
  it("keeps the unowned guard ahead of the flag", () => {
    expect(availabilityState({ owned: 0, free: -2, soft: 0 }, self)).toBe("free");
  });

  // Addendum 2's drawn state 9, verbatim: Atraxa at 99/99 viewing its own list.
  // Five of six rows are silent, which is the rule the whole feature rests on.
  it("reproduces the six rows of Addendum 2's worked example", () => {
    const rows = [
      { name: "Smothering Tithe", owned: 1, free: 0, soft: 0, expected: "free" },
      { name: "Rhystic Study", owned: 1, free: 0, soft: 0, expected: "free" },
      { name: "Arcane Signet", owned: 1, free: -1, soft: 0, expected: "over" },
      { name: "Sol Ring", owned: 4, free: 3, soft: 0, expected: "free" },
      { name: "Mind Stone", owned: 2, free: 1, soft: 1, expected: "soft" },
      { name: "Cyclonic Rift", owned: 1, free: 0, soft: 0, expected: "free" },
    ] as const;
    for (const r of rows) {
      expect(availabilityState(r, self), r.name).toBe(r.expected);
    }
  });
});
