import { describe, expect, it } from "vitest";

import { availableFeedKinds, feedKindAvailable, homeFeedEnabled } from "./flag";

/** A resolved env for a test. */
const env = (e: Record<string, string> = {}): NodeJS.ProcessEnv => e as unknown as NodeJS.ProcessEnv;

describe("homeFeedEnabled", () => {
  it("is on only for the literal 'true'", () => {
    expect(homeFeedEnabled(env({ HOME_FEED_ENABLED: "true" }))).toBe(true);
    expect(homeFeedEnabled(env({ HOME_FEED_ENABLED: "1" }))).toBe(false);
    expect(homeFeedEnabled(env())).toBe(false);
  });
});

describe("the kinds available to a reader", () => {
  const feed = env({ HOME_FEED_ENABLED: "true" });

  it("offers nothing while the feed is off, whatever else is on", () => {
    expect(availableFeedKinds(env({ SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_WISHLIST_ENABLED: "true" }))).toEqual([]);
  });

  it("offers sets, new precons and combos with the feed alone", () => {
    expect(availableFeedKinds(feed)).toEqual(["new-set", "new-precon", "combo"]);
    expect(feedKindAvailable("new-precon", env())).toBe(true);
  });

  it("needs the wishlist for a price drop, and friends AND the wishlist for a trade match", () => {
    expect(feedKindAvailable("price-drop", env({ SOCIAL_WISHLIST_ENABLED: "true" }))).toBe(true);
    expect(feedKindAvailable("trade-match", env({ SOCIAL_WISHLIST_ENABLED: "true" }))).toBe(false);
    expect(feedKindAvailable("trade-match", env({ SOCIAL_FRIENDS_ENABLED: "true" }))).toBe(false);
    expect(feedKindAvailable("trade-match", env({ SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_WISHLIST_ENABLED: "true" }))).toBe(true);
  });

  it("offers a spare request only with SPARE_REQUESTS_ENABLED and friends (G5)", () => {
    const all = env({ ...feed, SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_WISHLIST_ENABLED: "true" });
    expect(feedKindAvailable("spare-request", all)).toBe(false);
    expect(availableFeedKinds(all)).toEqual(["new-set", "new-precon", "price-drop", "trade-match", "combo"]);
    expect(feedKindAvailable("spare-request", env({ SPARE_REQUESTS_ENABLED: "true" }))).toBe(false);
    const on = env({ ...feed, SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_WISHLIST_ENABLED: "true", SPARE_REQUESTS_ENABLED: "true" });
    expect(feedKindAvailable("spare-request", on)).toBe(true);
    expect(availableFeedKinds(on)).toEqual(["new-set", "new-precon", "price-drop", "trade-match", "spare-request", "combo"]);
  });

  it("offers Wizards' three announcement kinds only with ANNOUNCEMENTS_ENABLED, whatever else is on", () => {
    const kinds = ["secret-lair", "commander-decklists", "wizards-news"] as const;
    // Every other switch on, the feed on: still none of the three.
    const rest = env({ ...feed, SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_WISHLIST_ENABLED: "true" });
    for (const k of kinds) expect(feedKindAvailable(k, rest)).toBe(false);
    expect(availableFeedKinds(rest).filter((k) => (kinds as readonly string[]).includes(k))).toEqual([]);
    for (const k of kinds) expect(feedKindAvailable(k, env({ ANNOUNCEMENTS_ENABLED: "1" }))).toBe(false);
    const on = env({ ...feed, ANNOUNCEMENTS_ENABLED: "true" });
    for (const k of kinds) expect(feedKindAvailable(k, on)).toBe(true);
    expect(availableFeedKinds(on)).toEqual(["new-set", "new-precon", "secret-lair", "commander-decklists", "wizards-news", "combo"]);
    // The feed off still offers nothing.
    expect(availableFeedKinds(env({ ANNOUNCEMENTS_ENABLED: "true" }))).toEqual([]);
  });
});
