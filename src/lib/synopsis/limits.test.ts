import { describe, expect, it } from "vitest";

import { SYNOPSIS_ANSWER_TOKENS_WORST_CASE, SYNOPSIS_MAX_TOKENS, SYNOPSIS_THINKING_HEADROOM_TOKENS } from "./limits";

describe("the output ceiling", () => {
  // Thinking counts inside max_tokens, so a ceiling sized for the answer alone truncates it.
  it("holds the answer's worst case and the thinking headroom together", () => {
    expect(SYNOPSIS_MAX_TOKENS).toBeGreaterThanOrEqual(SYNOPSIS_ANSWER_TOKENS_WORST_CASE + SYNOPSIS_THINKING_HEADROOM_TOKENS);
  });
});
