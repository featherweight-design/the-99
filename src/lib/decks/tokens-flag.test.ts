import { describe, expect, it } from "vitest";
import { deckTokensEnabled } from "./tokens-flag";

describe("deckTokensEnabled", () => {
  it("is on only for the exact string", () => {
    expect(deckTokensEnabled({ DECK_TOKENS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    for (const v of [undefined, "", "TRUE", "1", " true", "false"]) {
      expect(deckTokensEnabled({ DECK_TOKENS_ENABLED: v } as unknown as NodeJS.ProcessEnv)).toBe(false);
    }
  });
});
