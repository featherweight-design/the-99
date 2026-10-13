import { describe, expect, it } from "vitest";
import { retryable } from "./retry";
import { MODEL_TIMEOUT_MS, TUNING_MODEL, TUNING_RETRY_FLOOR_MS } from "./limits";

const usage = (inputTokens: number, outputTokens: number) => ({ inputTokens, outputTokens, cacheReadTokens: 0, cacheWriteTokens: 0 });
const billed = (u = usage(4_000, 900)) => [{ model: TUNING_MODEL, usage: u, step: "suggest", effort: "medium" as const }];

describe("retryable", () => {
  const dropped = [{ rule: "addNotLegal" }];
  it("allows one more ask for a cheap, early, empty answer", () => {
    expect(retryable(billed(), dropped, 10_000)).toBe(true);
    expect(retryable(billed(), [], 10_000)).toBe(true);
  });
  it("never asks again for an answer whose every drop was a locked card", () => {
    expect(retryable(billed(), [{ rule: "neverCut" }, { rule: "neverCut" }], 10_000)).toBe(false);
    expect(retryable(billed(), [{ rule: "neverCut" }, { rule: "overCap" }], 10_000)).toBe(true);
  });
  it("does not ask when a first ask already used more than one whole attempt (callModel retried inside it)", () => {
    expect(retryable(billed(usage(20_000, 12_000)), dropped, 10_000)).toBe(false);
  });
  it("does not ask when a whole attempt no longer fits the deadline", () => {
    expect(retryable(billed(), dropped, MODEL_TIMEOUT_MS - TUNING_RETRY_FLOOR_MS)).toBe(true);
    expect(retryable(billed(), dropped, MODEL_TIMEOUT_MS - TUNING_RETRY_FLOOR_MS + 1)).toBe(false);
  });
  it("does not ask when nothing was billed", () => {
    expect(retryable([], dropped, 0)).toBe(false);
  });
});
