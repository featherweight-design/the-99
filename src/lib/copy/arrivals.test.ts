import { describe, expect, it } from "vitest";

import { arrivalsCopy as copy } from "./arrivals";

describe("arrivalsCopy", () => {
  it("says a set is announced, with its revealed commanders counted", () => {
    expect(copy.announced(0)).toBe(" is announced.");
    expect(copy.announced(1)).toBe(" is announced, with 1 commander revealed.");
    expect(copy.announced(15)).toBe(" is announced, with 15 commanders revealed.");
  });

  it("rolls a set's decklists up into one line", () => {
    expect(copy.listed(1)).toBe(": 1 decklist listed.");
    expect(copy.listed(4)).toBe(": 4 decklists listed.");
  });

  it("heads several arrivals with their count, and caps the rest", () => {
    expect(copy.heading(5)).toBe("5 new in Commander precons");
    expect(copy.more(2)).toBe("and 2 more");
  });

  it("carries no em dash in any string", () => {
    const all = [copy.regionLabel, copy.dismiss, copy.seeOne, copy.seeMany, copy.announced(3), copy.listed(3), copy.heading(3), copy.more(3)];
    for (const s of all) expect(s).not.toContain("—");
  });
});
