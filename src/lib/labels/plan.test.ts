import { describe, expect, it } from "vitest";

import {
  boundedNumber, CARDS_PER_REQUEST, meetsFloor, planChunks, runToken, waveSize, withinCap,
  worstCaseUsd,
} from "./plan";

const names = (n: number) => Array.from({ length: n }, (_, i) => `Card ${i}`);

describe("runToken", () => {
  // Short because the provider caps `custom_id`, and the run id is a 29-character timestamp.
  it("is short enough to leave room in a custom id", () => {
    expect(runToken("run-2026-09-26T06-54-54-984Z")).toHaveLength(12);
  });

  it("is stable for one run id, so a resumed run reproduces its own ids", () => {
    expect(runToken("run-A")).toBe(runToken("run-A"));
  });

  // The property #1056 round 4 was about: ids that repeat across runs make a recovery
  // listing match an earlier run's request, which either adopts a stale result or re-pays.
  it("differs between runs", () => {
    expect(runToken("run-A")).not.toBe(runToken("run-B"));
  });
});

describe("planChunks", () => {
  it("splits into requests of CARDS_PER_REQUEST, last one short", () => {
    const c = planChunks("r", "haiku", names(CARDS_PER_REQUEST * 2 + 5));
    expect(c).toHaveLength(3);
    expect(c[0].names).toHaveLength(CARDS_PER_REQUEST);
    expect(c[2].names).toHaveLength(5);
  });

  it("covers every card exactly once, in order", () => {
    const all = names(29);
    expect(planChunks("r", "haiku", all).flatMap((c) => c.names)).toEqual(all);
  });

  it("plans nothing for no cards", () => {
    expect(planChunks("r", "haiku", [])).toEqual([]);
  });

  // Determinism in (runId, model, index) is what lets a resumed run find its own intent
  // rather than creating a second one.
  it("reproduces the same ids for the same run, model and order", () => {
    expect(planChunks("r", "haiku", names(25))).toEqual(planChunks("r", "haiku", names(25)));
  });

  it("gives two models in one run different request ids", () => {
    const h = planChunks("r", "haiku", names(12))[0];
    const s = planChunks("r", "sonnet", names(12))[0];
    // Same chunk index, so only the model distinguishes them — and it must.
    expect(h.customId).not.toBe(s.customId);
    expect(h.intentKey).not.toBe(s.intentKey);
  });

  it("gives two runs different request ids", () => {
    expect(planChunks("r1", "haiku", names(12))[0].customId)
      .not.toBe(planChunks("r2", "haiku", names(12))[0].customId);
  });

  // Every id must fit the provider's cap with room to spare, for every model name.
  it("keeps every custom id short", () => {
    for (const model of ["haiku", "sonnet", "sonnet5"]) {
      for (const c of planChunks("run-2026-09-26T06-54-54-984Z", model, names(5000))) {
        expect(c.customId.length, c.customId).toBeLessThan(32);
      }
    }
  });
});

describe("worstCaseUsd", () => {
  const rates = { in: 1.5, out: 7.5 };

  it("charges the instruction block once per REQUEST, not once per run", () => {
    // No caching, so two requests pay for two system blocks. Charging it once per run is
    // how an estimate under-books a cap.
    const one = worstCaseUsd(1, 1000, 0, 100, rates);
    const two = worstCaseUsd(2, 1000, 0, 100, rates);
    expect(two).toBeCloseTo(2 * one, 10);
  });

  it("books the full output ceiling for every request", () => {
    // The worst case is every request returning `max_tokens`, because the real length is
    // unknown until the model answers.
    const usd = worstCaseUsd(10, 0, 0, 4000, rates);
    expect(usd).toBeCloseTo((10 * 4000 * 7.5) / 1e6, 10);
  });

  it("scales with the cards in a request", () => {
    expect(worstCaseUsd(1, 0, 10, 0, rates))
      .toBeCloseTo((CARDS_PER_REQUEST * 10 * 1.5) / 1e6, 10);
  });
});

describe("withinCap", () => {
  it("allows a run inside the cap", () => {
    expect(withinCap(10, 0, 55).ok).toBe(true);
  });

  // The hole the sample's ledger closed twice: a second attempt must not authorise the full
  // amount again on top of what a partial run already spent.
  it("counts what earlier runs already spent", () => {
    expect(withinCap(30, 30, 55).ok).toBe(false);
    const v = withinCap(30, 30, 55);
    if (!v.ok) expect(v.why).toContain("already spent");
  });

  it("refuses at the boundary only when it would PASS the cap", () => {
    expect(withinCap(55, 0, 55).ok).toBe(true);
    expect(withinCap(55.01, 0, 55).ok).toBe(false);
  });
});

