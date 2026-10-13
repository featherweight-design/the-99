import { afterEach, describe, expect, it, vi } from "vitest";

// The limit reads the environment and nothing else; the database is never reached.
vi.mock("../../db", () => ({ db: {} }));

import { PgDialect } from "drizzle-orm/pg-core";
import { callMicroFor, dailyLimitFor, joinBilled, ownerShareMicro, recordModelUsage, reserveModelCall, settleModelCall } from "./allowance";
import { modelCallParts } from "../../db/schema";
import { costMicroUsd } from "./prices";
import type { ModelFeature } from "./allowance-rule";
import { FEATURE_CALLS, featureWorstCaseMicroUsd } from "./prices";
import { MODEL_FRIEND_DAILY_ALLOWANCE, MODEL_OWNER_DAILY_ALLOWANCE, RESERVATION_TTL_MS } from "./allowance-rule";

describe("ownerShareMicro", () => {
  const before = process.env.MODEL_OWNER_MONTHLY_USD;
  afterEach(() => {
    if (before === undefined) delete process.env.MODEL_OWNER_MONTHLY_USD;
    else process.env.MODEL_OWNER_MONTHLY_USD = before;
  });

  it("reads MODEL_OWNER_MONTHLY_USD, and falls back to five on unset or garbage", () => {
    delete process.env.MODEL_OWNER_MONTHLY_USD;
    expect(ownerShareMicro()).toBe(5_000_000);
    process.env.MODEL_OWNER_MONTHLY_USD = "25";
    expect(ownerShareMicro()).toBe(25_000_000);
    process.env.MODEL_OWNER_MONTHLY_USD = "-1";
    expect(ownerShareMicro()).toBe(5_000_000);
  });
});

describe("dailyLimitFor", () => {
  const keys = ["MODEL_OWNER_USER_ID", "MODEL_OWNER_DAILY_ALLOWANCE"] as const;
  const before = keys.map((k) => process.env[k]);
  afterEach(() => {
    keys.forEach((k, i) => {
      if (before[i] === undefined) delete process.env[k];
      else process.env[k] = before[i];
    });
  });

  it("gives the owner an overridden limit, and a friend still five", () => {
    process.env.MODEL_OWNER_USER_ID = "user_owner";
    process.env.MODEL_OWNER_DAILY_ALLOWANCE = "100";
    expect(dailyLimitFor("user_owner")).toBe(100);
    expect(dailyLimitFor("user_friend")).toBe(5);
  });

  it("ignores a garbage override, and an override with no owner", () => {
    process.env.MODEL_OWNER_USER_ID = "user_owner";
    process.env.MODEL_OWNER_DAILY_ALLOWANCE = "lots";
    expect(dailyLimitFor("user_owner")).toBe(10);
    delete process.env.MODEL_OWNER_USER_ID;
    process.env.MODEL_OWNER_DAILY_ALLOWANCE = "100";
    expect(dailyLimitFor("user_owner")).toBe(5);
  });

  it("gives the owner ten and everyone else five", () => {
    process.env.MODEL_OWNER_USER_ID = "user_owner";
    expect([MODEL_OWNER_DAILY_ALLOWANCE, MODEL_FRIEND_DAILY_ALLOWANCE]).toEqual([10, 5]);
    expect(dailyLimitFor("user_owner")).toBe(10);
    expect(dailyLimitFor("user_friend")).toBe(5);
  });

  it("fails closed: unset or empty, no account is the owner", () => {
    delete process.env.MODEL_OWNER_USER_ID;
    expect(dailyLimitFor("user_owner")).toBe(5);
    expect(dailyLimitFor("")).toBe(5);
    process.env.MODEL_OWNER_USER_ID = "   ";
    expect(dailyLimitFor("")).toBe(5);
    expect(dailyLimitFor("   ")).toBe(5);
  });
});

describe("callMicroFor", () => {
  it("measures a named feature against its own call, and an unnamed one against the cheapest", () => {
    const features = Object.keys(FEATURE_CALLS) as ModelFeature[];
    const cheapest = Math.min(...features.map((f) => featureWorstCaseMicroUsd(f)));
    expect(callMicroFor()).toBe(cheapest);
    for (const f of features) expect(callMicroFor(f)).toBe(featureWorstCaseMicroUsd(f));
    // The case the named form exists for: a feature dearer than the cheapest is judged by its own.
    const dearest = features.reduce((a, b) => (featureWorstCaseMicroUsd(a) >= featureWorstCaseMicroUsd(b) ? a : b));
    expect(callMicroFor(dearest)).toBeGreaterThan(callMicroFor());
  });
});

