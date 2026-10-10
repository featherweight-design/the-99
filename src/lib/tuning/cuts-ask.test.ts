import { describe, expect, it } from "vitest";

import { FEATURE_CALLS } from "../model/prices";
import { cutsAsk, MAX_CUTS_PER_RUN, OUTPUT_CEILING_TOKENS, OUTPUT_MARGIN, WORST_TOKENS_PER_CUT } from "./cuts-ask";

describe("the per-run cap", () => {
  it("is 15, derived from the worst measured tokens per cut with the margin kept free", () => {
    expect(MAX_CUTS_PER_RUN).toBe(15);
    expect(MAX_CUTS_PER_RUN * WORST_TOKENS_PER_CUT).toBeLessThanOrEqual(OUTPUT_CEILING_TOKENS * (1 - OUTPUT_MARGIN));
    expect((MAX_CUTS_PER_RUN + 1) * WORST_TOKENS_PER_CUT).toBeGreaterThan(OUTPUT_CEILING_TOKENS * (1 - OUTPUT_MARGIN));
  });

  it("reads the ceiling the model call is actually held to", () => {
    expect(OUTPUT_CEILING_TOKENS).toBe(FEATURE_CALLS.proposed_cuts.maxTokens);
  });

  it("asks for the overage up to the cap, and nothing for a deck not over", () => {
    expect([cutsAsk(-3), cutsAsk(0), cutsAsk(9), cutsAsk(15), cutsAsk(47)]).toEqual([0, 0, 9, 15, 15]);
  });
});