describe("meetsFloor", () => {
  it("publishes when the share clears the floor", () => {
    expect(meetsFloor(96, 100, 0.95).ok).toBe(true);
  });

  it("refuses below the floor and says what came back", () => {
    const v = meetsFloor(90, 100, 0.95);
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.why).toContain("90 of 100");
      expect(v.why).toContain("the previous labels stand");
    }
  });

  it("publishes exactly at the floor", () => {
    expect(meetsFloor(95, 100, 0.95).ok).toBe(true);
  });

  // 0/0 is 1 by the formula, and "nothing was asked for" is not a successful run. Without
  // this, an empty query would publish an empty table over a good one.
  it("refuses a run that asked about nothing", () => {
    const v = meetsFloor(0, 0, 0.95);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.why).toContain("no cards at all");
  });
});

describe("waveSize", () => {
  const rates = { in: 0, out: 7.5 };
  // $7.50 per million output, 1,000-token ceiling → $0.0075 a request.
  const size = (remaining: number, cap?: number) =>
    waveSize(remaining, 0, 0, 1000, rates, cap);

  it("fits as many requests as the remaining budget allows", () => {
    expect(size(0.075)).toBe(10);
  });

  // The whole reason this exists: one `batches.create` is atomic, so a wave that overruns
  // the budget cannot be stopped part-way.
  it("never plans a wave whose worst case passes the remainder", () => {
    for (const remaining of [0.01, 0.1, 1, 3]) {
      const n = size(remaining);
      expect(worstCaseUsd(n, 0, 0, 1000, rates)).toBeLessThanOrEqual(remaining);
    }
  });

  it("returns 0 when not even one request fits", () => {
    expect(size(0.001)).toBe(0);
    expect(size(0)).toBe(0);
  });

  it("is bounded by the cap even with budget to spare", () => {
    expect(size(1000, 300)).toBe(300);
  });

  it("never returns a negative size for a negative remainder", () => {
    expect(size(-5)).toBe(0);
  });
});

describe("boundedNumber", () => {
  it("takes the fallback when unset or empty", () => {
    expect(boundedNumber("X", undefined, 55, 0, 100)).toBe(55);
    expect(boundedNumber("X", "", 55, 0, 100)).toBe(55);
  });

  it("takes a valid override", () => {
    expect(boundedNumber("X", "12.5", 55, 0, 100)).toBe(12.5);
  });

  // THE ONE THAT MATTERS. NaN makes `worst > cap`, `share < floor` and `projected > reportAt`
  // all false, so one mistyped variable switches the cap, the floor and the pause off together
  // and the run reports that it passed every guard.
  for (const bad of ["NaN", "abc", "Infinity", "-Infinity", "1e999"]) {
    it(`refuses ${bad}`, () => {
      expect(() => boundedNumber("LABEL_FLOOR", bad, 0.95, 0, 1)).toThrow(/finite number/);
    });
  }

  // Bounded above as well: `LABEL_CAP_USD=5500` is a plausible typo for 55.
  it("refuses a value past the ceiling", () => {
    expect(() => boundedNumber("LABEL_CAP_USD", "5500", 55, 0, 100)).toThrow(/between 0 and 100/);
  });

  it("refuses a negative", () => {
    expect(() => boundedNumber("LABEL_FLOOR", "-0.5", 0.95, 0, 1)).toThrow(/between 0 and 1/);
  });

  it("allows the exact bounds", () => {
    expect(boundedNumber("X", "0", 1, 0, 1)).toBe(0);
    expect(boundedNumber("X", "1", 0, 0, 1)).toBe(1);
  });
});

describe("worstCaseUsd counts the request body's own wrapper", () => {
  const rates = { in: 1.5, out: 0 };
  // `renderBody` wraps the cards in a preamble and separators, which `perCardTokens` does not
  // cover. A ceiling that omits part of the request is not a ceiling, and this is the quantity
  // the $55 hard stop is enforced against.
  it("charges the overhead once per request", () => {
    const without = worstCaseUsd(4, 0, 0, 0, rates, 0);
    const with100 = worstCaseUsd(4, 0, 0, 0, rates, 100);
    expect(with100 - without).toBeCloseTo((4 * 100 * 1.5) / 1e6, 12);
  });

  it("feeds the wave sizing too, so a wave cannot be planned above the budget", () => {
    const n = waveSize(1, 0, 0, 0, rates, 400, 1_000_000);
    expect(worstCaseUsd(n, 0, 0, 0, rates, 1_000_000)).toBeLessThanOrEqual(1);
  });
});
