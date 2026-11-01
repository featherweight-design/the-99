import { describe, expect, it } from "vitest";
import { liveMoments } from "./live";

describe("liveMoments", () => {
  it("is each moment whose tool is on, and the nine with no tool (the friends moments since SOCIAL_FRIENDS_ENABLED retired)", () => {
    const live = liveMoments({} as unknown as NodeJS.ProcessEnv);
    expect(live).toEqual(["precons", "top-off", "card-assignments", "friend-spares", "wishlist", "collection-sync", "lineup", "matchups", "friends-after-game"]);
  });
});
