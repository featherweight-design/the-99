import { describe, expect, it, vi } from "vitest";

// The transaction's shape, played by hand: whether a tombstone exists, whether the unique index absorbs the insert, and
// what the insert was asked to write.
const state = vi.hoisted(() => ({ tombstone: false, conflict: false, values: null as null | Record<string, unknown>, locked: 0, order: [] as string[] }));
vi.mock("../../db", async () => {
  const schema = await vi.importActual<typeof import("../../db/schema")>("../../db/schema");
  const tx = {
    execute: async () => { state.locked += 1; state.order.push("lock"); },
    select: () => ({ from: (t: unknown) => ({ where: async () => { state.order.push(t === schema.accountTombstones ? "tombstone" : "other"); return state.tombstone ? [{ id: "h" }] : []; } }) }),
    insert: () => ({
      values: (v: Record<string, unknown>) => {
        state.values = v;
        state.order.push("insert");
        return { onConflictDoNothing: () => ({ returning: async () => (state.conflict ? [] : [{ id: "lot" }]) }) };
      },
    }),
  };
  return { db: { transaction: async (cb: (t: typeof tx) => unknown) => cb(tx) } };
});

import { WELCOME_DAYS, WELCOME_UNITS, welcomeExpiry, grantWelcome } from "./welcome";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-18T12:00:00Z");
const on = { PAYMENTS_ENABLED: "true", WELCOME_CREDITS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const reset = (over: Partial<typeof state> = {}) => Object.assign(state, { tombstone: false, conflict: false, values: null, locked: 0, order: [] }, over);

describe("grantWelcome", () => {
  it("writes 15 units that expire 30 days after the ACCOUNT was created, not after the call", async () => {
    reset();
    const created = new Date(NOW.getTime() - 5 * DAY);
    const r = await grantWelcome("user_a", created, on, NOW);
    expect(r).toEqual({ granted: true, expiresAt: new Date(created.getTime() + WELCOME_DAYS * DAY) });
    expect(state.values).toMatchObject({ userId: "user_a", source: "welcome", units: WELCOME_UNITS, externalId: "welcome:user_a" });
    expect(state.values?.expiresAt).toEqual(welcomeExpiry(created));
    expect(WELCOME_UNITS).toBe(15);
  });

  it("takes the account's lock, then reads the tombstone, then inserts", async () => {
    reset();
    await grantWelcome("user_a", NOW, on, NOW);
    expect(state.order).toEqual(["lock", "tombstone", "insert"]);
  });

  it("writes nothing for a deleted account", async () => {
    reset({ tombstone: true });
    expect(await grantWelcome("user_a", NOW, on, NOW)).toEqual({ granted: false, reason: "deleted" });
    expect(state.values).toBeNull();
  });

  it("answers `already` when the unique index absorbs the insert (a redelivery, a backfill)", async () => {
    reset({ conflict: true });
    expect(await grantWelcome("user_a", NOW, on, NOW)).toEqual({ granted: false, reason: "already" });
  });

  it("gives an account past its 30 days nothing, and does not touch the database", async () => {
    reset();
    const old = new Date(NOW.getTime() - WELCOME_DAYS * DAY);
    expect(await grantWelcome("user_a", old, on, NOW)).toEqual({ granted: false, reason: "expired" });
    expect(state.locked).toBe(0);
  });

  it("writes nothing while its switch, or its parent, is off", async () => {
    reset();
    const noSwitch = { PAYMENTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    const noParent = { WELCOME_CREDITS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    expect(await grantWelcome("user_a", NOW, noSwitch, NOW)).toEqual({ granted: false, reason: "switch" });
    expect(await grantWelcome("user_a", NOW, noParent, NOW)).toEqual({ granted: false, reason: "switch" });
    expect(state.locked).toBe(0);
  });
});
