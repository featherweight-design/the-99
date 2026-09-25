import { describe, expect, it } from "vitest";
import { commandersCopy, discoverCopy, filterCopy } from "./lanes";

describe("filterCopy", () => {
  it("pluralises the sheet's dismiss label and groups the thousands", () => {
    expect(filterCopy.sheet.dismiss(1)).toBe("Show 1 commander");
    expect(filterCopy.sheet.dismiss(3301)).toBe("Show 3,301 commanders");
  });

  it("collapses colours past one pip rather than naming each hue", () => {
    expect(filterCopy.colour.collapsed(2)).toBe("2 colors");
  });

  it("states what Exactly costs, in rows", () => {
    expect(filterCopy.match.excludedAside(6)).toBe("Exactly excludes 6 that Any would show");
  });
});

describe("commandersCopy", () => {
  it("states the owned lane at rest rather than printing a ratio", () => {
    expect(commandersCopy.result.rest(148)).toBe("148 commanders you own and haven't built");
    expect(commandersCopy.result.rest(1)).toBe("1 commander you own and haven't built");
  });

  it("prints a ratio only once something is filtered", () => {
    expect(commandersCopy.result.filtered(4, 148)).toBe("4 of 148 commanders match");
  });
});

describe("discoverCopy", () => {
  it("offers Recently released as its third order, and no colour order", () => {
    expect(discoverCopy.order.recent).toBe("Recently released");
    expect("colour" in discoverCopy.order).toBe(false);
  });

  it("names the lane boundary in the zero state", () => {
    expect(discoverCopy.empty.body("jodah", 3301)).toContain("it's on your commanders instead");
  });
});

// The locale is pinned, so a four-digit count must never reach a surface ungrouped. Pins the
// class rather than one string: a count-taking function added without `n()` fails here.
describe("locale formatting", () => {
  it("groups every four-digit count across the three blocks", () => {
    expect(filterCopy.sheet.dismiss(3301)).toContain("3,301");
    expect(commandersCopy.result.rest(1234)).toContain("1,234");
    expect(commandersCopy.result.filtered(1234, 5678)).toContain("5,678");
    expect(discoverCopy.result.rest(1234)).toContain("1,234");
    expect(discoverCopy.row.popularity(1234)).toContain("1,234");
    expect(discoverCopy.empty.body("jodah", 3301)).toContain("3,301");
  });
});
