import { describe, expect, it } from "vitest";

import { findADeckReadEnabled, swapToolsEnabled } from "./flag";

describe("the swap tools flag", () => {
  it("is off for every value but the exact string 'true'", () => {
    for (const v of [undefined, "", "false", "TRUE", "1", "yes", " true"]) {
      expect(swapToolsEnabled({ SWAP_TOOLS_ENABLED: v } as unknown as NodeJS.ProcessEnv)).toBe(false);
    }
  });

  it("is on for 'true'", () => {
    expect(swapToolsEnabled({ SWAP_TOOLS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});

describe("the Find a deck read flag", () => {
  const env = (e: Record<string, string>) => e as unknown as NodeJS.ProcessEnv;
  it("is on only for 'true', and only with the swap tools on", () => {
    expect(findADeckReadEnabled(env({ FIND_A_DECK_READ_ENABLED: "true", SWAP_TOOLS_ENABLED: "true" }))).toBe(true);
    expect(findADeckReadEnabled(env({ FIND_A_DECK_READ_ENABLED: "true" }))).toBe(false);
    expect(findADeckReadEnabled(env({ FIND_A_DECK_READ_ENABLED: "1", SWAP_TOOLS_ENABLED: "true" }))).toBe(false);
  });
});
