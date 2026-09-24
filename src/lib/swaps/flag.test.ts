import { describe, expect, it } from "vitest";

import { swapToolsEnabled } from "./flag";

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
