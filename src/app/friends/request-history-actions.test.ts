import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_viewer" }));
vi.mock("../../lib/social/request-history", async (orig) => ({ ...(await orig<typeof import("../../lib/social/request-history")>()), loadRequestHistory: m.load }));

import { loadMoreHistoryAction } from "./request-history-actions";

const GOOD = { createdAt: "2026-11-01T10:00:00.123456Z", id: "1b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b" };
beforeEach(() => m.load.mockReset().mockResolvedValue({ entries: [], next: null }));

describe("loadMoreHistoryAction", () => {
  it("reads the viewer's own history after a well-formed cursor, in the named direction", async () => {
    await loadMoreHistoryAction("received", GOOD);
    expect(m.load).toHaveBeenCalledWith("user_viewer", "received", GOOD);
    await loadMoreHistoryAction("anything else", GOOD);
    expect(m.load).toHaveBeenLastCalledWith("user_viewer", "asked", GOOD);
  });

  it("refuses a missing or malformed cursor with an empty page and reads nothing", async () => {
    for (const bad of [null, "x", { createdAt: "yesterday", id: GOOD.id }, { createdAt: GOOD.createdAt, id: "'; drop" }, { createdAt: 1, id: 2 }]) {
      expect(await loadMoreHistoryAction("asked", bad)).toEqual({ entries: [], next: null });
    }
    expect(m.load).not.toHaveBeenCalled();
  });
});
