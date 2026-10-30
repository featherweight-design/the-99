// `displaceLead`: while the lead slot holds an answered spare request, a server lead that is not the held story joins
// What's new's rows in the feed's own order; with nothing held, or the held story still the lead, the feed is untouched.
import { describe, expect, it } from "vitest";
import type { FeedView, HomeFeed } from "../../lib/feed/home";
import { displaceLead } from "./held-lead";

const view = (key: string, at: string, o: Partial<FeedView> = {}): FeedView => ({
  key, kind: "new-set", at, unseen: true, card: null, friend: null, href: null, opens: null, outbound: null, name: null, setSize: null,
  owned: null, drop: null, combo: null, answer: null, askable: false, ...o,
});
const A = view("a", "2026-10-22T10:00:00Z");
const B = view("b", "2026-10-22T08:00:00Z");
const LEAD = view("lead", "2026-10-22T09:00:00Z", { kind: "trade-match" });
const feed: HomeFeed = { chosen: true, on: ["new-set", "trade-match"], items: [A, B], unseen: 3, lead: LEAD };

describe("displaceLead", () => {
  it("puts a displaced lead among the rows in the feed's order and draws no lead", () => {
    const out = displaceLead(feed, "held");
    expect(out.chosen && out.items.map((i) => i.key)).toEqual(["a", "lead", "b"]);
    expect(out.chosen && out.lead).toBeNull();
    expect(out.chosen && out.unseen).toBe(3);
  });

  it("re-sorts an answer to the reader's own ask by time, never as waiting", () => {
    const answer = view("ans", "2026-10-12T08:00:00Z", { kind: "spare-request", answer: "yes" });
    const out = displaceLead({ ...feed, items: [A, answer] }, "held");
    expect(out.chosen && out.items.map((i) => i.key)).toEqual(["a", "lead", "ans"]);
  });

  it("leaves the feed alone with nothing held, or while the held story is still the lead", () => {
    expect(displaceLead(feed, null)).toBe(feed);
    expect(displaceLead(feed, "lead")).toBe(feed);
    const none: HomeFeed = { ...feed, lead: null };
    expect(displaceLead(none, "held")).toBe(none);
    const offer: HomeFeed = { chosen: false, offer: ["new-set"], on: [] };
    expect(displaceLead(offer, "held")).toBe(offer);
  });
});
