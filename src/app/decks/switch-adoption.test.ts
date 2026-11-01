// Admin PR 5 (actions and routes) and 6a (pages, layouts, the page cache): a server action decides its
// switch from the READER's resolved env (`requestSwitchEnv`),
// not from `process.env` alone. Proved on Home's check-in, whose guard is `FEEDBACK_ENABLED` (the synopsis reads, guarded
// by `ANALYSIS_TAB_ENABLED`, were the proof until that switch retired, always on): the environment has it off and the
// reader's override turns it on, so an action reading the environment would refuse and one reading the resolved env goes
// through.
import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({
  override: {} as Record<string, string>,
  resolvedFor: [] as string[],
  reads: [] as string[],
}));

vi.mock("../../lib/switches/request", () => ({
  requestSwitchEnv: vi.fn(async (userId: string) => {
    stub.resolvedFor.push(userId);
    return { ...stub.override };
  }),
}));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user-1" }));
vi.mock("../../db", () => ({ db: { transaction: async () => (stub.reads.push("check-in"), true) } }));

const { checkInDue } = await import("../check-in-actions");

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FEEDBACK_ENABLED", "false");
  stub.override = {};
  stub.resolvedFor = [];
  stub.reads = [];
});

describe("an action reads the reader's resolved switches", () => {
  it("goes through when the reader's override turns on a switch the environment has off", async () => {
    stub.override = { FEEDBACK_ENABLED: "true" };
    expect(await checkInDue()).toBe(true);
    expect(stub.reads).toEqual(["check-in"]);
    // Resolved for the signed-in reader, once per action.
    expect(stub.resolvedFor).toEqual(["user-1"]);
  });

  it("refuses when the resolved env leaves the switch off", async () => {
    expect(await checkInDue()).toBe(false);
    expect(stub.reads).toEqual([]);
  });
});
