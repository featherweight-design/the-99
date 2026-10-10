import { describe, expect, it } from "vitest";

import { proposedCutsEnabled, tuningEnabled } from "./flag";

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
  const env = (e: Record<string, string | undefined>) => e as unknown as NodeJS.ProcessEnv;

  it("is on only with both Proposed cuts and Analysis exactly 'true'", () => {
    expect(proposedCutsEnabled(env({ PROPOSED_CUTS_ENABLED: "true", ANALYSIS_TAB_ENABLED: "true" }))).toBe(true);
    for (const [cuts, analysis] of [["true", "1"], ["1", "true"], ["true", undefined], [undefined, "true"]]) {
      expect(proposedCutsEnabled(env({ PROPOSED_CUTS_ENABLED: cuts, ANALYSIS_TAB_ENABLED: analysis }))).toBe(false);
    }
  });

  it("is off with both unset, the production default", () => {
    expect(proposedCutsEnabled(env({}))).toBe(false);
  });
});
