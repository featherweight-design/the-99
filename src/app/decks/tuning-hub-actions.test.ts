import { beforeEach, describe, expect, it, vi } from "vitest";

const order: string[] = [];
vi.mock("../../lib/auth", () => ({ requireUserId: vi.fn(async () => "u1") }));
vi.mock("../../lib/tuning/flag", () => ({ tuningHubEnabled: () => true, hubTools: () => ["suggested", "cuts"] }));
vi.mock("../../lib/tuning/reap-runs", () => ({ reapReaderRuns: vi.fn(async () => { order.push("reap"); }) }));
const readArgs: unknown[][] = [];
vi.mock("../../lib/tuning/hub-read", () => ({ readHubTiles: vi.fn(async (...a: unknown[]) => { order.push("read"); readArgs.push(a); return null; }) }));
vi.mock("../../lib/tuning/history-read", () => ({
  readHistory: vi.fn(async (...a: unknown[]) => { order.push("read"); readArgs.push(a); return { rows: [], nextCursor: null }; }),
  readPastRun: vi.fn(async (...a: unknown[]) => { order.push("read"); readArgs.push(a); return null; }),
}));

import { reapReaderRuns } from "../../lib/tuning/reap-runs";
import { readTuningHistory, readTuningHub, readTuningPastRun } from "./tuning-hub-actions";

const DECK = "00000000-0000-4000-8000-000000000001";

beforeEach(() => { order.length = 0; readArgs.length = 0; vi.mocked(reapReaderRuns).mockClear(); });

describe("the hub's reads reap the reader's abandoned runs before they describe them", () => {
  it.each([
    ["landing", () => readTuningHub(DECK)],
    ["History", () => readTuningHistory(DECK, null, null)],
    ["a past run", () => readTuningPastRun(DECK, `run:${DECK}`)],
  ])("%s", async (_, read) => {
    await read();
    expect(reapReaderRuns).toHaveBeenCalledWith(DECK, "u1", expect.any(Date));
    expect(order).toEqual(["reap", "read"]);
    // The read is shaped at the very instant the reap cut off at.
    const reapedAt = vi.mocked(reapReaderRuns).mock.calls[0][2];
    expect(readArgs.at(-1)!.at(-1)).toBe(reapedAt);
  });

  it("never returns a past run of a tool this deployment does not draw", async () => {
    const { readPastRun } = await import("../../lib/tuning/history-read");
    vi.mocked(readPastRun).mockResolvedValueOnce({ kind: "count", tool: "mana", at: "2026-10-11T12:00:00Z", summary: { kind: "none" } } as never);
    expect(await readTuningPastRun(DECK, `count:${DECK}`)).toBeNull();
    vi.mocked(readPastRun).mockResolvedValueOnce({ kind: "count", tool: "cuts", at: "2026-10-11T12:00:00Z", summary: { kind: "none" } } as never);
    expect(await readTuningPastRun(DECK, `count:${DECK}`)).not.toBeNull();
  });

  it("reaps nothing for an id that is not a deck's", async () => {
    await readTuningHistory("nope", null, null);
    expect(reapReaderRuns).not.toHaveBeenCalled();
  });
});
