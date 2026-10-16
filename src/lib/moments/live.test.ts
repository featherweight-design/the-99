import { describe, expect, it } from "vitest";
import { liveMoments } from "./live";

describe("liveMoments", () => {
  it("is none with MOMENTS_ENABLED off, whatever the tools", () => {
    expect(liveMoments({ LINEUP_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toEqual([]);
  });

  it("is each moment whose tool is on, and the two with no tool", () => {
    const live = liveMoments({ MOMENTS_ENABLED: "true", LINEUP_ENABLED: "true" } as unknown as NodeJS.ProcessEnv);
    expect(live).toEqual(["top-off", "card-assignments", "lineup"]);
  });

  it("follows a tool's parent, as the screen does: Matchups needs friends as well as games", () => {
    const env = { MOMENTS_ENABLED: "true", SOCIAL_GAMES_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    expect(liveMoments(env)).not.toContain("matchups");
    expect(liveMoments({ ...env, SOCIAL_FRIENDS_ENABLED: "true" })).toContain("matchups");
  });
});
