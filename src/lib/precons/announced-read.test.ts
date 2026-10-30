import { beforeEach, describe, expect, it, vi } from "vitest";

const reads = vi.hoisted(() => ({ early: vi.fn(async () => ({ fdc: { lists: [], promised: null } })), seen: vi.fn(async () => ["early:fdc:1"]) }));
vi.mock("./upcoming", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./upcoming")>()),
  loadUpcomingSets: vi.fn(async () => [{ code: "fdc", name: "Foundations Commander", releasesOn: "2026-11-13", released: false, cardCount: 40, parentName: null, arrivedAt: null, seen: false }]),
}));
vi.mock("./arrivals-read", () => ({ loadPreconArrivals: vi.fn(async () => []) }));
vi.mock("./revealed", () => ({ loadRevealedCommanders: vi.fn(async () => ({})) }));
vi.mock("../announcements/early-tiles-read", () => ({ loadEarlyListsBySet: reads.early, loadEarlySeen: reads.seen }));

import { loadUpcomingPayload } from "./announced-read";

const now = new Date("2026-10-14T12:00:00Z");

describe("loadUpcomingPayload: early lists behind ANNOUNCEMENTS_ENABLED", () => {
  beforeEach(() => { reads.early.mockClear(); reads.seen.mockClear(); });

  it("reads no early list and no early seen key with the switch off", async () => {
    const payload = await loadUpcomingPayload("u1", now, { ANNOUNCEMENTS_ENABLED: "false" } as unknown as NodeJS.ProcessEnv);
    expect(reads.early).not.toHaveBeenCalled();
    expect(reads.seen).not.toHaveBeenCalled();
    expect(payload.early).toEqual({});
    expect(payload.earlySeen).toEqual([]);
  });

  it("reads both with the switch on", async () => {
    const payload = await loadUpcomingPayload("u1", now, { ANNOUNCEMENTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv);
    expect(reads.early).toHaveBeenCalledOnce();
    expect(payload.early).toEqual({ fdc: { lists: [], promised: null } });
    expect(payload.earlySeen).toEqual(["early:fdc:1"]);
  });
});
