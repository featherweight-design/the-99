import { describe, expect, it } from "vitest";

import { bareStanding, closedBy, formLine, standingLine } from "./standing";

const base = { used: 1, limit: 5, nextAt: "2026-10-12T02:01:00.000Z", reopensAt: null, paused: null, ownerShare: false, now: "2026-10-11T12:00:00.000Z" };

describe("the form's credit line", () => {
  it("closes paused first, then the owner's share, then spent", () => {
    expect(closedBy({ ...base, used: 5, ownerShare: true, paused: "2026-11-01T00:00:00.000Z" })).toBe("paused");
    expect(closedBy({ ...base, used: 5, ownerShare: true })).toBe("ownerShare");
    expect(closedBy({ ...base, used: 5 })).toBe("spent");
    expect(closedBy(base)).toBeNull();
    // A paid lot keeps the press open once the free allowance is spent, behind the cap's two states.
    expect(closedBy({ ...base, used: 5, plan: 2 })).toBeNull();
    expect(closedBy({ ...base, used: 5, plan: 2, ownerShare: true })).toBe("ownerShare");
    // Open on a paid lot with more units out than the limit: the free count never reads below zero.
    expect(standingLine({ ...base, used: 7, pack: 3 })).not.toMatch(/-\d/);
  });

  it("names when a credit comes back as the results do: the oldest unit's leaving, past the limit", () => {
    const over = { ...base, used: 6, nextAt: "2026-10-12T01:00:00.000Z", reopensAt: "2026-10-12T03:00:00.000Z" };
    expect(formLine(over)).toMatch(/^Won’t be read: 0 of 5 left · reset at /);
    expect(formLine(over)).toBe(formLine({ ...over, nextAt: over.reopensAt }));
    expect(formLine(over)).not.toBe(formLine({ ...over, reopensAt: null }));
  });

  it("never counts below zero, and names the oldest unit's leaving, on every bare line (7l)", () => {
    const over = { ...base, used: 6, nextAt: "2026-10-12T01:00:00.000Z", reopensAt: "2026-10-12T03:00:00.000Z" };
    expect(bareStanding(over)).toMatch(/^0 of 5 left · reset at /);
    expect(bareStanding(over)).toBe(bareStanding({ ...over, used: 5, nextAt: over.reopensAt }));
  });
});
