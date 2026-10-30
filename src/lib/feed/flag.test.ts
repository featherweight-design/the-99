import { describe, expect, it } from "vitest";

import { availableFeedKinds, feedKindAvailable } from "./flag";

/** A resolved env for a test. */
const env = (e: Record<string, string> = {}): NodeJS.ProcessEnv => e as unknown as NodeJS.ProcessEnv;

describe("the kinds available to a reader", () => {
  const feed = env();

  it("offers sets, new precons, price drops and combos with nothing else on", () => {
    expect(availableFeedKinds(feed)).toEqual(["new-set", "new-precon", "price-drop", "combo"]);
    expect(feedKindAvailable("new-precon", env())).toBe(true);
  });

  it("always offers a price drop, and a trade match with friends alone (the wishlist's switch is retired)", () => {
    expect(feedKindAvailable("price-drop", env())).toBe(true);
    expect(feedKindAvailable("price-drop", env({ SOCIAL_WISHLIST_ENABLED: "off" }))).toBe(true);
    expect(feedKindAvailable("trade-match", env({ SOCIAL_WISHLIST_ENABLED: "true" }))).toBe(false);
    expect(feedKindAvailable("trade-match", env({ SOCIAL_FRIENDS_ENABLED: "true" }))).toBe(true);
  });

  it("offers a spare request only with friends (G5)", () => {
    const noFriends = feed;
    expect(feedKindAvailable("spare-request", noFriends)).toBe(false);
    expect(availableFeedKinds(noFriends)).toEqual(["new-set", "new-precon", "price-drop", "combo"]);
    const on = env({ ...feed, SOCIAL_FRIENDS_ENABLED: "true" });
    expect(feedKindAvailable("spare-request", on)).toBe(true);
    expect(availableFeedKinds(on)).toEqual(["new-set", "new-precon", "price-drop", "trade-match", "spare-request", "combo"]);
  });

  it("offers Wizards' three announcement kinds only with ANNOUNCEMENTS_ENABLED, whatever else is on", () => {
    const kinds = ["secret-lair", "commander-decklists", "wizards-news"] as const;
    // Every other switch on: still none of the three.
    const rest = env({ ...feed, SOCIAL_FRIENDS_ENABLED: "true" });
    for (const k of kinds) expect(feedKindAvailable(k, rest)).toBe(false);
    expect(availableFeedKinds(rest).filter((k) => (kinds as readonly string[]).includes(k))).toEqual([]);
    for (const k of kinds) expect(feedKindAvailable(k, env({ ANNOUNCEMENTS_ENABLED: "1" }))).toBe(false);
    const on = env({ ...feed, ANNOUNCEMENTS_ENABLED: "true" });
    for (const k of kinds) expect(feedKindAvailable(k, on)).toBe(true);
    expect(availableFeedKinds(on)).toEqual(["new-set", "new-precon", "secret-lair", "commander-decklists", "wizards-news", "price-drop", "combo"]);
  });
});
