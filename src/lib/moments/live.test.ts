import { describe, expect, it } from "vitest";
import { liveMoments } from "./live";

describe("liveMoments", () => {
  it("is each moment whose tool is on, and the three with no tool", () => {
    const live = liveMoments({ LINEUP_ENABLED: "true" } as unknown as NodeJS.ProcessEnv);
    expect(live).toEqual(["precons", "top-off", "card-assignments", "lineup"]);
  });

  it("follows a tool's parent, as the screen does: Matchups needs friends as well as games", () => {
    const env = { SOCIAL_GAMES_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    expect(liveMoments(env)).not.toContain("matchups");
    expect(liveMoments({ ...env, SOCIAL_FRIENDS_ENABLED: "true" })).toContain("matchups");
  });
});
