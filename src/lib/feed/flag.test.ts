import { describe, expect, it } from "vitest";

import { availableFeedKinds, feedKindAvailable } from "./flag";

/** A resolved env for a test. */
const env = (e: Record<string, string> = {}): NodeJS.ProcessEnv => e as unknown as NodeJS.ProcessEnv;

describe("the kinds available to a reader", () => {
  const feed = env();

  it("offers sets, new precons, price drops, trade matches, spare requests and combos with nothing else on", () => {
    expect(availableFeedKinds(feed)).toEqual(["new-set", "new-precon", "price-drop", "trade-match", "spare-request", "combo"]);
    expect(feedKindAvailable("new-precon", env())).toBe(true);
  });

  it("always offers a price drop, a trade match and a spare request (the wishlist's and friends' switches are retired)", () => {
    expect(feedKindAvailable("price-drop", env())).toBe(true);
    expect(feedKindAvailable("price-drop", env({ SOCIAL_WISHLIST_ENABLED: "off" }))).toBe(true);
    expect(feedKindAvailable("trade-match", env())).toBe(true);
    expect(feedKindAvailable("spare-request", env())).toBe(true);
  });

  it("offers Wizards' three announcement kinds only with ANNOUNCEMENTS_ENABLED, whatever else is on", () => {
    const kinds = ["secret-lair", "commander-decklists", "wizards-news"] as const;
    // Every other switch on: still none of the three.
    const rest = env({ ...feed, PUSH_ENABLED: "true" });
    for (const k of kinds) expect(feedKindAvailable(k, rest)).toBe(false);
    expect(availableFeedKinds(rest).filter((k) => (kinds as readonly string[]).includes(k))).toEqual([]);
    for (const k of kinds) expect(feedKindAvailable(k, env({ ANNOUNCEMENTS_ENABLED: "1" }))).toBe(false);
    const on = env({ ...feed, ANNOUNCEMENTS_ENABLED: "true" });
    for (const k of kinds) expect(feedKindAvailable(k, on)).toBe(true);
    expect(availableFeedKinds(on)).toEqual(["new-set", "new-precon", "secret-lair", "commander-decklists", "wizards-news", "price-drop", "trade-match", "spare-request", "combo"]);
  });
});
