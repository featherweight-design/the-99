import { describe, expect, it } from "vitest";

import {
  ANNOUNCEMENT_KINDS, CATALOG_KINDS, DEFAULT_ON_KINDS, FEED_KINDS, FEED_WINDOW_DAYS, LEAD_PRIORITY, NEVER_LEADS, PUSH_OUTBOX_ALL_KINDS, PUSH_OUTBOX_KINDS, SEAT_PUSH_KIND, STORED_KINDS,
  feedOrder, isAnnouncementKind, isDefaultOn, isFeedKind, isStoredKind, leadStory, windowFloor, type FeedKind,
} from "./kinds";

const at = (iso: string) => new Date(iso);
const item = (kind: FeedKind, iso: string, unseen = true, key = `${kind}:${iso}`) => ({ kind, createdAt: at(iso), unseen, key });

describe("the feed's kinds", () => {
  it("is the closed set of nine, split into catalog and stored with nothing left over", () => {
    expect([...FEED_KINDS].sort()).toEqual([
      "combo", "commander-decklists", "new-precon", "new-set", "price-drop", "secret-lair", "spare-request", "trade-match", "wizards-news",
    ]);
    expect([...CATALOG_KINDS, ...STORED_KINDS].sort()).toEqual([...FEED_KINDS].sort());
    expect(isFeedKind("combo")).toBe(true);
    expect(isFeedKind("news")).toBe(false);
    expect(isFeedKind(undefined)).toBe(false);
    expect(isStoredKind("new-set")).toBe(false);
    expect(isStoredKind("trade-match")).toBe(true);
  });

  it("orders the lead story by the boards' rule, every kind once there or in NEVER_LEADS", () => {
    expect(LEAD_PRIORITY).toEqual(["spare-request", "trade-match", "combo", "price-drop", "commander-decklists", "new-precon", "new-set", "secret-lair"]);
    expect(NEVER_LEADS).toEqual(["wizards-news"]);
    expect([...LEAD_PRIORITY, ...NEVER_LEADS].sort()).toEqual([...FEED_KINDS].sort());
  });

  it("makes the Announcements kinds catalog family and default on, after New precons in Settings' order", () => {
    for (const k of ANNOUNCEMENT_KINDS) {
      expect(CATALOG_KINDS).toContain(k);
      expect(isDefaultOn(k)).toBe(true);
      expect(isAnnouncementKind(k)).toBe(true);
    }
    expect(DEFAULT_ON_KINDS).toEqual(["spare-request", "secret-lair", "commander-decklists", "wizards-news"]);
    expect(isDefaultOn("new-set")).toBe(false);
    expect(isAnnouncementKind("new-set")).toBe(false);
    expect(FEED_KINDS.slice(0, 5)).toEqual(["new-set", "new-precon", "secret-lair", "commander-decklists", "wizards-news"]);
  });

  it("keeps the outbox's kinds every feed kind, in the order migration 0193's check was generated in", () => {
    expect([...PUSH_OUTBOX_KINDS].sort()).toEqual([...FEED_KINDS].sort());
    expect(PUSH_OUTBOX_KINDS).toEqual(["new-set", "new-precon", "price-drop", "trade-match", "spare-request", "combo", "secret-lair", "commander-decklists", "wizards-news"]);
  });
});

describe("the seat notice's push kind (Rule 0 revisions, item 6)", () => {
  it("is an outbox kind and NOT a feed kind: no feed row, no Settings checkbox, no preference key", () => {
    expect(SEAT_PUSH_KIND).toBe("rule_zero_seat");
    expect(PUSH_OUTBOX_ALL_KINDS).toEqual([...PUSH_OUTBOX_KINDS, "rule_zero_seat"]);
    expect((FEED_KINDS as readonly string[]).includes(SEAT_PUSH_KIND)).toBe(false);
    expect((PUSH_OUTBOX_KINDS as readonly string[]).includes(SEAT_PUSH_KIND)).toBe(false);
    expect(isFeedKind(SEAT_PUSH_KIND)).toBe(false);
    expect(isStoredKind(SEAT_PUSH_KIND)).toBe(false);
    expect(LEAD_PRIORITY.includes(SEAT_PUSH_KIND as never)).toBe(false);
  });
});

