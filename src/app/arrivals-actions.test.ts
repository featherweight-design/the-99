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

const { dismissArrivals } = await import("./arrivals-actions");

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
