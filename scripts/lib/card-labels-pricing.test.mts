import { describe, expect, it } from "vitest";

import { BATCH_DISCOUNT, CACHE_READ, CACHE_WRITE_5M, RATES } from "../eval/lib/pricing.mjs";
import { ALL_MODELS, PRICING } from "./card-labels-pricing.mjs";

/**
 * This module's rates must be the canonical table's, halved by the Batch API.
 *
 * `scripts/eval/lib/pricing.mts` is the repository's verified model table, checked against
 * the claude-api skill's own rates. This file had `claude-sonnet-5` at Sonnet 4.5's $3/$15
 * for its whole life, and nothing failed: the sample ran, the ledger reconciled, the report
 * published. What it cost was a cap that could not hold — `worstTotal` and the ledger
 * reservation both read this row, so an opt-in run was approved against a ceiling two
 * thirds of its real one — and a projection overstated by exactly 3/2.
 *
 * Which is the same lesson as the label vocabulary next door, in the same shape: a second
 * table written from memory agrees with itself forever. Caught by review, not by a test,
 * so here is the test.
 */
describe("the label pricing is the canonical table at batch rates", () => {
  /** The published model id each key submits, which is how the two tables are joined. */
  const CANONICAL = {
    haiku: "claude-haiku-4-5",
    sonnet: "claude-sonnet-4-5",
    sonnet5: "claude-sonnet-5",
  } as const satisfies Record<keyof typeof PRICING, string>;

  // COVERAGE first, so a model added to `ALL_MODELS` cannot quietly escape the comparison
  // — which is exactly how a wrong rate survives.
  it("maps every submittable model to a canonical id", () => {
    expect(Object.keys(ALL_MODELS).sort()).toEqual(Object.keys(CANONICAL).sort());
  });

  for (const [key, id] of Object.entries(CANONICAL) as [keyof typeof PRICING, string][]) {
    // EVERY model is asserted, and a missing canonical row FAILS rather than skipping.
    //
    // It used to skip, and the model it skipped was Sonnet 4.5 — the one the full run
    // actually pays with, whose $41.09 projection and $55 hard stop are both computed from
    // this table. A skip there is the same silent gap that let Sonnet 5 carry the wrong
    // rates: nothing fails, and the cap is computed from a figure nothing checks.
    const canonical = RATES[id];
    it(`${key} matches ${id} at batch rates`, () => {
      expect(canonical, `${id} has no row in the canonical table`).toBeDefined();
      if (!canonical) return;
      const p = PRICING[key];
      expect(p.in, "input").toBeCloseTo(canonical.input * BATCH_DISCOUNT, 6);
      expect(p.out, "output").toBeCloseTo(canonical.output * BATCH_DISCOUNT, 6);
      // The cache meters are multiples of INPUT, and the batch discount applies to them
      // too — the discounts stack, per the canonical table's own header.
      expect(p.cacheWrite, "cache write").toBeCloseTo(canonical.input * CACHE_WRITE_5M * BATCH_DISCOUNT, 6);
      expect(p.cacheRead, "cache read").toBeCloseTo(canonical.input * CACHE_READ * BATCH_DISCOUNT, 6);
    });
  }
});
