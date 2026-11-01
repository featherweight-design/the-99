import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The database is never reached: the limit's group read is handed a fake query.
vi.mock("../../db", () => ({ db: {} }));
// The model-call switch, resolved app-wide (no account): unset, so on, unless a test sets it.
// A reservation reads it strictly (a failed read refuses, `strictThrows`); a panel reads it through the memo.
const switches = vi.hoisted(() => ({ env: {} as Record<string, string>, asked: [] as unknown[], strictThrows: false }));
vi.mock("../switches/snapshot", () => ({
  resolveSwitchEnv: async (userId: unknown) => { switches.asked.push(userId); return switches.env; },
  resolveSwitchEnvStrict: async (userId: unknown) => {
    switches.asked.push(userId);
    if (switches.strictThrows) throw new Error("switch overrides could not be read");
    return switches.env;
  },
}));

import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { db } from "../../db";
import { callMicroFor, readAllowance, dailyLimitFor, dailyLimitsFor, groupAllowanceQuery, groupPaidLimitQuery, joinBilled, ownerShareMicro, recordModelUsage, reserveModelCall, settleModelCall } from "./allowance";
import { modelCallParts } from "../../db/schema";
import { costMicroUsd } from "./prices";
import type { ModelFeature } from "./allowance-rule";
import { FEATURE_CALLS, featureWorstCaseMicroUsd } from "./prices";
import { ALLOWANCE_WINDOW_MS, MODEL_DEFAULT_DAILY_ALLOWANCE, MODEL_OWNER_DAILY_ALLOWANCE, RESERVATION_TTL_MS } from "./allowance-rule";

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
  const keys = ["MODEL_OWNER_USER_ID", "MODEL_OWNER_DAILY_ALLOWANCE", "MODEL_DAILY_ALLOWANCE"] as const;
  const before = keys.map((k) => process.env[k]);
  afterEach(() => {
    keys.forEach((k, i) => {
      if (before[i] === undefined) delete process.env[k];
      else process.env[k] = before[i];
    });
  });
  // The reader's group allowances, as the membership read would return them.
  const groups = (...allowances: number[]) =>
    ({ execute: async () => ({ rows: allowances.map((allowance) => ({ user_id: "user_owner", allowance })).concat(allowances.map((allowance) => ({ user_id: "user_friend", allowance }))) }) }) as never;
  const none = groups();

  it("gives the default to a player in no group while MODEL_DAILY_ALLOWANCE is unset; the owner keeps their own", async () => {
    delete process.env.MODEL_DAILY_ALLOWANCE;
    process.env.MODEL_OWNER_USER_ID = "user_owner";
    delete process.env.MODEL_OWNER_DAILY_ALLOWANCE;
    expect([MODEL_OWNER_DAILY_ALLOWANCE, MODEL_DEFAULT_DAILY_ALLOWANCE]).toEqual([10, 1]);
    expect(await dailyLimitFor(none, "user_owner")).toBe(10);
    expect(await dailyLimitFor(none, "user_friend")).toBe(1);
    process.env.MODEL_OWNER_DAILY_ALLOWANCE = "100";
    expect(await dailyLimitFor(none, "user_owner")).toBe(100);
    expect(await dailyLimitFor(none, "user_friend")).toBe(1);
  });

  it("gives a group's allowance to its member, owner included, over the default", async () => {
    process.env.MODEL_OWNER_USER_ID = "user_owner";
    process.env.MODEL_DAILY_ALLOWANCE = "1";
    expect(await dailyLimitFor(groups(3), "user_friend")).toBe(3);
    expect(await dailyLimitFor(groups(5), "user_owner")).toBe(5);
    expect(await dailyLimitFor(groups(3, 5), "user_friend")).toBe(5);
  });

  it("takes MODEL_DAILY_ALLOWANCE for a player in no group, and the owner keeps their own", async () => {
    process.env.MODEL_OWNER_USER_ID = "user_owner";
    process.env.MODEL_DAILY_ALLOWANCE = "1";
    expect(await dailyLimitFor(none, "user_friend")).toBe(1);
    expect(await dailyLimitFor(none, "user_owner")).toBe(10);
  });

  it("ignores a garbage default or override, and an override with no owner", async () => {
    process.env.MODEL_DAILY_ALLOWANCE = "0";
    expect(await dailyLimitFor(none, "user_friend")).toBe(1);
    process.env.MODEL_OWNER_USER_ID = "user_owner";
    process.env.MODEL_OWNER_DAILY_ALLOWANCE = "lots";
    expect(await dailyLimitFor(none, "user_owner")).toBe(10);
    delete process.env.MODEL_OWNER_USER_ID;
    process.env.MODEL_OWNER_DAILY_ALLOWANCE = "100";
    expect(await dailyLimitFor(none, "user_owner")).toBe(1);
  });

  it("reads only groups that set an allowance, so a group without one names none", () => {
    const text = new PgDialect().sqlToQuery(groupAllowanceQuery(["u1", "u2"])).sql.replace(/\s+/g, " ");
    expect(text).toContain("g.daily_allowance is not null");
    expect(text).toContain("m.user_id in ($1, $2)");
  });

  it("reads only groups that set a paid limit, a query of its own so a group with only a paid limit is seen", () => {
    const text = new PgDialect().sqlToQuery(groupPaidLimitQuery(["u1"])).sql.replace(/\s+/g, " ");
    expect(text).toContain("g.paid_daily_limit is not null");
    expect(text).not.toContain("daily_allowance");
    expect(text).toContain("m.user_id in ($1)");
  });

  it("reads many accounts' limits in one statement", async () => {
    const execute = vi.fn(async () => ({ rows: [{ user_id: "u1", allowance: 3 }] }));
    const limits = await dailyLimitsFor({ execute } as never, ["u1", "u2"]);
    expect(execute).toHaveBeenCalledOnce();
    expect([limits.get("u1"), limits.get("u2")]).toEqual([3, 1]);
  });

  it("fails closed: unset or empty, no account is the owner", async () => {
    delete process.env.MODEL_DAILY_ALLOWANCE;
    delete process.env.MODEL_OWNER_USER_ID;
    expect(await dailyLimitFor(none, "user_owner")).toBe(1);
    process.env.MODEL_OWNER_USER_ID = "   ";
    expect(await dailyLimitFor(none, "   ")).toBe(1);
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
  it("reads a friend's player rows only, never a month's spend, and writes its own origin", async () => {
    const wheres: unknown[] = [];
    let inserted: Record<string, unknown> | undefined;
    const answers: unknown[][] = [[]];
    const tx = {
      execute: async () => ({ rows: [] }),
      select: () => ({ from: () => ({ where: (w: unknown) => { wheres.push(w); return Promise.resolve(answers.shift() ?? []); } }) }),
      insert: () => ({ values: (v: Record<string, unknown>) => { inserted = v; return { returning: async () => [{ id: "call-1" }] }; } }),
    };
    const got = await reserveModelCall(tx as never, "user_a", "tuning", "claude-sonnet-5");
    expect(got).toEqual({ id: "call-1" });
    expect(inserted?.origin).toBe("player");
    const dialect = new PgDialect();
    // The window's ledger rows alone: a friend has no monthly figure since 2026-10-17 (no
    // app-wide limit; only the owner's share reads one), and a system call is a credit in none.
    expect(wheres).toHaveLength(1);
    for (const w of wheres) {
      const q = dialect.sqlToQuery(w as never);
      expect(q.sql).toContain('"model_calls"."origin" = $');
      expect(q.params).toContain("player");
    }
  });

  it("refuses at the group's allowance, read through the press's own transaction", async () => {
    const now = new Date("2026-10-13T12:00:00Z");
    const spent = (n: number) => Array.from({ length: n }, (_, i) => ({ status: "spent", createdAt: new Date(now.getTime() - (i + 1) * 60_000) }));
    const dialect = new PgDialect();
    const reserve = async (used: number) => {
      const answers: unknown[][] = [spent(used)];
      const reads: string[] = [];
      const tx = {
        execute: vi.fn(async (q: never) => {
          const text = dialect.sqlToQuery(q).sql;
          reads.push(text);
          return { rows: text.includes("daily_allowance") ? [{ user_id: "user_a", allowance: 2 }] : [] };
        }),
        select: () => ({ from: () => ({ where: () => Promise.resolve(answers.shift() ?? []) }) }),
        insert: () => ({ values: () => ({ returning: async () => [{ id: "call-1" }] }) }),
      };
      return { got: await reserveModelCall(tx as never, "user_a", "tuning", "claude-sonnet-5", now), reads };
    };
    // The default would allow five; the group's two is the limit, and it is read on `tx`.
    const under = await reserve(1);
    expect(under.got).toEqual({ id: "call-1" });
    expect(under.reads.some((r) => r.includes("daily_allowance"))).toBe(true);
    expect((await reserve(2)).got).toEqual({ refused: "allowance" });
  });

  it("a system call checks nothing, writes origin system and never reads the player's rows", async () => {
    let inserted: Record<string, unknown> | undefined;
    const tx = {
      execute: vi.fn(async () => ({ rows: [] })),
      select: vi.fn(() => { throw new Error("a system call read the ledger"); }),
      insert: () => ({ values: (v: Record<string, unknown>) => { inserted = v; return { returning: async () => [{ id: "call-s" }] }; } }),
    };
    const got = await reserveModelCall(tx as never, "user_a", "synopsis", "claude-sonnet-5", new Date(), "system");
    expect(got).toEqual({ id: "call-s" });
    expect(inserted).toMatchObject({ userId: "user_a", feature: "synopsis", origin: "system" });
    // No lock, no allowance: the player path's reads never ran.
    expect(tx.execute).not.toHaveBeenCalled();
    expect(tx.select).not.toHaveBeenCalled();
  });
});

