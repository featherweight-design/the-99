import { describe, expect, it } from "vitest";
import { liveMoments } from "./live";

describe("liveMoments", () => {
  it("is each moment whose tool is on, and the twelve with no tool (the friends moments since SOCIAL_FRIENDS_ENABLED retired, the swap tools' since SWAP_TOOLS_ENABLED did, Help me choose's since HELP_ME_CHOOSE_ENABLED did)", () => {
    const live = liveMoments({} as unknown as NodeJS.ProcessEnv);
    expect(live).toEqual(["precons", "help-me-choose", "top-off", "card-assignments", "stand-ins", "friend-spares", "find-a-deck", "wishlist", "collection-sync", "lineup", "matchups", "friends-after-game"]);
  });

  it("keeps Help me choose's moment with its retired switch off", () => {
    expect(liveMoments({ HELP_ME_CHOOSE_ENABLED: "off" } as unknown as NodeJS.ProcessEnv)).toContain("help-me-choose");
  });

  it("keeps the swap tools' moments with their retired switch off", () => {
    const live = liveMoments({ SWAP_TOOLS_ENABLED: "off" } as unknown as NodeJS.ProcessEnv);
    expect(live).toContain("stand-ins");
    expect(live).toContain("find-a-deck");
  });

  it("follows the Analysis tab for Proposed cuts: its retired switch alone raises nothing", () => {
    expect(liveMoments({ PROPOSED_CUTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).not.toContain("proposed-cuts");
    expect(liveMoments({ ANALYSIS_TAB_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toContain("proposed-cuts");
  });

  it("follows the Analysis tab for Suggested changes: its retired switch alone raises nothing, and off lowers nothing", () => {
    expect(liveMoments({ TUNING_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).not.toContain("suggested-changes");
    expect(liveMoments({ ANALYSIS_TAB_ENABLED: "true", TUNING_ENABLED: "off" } as unknown as NodeJS.ProcessEnv)).toContain("suggested-changes");
  });
});
