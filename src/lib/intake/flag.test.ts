import { describe, expect, it } from "vitest";

import { helpMeChooseEnabled } from "./flag";

describe("helpMeChooseEnabled", () => {
  it("is on only for the exact string 'true'", () => {
    expect(helpMeChooseEnabled({ HELP_ME_CHOOSE_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    for (const v of [undefined, "", "false", "TRUE", "1", "yes", " true"]) {
      expect(helpMeChooseEnabled({ HELP_ME_CHOOSE_ENABLED: v } as unknown as NodeJS.ProcessEnv)).toBe(false);
    }
  });
});
