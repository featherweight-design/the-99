import { describe, expect, it } from "vitest";

import { noticesEnabled } from "./flag";

describe("the notices flag", () => {
  it("is off for every value but the exact string 'true'", () => {
    // DEFAULTS OFF is the whole safety property: production must be unaffected until the
    // variable is set deliberately, rather than by a deploy that happened to carry this code.
    for (const v of [undefined, "", "false", "TRUE", "1", "yes", " true"]) {
      expect(noticesEnabled({ NOTICES_ENABLED: v } as unknown as NodeJS.ProcessEnv)).toBe(false);
    }
  });

  it("is on for 'true'", () => {
    expect(noticesEnabled({ NOTICES_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});
