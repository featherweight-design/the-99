import { describe, expect, it } from "vitest";

import { FEATURE_CALLS } from "../model/prices";
import { cutsAsk, cutsNamed, EXTRA_CUTS_NAMED, MAX_CUTS_PER_RUN, OUTPUT_CEILING_TOKENS, OUTPUT_MARGIN, WORST_TOKENS_PER_CUT } from "./cuts-ask";

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

  it("names three more than the deck needs, held to the same cap, and nothing for a deck not over", () => {
    expect(EXTRA_CUTS_NAMED).toBe(3);
    expect([cutsNamed(-3), cutsNamed(0), cutsNamed(1), cutsNamed(3), cutsNamed(12), cutsNamed(13), cutsNamed(47)]).toEqual([0, 0, 4, 6, 15, 15, 15]);
  });

  it("never names fewer than the deck needs", () => {
    for (let over = 0; over <= 60; over++) expect(cutsNamed(over)).toBeGreaterThanOrEqual(cutsAsk(over));
  });
});
