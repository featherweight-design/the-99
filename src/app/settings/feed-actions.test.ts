// saveFeedKinds' scope (menu and Home PR 4b, review round 1): the write covers the kinds the FORM offered, so a kind
// that came available while the page was open keeps what it had, and nothing outside the offer can be checked.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ available: [] as string[], set: vi.fn() }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "u1" }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: async () => ({}) }));
vi.mock("../../lib/feed/flag", () => ({ homeFeedEnabled: () => true, availableFeedKinds: () => m.available }));
vi.mock("../../lib/feed/prefs", async (orig) => ({ ...(await orig<typeof import("../../lib/feed/prefs")>()), setFeedKinds: m.set }));

import { saveFeedKinds } from "./feed-actions";

beforeEach(() => {
  vi.clearAllMocks();
  m.set.mockResolvedValue(true);
});

describe("saveFeedKinds", () => {
  it("scopes the write to the offered kinds, not to what is available now", async () => {
    m.available = ["new-set", "combo", "price-drop"]; // price-drop came on after the form loaded
    const r = await saveFeedKinds(["combo"], ["new-set", "combo"]);
    expect(r).toEqual({ ok: true, changed: true });
    expect(m.set).toHaveBeenCalledWith("u1", ["combo"], expect.any(Date), ["new-set", "combo"]);
  });

  it("refuses a checked kind that was not offered, and an offer that is not available", async () => {
    m.available = ["new-set", "combo"];
    expect(await saveFeedKinds(["price-drop"], ["new-set", "combo"])).toEqual({ ok: false, reason: "invalid" });
    expect(await saveFeedKinds(["combo"], ["combo", "price-drop"])).toEqual({ ok: false, reason: "invalid" });
    expect(m.set).not.toHaveBeenCalled();
  });
});
