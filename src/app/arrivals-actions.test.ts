// The banner's ✕: writes only keys the reader's own lines give at the press, and nothing with the switch off.
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
  stub.env = { PRECONS_ENABLED: "true", UPCOMING_PRECONS_ENABLED: "true" };
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

  it("reads and writes nothing with the switch off", async () => {
    stub.env = { PRECONS_ENABLED: "true" };
    await dismissArrivals(["trc"]);
    expect(stub.lines).not.toHaveBeenCalled();
    expect(stub.mark).not.toHaveBeenCalled();
  });
});

// About's half (About on the banner, Q2): ✕ writes About's seen, re-decided against the reader's notice now.
describe("dismissArrivals, About's line", () => {
  const ABOUT_ON = { ABOUT_SHEET_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true", NEVER_CUT_ENABLED: "true" };

  it("writes the drawn ids the reader's notice still names, as a visit writes them", async () => {
    stub.env = ABOUT_ON;
    await dismissArrivals([], ["change-commander"]);
    expect(about.read).toHaveBeenCalledWith("user_1");
    expect(about.mark).toHaveBeenCalledWith("user_1", ABOUT_VERSION, ["change-commander"]);
    // No arrival keys claimed: the arrival read is not made.
    expect(stub.lines).not.toHaveBeenCalled();
  });

  it("never writes an id the page did not draw, nor one no longer new", async () => {
    stub.env = ABOUT_ON;
    about.seen = { version: ABOUT_VERSION, ids: ["locked-cards"] };
    // `locked-cards` is already met; `notes` is behind a switch that is off; neither is written.
    await dismissArrivals([], ["change-commander", "locked-cards", "notes", "how-it-works"]);
    expect(about.mark).toHaveBeenCalledWith("user_1", ABOUT_VERSION, ["change-commander"]);
  });

  it("writes nothing when the reader is already current", async () => {
    stub.env = ABOUT_ON;
    about.seen = { version: ABOUT_VERSION, ids: ["change-commander", "locked-cards"] };
    await dismissArrivals([], ["change-commander"]);
    expect(about.mark).not.toHaveBeenCalled();
  });

  it("takes both halves in one press", async () => {
    stub.env = { ...stub.env, ...ABOUT_ON };
    await dismissArrivals(["trc"], ["locked-cards"]);
    expect(stub.mark).toHaveBeenCalledWith("user_1", ["trc"]);
    expect(about.mark).toHaveBeenCalledWith("user_1", ABOUT_VERSION, ["locked-cards"]);
  });

  it("reads and writes nothing for About with its switch off", async () => {
    stub.env = { CHANGE_COMMANDER_ENABLED: "true" };
    await dismissArrivals([], ["change-commander"]);
    expect(about.read).not.toHaveBeenCalled();
    expect(about.mark).not.toHaveBeenCalled();
  });
});
