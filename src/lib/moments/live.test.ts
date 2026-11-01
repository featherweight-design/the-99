import { describe, expect, it } from "vitest";
import { liveMoments } from "./live";

describe("liveMoments", () => {
  // No moment has a tool switch left: the friends moments since SOCIAL_FRIENDS_ENABLED retired, the swap tools' since
  // SWAP_TOOLS_ENABLED did, Help me choose's since HELP_ME_CHOOSE_ENABLED did, and the three Tuning moments since
  // ANALYSIS_TAB_ENABLED did (2026-11-01).
  it("is every moment, in the registry's order, with nothing set", () => {
    const live = liveMoments({} as unknown as NodeJS.ProcessEnv);
    expect(live).toEqual(["precons", "help-me-choose", "top-off", "proposed-cuts", "suggested-changes", "mana-balance", "card-assignments", "stand-ins", "friend-spares", "find-a-deck", "wishlist", "collection-sync", "lineup", "matchups", "friends-after-game"]);
  });

  it("keeps Help me choose's moment with its retired switch off", () => {
    expect(liveMoments({ HELP_ME_CHOOSE_ENABLED: "off" } as unknown as NodeJS.ProcessEnv)).toContain("help-me-choose");
  });

  it("keeps the swap tools' moments with their retired switch off", () => {
    const live = liveMoments({ SWAP_TOOLS_ENABLED: "off" } as unknown as NodeJS.ProcessEnv);
    expect(live).toContain("stand-ins");
    expect(live).toContain("find-a-deck");
  });

  it("keeps the Tuning moments with the Analysis tab's retired switch, and its children's, off", () => {
    const live = liveMoments({ ANALYSIS_TAB_ENABLED: "off", PROPOSED_CUTS_ENABLED: "off", TUNING_ENABLED: "off" } as unknown as NodeJS.ProcessEnv);
    for (const id of ["proposed-cuts", "suggested-changes", "mana-balance"] as const) expect(live).toContain(id);
  });
});
