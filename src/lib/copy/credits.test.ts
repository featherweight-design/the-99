import { describe, expect, it } from "vitest";

import { clockTime, creditsCopy } from "./credits";

describe("the spend cap's copy", () => {
  it("names the month a pause lifts in, read in UTC", () => {
    // 00:00 UTC on October 1 is still September 30 in every US clock: the name must be October.
    expect(creditsCopy.paused(new Date("2026-10-01T00:00:00Z"))).toBe(
      "Paused until October 1. The app has reached its monthly limit for deeper looks, suggestions and overviews. Nothing you did caused this.",
    );
  });

  it("names the owner's month", () => {
    expect(creditsCopy.ownerShare(new Date("2026-09-24T12:00:00Z"))).toBe(
      "You’ve used your testing share for September. Friends aren’t affected.",
    );
  });

  it("has a server twin with no date in it", () => {
    expect(creditsCopy.pausedServer).toBe("Paused until the 1st of next month. Nothing you did caused this.");
  });

  // ONE FORMAT: the overview composes its own leads around `standing`, so `first` and `again`
  // must be built from the very same line or the two surfaces drift apart.
  it("exports standing, and first and again compose from it", () => {
    const next = new Date("2026-09-24T14:20:00");
    expect(creditsCopy.standing(4, 5, next)).toBe(`4 of 5 left · next one at ${clockTime(next)}`);
    expect(creditsCopy.standing(5, 5, null)).toBe("5 of 5 left");
    expect(creditsCopy.first(4, 5, next)).toBe(`Uses a credit. ${creditsCopy.standing(4, 5, next)}.`);
    expect(creditsCopy.again(4, 5, next)).toContain(creditsCopy.standing(4, 5, next));
  });

  it("composes paused from its reason, so the reason is said in one place", () => {
    const until = new Date("2026-10-01T00:00:00Z");
    expect(creditsCopy.paused(until)).toBe(`Paused until October 1. ${creditsCopy.pausedReason}`);
  });
});
