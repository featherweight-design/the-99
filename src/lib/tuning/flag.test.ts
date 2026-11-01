import { describe, expect, it } from "vitest";

import { hubTools, proposedCutsEnabled, suggestedChangesV2Enabled, tuningEnabled } from "./flag";

describe("the Tuning flag", () => {
  it("is off for every value but the exact string 'true', with Analysis also on", () => {
    for (const v of [undefined, "", "false", "TRUE", "1", "yes", " true"]) {
      expect(
        tuningEnabled({ TUNING_ENABLED: v, ANALYSIS_TAB_ENABLED: "true" } as unknown as NodeJS.ProcessEnv),
      ).toBe(false);
    }
  });

  it("is on for 'true' with Analysis also on", () => {
    expect(
      tuningEnabled({ TUNING_ENABLED: "true", ANALYSIS_TAB_ENABLED: "true" } as unknown as NodeJS.ProcessEnv),
    ).toBe(true);
  });

  it("is off whenever Analysis is off, even with Tuning itself on", () => {
    // Suggested changes mounts on the Analysis tab, over a reading: with no tab, nothing can
    // host it and nothing has read a profile to suggest swaps against.
    for (const analysis of [undefined, "", "false", "1"]) {
      expect(
        tuningEnabled({ TUNING_ENABLED: "true", ANALYSIS_TAB_ENABLED: analysis } as unknown as NodeJS.ProcessEnv),
      ).toBe(false);
    }
  });

  it("is off with both unset, the production default", () => {
    expect(tuningEnabled({} as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe("the Proposed cuts flag", () => {
  const env = (o: Record<string, string | undefined>) => o as unknown as NodeJS.ProcessEnv;

  it("is off for every value but the exact string 'true', with Analysis also on", () => {
    for (const v of [undefined, "", "false", "TRUE", "1", "yes", " true"]) {
      expect(proposedCutsEnabled(env({ PROPOSED_CUTS_ENABLED: v, ANALYSIS_TAB_ENABLED: "true" }))).toBe(false);
    }
  });

  it("is on for 'true' with Analysis also on", () => {
    expect(proposedCutsEnabled(env({ PROPOSED_CUTS_ENABLED: "true", ANALYSIS_TAB_ENABLED: "true" }))).toBe(true);
  });

  it("is off whenever Analysis is off, even with the switch itself on", () => {
    for (const analysis of [undefined, "", "false", "1"]) {
      expect(proposedCutsEnabled(env({ PROPOSED_CUTS_ENABLED: "true", ANALYSIS_TAB_ENABLED: analysis }))).toBe(false);
    }
  });

  it("does not depend on TUNING_ENABLED, and the reverse", () => {
    expect(proposedCutsEnabled(env({ PROPOSED_CUTS_ENABLED: "true", ANALYSIS_TAB_ENABLED: "true", TUNING_ENABLED: undefined }))).toBe(true);
    expect(tuningEnabled(env({ TUNING_ENABLED: "true", ANALYSIS_TAB_ENABLED: "true", PROPOSED_CUTS_ENABLED: undefined }))).toBe(true);
  });

  it("is off with everything unset, the production default", () => {
    expect(proposedCutsEnabled(env({}))).toBe(false);
  });
});

describe("the Suggested changes v2 flag", () => {
  const env = (o: Record<string, string | undefined>) => o as unknown as NodeJS.ProcessEnv;

  it("needs the Analysis tab, not Suggested changes' retired switch", () => {
    for (const v of [undefined, "", "false", "off", "true"]) {
      expect(suggestedChangesV2Enabled(env({ SUGGESTED_CHANGES_V2_ENABLED: "true", ANALYSIS_TAB_ENABLED: "true", TUNING_ENABLED: v }))).toBe(true);
    }
    expect(suggestedChangesV2Enabled(env({ SUGGESTED_CHANGES_V2_ENABLED: "true", TUNING_ENABLED: "true" }))).toBe(false);
  });

  it("is off for every value but the exact string 'true'", () => {
    for (const v of [undefined, "", "false", "TRUE", "1"]) {
      expect(suggestedChangesV2Enabled(env({ SUGGESTED_CHANGES_V2_ENABLED: v, ANALYSIS_TAB_ENABLED: "true" }))).toBe(false);
    }
  });
});

describe("the Tuning hub", () => {
  const env = (vars: Record<string, string | undefined>) => vars as unknown as NodeJS.ProcessEnv;
  const on = { ANALYSIS_TAB_ENABLED: "true" };

  // No Tuning tool has a switch but the Analysis tab's (Suggested changes' own retired 2026-11-01, Proposed cuts'
  // 2026-10-31): all three are listed whenever the tab is, in the hub's fixed order, so the hub draws wherever the tab does.
  it("lists all three tools with the tab alone, Mana Balance between the other two", () => {
    expect(hubTools(env(on))).toEqual(["suggested", "mana", "cuts"]);
  });

  it("lists every tool whatever the retired switches say", () => {
    for (const v of [undefined, "", "false", "off", "true"]) {
      expect(hubTools(env({ ...on, TUNING_ENABLED: v, PROPOSED_CUTS_ENABLED: v }))).toEqual(["suggested", "mana", "cuts"]);
    }
  });

  it("lists nothing whenever Analysis is off, whatever the retired switches say", () => {
    expect(hubTools(env({ TUNING_ENABLED: "true", PROPOSED_CUTS_ENABLED: "true" }))).toEqual([]);
  });
});
