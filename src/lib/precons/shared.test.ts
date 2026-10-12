import { describe, expect, it } from "vitest";
import { sharedWith, SHARED_ANY_COMMANDERS, SHARED_SAME_COMMANDERS } from "./shared";

const ids = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);
const precon = { cards: new Set(["cmd", ...ids("c", 99)]), commanders: ["cmd"] };
const deck = (held: number, commanders = ["cmd"]) => ({
  cards: new Set([...commanders, ...ids("c", held - 1), ...ids("other", 100 - held)]),
  commanders,
});

describe("sharedWith", () => {
  it("shares at 40% under the precon's own commander, not below", () => {
    expect(SHARED_SAME_COMMANDERS).toBe(0.4);
    expect(sharedWith(precon, deck(40))).toEqual({ shared: 40, sameCommanders: true });
    expect(sharedWith(precon, deck(39))).toBeNull();
  });

  it("needs 60% under another commander", () => {
    expect(SHARED_ANY_COMMANDERS).toBe(0.6);
    const swapped = (held: number) => ({ cards: new Set([...ids("c", held), "kilo"]), commanders: ["kilo"] });
    expect(sharedWith(precon, swapped(60))).toEqual({ shared: 60, sameCommanders: false });
    expect(sharedWith(precon, swapped(59))).toBeNull();
  });

  it("calls a partner pair the same only when both commanders match", () => {
    const pair = { cards: new Set(["a", "b", ...ids("c", 98)]), commanders: ["a", "b"] };
    const one = { cards: new Set(["a", ...ids("c", 45)]), commanders: ["a"] };
    expect(sharedWith(pair, one)).toBeNull();
    const both = { cards: new Set(["b", "a", ...ids("c", 45)]), commanders: ["b", "a"] };
    expect(sharedWith(pair, both)?.sameCommanders).toBe(true);
  });

  it("never shares an empty precon", () => {
    expect(sharedWith({ cards: new Set(), commanders: [] }, deck(100))).toBeNull();
  });
});
