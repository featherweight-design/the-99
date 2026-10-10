import { describe, expect, it } from "vitest";

import { deckPrintingsEnabled } from "./printings-flag";

describe("the deck printings flag", () => {
  it("is off for every value but the exact string 'true'", () => {
    for (const v of [undefined, "", "false", "TRUE", "1", "yes", " true"]) {
      expect(deckPrintingsEnabled({ DECK_PRINTINGS_ENABLED: v } as unknown as NodeJS.ProcessEnv)).toBe(false);
    }
  });

  it("is on for 'true'", () => {
    expect(deckPrintingsEnabled({ DECK_PRINTINGS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});
