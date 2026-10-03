import { readdirSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  boundedNumber, budgetFamily, CARDS_PER_REQUEST, chunkHash, familySpend, MEASURED_PER_CARD, meetsFloor,
  modelToken, pauseRemediation, planChunks, projectedTotalUsd, runToken, waveSize,
  withinCap,
  worstCaseUsd,
  type SpendRow,
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

  // Every id must fit the provider's cap with room to spare, for every model name — including a
  // retried chunk, whose attempt number makes the id longer.
  it("keeps every custom id short", () => {
    for (const model of ["haiku", "sonnet", "sonnet5"]) {
      for (const c of planChunks("run-2026-09-26T06-54-54-984Z", model, names(5000))) {
        expect(c.customId.length, c.customId).toBeLessThan(32);
      }
      const retried = planChunks("r", model, names(12), Array.from({ length: 98 }, () => names(12)));
      expect(retried[0].customId.length, retried[0].customId).toBeLessThan(32);
    }
  });
});

describe("planChunks keys a chunk on WHAT it asks, not where it sits", () => {
  // The defect this replaced: keyed on index, a card entering the stale set between waves moved
  // every later chunk's contents under an unchanged key, so a resumed run had to refuse.
  it("gives the same cards the same key wherever they fall in the plan", () => {
    const all = names(24);
    const whole = planChunks("r", "haiku", all)[1];
    const alone = planChunks("r", "haiku", all.slice(12))[0];
    expect(alone.intentKey).toBe(whole.intentKey);
    expect(alone.customId).toBe(whole.customId);
  });

  it("gives different cards a different key", () => {
    const a = planChunks("r", "haiku", names(12))[0];
    const b = planChunks("r", "haiku", [...names(11), "Some Other Card"])[0];
    expect(a.intentKey).not.toBe(b.intentKey);
    expect(a.customId).not.toBe(b.customId);
  });

  it("never repeats a key or a request id within one plan", () => {
    const plan = planChunks("run-2026-09-26T06-54-54-984Z", "sonnet", names(5000));
    expect(new Set(plan.map((c) => c.intentKey)).size).toBe(plan.length);
    expect(new Set(plan.map((c) => c.customId)).size).toBe(plan.length);
  });

  it("is the run, the model, the content hash and the attempt", () => {
    const c = planChunks("backfill-2026-10-02", "haiku", names(12))[0];
    expect(c.intentKey).toBe(`backfill-2026-10-02:haiku:${chunkHash(names(12))}:1`);
  });

  it("hashes the names in order, with a separator a name cannot contain", () => {
    expect(chunkHash(["ab", "c"])).not.toBe(chunkHash(["a", "bc"]));
    expect(chunkHash(["a", "b"])).toHaveLength(10);
  });
});

describe("a chunk asked again after a terminal failure takes the next attempt", () => {
  // Content addressing reproduces the key of a chunk whose batch expired or errored, and that key
  // is already in the ledger. Reused, the insert-as-claim reads it as another process's claim.
  it("moves to attempt 2 when this run already recorded the same cards", () => {
    const first = planChunks("r", "haiku", names(12))[0];
    const again = planChunks("r", "haiku", names(12), [names(12)])[0];
    expect(again.intentKey).toBe(first.intentKey.replace(/:1$/, ":2"));
    expect(again.customId).not.toBe(first.customId);
  });

  it("counts every earlier attempt, so a third try does not collide with the second", () => {
    const third = planChunks("r", "haiku", names(12), [names(12), names(12)])[0];
    expect(third.intentKey.endsWith(":3")).toBe(true);
  });

  it("leaves a chunk nobody asked before at attempt 1", () => {
    const fresh = planChunks("r", "haiku", names(12), [names(13).slice(1)])[0];
    expect(fresh.intentKey.endsWith(":1")).toBe(true);
  });
});

