import { describe, expect, it } from "vitest";

import { neverCutEnabled } from "./never-cut-flag";

describe("the never-cut flag", () => {
  it("is off for every value but the exact string 'true'", () => {
    for (const v of [undefined, "", "false", "TRUE", "1", "yes", " true"]) {
      expect(neverCutEnabled({ NEVER_CUT_ENABLED: v } as unknown as NodeJS.ProcessEnv)).toBe(false);
    }
  });

  it("is on for 'true'", () => {
    expect(neverCutEnabled({ NEVER_CUT_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});
