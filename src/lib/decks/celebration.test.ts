import { describe, expect, it } from "vitest";
import { celebrationKey, shouldCelebrate } from "./celebration";

describe("shouldCelebrate", () => {
  it("fires when a deck first reads Complete", () => {
    expect(shouldCelebrate({ status: "Complete", alreadyCelebrated: false })).toBe(true);
  });

  it("does not fire again once celebrated", () => {
    expect(shouldCelebrate({ status: "Complete", alreadyCelebrated: true })).toBe(false);
  });

  it("does not fire for a playable-but-incomplete deck", () => {
    expect(shouldCelebrate({ status: "Playable", alreadyCelebrated: false })).toBe(false);
  });

  it("does not fire while building", () => {
    expect(shouldCelebrate({ status: "Building", alreadyCelebrated: false })).toBe(false);
  });

  it("does not fire for a draft", () => {
    expect(shouldCelebrate({ status: "Draft", alreadyCelebrated: false })).toBe(false);
  });

  // The reverse/repeat lifecycle: 99/99 → celebrate → remove a card → re-add.
  // Once the flag is set the deck never celebrates again, whatever the status
  // does in between. This is the whole point of the one-shot design.
  it("stays silent when a celebrated deck drops out of Complete and returns", () => {
    const sequence = ["Complete", "Building", "Complete"] as const;
    for (const status of sequence) {
      expect(shouldCelebrate({ status, alreadyCelebrated: true })).toBe(false);
    }
  });
});

describe("celebrationKey", () => {
  it("namespaces per deck", () => {
    expect(celebrationKey("abc")).toBe("the99:celebrated:abc");
    expect(celebrationKey("abc")).not.toBe(celebrationKey("def"));
  });
});
