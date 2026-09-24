import { describe, expect, it } from "vitest";

import {
  SYNOPSIS_ANSWER_TOKENS_WORST_CASE,
  SYNOPSIS_MAX_TOKENS,
  SYNOPSIS_OBSERVED_MAX_OUTPUT_TOKENS,
  SYNOPSIS_REASONING_HEADROOM_TOKENS,
} from "./limits";

describe("the output ceiling", () => {
  // Reasoning counts inside max_tokens, so a ceiling sized for the answer alone truncates it.
  it("holds the answer's worst case and the reasoning headroom together", () => {
    expect(SYNOPSIS_MAX_TOKENS).toBeGreaterThanOrEqual(SYNOPSIS_ANSWER_TOKENS_WORST_CASE + SYNOPSIS_REASONING_HEADROOM_TOKENS);
  });

  // A ceiling under the measured maximum cuts off an answer the harness accepted.
  it("clears the most output any measured answer used", () => {
    expect(SYNOPSIS_MAX_TOKENS).toBeGreaterThan(SYNOPSIS_OBSERVED_MAX_OUTPUT_TOKENS);
  });
});
