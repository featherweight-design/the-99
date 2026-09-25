import { describe, expect, it } from "vitest";

import { helpMeChooseEnabled } from "./flag";

describe("the Help me choose flag", () => {
  it("is off for every value but the exact string 'true'", () => {
    // DEFAULTS OFF is the safety property: production is unaffected until the variable is set.
    for (const v of [undefined, "", "false", "TRUE", "1", "yes", " true"]) {
      expect(helpMeChooseEnabled({ HELP_ME_CHOOSE_ENABLED: v } as unknown as NodeJS.ProcessEnv)).toBe(false);
    }
  });

  it("is on for 'true'", () => {
    expect(helpMeChooseEnabled({ HELP_ME_CHOOSE_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});
