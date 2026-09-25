import { describe, expect, it } from "vitest";

import { changeCommanderEnabled } from "./flag";

describe("the change commander flag", () => {
  it("is off for every value but the exact string 'true'", () => {
    for (const v of [undefined, "", "false", "TRUE", "1", "yes", " true"]) {
      expect(changeCommanderEnabled({ CHANGE_COMMANDER_ENABLED: v } as unknown as NodeJS.ProcessEnv)).toBe(false);
    }
  });

  it("is on for 'true'", () => {
    expect(changeCommanderEnabled({ CHANGE_COMMANDER_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});