describe("budgetFamily", () => {
  // The defect: the cap bounded one run id, so a backfill dispatched again under a new date
  // started from $0 with a fresh $55.
  it("puts every dated backfill in one budget", () => {
    expect(budgetFamily("backfill-2026-09-28")).toBe(budgetFamily("backfill-2026-10-02"));
  });

  it("gives each ISO-week cron run its own budget, apart from the backfills", () => {
    expect(budgetFamily("weekly-2026-W40")).not.toBe(budgetFamily("weekly-2026-W41"));
    expect(budgetFamily("weekly-2026-W40")).toBe("weekly-2026-W40");
    expect(budgetFamily("weekly-2026-W40")).not.toBe(budgetFamily("backfill-2026-09-28"));
  });

  it("matches the workflow's exact shapes, so a hand-typed id does not join a budget", () => {
    expect(budgetFamily("weekly-something")).toBe("weekly-something");
    expect(budgetFamily("backfill-tomorrow")).toBe("backfill-tomorrow");
  });

  it("keeps any other id in a budget of its own", () => {
    expect(budgetFamily("run-2026-09-26T06-54-54-984Z")).toBe("run-2026-09-26T06-54-54-984Z");
    expect(budgetFamily("run-A")).not.toBe(budgetFamily("run-B"));
  });
});

