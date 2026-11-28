import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ clear: vi.fn(), restore: vi.fn() }));
vi.mock("../../app/feed-dismiss-actions", () => ({ clearFeedItemsAction: m.clear, restoreFeedItemsAction: m.restore }));

import { CLEAR_ALL_MAX } from "../../lib/social/feed-dismiss-limits";
import { clearInSlices, restoreInSlices, slices } from "./clear-slices";

const keys = (n: number) => Array.from({ length: n }, (_, i) => `item:k${i}`);

beforeEach(() => {
  m.clear.mockReset();
  m.restore.mockReset();
});

describe("clearInSlices (a rolled trade match can stand for more items than one write takes)", () => {
  it("cuts the keys into writes of at most CLEAR_ALL_MAX, in order", () => {
    expect(slices(keys(CLEAR_ALL_MAX)).map((s) => s.length)).toEqual([CLEAR_ALL_MAX]);
    expect(slices(keys(CLEAR_ALL_MAX * 2 + 1)).map((s) => s.length)).toEqual([CLEAR_ALL_MAX, CLEAR_ALL_MAX, 1]);
    expect(slices([])).toEqual([]);
  });

  it("writes every slice and returns every key the writes newly cleared", async () => {
    m.clear.mockImplementation(async (s: string[]) => ({ ok: true, cleared: s.slice(0, 1) }));
    const all = keys(CLEAR_ALL_MAX + 5);
    expect(await clearInSlices(all)).toEqual({ ok: true, cleared: [all[0], all[CLEAR_ALL_MAX]] });
    expect(m.clear.mock.calls.map(([s]) => s.length)).toEqual([CLEAR_ALL_MAX, 5]);
  });

  it("stops at the first refusal and returns it", async () => {
    m.clear.mockResolvedValueOnce({ ok: false, reason: "invalid" });
    expect(await clearInSlices(keys(CLEAR_ALL_MAX + 5))).toEqual({ ok: false, reason: "invalid" });
    expect(m.clear).toHaveBeenCalledTimes(1);
  });

  it("restores slice by slice, stopping at the first refusal", async () => {
    m.restore.mockResolvedValue({ ok: true });
    expect(await restoreInSlices(keys(CLEAR_ALL_MAX + 1))).toEqual({ ok: true });
    expect(m.restore).toHaveBeenCalledTimes(2);
    m.restore.mockReset();
    m.restore.mockResolvedValueOnce({ ok: false, reason: "off" });
    expect(await restoreInSlices(keys(CLEAR_ALL_MAX + 1))).toEqual({ ok: false, reason: "off" });
    expect(m.restore).toHaveBeenCalledTimes(1);
  });
});
