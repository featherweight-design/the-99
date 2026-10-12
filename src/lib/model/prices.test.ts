import { describe, expect, it } from "vitest";

import { INTAKE_MODEL, READ_JUDGE_MAX_TOKENS, READ_JUDGE_MODEL, READ_SHORTLIST_MAX_TOKENS, READ_SHORTLIST_MODEL } from "../intake/limits";
import { SYNOPSIS_MAX_TOKENS_V8 } from "../synopsis/limits";
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
    expect(FEATURE_CALLS.tuning).toEqual({ model: TUNING_MODEL, inputCeilingTokens: 12_000, maxTokens: TUNING_MAX_TOKENS, callsPerWrite: 1 });
    // Measured, not provisional: the largest cuts request was 15,266 input tokens.
    expect(FEATURE_CALLS.proposed_cuts).toEqual({ model: TUNING_MODEL, inputCeilingTokens: 20_000, maxTokens: TUNING_MAX_TOKENS, callsPerWrite: 1 });
    // Measured: 66,042 input tokens at 22 decks, 4,257 output; priced at the ceiling the press refuses above.
    expect(FEATURE_CALLS.fits_read).toEqual({ model: "claude-haiku-5-5", inputCeilingTokens: 100_000, maxTokens: 8_000, callsPerWrite: 1 });
    expect(FEATURE_CALLS.synopsis).toEqual({ model: SYNOPSIS_MODEL, inputCeilingTokens: 24_000, maxTokens: SYNOPSIS_MAX_TOKENS_V8, callsPerWrite: 2 });
    // $0.208 at today's Sonnet 5 and an 8,000-token ceiling; $0.832 for the synopsis, whose one
    // write can make two calls (the first answer and its repair) at Sonnet 5.5's 16,000-token
    // ceiling each, at the same $2 / $10 rate (it was $0.312 at contract 7's 3,000, $0.372 at
    // contract 8's first 4,500 and $0.432 at 6,000).
    expect(featureWorstCaseMicroUsd("tuning")).toBe(208_000);
    expect(featureWorstCaseMicroUsd("synopsis")).toBe(832_000);
    // The read: two steps under one reservation (rework plan, 2026-10-11). The shortlist on Haiku
    // 5.5's >100K card, its 175,000-token ceiling all at the cache-write rate, both attempts:
    // 2 x (175,000 x 1.25 x $0.50 + 4,000 x $2.50) = $0.239. The judgement on Sonnet 5.5:
    // 2 x (30,000 x $2 + 12,000 x $10) = $0.360. $0.599 in all.
    expect(FEATURE_CALLS.intake.steps).toEqual([
      { model: READ_SHORTLIST_MODEL, inputCeilingTokens: 175_000, maxTokens: READ_SHORTLIST_MAX_TOKENS, cacheWrite: true },
      { model: READ_JUDGE_MODEL, inputCeilingTokens: 30_000, maxTokens: READ_JUDGE_MAX_TOKENS },
    ]);
    expect(featureWorstCaseMicroUsd("intake")).toBe(598_750);
    // Whatever model the row recorded, the steps price it; only the stub costs nothing.
    expect(featureWorstCaseMicroUsd("intake", INTAKE_MODEL)).toBe(598_750);
  });

  it("prices Haiku 5.5 on the card its prompt's length picks", () => {
    const u = (inputTokens: number) => ({ inputTokens, outputTokens: 1_000, cacheReadTokens: 0, cacheWriteTokens: 0 });
    // Up to 100K: $0.10 / $0.50. Above: $0.50 / $2.50.
    expect(costMicroUsd("claude-haiku-5-5", u(100_000))).toBe(10_500);
    expect(costMicroUsd("claude-haiku-5-5", u(100_001))).toBe(Math.ceil(100_001 * 0.5 + 2_500));
    // A cached prompt is still the prompt: 150K read from the cache is on the dearer card, at 0.1x.
    expect(costMicroUsd("claude-haiku-5-5", { inputTokens: 1_000, outputTokens: 0, cacheReadTokens: 150_000, cacheWriteTokens: 0 })).toBe(Math.ceil((1_000 + 15_000) * 0.5));
  });

  it("prices a cache-writing call's input at the write rate", () => {
    expect(worstCaseMicroUsd("claude-sonnet-5-5", 1_000, 0, { cacheWrite: true })).toBe(2 * 1_250 * 2);
    expect(worstCaseMicroUsd("claude-sonnet-5-5", 1_000, 0)).toBe(2 * 1_000 * 2);
  });

  it("has a rate for every feature's model, so no reservation can be priced at nothing", () => {
    for (const call of Object.values(FEATURE_CALLS)) {
      expect(RATES[call.model]).toBeDefined();
      for (const step of call.steps ?? []) expect(RATES[step.model]).toBeDefined();
    }
  });

  it("prices a reservation at the model it recorded, falling back to the feature's", () => {
    expect(featureWorstCaseMicroUsd("tuning", "claude-opus-5")).toBe(2 * (12_000 * 5 + TUNING_MAX_TOKENS * 25));
    expect(featureWorstCaseMicroUsd("tuning", null)).toBe(featureWorstCaseMicroUsd("tuning"));
  });
});
