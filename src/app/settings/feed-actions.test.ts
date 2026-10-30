// saveFeedKinds' scope (menu and Home PR 4b, review round 1): the write covers the kinds the FORM offered, so a kind
// that came available while the page was open keeps what it had, and nothing outside the offer can be checked.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ available: [] as string[], set: vi.fn(), close: vi.fn(), revalidatePath: vi.fn(), feedOn: true }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "u1" }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: async () => ({}) }));
vi.mock("../../lib/feed/flag", () => ({ homeFeedEnabled: () => m.feedOn, availableFeedKinds: () => m.available }));
vi.mock("../../lib/feed/prefs", async (orig) => ({ ...(await orig<typeof import("../../lib/feed/prefs")>()), setFeedKinds: m.set, closeFeedOffer: m.close }));

import { closeFeedOfferAction, saveFeedKinds } from "./feed-actions";

beforeEach(() => {
  vi.clearAllMocks();
  m.set.mockResolvedValue(true);
  m.close.mockResolvedValue(true);
  m.feedOn = true;
});

describe("saveFeedKinds", () => {
  it("scopes the write to the offered kinds, not to what is available now", async () => {
    m.available = ["new-set", "combo", "price-drop"]; // price-drop came on after the form loaded
    const r = await saveFeedKinds(["combo"], ["new-set", "combo"]);
    expect(r).toEqual({ ok: true, changed: true });
    expect(m.set).toHaveBeenCalledWith("u1", ["combo"], expect.any(Date), ["new-set", "combo"]);
  });

  it("revalidates Settings after a write that changed something, and not after one that did not", async () => {
    m.available = ["combo"];
    await saveFeedKinds(["combo"], ["combo"]);
    expect(m.revalidatePath).toHaveBeenCalledWith("/settings");
    m.revalidatePath.mockClear();
    m.set.mockResolvedValue(false);
    await saveFeedKinds(["combo"], ["combo"]);
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses a checked kind that was not offered, and an offer that is not available", async () => {
    m.available = ["new-set", "combo"];
    expect(await saveFeedKinds(["price-drop"], ["new-set", "combo"])).toEqual({ ok: false, reason: "invalid" });
    expect(await saveFeedKinds(["combo"], ["combo", "price-drop"])).toEqual({ ok: false, reason: "invalid" });
    expect(m.set).not.toHaveBeenCalled();
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("closeFeedOfferAction (the offer's ✕, announcements call 3)", () => {
  it("closes the offer for the caller alone, writing no kind and revalidating nothing", async () => {
    expect(await closeFeedOfferAction()).toEqual({ ok: true, changed: true });
    expect(m.close).toHaveBeenCalledTimes(1);
    expect(m.close).toHaveBeenCalledWith("u1", expect.any(Date));
    expect(m.set).not.toHaveBeenCalled();
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("is refused, writing nothing, while the feed is off for the caller", async () => {
    m.feedOn = false;
    expect(await closeFeedOfferAction()).toEqual({ ok: false, reason: "off" });
    expect(m.close).not.toHaveBeenCalled();
  });
});
