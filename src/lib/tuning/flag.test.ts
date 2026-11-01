import { describe, expect, it } from "vitest";

import { hubTools, proposedCutsEnabled, tuningEnabled, tuningHubEnabled } from "./flag";

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

describe("the Tuning hub", () => {
  const env = (vars: Record<string, string | undefined>) => vars as unknown as NodeJS.ProcessEnv;
  const on = { ANALYSIS_TAB_ENABLED: "true" };

  it("holds Mana Balance alone with no other tool on, which then mounts directly", () => {
    expect(hubTools(env(on))).toEqual(["mana"]);
    expect(tuningHubEnabled(env(on))).toBe(false);
  });

  it("is on with one more tool on, beside Mana Balance", () => {
    expect(hubTools(env({ ...on, TUNING_ENABLED: "true" }))).toEqual(["suggested", "mana"]);
    expect(tuningHubEnabled(env({ ...on, TUNING_ENABLED: "true" }))).toBe(true);
    expect(hubTools(env({ ...on, PROPOSED_CUTS_ENABLED: "true" }))).toEqual(["mana", "cuts"]);
    expect(tuningHubEnabled(env({ ...on, PROPOSED_CUTS_ENABLED: "true" }))).toBe(true);
  });

  it("draws Mana Balance between the other two, in the hub's fixed order", () => {
    const all = env({ ...on, TUNING_ENABLED: "true", PROPOSED_CUTS_ENABLED: "true" });
    expect(hubTools(all)).toEqual(["suggested", "mana", "cuts"]);
    expect(tuningHubEnabled(all)).toBe(true);
  });

  it("is off whenever Analysis is off, whatever the tools say", () => {
    expect(hubTools(env({ TUNING_ENABLED: "true", PROPOSED_CUTS_ENABLED: "true" }))).toEqual([]);
    expect(tuningHubEnabled(env({ TUNING_ENABLED: "true", PROPOSED_CUTS_ENABLED: "true" }))).toBe(false);
  });
});
