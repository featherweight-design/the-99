import { describe, expect, it } from "vitest";

import { SYNOPSIS_MAX_TOKENS } from "../synopsis/limits";
import { SYNOPSIS_MODEL } from "../synopsis/model";
import { STUB_MODEL } from "../synopsis/stub";
import { TUNING_MAX_TOKENS, TUNING_MODEL } from "../tuning/limits";
import { costMicroUsd, FEATURE_CALLS, featureWorstCaseMicroUsd, RATES, worstCaseMicroUsd } from "./prices";

const usage = (inputTokens: number, outputTokens: number, cacheReadTokens = 0, cacheWriteTokens = 0) =>
  ({ inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens });

describe("costMicroUsd", () => {
  it("prices input and output per million tokens, as micro-dollars per token", () => {
    // Sonnet 5, $2 / $10: 1,000 in and 500 out is $0.002 + $0.005.
    expect(costMicroUsd("claude-sonnet-5", usage(1_000, 500))).toBe(7_000);
    expect(costMicroUsd("claude-haiku-4-5", usage(1_000, 500))).toBe(3_500);
    expect(costMicroUsd("claude-opus-5", usage(1_000, 500))).toBe(17_500);
  });

  it("prices a cache read at a tenth of input and a cache write at 1.25x", () => {
    expect(costMicroUsd("claude-sonnet-5", usage(0, 0, 1_000, 0))).toBe(200);
    expect(costMicroUsd("claude-sonnet-5", usage(0, 0, 0, 1_000))).toBe(2_500);
  });

  it("rounds a fraction of a micro-dollar up, never down", () => {
    expect(costMicroUsd("claude-haiku-4-5", usage(0, 0, 1, 0))).toBe(1);
  });

  it("throws for a model it has no rate for, rather than pricing it at nothing", () => {
    expect(() => costMicroUsd("claude-imaginary-9", usage(1, 1))).toThrow(/no rate/);
  });

  it("prices the synopsis stub at nothing, because it makes no request", () => {
    expect(costMicroUsd(STUB_MODEL, usage(1_000, 1_000))).toBe(0);
  });

  it("has a rate for every model a feature selects", () => {
    for (const model of [TUNING_MODEL, SYNOPSIS_MODEL]) expect(RATES[model]).toBeDefined();
  });
});

describe("worstCaseMicroUsd", () => {
  it("is two attempts of the whole input ceiling and the whole reply", () => {
    expect(worstCaseMicroUsd("claude-sonnet-5", 12_000, 8_000)).toBe(2 * (12_000 * 2 + 8_000 * 10));
  });

  it("throws for an unknown model", () => {
    expect(() => worstCaseMicroUsd("nope", 1, 1)).toThrow();
  });
});

describe("FEATURE_CALLS", () => {
  it("prices each feature with its own model, ceiling and max_tokens", () => {
    expect(FEATURE_CALLS.tuning).toEqual({ model: TUNING_MODEL, inputCeilingTokens: 12_000, maxTokens: TUNING_MAX_TOKENS });
    expect(FEATURE_CALLS.synopsis).toEqual({ model: SYNOPSIS_MODEL, inputCeilingTokens: 24_000, maxTokens: SYNOPSIS_MAX_TOKENS });
    // $0.208 and $0.256 at today's Sonnet 5 and 8,000-token ceilings.
    expect(featureWorstCaseMicroUsd("tuning")).toBe(208_000);
    expect(featureWorstCaseMicroUsd("synopsis")).toBe(256_000);
  });

  it("prices a reservation at the model it recorded, falling back to the feature's", () => {
    expect(featureWorstCaseMicroUsd("tuning", "claude-opus-5")).toBe(2 * (12_000 * 5 + TUNING_MAX_TOKENS * 25));
    expect(featureWorstCaseMicroUsd("tuning", null)).toBe(featureWorstCaseMicroUsd("tuning"));
  });
});
