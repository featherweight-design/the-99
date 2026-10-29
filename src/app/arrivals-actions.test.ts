// The banner's ✕: writes only keys the reader's own lines give at the press, and nothing with Precons off.
import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({
  env: {} as Record<string, string>,
  lines: vi.fn(),
  mark: vi.fn(),
}));
vi.mock("../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../lib/switches/request", () => ({ requestSwitchEnv: async () => stub.env as NodeJS.ProcessEnv }));
vi.mock("../lib/precons/banner", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/precons/banner")>()),
  readArrivalLines: stub.lines,
}));
vi.mock("../lib/precons/upcoming", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/precons/upcoming")>()),
  markUpcomingSeen: stub.mark,
}));

const about = vi.hoisted(() => ({
  seen: { version: 14, ids: [] as string[] },
  read: vi.fn(),
  mark: vi.fn(),
}));
vi.mock("../lib/about/read", () => ({ aboutSeen: about.read, markAboutVisited: about.mark }));

const { dismissArrivals } = await import("./arrivals-actions");
const { ABOUT_VERSION } = await import("../lib/copy/about");

const NOW = new Date("2026-10-14T12:00:00Z");
const LINES = [
  { kind: "set", code: "trc", name: "Star Trek Commander", releasesOn: "2026-11-13", arrivedAt: NOW },
  { kind: "lists", code: "frc", name: "Reality Fracture Commander", releasesOn: "2026-10-02", arrivedAt: NOW, count: 4 },
];

beforeEach(() => {
  stub.env = { PRECONS_ENABLED: "true" };
  stub.lines.mockReset();
  stub.lines.mockResolvedValue(LINES);
  stub.mark.mockReset();
  about.read.mockReset();
  about.read.mockImplementation(async () => about.seen);
  about.mark.mockReset();
  about.seen = { version: ABOUT_VERSION, ids: [] };
});

describe("dismissArrivals", () => {
  it("marks seen what the page drew, re-read on the server", async () => {
    await dismissArrivals(["trc", "frc", "lists:frc"]);
    expect(stub.lines).toHaveBeenCalledWith("user_1", expect.any(Date));
    expect(stub.mark).toHaveBeenCalledWith("user_1", ["trc", "frc", "lists:frc"]);
  });

  it("never writes a key the reader's lines do not give now", async () => {
    await dismissArrivals(["trc", "mdc", "lists:mdc", "../etc"]);
    expect(stub.mark).toHaveBeenCalledWith("user_1", ["trc"]);
  });

  it("writes nothing when nothing claimed is still there", async () => {
    stub.lines.mockResolvedValue([]);
    await dismissArrivals(["trc"]);
    expect(stub.mark).not.toHaveBeenCalled();
  });

  it("reads and writes nothing with Precons off", async () => {
    stub.env = {};
    await dismissArrivals(["trc"]);
    expect(stub.lines).not.toHaveBeenCalled();
    expect(stub.mark).not.toHaveBeenCalled();
  });
});

// About's half (About visual PR 6b): ✕ writes each launch's ack and raises the floor, re-decided against the reader's
// announcements now, from their own resolved switches.
describe("dismissArrivals, About's lines", () => {
  const LOCK = "decks/your-deck/lock";

  it("writes a launch the reader is still told, by its ack, with the floor", async () => {
    stub.env = { NEVER_CUT_ENABLED: "true" };
    about.seen = { version: ABOUT_VERSION, ids: ["x"] };
    const written = await dismissArrivals([], [LOCK]);
    expect(about.read).toHaveBeenCalledWith("user_1");
    const [, version, ids] = about.mark.mock.calls[0] as unknown as [string, number, string[]];
    expect(ids).toContain(LOCK);
    // The state it leaves goes back to the banner, which acknowledges it (and ends a first run) in this document.
    expect(written).toEqual(expect.arrayContaining(["x", ...ids]));
    expect(version).toBeLessThanOrEqual(ABOUT_VERSION);
    // No arrival keys claimed: the arrival read is not made.
    expect(stub.lines).not.toHaveBeenCalled();
  });

  it("never writes a key the page did not draw, one no longer new, or one switched off for the reader", async () => {
    stub.env = {};
    about.seen = { version: ABOUT_VERSION, ids: ["x"] };
    const answer = await dismissArrivals([], [LOCK, "made/up/key"]);
    expect(answer).not.toContain(LOCK);
    expect(answer).not.toContain("made/up/key");
    expect(about.mark).not.toHaveBeenCalled();
    stub.env = { NEVER_CUT_ENABLED: "true" };
    about.seen = { version: ABOUT_VERSION, ids: ["x", LOCK] };
    await dismissArrivals([], [LOCK]);
    expect(about.mark).not.toHaveBeenCalled();
  });

  // Review round 7: a launch another tab already marked seen writes nothing here, and is still acknowledged.
  it("answers a no-write ✕ with the state the reader holds, so a launch seen in another tab is acknowledged", async () => {
    stub.env = { NEVER_CUT_ENABLED: "true" };
    about.seen = { version: ABOUT_VERSION, ids: ["x", LOCK] };
    const answer = await dismissArrivals([], [LOCK]);
    expect(about.mark).not.toHaveBeenCalled();
    expect(answer).toContain(LOCK);
    expect(answer).toContain("x");
  });

  it("takes both halves in one press", async () => {
    stub.env = { ...stub.env, NEVER_CUT_ENABLED: "true" };
    about.seen = { version: ABOUT_VERSION, ids: ["x"] };
    await dismissArrivals(["trc"], [LOCK]);
    expect(stub.mark).toHaveBeenCalledWith("user_1", ["trc"]);
    expect(about.mark).toHaveBeenCalled();
  });
});
