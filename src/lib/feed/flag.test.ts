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

  it("offers sets and combos with the feed alone", () => {
    expect(availableFeedKinds(feed)).toEqual(["new-set", "combo"]);
  });

  it("offers a new precon only with Precons on: its link is /decks/precons/[fileName], a 404 with Precons off", () => {
    expect(feedKindAvailable("new-precon", env())).toBe(false);
    expect(feedKindAvailable("new-precon", env({ PRECONS_ENABLED: "true" }))).toBe(true);
    expect(availableFeedKinds(env({ ...feed, PRECONS_ENABLED: "true" }))).toEqual(["new-set", "new-precon", "combo"]);
  });

  it("needs the wishlist for a price drop, and friends AND the wishlist for a trade match", () => {
    expect(feedKindAvailable("price-drop", env({ SOCIAL_WISHLIST_ENABLED: "true" }))).toBe(true);
    expect(feedKindAvailable("trade-match", env({ SOCIAL_WISHLIST_ENABLED: "true" }))).toBe(false);
    expect(feedKindAvailable("trade-match", env({ SOCIAL_FRIENDS_ENABLED: "true" }))).toBe(false);
    expect(feedKindAvailable("trade-match", env({ SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_WISHLIST_ENABLED: "true" }))).toBe(true);
  });

  it("offers a spare request only with SPARE_REQUESTS_ENABLED and friends (G5)", () => {
    const all = env({ ...feed, PRECONS_ENABLED: "true", SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_WISHLIST_ENABLED: "true" });
    expect(feedKindAvailable("spare-request", all)).toBe(false);
    expect(availableFeedKinds(all)).toEqual(["new-set", "new-precon", "price-drop", "trade-match", "combo"]);
    expect(feedKindAvailable("spare-request", env({ SPARE_REQUESTS_ENABLED: "true" }))).toBe(false);
    const on = env({ ...feed, PRECONS_ENABLED: "true", SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_WISHLIST_ENABLED: "true", SPARE_REQUESTS_ENABLED: "true" });
    expect(feedKindAvailable("spare-request", on)).toBe(true);
    expect(availableFeedKinds(on)).toEqual(["new-set", "new-precon", "price-drop", "trade-match", "spare-request", "combo"]);
  });
});
