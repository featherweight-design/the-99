import { describe, expect, it } from "vitest";

import { howItWorksEnabled } from "./how-it-works-flag";

describe("howItWorksEnabled", () => {
  it("is on for the exact string 'true' and off for anything else", () => {
    expect(howItWorksEnabled({ HOW_IT_WORKS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    for (const value of [undefined, "", "1", "TRUE", "yes", "false"]) {
      expect(howItWorksEnabled({ HOW_IT_WORKS_ENABLED: value } as unknown as NodeJS.ProcessEnv)).toBe(false);
    }
  });
});
