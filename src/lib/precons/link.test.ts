import { describe, expect, it } from "vitest";
import { MAX_SUGGESTIONS, pickerOrder, pickSuggestions, suggestionDismissKey, type PreconMatch } from "./link";

const match = (name: string, shared: number, of: number, sameCommanders: boolean, over: Partial<PreconMatch> = {}): PreconMatch => ({
  fileName: name, name, setCode: "SET", releaseDate: "2024-01-01", commanders: [`${name} Commander`], leadImage: null,
  cards: 100, shared, of, sameCommanders, ...over,
});

describe("pickSuggestions", () => {
  // The addendum's fixtures: Eldrazi Unbound 73/85 same, Counter Intelligence 64/91 swapped,
  // Mutant Menace 41/85 same, Wretched Ranks 13/67 same (no suggestion).
  const eldrazi = match("Eldrazi Unbound", 73, 85, true);
  const counter = match("Counter Intelligence", 64, 91, false);
  const mutant = match("Mutant Menace", 41, 85, true);
  const wretched = match("Wretched Ranks", 13, 67, true);

  it("offers only what the shared rule finds", () => {
    expect(pickSuggestions([wretched], null)).toEqual([]);
    expect(pickSuggestions([counter, wretched], null)).toEqual([counter]);
  });

  it("puts the same commanders first, then the larger share, and stops at two (K15)", () => {
    expect(MAX_SUGGESTIONS).toBe(2);
    // Counter Intelligence's 70% outranks Mutant Menace's 48% on share alone; same commanders win.
    expect(pickSuggestions([counter, mutant, eldrazi], null).map((m) => m.name)).toEqual(["Eldrazi Unbound", "Mutant Menace"]);
    expect(pickSuggestions([counter, mutant], null).map((m) => m.name)).toEqual(["Mutant Menace", "Counter Intelligence"]);
  });

  it("orders two same-commander matches by share, not by count", () => {
    const small = match("Small", 40, 50, true);
    const big = match("Big", 45, 99, true);
    expect(pickSuggestions([big, small], null).map((m) => m.name)).toEqual(["Small", "Big"]);
  });

  it("offers nothing to a linked deck (lock 2)", () => {
    expect(pickSuggestions([eldrazi], "EldraziUnbound_CMM")).toEqual([]);
  });
});

describe("pickerOrder", () => {
  it("lists every precon sharing a card, most shared first (K6)", () => {
    const rows = pickerOrder([match("A", 9, 79, false), match("None", 0, 80, false), match("B", 13, 67, true)]);
    expect(rows.map((m) => m.name)).toEqual(["B", "A"]);
  });
});

describe("suggestionDismissKey", () => {
  it("is per deck AND per precon (G-R3-2)", () => {
    expect(suggestionDismissKey("d1", "A")).not.toBe(suggestionDismissKey("d1", "B"));
    expect(suggestionDismissKey("d1", "A")).not.toBe(suggestionDismissKey("d2", "A"));
  });
});