describe("reserveModelCall and the owner's share", () => {
  const before = process.env.MODEL_OWNER_USER_ID;
  afterEach(() => {
    if (before === undefined) delete process.env.MODEL_OWNER_USER_ID;
    else process.env.MODEL_OWNER_USER_ID = before;
  });
  const reserve = async (userId: string, ownerMicro: number | null) => {
    const wheres: unknown[] = [];
    // The owner's priced sum and unpriced rows (the owner only), then the window's ledger rows.
    const answers: unknown[][] = ownerMicro === null ? [[]] : [[{ micro: String(ownerMicro) }], [], []];
    const tx = {
      execute: async () => ({ rows: [] }),
      select: () => ({ from: () => ({ where: (w: unknown) => { wheres.push(w); return Promise.resolve(answers.shift() ?? []); } }) }),
      insert: () => ({ values: () => ({ returning: async () => [{ id: "call-1" }] }) }),
    };
    return { got: await reserveModelCall(tx as never, userId, "tuning", "claude-sonnet-5"), wheres };
  };

  it("reads the owner's own month and refuses past the share", async () => {
    process.env.MODEL_OWNER_USER_ID = "user_owner";
    const share = ownerShareMicro();
    const call = featureWorstCaseMicroUsd("tuning", "claude-sonnet-5");
    expect((await reserve("user_owner", share - call)).got).toEqual({ id: "call-1" });
    const over = await reserve("user_owner", share - call + 1);
    expect(over.got).toEqual({ refused: "ownerShare" });
    // The figure is the owner's alone: both month reads are scoped to their user id.
    for (const w of over.wheres.slice(0, 2)) {
      const q = new PgDialect().sqlToQuery(w as never);
      expect(q.sql).toContain('"model_calls"."user_id" = $');
      expect(q.params).toContain("user_owner");
    }
  });

  it("never reads a month's spend for a friend: there is no app-wide limit to hold them to", async () => {
    process.env.MODEL_OWNER_USER_ID = "user_owner";
    const friend = await reserve("user_a", null);
    expect(friend.got).toEqual({ id: "call-1" });
    // The window's ledger rows, and nothing else.
    expect(friend.wheres).toHaveLength(1);
  });
});

