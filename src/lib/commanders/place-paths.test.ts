import { describe, expect, it } from "vitest";
import { atPlace, choosePath, discoverPath } from "./place-paths";

describe("place paths", () => {
  it("name the tabs on the place and today's addresses off it", () => {
    expect(choosePath(true)).toBe("/commanders/choose");
    expect(choosePath(false)).toBe("/decks/new/choose");
    expect(discoverPath(true)).toBe("/commanders/discover");
    expect(discoverPath(false)).toBe("/discover");
  });
  it("moves only a tool's Help me choose address, and only on the place", () => {
    expect(atPlace("/decks/new/choose", true)).toBe("/commanders/choose");
    expect(atPlace("/decks/new/choose", false)).toBe("/decks/new/choose");
    expect(atPlace("/friends", true)).toBe("/friends");
  });
});
