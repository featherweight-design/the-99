import { describe, expect, it } from "vitest";
import { countParts } from "./count-parts";

describe("countParts", () => {
  it("cuts a copy string around the first reading of its number", () => {
    expect(countParts("312 of 1,284", 312)).toEqual({ before: "", after: " of 1,284", grouped: true });
    expect(countParts("1,284 cards · read today", 1284)).toEqual({ before: "", after: " cards · read today", grouped: true });
    expect(countParts("18 · $94.80", 18)).toEqual({ before: "", after: " · $94.80", grouped: true });
    expect(countParts("about 42 cards", 42)).toEqual({ before: "about ", after: " cards", grouped: true });
  });
  it("reads a count the copy left ungrouped, and never takes a money figure for it", () => {
    expect(countParts("1000 · $94.80", 1000)).toEqual({ before: "", after: " · $94.80", grouped: false });
    expect(countParts("1000 cards", 1000)).toEqual({ before: "", after: " cards", grouped: false });
    expect(countParts("1000 · $1,000.00", 1000)).toEqual({ before: "", after: " · $1,000.00", grouped: false });
  });
  it("returns no words when the number is not in the string", () => {
    expect(countParts("none", 5)).toEqual({ before: "", after: "", grouped: true });
  });
});
