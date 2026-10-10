import { describe, expect, it } from "vitest";

import {
  SYNOPSIS_CONTRACT_VERSION,
  SYNOPSIS_CONTRACT_VERSION_V2,
  synopsisContractVersion,
  SYNOPSIS_ANSWER_TOKENS_WORST_CASE,
  SYNOPSIS_MAX_TOKENS,
  SYNOPSIS_MAX_TOKENS_V8,
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

describe("the contract-8 ceiling", () => {
  it("is above contract 7's, which it must hold plus the evidence and the checklist", () => {
    expect(SYNOPSIS_MAX_TOKENS_V8).toBeGreaterThan(SYNOPSIS_MAX_TOKENS);
  });
});

describe("the contract version", () => {
  it("follows the v2 switch: 8 while it is on, 7 otherwise", () => {
    expect(synopsisContractVersion(false)).toBe(SYNOPSIS_CONTRACT_VERSION);
    expect(synopsisContractVersion(true)).toBe(SYNOPSIS_CONTRACT_VERSION_V2);
    expect(SYNOPSIS_CONTRACT_VERSION).toBe(7);
    expect(SYNOPSIS_CONTRACT_VERSION_V2).toBe(8);
  });
});
