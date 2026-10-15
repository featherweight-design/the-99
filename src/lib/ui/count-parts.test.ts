import { describe, expect, it } from "vitest";
import { countParts } from "./count-parts";

describe("countParts", () => {
  it("cuts a copy string around the first reading of its number", () => {
    expect(countParts("312 of 1,284", 312)).toEqual({ before: "", after: " of 1,284" });
    expect(countParts("1,284 cards · read today", 1284)).toEqual({ before: "", after: " cards · read today" });
    expect(countParts("18 · $94.80", 18)).toEqual({ before: "", after: " · $94.80" });
    expect(countParts("about 42 cards", 42)).toEqual({ before: "about ", after: " cards" });
  });
  it("returns no words when the number is not in the string", () => {
    expect(countParts("none", 5)).toEqual({ before: "", after: "" });
  });
});
