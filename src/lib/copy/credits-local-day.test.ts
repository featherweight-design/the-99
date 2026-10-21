// The welcome expiry is dated in the reader's own day (welcome credits G4, the orchestrator's ruling 4: stored in UTC,
// shown as the player's local day). Every other credits test runs at noon UTC, where any zone within 11 hours reads
// the same day, so this one pins a zone and an instant on either side of UTC midnight.

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { creditsCopy, localDay } from "./credits";

// 03:00 UTC on Nov 20 is 8:00 PM on Nov 19 in Denver; 23:00 UTC on Nov 19 is 9:00 AM on Nov 20 in Sydney.
const EARLY_UTC = new Date("2026-11-20T03:00:00Z");
const LATE_UTC = new Date("2026-11-19T23:00:00Z");

describe("localDay", () => {
  let tz: string | undefined;
  beforeEach(() => {
    tz = process.env.TZ;
  });
  afterEach(() => {
    if (tz === undefined) delete process.env.TZ;
    else process.env.TZ = tz;
  });

  it("names the evening US reader's own day, never tomorrow's", () => {
    process.env.TZ = "America/Denver";
    expect(localDay(EARLY_UTC)).toBe("Nov 19");
    expect(creditsCopy.welcomeExpiring(9, EARLY_UTC)).toBe("9 welcome credits expire Nov 19");
  });

  it("names the morning reader's own day east of UTC", () => {
    process.env.TZ = "Australia/Sydney";
    expect(localDay(LATE_UTC)).toBe("Nov 20");
  });

  it("leaves the plan's expiry in UTC, as shipped", () => {
    process.env.TZ = "America/Denver";
    expect(creditsCopy.expiring(2, EARLY_UTC)).toBe("2 plan credits expire Nov 20");
  });
});
