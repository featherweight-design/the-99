import { describe, expect, it } from "vitest";

import { HUB_TOOLS, proposedCutsEnabled, suggestedChangesV2Enabled, tuningEnabled } from "./flag";

// Both retired flags read their own variable alone (the admin registry is their only reader): they once also needed
// ANALYSIS_TAB_ENABLED, retired too (always on, 2026-11-01), so the admin's Feature flags view names no parent for them.
describe("the Tuning flag", () => {
  const env = (o: Record<string, string | undefined>) => o as unknown as NodeJS.ProcessEnv;

  it("is off for every value but the exact string 'true'", () => {
    for (const v of [undefined, "", "false", "TRUE", "1", "yes", " true"]) {
      expect(tuningEnabled(env({ TUNING_ENABLED: v, ANALYSIS_TAB_ENABLED: "true" }))).toBe(false);
    }
  });

  it("is on for 'true', whatever the Analysis tab's retired switch says", () => {
    for (const analysis of [undefined, "", "false", "off", "true"]) {
      expect(tuningEnabled(env({ TUNING_ENABLED: "true", ANALYSIS_TAB_ENABLED: analysis }))).toBe(true);
    }
  });

  it("is off unset, the production default", () => {
    expect(tuningEnabled(env({}))).toBe(false);
  });
});

describe("the Proposed cuts flag", () => {
  const env = (o: Record<string, string | undefined>) => o as unknown as NodeJS.ProcessEnv;

  it("is off for every value but the exact string 'true'", () => {
    for (const v of [undefined, "", "false", "TRUE", "1", "yes", " true"]) {
      expect(proposedCutsEnabled(env({ PROPOSED_CUTS_ENABLED: v, ANALYSIS_TAB_ENABLED: "true" }))).toBe(false);
    }
  });

  it("is on for 'true', whatever the Analysis tab's retired switch says", () => {
    for (const analysis of [undefined, "", "false", "off", "true"]) {
      expect(proposedCutsEnabled(env({ PROPOSED_CUTS_ENABLED: "true", ANALYSIS_TAB_ENABLED: analysis }))).toBe(true);
    }
  });

  it("does not depend on TUNING_ENABLED, and the reverse", () => {
    expect(proposedCutsEnabled(env({ PROPOSED_CUTS_ENABLED: "true", TUNING_ENABLED: undefined }))).toBe(true);
    expect(tuningEnabled(env({ TUNING_ENABLED: "true", PROPOSED_CUTS_ENABLED: undefined }))).toBe(true);
  });

  it("is off unset, the production default", () => {
    expect(proposedCutsEnabled(env({}))).toBe(false);
  });
});

describe("the Suggested changes v2 flag", () => {
  const env = (o: Record<string, string | undefined>) => o as unknown as NodeJS.ProcessEnv;

  // The Analysis tab's switch is retired (always on, 2026-11-01), and so is Suggested changes': v2 gates on its own alone.
  it("needs nothing but its own variable, whatever the retired switches say", () => {
    for (const v of [undefined, "", "false", "off", "true"]) {
      expect(suggestedChangesV2Enabled(env({ SUGGESTED_CHANGES_V2_ENABLED: "true", ANALYSIS_TAB_ENABLED: v, TUNING_ENABLED: v }))).toBe(true);
    }
  });

  it("is off for every value but the exact string 'true'", () => {
    for (const v of [undefined, "", "false", "TRUE", "1"]) {
      expect(suggestedChangesV2Enabled(env({ SUGGESTED_CHANGES_V2_ENABLED: v, ANALYSIS_TAB_ENABLED: "true" }))).toBe(false);
    }
  });
});

describe("the Tuning hub", () => {
  // No Tuning tool has a switch (Suggested changes' retired 2026-11-01, Proposed cuts' 2026-10-31) and neither has the
  // Analysis tab they mount on (2026-11-01): all three are always listed, in the hub's fixed order.
  it("lists all three tools, Mana Balance between the other two", () => {
    expect(HUB_TOOLS).toEqual(["suggested", "mana", "cuts"]);
  });
});
