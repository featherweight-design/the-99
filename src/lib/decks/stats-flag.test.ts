import { describe, expect, it } from "vitest";

import { deckStatsEnabled } from "./stats-flag";

describe("the Deck stats flag", () => {
  it("is off for every value but the exact string 'true'", () => {
    for (const v of [undefined, "", "false", "TRUE", "1", "yes", " true"]) {
      expect(deckStatsEnabled({ DECK_STATS_ENABLED: v } as unknown as NodeJS.ProcessEnv)).toBe(false);
    }
  });

  it("is on for 'true'", () => {
    expect(deckStatsEnabled({ DECK_STATS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});