describe("familySpend", () => {
  const rates = { in: 1, out: 10 };
  /** 1,000 output tokens at $10 a million: $0.01 a row. */
  const row = (over: Partial<SpendRow>): SpendRow => ({
    runId: "backfill-2026-09-28", status: "collected", promptVersion: "7", askedCards: 12,
    inTokens: 0, outTokens: 1000, cacheWriteTokens: 0, cacheReadTokens: 0, ...over,
  });
  const sum = (rows: SpendRow[], runId = "backfill-2026-10-02") => familySpend(rows, runId, "7", rates, 0.5);

  it("sums every run in the family, not the current run id alone", () => {
    const s = sum([row({}), row({ runId: "backfill-2026-10-01" })]);
    expect(s.measuredUsd).toBeCloseTo(0.02);
    expect(s.measuredCards).toBe(24);
  });

  it("leaves another family's spend out", () => {
    expect(sum([row({ runId: "weekly-2026-W40" }), row({ runId: "run-x" })]).totalUsd).toBe(0);
  });

  // A row from before the column has no record of which prompt it priced.
  it("counts a row with no prompt version for nothing", () => {
    expect(sum([row({ promptVersion: null, outTokens: 10_000_000 })]).totalUsd).toBe(0);
    expect(sum([row({ promptVersion: null, status: "expired", outTokens: null })]).totalUsd).toBe(0);
  });

  it("counts another prompt version's row for nothing", () => {
    expect(sum([row({ promptVersion: "6" })]).totalUsd).toBe(0);
  });

  it("reserves an expired batch at the worst case and never reads its tokens", () => {
    const s = sum([row({ status: "expired", inTokens: null, outTokens: null })]);
    expect(s.expiredChunks).toBe(1);
    expect(s.totalUsd).toBe(0.5);
  });

  // Reachable: a batch held under the floor records its usage, and its results can later expire.
  // The reserve already covers that batch at its worst case; adding its tokens too counts it twice.
  it("counts an expired batch that had recorded usage by its reserve alone", () => {
    const s = sum([row({ status: "expired", outTokens: 1000 })]);
    expect(s.totalUsd).toBe(0.5);
    expect(s.measuredCards).toBe(0);
  });

  // Content addressing re-plans a failed chunk to the same cards. The
  // failed row and its retry are two rows, and each is counted once — by its own status.
  it("counts an expired chunk and its retry once each", () => {
    const s = sum([
      row({ status: "expired", inTokens: null, outTokens: null }),
      row({ status: "collected", outTokens: 1000 }),
    ]);
    expect(s.reserveUsd).toBe(0.5);
    expect(s.measuredUsd).toBeCloseTo(0.01);
    expect(s.totalUsd).toBeCloseTo(0.51);
  });

  it("counts a batch whose every request errored as free, and its retry once", () => {
    const s = sum([
      row({ status: "failed", inTokens: null, outTokens: null, cacheWriteTokens: null, cacheReadTokens: null }),
      row({ status: "collected" }),
    ]);
    expect(s.totalUsd).toBeCloseTo(0.01);
    expect(s.expiredChunks).toBe(0);
  });

  // A batch held under the floor stays open, and it was still paid for.
  it("counts a held batch's measured usage although it is not collected", () => {
    expect(sum([row({ status: "in_progress" })]).measuredUsd).toBeCloseTo(0.01);
  });

  it("prices cache writes and reads as the provider bills them", () => {
    const s = sum([row({ outTokens: 0, inTokens: 1000, cacheWriteTokens: 1000, cacheReadTokens: 1000 })]);
    expect(s.measuredUsd).toBeCloseTo((1000 + 1250 + 100) / 1e6);
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

  it("books the instruction block at the write rate when caching makes it one", () => {
    const usd = worstCaseUsd(2, 1000, 0, 0, { ...rates, system: 1.875 });
    expect(usd).toBeCloseTo((2 * 1000 * 1.875) / 1e6, 10);
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

describe("modelToken", () => {
  // `model.slice(0, 1)` gave every Anthropic id the same token, because they all start `claude-`.
  // Two models in one run then produce identical custom ids, which the unique constraint rejects —
  // and the insert is a claim, so the second model's chunks go unclaimed while the request is sent.
  it("distinguishes models that share a long prefix", () => {
    const ids = ["claude-sonnet-4-5", "claude-sonnet-5", "claude-haiku-4-5-20251001"];
    expect(new Set(ids.map(modelToken)).size).toBe(ids.length);
  });

  it("is stable, so a resumed run reproduces its own ids", () => {
    expect(modelToken("claude-sonnet-4-5")).toBe(modelToken("claude-sonnet-4-5"));
  });

  it("keeps two models' chunk ids apart at the same index", () => {
    const a = planChunks("r", "claude-sonnet-4-5", names(12))[0].customId;
    const b = planChunks("r", "claude-sonnet-5", names(12))[0].customId;
    expect(a).not.toBe(b);
  });
});

describe("what a paused run tells the operator", () => {
  // The bound the dispatch form enforces. Pinned against the workflow in
  // `scripts/lib/card-labels-workflow.test.mts`; used here as the argument it is.
  const CEILING = 50;

  it("names a reachable figure when the form can reach it", () => {
    const r = pauseRemediation(41.09, CEILING);
    expect(r.canResume).toBe(true);
    expect(r.neededUsd).toBe(41.09);
    expect(r.text).toContain("$41.09");
  });

  it("rounds the needed figure UP, so the retry does not pause on a rounding error", () => {
    // The run's own comparison is `projected > line`, so a line at a TRUNCATED projection pauses
    // again. 41.081 must ask for 41.09, never 41.08.
    expect(pauseRemediation(41.081, CEILING).neededUsd).toBe(41.09);
    expect(pauseRemediation(41.081, CEILING).text).not.toContain("$41.08 ");
  });

  it("does not offer a dispatch it cannot reach", () => {
    // THE INVARIANT, asserted rather than the wording — this sentence has been wrong three times
    // and each wrong version read perfectly well. Past the ceiling there is no input to name.
    const r = pauseRemediation(60, CEILING);
    expect(r.canResume).toBe(false);
    expect(r.text).not.toMatch(/dispatch again/i);
    expect(r.text).toMatch(/NO DISPATCH CAN DO IT/);
  });

  it("refuses to resume at exactly the ceiling's own figure and one cent past it", () => {
    // The boundary in both directions, because `<=` and `<` read identically and differ here.
    expect(pauseRemediation(50, CEILING).canResume).toBe(true);
    expect(pauseRemediation(50.01, CEILING).canResume).toBe(false);
  });
});

describe("the projection's measured rate", () => {
  it("projects measured spend plus the remaining cards at the rate", () => {
    expect(projectedTotalUsd(0, 28666, MEASURED_PER_CARD.usd)).toBeCloseTo(28666 * 0.001902, 10);
    expect(projectedTotalUsd(10, 1000, 0.002)).toBeCloseTo(12, 10);
  });

  // A rate with no source went stale once already. The constant must be the NEWEST committed re-sample's
  // measured figure, so a later re-sample that is published without moving it fails here.
  it("is the newest committed re-sample's measured rate, from the run it names", () => {
    const dir = "docs/superpowers/benchmarks";
    const newest = readdirSync(dir)
      .map((f) => /^2026-09-28-card-label-vocabulary-resample-(\d+)-cost\.json$/.exec(f))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => Number(m[1]))
      .sort((a, b) => b - a)[0];
    const at = `${dir}/2026-09-28-card-label-vocabulary-resample-${newest}`;
    const cost = JSON.parse(readFileSync(`${at}-cost.json`, "utf8"));
    expect(MEASURED_PER_CARD.usd).toBe(cost.perModel.sonnet.usdPerCard);
    expect(MEASURED_PER_CARD.runId).toBe(JSON.parse(readFileSync(`${at}-run.json`, "utf8")).runId);
    expect(MEASURED_PER_CARD.source).toBe(`${at}-cost.json`);
  });
});
