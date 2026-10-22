import { describe, expect, it } from "vitest";

import { CATALOG_KINDS, FEED_KINDS, FEED_WINDOW_DAYS, LEAD_PRIORITY, STORED_KINDS, feedOrder, isFeedKind, isStoredKind, leadStory, windowFloor, type FeedKind } from "./kinds";

const at = (iso: string) => new Date(iso);
const item = (kind: FeedKind, iso: string, unseen = true, key = `${kind}:${iso}`) => ({ kind, createdAt: at(iso), unseen, key });

describe("the feed's kinds", () => {
  it("is the closed set of six the board draws, split into catalog and stored with nothing left over", () => {
    expect([...FEED_KINDS].sort()).toEqual(["combo", "new-precon", "new-set", "price-drop", "spare-request", "trade-match"]);
    expect([...CATALOG_KINDS, ...STORED_KINDS].sort()).toEqual([...FEED_KINDS].sort());
    expect(isFeedKind("combo")).toBe(true);
    expect(isFeedKind("news")).toBe(false);
    expect(isFeedKind(undefined)).toBe(false);
    expect(isStoredKind("new-set")).toBe(false);
    expect(isStoredKind("trade-match")).toBe(true);
  });

  it("orders the lead story spare request, trade match, combo, price drop, precon, set (the board's rule)", () => {
    expect(LEAD_PRIORITY).toEqual(["spare-request", "trade-match", "combo", "price-drop", "new-precon", "new-set"]);
    expect([...LEAD_PRIORITY].sort()).toEqual([...FEED_KINDS].sort());
  });
});

describe("leadStory", () => {
  it("takes the first UNSEEN item by priority, not the newest", () => {
    const lead = leadStory([item("new-set", "2026-10-22T10:00:00Z"), item("combo", "2026-10-20T10:00:00Z"), item("trade-match", "2026-10-19T10:00:00Z", false)]);
    expect(lead?.kind).toBe("combo");
  });

  it("takes the newest within a kind, and nothing when every item is seen", () => {
    const lead = leadStory([item("price-drop", "2026-10-20T10:00:00Z"), item("price-drop", "2026-10-21T10:00:00Z")]);
    expect(lead?.createdAt.toISOString()).toBe("2026-10-21T10:00:00.000Z");
    expect(leadStory([item("combo", "2026-10-20T10:00:00Z", false)])).toBeNull();
  });
});

describe("feedOrder", () => {
  it("puts what waits on the reader first, then newest, then by key", () => {
    const list = [
      item("new-set", "2026-10-20T10:00:00Z", true, "b"),
      item("combo", "2026-10-21T10:00:00Z"),
      item("spare-request", "2026-10-01T10:00:00Z"),
      item("new-precon", "2026-10-20T10:00:00Z", true, "a"),
    ].sort(feedOrder);
    expect(list.map((i) => i.kind)).toEqual(["spare-request", "combo", "new-precon", "new-set"]);
  });
});

describe("windowFloor", () => {
  it("is fourteen days before now", () => {
    expect(FEED_WINDOW_DAYS).toBe(14);
    expect(windowFloor(at("2026-10-22T12:00:00Z")).toISOString()).toBe("2026-10-08T12:00:00.000Z");
  });
});