describe("reserveModelCall and the origins", () => {
  it("prices the cap from player rows only and writes its own origin", async () => {
    const wheres: unknown[] = [];
    let inserted: Record<string, unknown> | undefined;
    const answers: unknown[][] = [[{ app: "0", user: "0" }], [], []];
    const tx = {
      execute: async () => undefined,
      select: () => ({ from: () => ({ where: (w: unknown) => { wheres.push(w); return Promise.resolve(answers.shift() ?? []); } }) }),
      insert: () => ({ values: (v: Record<string, unknown>) => { inserted = v; return { returning: async () => [{ id: "call-1" }] }; } }),
    };
    const got = await reserveModelCall(tx as never, "user_a", "tuning", "claude-sonnet-5");
    expect(got).toEqual({ id: "call-1" });
    expect(inserted?.origin).toBe("player");
    const dialect = new PgDialect();
    // The month's priced and unpriced reads AND the window's ledger rows: a system call is a credit in none.
    expect(wheres).toHaveLength(3);
    for (const w of wheres) {
      const q = dialect.sqlToQuery(w as never);
      expect(q.sql).toContain('"model_calls"."origin" = $');
      expect(q.params).toContain("player");
    }
  });

  it("a system call checks nothing, writes origin system and never reads the player's rows", async () => {
    let inserted: Record<string, unknown> | undefined;
    const tx = {
      execute: vi.fn(async () => undefined),
      select: vi.fn(() => { throw new Error("a system call read the ledger"); }),
      insert: () => ({ values: (v: Record<string, unknown>) => { inserted = v; return { returning: async () => [{ id: "call-s" }] }; } }),
    };
    const got = await reserveModelCall(tx as never, "user_a", "synopsis", "claude-sonnet-5", new Date(), "system");
    expect(got).toEqual({ id: "call-s" });
    expect(inserted).toMatchObject({ userId: "user_a", feature: "synopsis", origin: "system" });
    // No lock, no month's spend, no allowance: the player path's three reads never ran.
    expect(tx.execute).not.toHaveBeenCalled();
    expect(tx.select).not.toHaveBeenCalled();
  });
});

describe("joinBilled", () => {
  // Help me choose's read bills two calls on two models under one reservation.
  it("sums the meters, joins the models, and prices each call on its own model", () => {
    const shortlist = { model: "claude-haiku-5-5", usage: { inputTokens: 2_000, outputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 150_000 } };
    const judge = { model: "claude-sonnet-5-5", usage: { inputTokens: 10_000, outputTokens: 2_000, cacheReadTokens: 0, cacheWriteTokens: 0 } };
    expect(joinBilled([shortlist, judge])).toEqual({
      model: "claude-haiku-5-5+claude-sonnet-5-5",
      usage: { inputTokens: 12_000, outputTokens: 2_100, cacheReadTokens: 0, cacheWriteTokens: 150_000 },
      // Haiku on its >100K card: (2,000 + 150,000 x 1.25) x 0.5 + 100 x 2.5; Sonnet: 20,000 + 20,000.
      costMicroUsd: Math.ceil((2_000 + 187_500) * 0.5 + 250) + 40_000,
    });
  });
});