describe("reserveModelCall and paid credits (payments PR L)", () => {
  // A select whose `where` answers in order, and a grouped read for the lots' usage.
  function fakeTx(answers: unknown[][], groupPaidLimits: number[] = []) {
    const wheres: unknown[] = [];
    const executed: string[] = [];
    let inserted: Record<string, unknown> | undefined;
    const tx = {
      // The lock, the group allowance read (no group: the default limit), and the group paid limit read.
      execute: async (q: SQL) => {
        const text = new PgDialect().sqlToQuery(q).sql;
        executed.push(text);
        return { rows: text.includes("paid_daily_limit") ? groupPaidLimits.map((paid_limit) => ({ user_id: "user_a", paid_limit })) : [] };
      },
      select: () => ({
        from: () => ({
          where: (w: unknown) => {
            wheres.push(w);
            const rows = answers.shift() ?? [];
            return Object.assign(Promise.resolve(rows), { groupBy: () => Promise.resolve(rows) });
          },
        }),
      }),
      insert: () => ({ values: (v: Record<string, unknown>) => { inserted = v; return { returning: async () => [{ id: "call-1" }] }; } }),
    };
    return { tx, wheres, executed, inserted: () => inserted };
  }
  const now = new Date("2026-10-13T12:00:00Z");
  const spentToday = (n: number) => Array.from({ length: n }, () => ({ status: "spent", createdAt: new Date(now.getTime() - 60_000) }));

  it("funds from the free allowance while it has room, reading no lot, and counts only allowance runs in the window", async () => {
    const f = fakeTx([spentToday(MODEL_DEFAULT_DAILY_ALLOWANCE - 1)]);
    expect(await reserveModelCall(f.tx as never, "user_a", "tuning", "claude-sonnet-5", now)).toEqual({ id: "call-1" });
    expect(f.inserted()?.creditGrantId).toBeNull();
    expect(f.wheres).toHaveLength(1);
    const window = new PgDialect().sqlToQuery(f.wheres[0] as never);
    expect(window.sql).toContain('"model_calls"."credit_grant_id" is null');
  });

  it("refuses exactly as today once the allowance is spent and the player holds no lot", async () => {
    const f = fakeTx([spentToday(MODEL_DEFAULT_DAILY_ALLOWANCE), []]);
    expect(await reserveModelCall(f.tx as never, "user_a", "tuning", "claude-sonnet-5", now)).toEqual({ refused: "allowance" });
    expect(f.inserted()).toBeUndefined();
  });

  it("funds from the plan lot before the pack lot once the allowance is spent, and names it on the row", async () => {
    const lots = [
      { id: "pack-1", source: "pack", units: 40, revokedUnits: 0, expiresAt: null, createdAt: new Date("2026-09-01T00:00:00Z") },
      { id: "plan-1", source: "plan", units: 60, revokedUnits: 0, expiresAt: null, createdAt: new Date("2026-10-01T00:00:00Z") },
    ];
    const usage = [{ grantId: "pack-1", spent: "3", reserved: null }];
    const f = fakeTx([spentToday(MODEL_DEFAULT_DAILY_ALLOWANCE), lots, usage]);
    expect(await reserveModelCall(f.tx as never, "user_a", "tuning", "claude-sonnet-5", now)).toEqual({ id: "call-1" });
    expect(f.inserted()?.creditGrantId).toBe("plan-1");
  });

  it("refuses when every lot is spent, counting a reservation still in flight", async () => {
    const lots = [{ id: "pack-1", source: "pack", units: 2, revokedUnits: 0, expiresAt: null, createdAt: new Date("2026-09-01T00:00:00Z") }];
    const usage = [{ grantId: "pack-1", spent: "1", reserved: [[now.getTime() - 1000, 1]] }];
    const f = fakeTx([spentToday(MODEL_DEFAULT_DAILY_ALLOWANCE), lots, usage]);
    expect(await reserveModelCall(f.tx as never, "user_a", "tuning", "claude-sonnet-5", now)).toEqual({ refused: "allowance" });
  });

  it("a lot's stranded reservation gives its credit back", async () => {
    const lots = [{ id: "pack-1", source: "pack", units: 2, revokedUnits: 0, expiresAt: null, createdAt: new Date("2026-09-01T00:00:00Z") }];
    const usage = [{ grantId: "pack-1", spent: "1", reserved: [[now.getTime() - RESERVATION_TTL_MS - 1, 1]] }];
    const f = fakeTx([spentToday(MODEL_DEFAULT_DAILY_ALLOWANCE), lots, usage]);
    expect(await reserveModelCall(f.tx as never, "user_a", "tuning", "claude-sonnet-5", now)).toEqual({ id: "call-1" });
    expect(f.inserted()?.creditGrantId).toBe("pack-1");
  });

  // Suggested changes v2 over 10 swaps costs 2 credits, and ONE source funds the whole run (Hugh, 2026-10-30).
  describe("a 2-unit run", () => {
    const lot = (id: string, source: string, units: number, created: string) => ({ id, source, units, revokedUnits: 0, expiresAt: source === "welcome" ? new Date(now.getTime() + 86_400_000) : null, createdAt: new Date(created) });
    const reserve2 = (f: ReturnType<typeof fakeTx>) => reserveModelCall(f.tx as never, "user_a", "suggested_changes_v2", "claude-sonnet-5", now, "player", 2);

    it("refuses on free room of 1 with no lot, as a refusal of its cost", async () => {
      const f = fakeTx([[], []]);
      expect(await reserve2(f)).toEqual({ refused: "allowance", costs: 2 });
      expect(f.inserted()).toBeUndefined();
    });

    it("is funded by one lot holding 2, and writes its units", async () => {
      const f = fakeTx([[], [lot("pack-1", "pack", 2, "2026-09-01T00:00:00Z")], [], []]);
      expect(await reserve2(f)).toEqual({ id: "call-1" });
      expect(f.inserted()).toMatchObject({ creditGrantId: "pack-1", units: 2 });
    });

    it("is refused when two lots hold 1 each: a run is never split", async () => {
      const lots = [lot("welcome-1", "welcome", 1, "2026-10-01T00:00:00Z"), lot("pack-1", "pack", 1, "2026-09-01T00:00:00Z")];
      const f = fakeTx([spentToday(MODEL_DEFAULT_DAILY_ALLOWANCE), lots, [], []]);
      expect(await reserve2(f)).toEqual({ refused: "allowance", costs: 2 });
    });

    it("is refused at 19 of 20 paid credits used, where a 1-credit run would start", async () => {
      const paid19 = Array.from({ length: 19 }, () => ({ status: "spent", createdAt: new Date(now.getTime() - 60_000) }));
      const f = fakeTx([spentToday(MODEL_DEFAULT_DAILY_ALLOWANCE), [lot("pack-1", "pack", 40, "2026-09-01T00:00:00Z")], [], paid19]);
      expect(await reserve2(f)).toEqual({ refused: "allowance", costs: 2 });
    });

    it("counts a 2-unit row as two credits of the free window", async () => {
      const f = fakeTx([[{ status: "spent", createdAt: new Date(now.getTime() - 60_000), units: 2 }]]);
      // Limit 1, already 2 used: a 1-unit run goes to the (absent) lots and is refused as out of credits.
      expect(await reserveModelCall(f.tx as never, "user_a", "tuning", "claude-sonnet-5", now)).toEqual({ refused: "allowance" });
    });
  });

  describe("the 20-a-day paid limit", () => {
    const lots = [{ id: "pack-1", source: "pack", units: 100, revokedUnits: 0, expiresAt: null, createdAt: new Date("2026-09-01T00:00:00Z") }];
    const paidRows = (n: number, status = "spent", ageMs = 60_000) =>
      Array.from({ length: n }, () => ({ status, createdAt: new Date(now.getTime() - ageMs) }));
    const reserve = (answers: unknown[][], groupPaidLimits: number[] = []) => {
      const f = fakeTx([spentToday(MODEL_DEFAULT_DAILY_ALLOWANCE), lots, [], ...answers], groupPaidLimits);
      return { f, got: reserveModelCall(f.tx as never, "user_a", "tuning", "claude-sonnet-5", now) };
    };

    it("counts paid rows only, in the window", async () => {
      const { f, got } = reserve([paidRows(19)]);
      expect(await got).toEqual({ id: "call-1" });
      expect(f.inserted()?.creditGrantId).toBe("pack-1");
      expect(new PgDialect().sqlToQuery(f.wheres[3] as never).sql).toContain('"model_calls"."credit_grant_id" is not null');
    });

    it("refuses the twenty-first paid run with credits left, spent or in flight", async () => {
      expect(await reserve([paidRows(20)]).got).toEqual({ refused: "allowance" });
      expect(await reserve([[...paidRows(19), ...paidRows(1, "reserved", 1000)]]).got).toEqual({ refused: "allowance" });
    });

    it("lets a refunded or stranded or out-of-window paid row go", async () => {
      const rows = [...paidRows(18), ...paidRows(1, "reserved", RESERVATION_TTL_MS + 1), ...paidRows(1, "spent", ALLOWANCE_WINDOW_MS + 1)];
      expect(await reserve([rows]).got).toEqual({ id: "call-1" });
    });

    it("never refuses a run the free allowance can fund", async () => {
      const f = fakeTx([spentToday(MODEL_DEFAULT_DAILY_ALLOWANCE - 1), lots, [], paidRows(25)], [1]);
      expect(await reserveModelCall(f.tx as never, "user_a", "tuning", "claude-sonnet-5", now)).toEqual({ id: "call-1" });
      expect(f.inserted()?.creditGrantId).toBeNull();
      // The paid limit is not even read while the free allowance funds the run.
      expect(f.executed.some((t) => t.includes("paid_daily_limit"))).toBe(false);
    });

    it("takes the group's paid limit, read inside the lock", async () => {
      const three = reserve([paidRows(3)], [3]);
      expect(await three.got).toEqual({ refused: "allowance" });
      const lock = three.f.executed.findIndex((t) => t.includes("pg_advisory_xact_lock"));
      const read = three.f.executed.findIndex((t) => t.includes("paid_daily_limit"));
      expect(lock).toBeGreaterThanOrEqual(0);
      expect(read).toBeGreaterThan(lock);
      expect(await reserve([paidRows(2)], [3]).got).toEqual({ id: "call-1" });
      // A group's limit above the default lets the twenty-first run through.
      expect(await reserve([paidRows(20)], [25]).got).toEqual({ id: "call-1" });
    });
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

  it("a refund whose caller states no reason (null) stores none", async () => {
    const { tx, seen } = fakeTx({ status: "refunded" });
    await settleModelCall(tx, "call", "refunded", undefined, now, null);
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

describe("the model-call switch (MODEL_CALLS_ENABLED)", () => {
  // Every reservation in the file asks; each test here counts its own.
  beforeEach(() => {
    switches.asked = [];
  });
  afterEach(() => {
    switches.env = {};
    switches.asked = [];
    switches.strictThrows = false;
  });
  // A tx that fails the test on any read or write: a paused reservation must touch nothing.
  const untouched = () => {
    const fail = (what: string) => vi.fn(() => { throw new Error(`a paused reservation ${what}`); });
    return { execute: fail("took the lock"), select: fail("read the ledger"), insert: fail("wrote a row") };
  };

  it("refuses a player call as paused, before the lock, any read or any row", async () => {
    switches.env = { MODEL_CALLS_ENABLED: "false" };
    const tx = untouched();
    expect(await reserveModelCall(tx as never, "user_a", "tuning", "claude-sonnet-5")).toEqual({ refused: "paused" });
    expect(tx.execute).not.toHaveBeenCalled();
    expect(tx.select).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
    // Resolved app-wide: a plumbing switch takes no account's override.
    expect(switches.asked).toEqual([null]);
  });

  it("refuses a system call as paused too, writing nothing", async () => {
    switches.env = { MODEL_CALLS_ENABLED: "off" };
    const tx = untouched();
    expect(await reserveModelCall(tx as never, "user_a", "synopsis", "claude-sonnet-5", new Date(), "system")).toEqual({ refused: "paused" });
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("fails closed: an override read that fails refuses as paused, with no lock, read or row", async () => {
    switches.strictThrows = true;
    const tx = untouched();
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await reserveModelCall(tx as never, "user_a", "tuning", "claude-sonnet-5")).toEqual({ refused: "paused" });
    expect(await reserveModelCall(tx as never, "user_a", "synopsis", "claude-sonnet-5", new Date(), "system")).toEqual({ refused: "paused" });
    quiet.mockRestore();
    expect(tx.execute).not.toHaveBeenCalled();
    expect(tx.select).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("lets a call through while the variable is unset: on by default", async () => {
    let inserted = false;
    const tx = {
      execute: vi.fn(async () => ({ rows: [] })),
      select: vi.fn(),
      insert: () => ({ values: () => { inserted = true; return { returning: async () => [{ id: "call-s" }] }; } }),
    };
    expect(await reserveModelCall(tx as never, "user_a", "synopsis", "claude-sonnet-5", new Date(), "system")).toEqual({ id: "call-s" });
    expect(inserted).toBe(true);
  });

  describe("readAllowance", () => {
    const fake = db as unknown as Record<string, unknown>;
    afterEach(() => {
      delete fake.select;
      delete fake.execute;
    });
    const stubDb = () => {
      fake.select = () => ({ from: () => ({ where: () => Promise.resolve([]) }) });
      fake.execute = async () => ({ rows: [] });
    };

    it("reports paused while the switch is off, so a panel shows the stop before a press", async () => {
      stubDb();
      switches.env = { MODEL_CALLS_ENABLED: "false" };
      expect((await readAllowance("user_a")).paused).toBe(true);
    });

    it("reports nothing paused while the variable is unset", async () => {
      stubDb();
      expect((await readAllowance("user_a")).paused).toBeUndefined();
    });
  });
});
