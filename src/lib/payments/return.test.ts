import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

// readReturn's lookup: which key finds the lot. The grants table is played by hand and records the key asked for.
const state = vi.hoisted(() => ({ lots: new Map<string, { userId: string; units: number }>(), asked: [] as unknown[] }));
vi.mock("../../db", async () => {
  const { PgDialect } = await import("drizzle-orm/pg-core");
  return {
    db: {
      select: () => ({
        from: () => ({
          where: async (w: unknown) => {
            const params = new PgDialect().sqlToQuery(w as never).params;
            state.asked.push(params[0]);
            const lot = state.lots.get(params[0] as string);
            return lot && lot.userId === params[1] ? [{ units: lot.units }] : [];
          },
        }),
      }),
    },
  };
});

import { readReturn } from "./return";

const sessionOf = (over: Record<string, unknown>) => ({ payment_status: "paid", metadata: {}, ...over });
const stripeServing = (s: unknown) => ({ checkout: { sessions: { retrieve: vi.fn(async () => s) } } }) as unknown as Stripe;
const pack = sessionOf({ mode: "payment", metadata: { app: "the-99", pack: "pack40", user_id: "user_a" } });
const plan = (invoice: unknown) => sessionOf({ mode: "subscription", invoice, metadata: { app: "the-99", plan: "monthly", user_id: "user_a" } });

beforeEach(() => { state.lots.clear(); state.asked.length = 0; });

describe("readReturn", () => {
  it("finds a pack's lot by the Session id, as before", async () => {
    state.lots.set("cs_test_1", { userId: "user_a", units: 40 });
    expect(await readReturn(stripeServing(pack), { sessionId: "cs_test_1", viewerId: "user_a" })).toEqual({ kind: "added", units: 40 });
    expect(state.asked).toEqual(["cs_test_1"]);
  });

  it("finds a plan's lot by the Session's invoice id, for this viewer only", async () => {
    state.lots.set("in_1", { userId: "user_a", units: 50 });
    expect(await readReturn(stripeServing(plan("in_1")), { sessionId: "cs_test_2", viewerId: "user_a" })).toEqual({ kind: "added", units: 50, plan: true });
    expect(await readReturn(stripeServing(plan({ id: "in_1" })), { sessionId: "cs_test_2", viewerId: "user_a" })).toEqual({ kind: "added", units: 50, plan: true });
    expect(state.asked).toEqual(["in_1", "in_1"]);
    state.lots.set("in_1", { userId: "user_b", units: 50 });
    expect(await readReturn(stripeServing(plan("in_1")), { sessionId: "cs_test_2", viewerId: "user_a" })).toEqual({ kind: "processing", units: 50, plan: true });
  });

  it("is processing while the Session names no invoice yet, asking the table nothing", async () => {
    expect(await readReturn(stripeServing(plan(null)), { sessionId: "cs_test_2", viewerId: "user_a" })).toEqual({ kind: "processing", units: 50, plan: true });
    expect(state.asked).toEqual([]);
  });

  it("reads another reader's plan Session as none", async () => {
    expect(await readReturn(stripeServing(plan("in_1")), { sessionId: "cs_test_2", viewerId: "user_b" })).toEqual({ kind: "none" });
  });
});
