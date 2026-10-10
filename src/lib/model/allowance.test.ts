import { afterEach, describe, expect, it, vi } from "vitest";

// The limit reads the environment and nothing else; the database is never reached.
vi.mock("../../db", () => ({ db: {} }));

import { PgDialect } from "drizzle-orm/pg-core";
import { callMicroFor, dailyLimitFor, reserveModelCall } from "./allowance";
import type { ModelFeature } from "./allowance-rule";
import { FEATURE_CALLS, featureWorstCaseMicroUsd } from "./prices";
import { MODEL_FRIEND_DAILY_ALLOWANCE, MODEL_OWNER_DAILY_ALLOWANCE } from "./allowance-rule";

describe("dailyLimitFor", () => {
  const before = process.env.MODEL_OWNER_USER_ID;
  afterEach(() => {
    if (before === undefined) delete process.env.MODEL_OWNER_USER_ID;
    else process.env.MODEL_OWNER_USER_ID = before;
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
    for (const w of wheres.slice(0, 2)) {
      const q = dialect.sqlToQuery(w as never);
      expect(q.sql).toContain('"model_calls"."origin" = $');
      expect(q.params).toContain("player");
    }
  });
});
