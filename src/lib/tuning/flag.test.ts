import { describe, expect, it } from "vitest";

import { HUB_TOOLS, suggestedChangesV2Enabled } from "./flag";

describe("the Suggested changes v2 flag", () => {
  const env = (o: Record<string, string | undefined>) => o as unknown as NodeJS.ProcessEnv;

  it("is on for the exact string 'true'", () => {
    expect(suggestedChangesV2Enabled(env({ SUGGESTED_CHANGES_V2_ENABLED: "true" }))).toBe(true);
  });

  it("is off for every value but the exact string 'true'", () => {
    for (const v of [undefined, "", "false", "TRUE", "1"]) {
      expect(suggestedChangesV2Enabled(env({ SUGGESTED_CHANGES_V2_ENABLED: v }))).toBe(false);
    }
  });
});

describe("the Tuning hub", () => {
  // No Tuning tool has a switch, and neither has the Analysis tab they mount on: all three are always listed, in the
  // hub's fixed order.
  it("lists all three tools, Mana Balance between the other two", () => {
    expect(HUB_TOOLS).toEqual(["suggested", "mana", "cuts"]);
  });
});
