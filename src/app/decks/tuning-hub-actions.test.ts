import { beforeEach, describe, expect, it, vi } from "vitest";

const order: string[] = [];
vi.mock("../../lib/auth", () => ({ requireUserId: vi.fn(async () => "u1") }));
vi.mock("../../lib/tuning/flag", () => ({ tuningHubEnabled: () => true, hubTools: () => ["suggested", "cuts"] }));
vi.mock("../../lib/tuning/reap-runs", () => ({ reapReaderRuns: vi.fn(async () => { order.push("reap"); }) }));
vi.mock("../../lib/tuning/hub-read", () => ({ readHubTiles: vi.fn(async () => { order.push("read"); return null; }) }));
vi.mock("../../lib/tuning/history-read", () => ({
  readHistory: vi.fn(async () => { order.push("read"); return { rows: [], nextCursor: null }; }),
  readPastRun: vi.fn(async () => { order.push("read"); return null; }),
}));

import { reapReaderRuns } from "../../lib/tuning/reap-runs";
import { readTuningHistory, readTuningHub, readTuningPastRun } from "./tuning-hub-actions";

const DECK = "00000000-0000-4000-8000-000000000001";

beforeEach(() => { order.length = 0; vi.mocked(reapReaderRuns).mockClear(); });

describe("the hub's reads reap the reader's abandoned runs before they describe them", () => {
  it.each([
    ["landing", () => readTuningHub(DECK)],
    ["History", () => readTuningHistory(DECK, null, null)],
    ["a past run", () => readTuningPastRun(DECK, `run:${DECK}`)],
  ])("%s", async (_, read) => {
    await read();
    expect(reapReaderRuns).toHaveBeenCalledWith(DECK, "u1");
    expect(order).toEqual(["reap", "read"]);
  });

  it("reaps nothing for an id that is not a deck's", async () => {
    await readTuningHistory("nope", null, null);
    expect(reapReaderRuns).not.toHaveBeenCalled();
  });
});