describe("leadStory", () => {
  it("lets a decklists post lead ahead of a precon, and a Secret Lair drop only behind a set", () => {
    expect(leadStory([item("new-precon", "2026-10-22T10:00:00Z"), item("commander-decklists", "2026-10-20T10:00:00Z")])?.kind).toBe("commander-decklists");
    expect(leadStory([item("secret-lair", "2026-10-22T10:00:00Z"), item("new-set", "2026-10-20T10:00:00Z")])?.kind).toBe("new-set");
    expect(leadStory([item("secret-lair", "2026-10-22T10:00:00Z")])?.kind).toBe("secret-lair");
  });

  it("never leads with Wizards news, even alone, and passes it over for anything else", () => {
    expect(leadStory([item("wizards-news", "2026-10-22T10:00:00Z")])).toBeNull();
    // First in the list, so a rule that only skipped it when comparing would still seat it as the first best.
    expect(leadStory([item("wizards-news", "2026-10-22T10:00:00Z"), item("secret-lair", "2026-10-20T10:00:00Z")])?.kind).toBe("secret-lair");
  });

  it("sorts a kind missing from LEAD_PRIORITY LAST, never first (indexOf's -1)", () => {
    const stray = item("stray" as FeedKind, "2026-10-22T10:00:00Z");
    expect(leadStory([stray, item("secret-lair", "2026-10-20T10:00:00Z")])?.kind).toBe("secret-lair");
    expect(leadStory([item("secret-lair", "2026-10-20T10:00:00Z"), stray])?.kind).toBe("secret-lair");
    // Alone, it can still lead: last is not never.
    expect(leadStory([stray])?.kind).toBe("stray");
  });

  it("takes the first UNSEEN item by priority, not the newest", () => {
    const lead = leadStory([item("new-set", "2026-10-22T10:00:00Z"), item("combo", "2026-10-20T10:00:00Z"), item("trade-match", "2026-10-19T10:00:00Z", false)]);
    expect(lead?.kind).toBe("combo");
  });

  it("takes the newest within a kind, and nothing when every item is seen", () => {
    const lead = leadStory([item("price-drop", "2026-10-20T10:00:00Z"), item("price-drop", "2026-10-21T10:00:00Z")]);
    expect(lead?.createdAt.toISOString()).toBe("2026-10-21T10:00:00.000Z");
    expect(leadStory([item("combo", "2026-10-20T10:00:00Z", false)])).toBeNull();
  });

  it("never leads with an answer to the reader's own spare request, however new", () => {
    const answer = { ...item("spare-request", "2026-10-22T11:00:00Z"), answer: "yes" };
    expect(leadStory([answer, item("new-set", "2026-10-20T10:00:00Z")])?.kind).toBe("new-set");
    expect(leadStory([answer])).toBeNull();
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

  it("files an answer to the reader's own ask by time: it waits on nothing", () => {
    const list = [
      { ...item("spare-request", "2026-10-01T10:00:00Z", true, "ans"), answer: "no" },
      item("combo", "2026-10-21T10:00:00Z"),
    ].sort(feedOrder);
    expect(list.map((i) => i.key)).toEqual(["combo:2026-10-21T10:00:00Z", "ans"]);
  });
});

describe("windowFloor", () => {
  it("is fourteen days before now", () => {
    expect(FEED_WINDOW_DAYS).toBe(14);
    expect(windowFloor(at("2026-10-22T12:00:00Z")).toISOString()).toBe("2026-10-08T12:00:00.000Z");
  });
});
