import { describe, expect, it } from "vitest";

import { refusal } from "./ledger.mjs";
import { costUsd, worstCaseUsd } from "./pricing.mjs";
import { DEV_COUNT, OVERLAY_COUNT, splitDecks } from "./split.mjs";

describe("costUsd", () => {
  it("prices every meter, and the batch halves all of them", () => {
    const usage = { input_tokens: 1_000_000, output_tokens: 1_000_000, cache_creation_input_tokens: 1_000_000, cache_read_input_tokens: 1_000_000 };
    // Sonnet 5: 2 + 10 + 2 × 1.25 + 2 × 0.1
    expect(costUsd("claude-sonnet-5", usage, { batch: false })).toBeCloseTo(14.7);
    expect(costUsd("claude-sonnet-5", usage, { batch: true })).toBeCloseTo(7.35);
  });

  it("refuses to price a model it has no rate for, rather than calling it free", () => {
    expect(() => costUsd("claude-haiku-4-5-20251001", { input_tokens: 1, output_tokens: 1 }, { batch: true })).toThrow();
  });

  it("puts the worst case above any real reply: full ceiling, cache-write input, and a retry", () => {
    const real = costUsd("claude-haiku-4-5", { input_tokens: 4000, output_tokens: 3000 }, { batch: true });
    expect(worstCaseUsd("claude-haiku-4-5", 4000, 3000, { batch: true })).toBeGreaterThan(2 * real);
  });
});

describe("refusal", () => {
  const at = (usd: number) => ({ entries: [{ at: "", runId: "r", source: "s", usd, requests: 1 }] });
  it("stops a batch whose worst case would cross the cap", () => {
    expect(refusal(at(20), 6, 0.9)).toMatch(/cross/);
    expect(refusal(at(20), 4, 0.9)).toBeNull();
  });
  it("stops and asks at $15 before the plan is half done, not after", () => {
    expect(refusal(at(15), 0, 0.4)).toMatch(/ask/);
    expect(refusal(at(15), 0, 0.6)).toBeNull();
  });
});

describe("splitDecks", () => {
  const ids = Array.from({ length: 19 }, (_, i) => `deck-${String(i).padStart(2, "0")}`);
  it("is fixed by the ids alone, whatever order they arrive in", () => {
    expect(splitDecks([...ids].reverse())).toEqual(splitDecks(ids));
  });
  it("keeps development and held-out decks disjoint, and the overlay inside the held-out set", () => {
    const s = splitDecks(ids);
    expect(s.dev).toHaveLength(DEV_COUNT);
    expect(s.heldOut).toHaveLength(19 - DEV_COUNT);
    expect(s.dev.filter((d) => s.heldOut.includes(d))).toEqual([]);
    expect(s.overlay).toEqual(s.heldOut.slice(0, OVERLAY_COUNT));
  });
});
