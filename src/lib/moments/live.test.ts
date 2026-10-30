import { describe, expect, it } from "vitest";
import { liveMoments } from "./live";

describe("liveMoments", () => {
  it("is each moment whose tool is on, and the four with no tool", () => {
    const live = liveMoments({} as unknown as NodeJS.ProcessEnv);
    expect(live).toEqual(["precons", "top-off", "card-assignments", "lineup"]);
  });

  it("follows friends for Matchups, as the screen does: the retired opponents switch alone raises nothing", () => {
    const env = { SOCIAL_GAMES_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    expect(liveMoments(env)).not.toContain("matchups");
    expect(liveMoments({ SOCIAL_FRIENDS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toContain("matchups");
  });
});
