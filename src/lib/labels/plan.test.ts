import { describe, expect, it } from "vitest";

import {
  CARDS_PER_REQUEST, meetsFloor, planChunks, runToken, withinCap, worstCaseUsd,
} from "./plan";

const names = (n: number) => Array.from({ length: n }, (_, i) => `Card ${i}`);

describe("runToken", () => {
  // Short because the provider caps `custom_id`, and the run id is a 29-character timestamp.
  it("is short enough to leave room in a custom id", () => {
    expect(runToken("run-2026-09-26T06-54-54-984Z")).toHaveLength(7);
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