describe("recordModelUsage writes one part per provider call (admin brief, rule 13)", () => {
  const usage = (n: number) => ({ inputTokens: n, outputTokens: n, cacheReadTokens: 0, cacheWriteTokens: 0 });
  // A transaction whose parent UPDATE matches (`first`) or finds the meters already recorded.
  const fakeTx = (first: boolean) => {
    const inserted: { table: unknown; rows: unknown[] }[] = [];
    const tx = {
      update: () => ({ set: () => ({ where: () => ({
        // Dated before this month, so the alarm read is never reached.
        returning: async () => (first ? [{ createdAt: new Date("2000-01-01T00:00:00Z"), cost: 1 }] : []),
      }) }) }),
      insert: (table: unknown) => ({ values: async (rows: unknown[]) => { inserted.push({ table, rows }); } }),
    };
    return { tx: tx as never, inserted };
  };

  it("records each call with its own step, model, effort and cost", async () => {
    const { tx, inserted } = fakeTx(true);
    await recordModelUsage(tx, "call_1", [
      { model: "claude-haiku-5-5", usage: usage(100), step: "shortlist", effort: "medium" },
      { model: "claude-sonnet-5-5", usage: usage(200), step: "judgement", effort: "medium" },
    ]);
    expect(inserted).toHaveLength(1);
    expect(inserted[0].table).toBe(modelCallParts);
    expect(inserted[0].rows).toEqual([
      expect.objectContaining({ callId: "call_1", step: "shortlist", model: "claude-haiku-5-5", effort: "medium", inputTokens: 100, costMicroUsd: costMicroUsd("claude-haiku-5-5", usage(100)) }),
      expect.objectContaining({ callId: "call_1", step: "judgement", model: "claude-sonnet-5-5", effort: "medium", inputTokens: 200, costMicroUsd: costMicroUsd("claude-sonnet-5-5", usage(200)) }),
    ]);
  });

  it("names a lone call `call` with effort not recorded when its writer set neither", async () => {
    const { tx, inserted } = fakeTx(true);
    await recordModelUsage(tx, "call_2", { model: "claude-sonnet-5", usage: usage(10) });
    expect(inserted[0].rows).toEqual([expect.objectContaining({ step: "call", effort: null })]);
  });

  it("writes no part for a bill marked noCall, while the parent's cost still settles", async () => {
    const { tx, inserted } = fakeTx(true);
    await recordModelUsage(tx, "call_4", [{ model: "claude-haiku-5-5", usage: usage(0), step: "shortlist", effort: null, noCall: true }]);
    expect(inserted).toHaveLength(0);
  });

  it("writes no parts when the parent's meters were already recorded, so a late or retried write counts once", async () => {
    const { tx, inserted } = fakeTx(false);
    await recordModelUsage(tx, "call_3", { model: "claude-sonnet-5", usage: usage(10), step: "write", effort: "low" });
    expect(inserted).toHaveLength(0);
  });
});

describe("settleModelCall: what the row ends on, and why", () => {
  const now = new Date("2026-10-13T12:00:00Z");
  // A transaction whose UPDATE records its `set` and answers with the row it moved (none when it was no longer reserved).
  const fakeTx = (moved: { status: string } | null) => {
    const seen: { set?: Record<string, unknown> } = {};
    const tx = {
      update: () => ({ set: (v: Record<string, unknown>) => { seen.set = v; return { where: () => ({ returning: async () => (moved ? [moved] : []) }) }; } }),
    };
    return { tx: tx as never, seen };
  };
  const rendered = (v: unknown) => new PgDialect().sqlToQuery(v as never);

  it("a refund carries the reason its caller names", async () => {
    const { tx, seen } = fakeTx({ status: "refunded" });
    expect(await settleModelCall(tx, "call", "refunded", undefined, now, "reaped")).toBe("refunded");
    expect(seen.set).toEqual({ status: "refunded", refundReason: "reaped" });
  });

  it("a refund whose caller names none stores none", async () => {
    const { tx, seen } = fakeTx({ status: "refunded" });
    await settleModelCall(tx, "call", "refunded", undefined, now);
    expect(seen.set).toEqual({ status: "refunded", refundReason: null });
  });

  it("a spend is decided in the statement: spent while the reservation is live, refunded as late_success after", async () => {
    const { tx, seen } = fakeTx({ status: "spent" });
    expect(await settleModelCall(tx, "call", "spent", undefined, now, "failed")).toBe("spent");
    const status = rendered(seen.set?.status);
    const reason = rendered(seen.set?.refundReason);
    expect(status.sql).toMatch(/case when .* then 'spent' else 'refunded' end/);
    expect(reason.sql).toMatch(/case when .* then null else 'late_success' end/);
    // Both compare the row's age against the same cutoff: the TTL before `now`, and a caller's reason never replaces it.
    const cutoff = new Date(now.getTime() - RESERVATION_TTL_MS);
    expect(status.params).toEqual([cutoff.toISOString()]);
    expect(reason.params).toEqual([cutoff.toISOString()]);
  });

  it("reports the status a late success ended on, and null for a row already settled", async () => {
    expect(await settleModelCall(fakeTx({ status: "refunded" }).tx, "call", "spent", undefined, now)).toBe("refunded");
    expect(await settleModelCall(fakeTx(null).tx, "call", "spent", undefined, now)).toBeNull();
  });
});
