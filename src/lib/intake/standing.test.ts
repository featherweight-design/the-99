import { describe, expect, it } from "vitest";

import { bareStanding, closedBy, formLine } from "./standing";

const base = { used: 1, limit: 5, nextAt: "2026-10-12T02:01:00.000Z", reopensAt: null, paused: null, ownerShare: false, now: "2026-10-11T12:00:00.000Z" };

describe("the form's credit line", () => {
  it("closes paused first, then the owner's share, then spent", () => {
    expect(closedBy({ ...base, used: 5, ownerShare: true, paused: "2026-11-01T00:00:00.000Z" })).toBe("paused");
    expect(closedBy({ ...base, used: 5, ownerShare: true })).toBe("ownerShare");
    expect(closedBy({ ...base, used: 5 })).toBe("spent");
    expect(closedBy(base)).toBeNull();
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
