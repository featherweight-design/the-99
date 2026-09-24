import { describe, expect, it } from "vitest";

import { creditsCopy } from "./credits";

describe("the spend cap's copy", () => {
  it("names the month a pause lifts in, read in UTC", () => {
    // 00:00 UTC on October 1 is still September 30 in every US clock: the name must be October.
    expect(creditsCopy.paused(new Date("2026-10-01T00:00:00Z"))).toBe(
      "Paused until October 1. The app has reached its monthly limit for suggestions and overviews. Nothing you did caused this.",
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
});
