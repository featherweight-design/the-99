import { describe, expect, it, vi } from "vitest";

// The transaction's shape, played by hand: whether a tombstone exists, whether the unique index absorbs the insert, and
// what the insert was asked to write.
const state = vi.hoisted(() => ({ tombstone: false, conflict: false, held: false, claimed: new Set<string>(), lots: 0, claimHash: "", released: 0, values: null as null | Record<string, unknown>, where: null as unknown, lockSql: "", locked: 0, order: [] as string[] }));
vi.mock("../../db", async () => {
  const schema = await vi.importActual<typeof import("../../db/schema")>("../../db/schema");
  const tx = {
    execute: async (sqlArg: unknown) => { state.locked += 1; state.order.push("lock"); state.lockSql = JSON.stringify(dialect.sqlToQuery(sqlArg as never).params); },
    select: () => ({ from: (t: unknown) => ({ where: async (cond: unknown) => {
      if (t === schema.accountTombstones) {
        state.order.push("tombstone");
        state.where = cond;
        return state.tombstone ? [{ id: "h" }] : [];
      }
      state.order.push("held");
      return state.held ? [{ id: "lot" }] : [];
    } }) }),
    delete: (t: unknown) => ({ where: async () => { if (t === schema.welcomeEmailClaims) { state.claimed.delete(state.claimHash); state.released += 1; } } }),
    insert: (t: unknown) => ({
      values: (v: Record<string, unknown>) => {
        if (t === schema.welcomeEmailClaims) {
          state.order.push("claim");
          return { onConflictDoNothing: () => ({ returning: async () => {
            const h = String(v.emailHash);
            if (state.claimed.has(h)) return [];
            state.claimed.add(h);
            state.claimHash = h;
            return [{ h }];
          } }) };
        }
        state.values = v;
        state.order.push("insert");
        return { onConflictDoNothing: () => ({ returning: async () => {
          if (state.conflict) return [];
          state.lots += 1;
          return [{ id: "lot" }];
        } }) };
      },
    }),
  };
  return { db: { transaction: async (cb: (t: typeof tx) => unknown) => cb(tx) } };
});

import { PgDialect } from "drizzle-orm/pg-core";
import { tombstoneHash } from "../account/purge";
import { WELCOME_DAYS, WELCOME_UNITS, welcomeExpiry, grantWelcome } from "./welcome";

const dialect = new PgDialect();
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-18T12:00:00Z");
const on = { PAYMENTS_ENABLED: "true", WELCOME_CREDITS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const H = "a".repeat(64);
const reset = (over: Partial<typeof state> = {}) => Object.assign(state, { tombstone: false, conflict: false, held: false, claimed: new Set<string>(), lots: 0, claimHash: "", released: 0, values: null, where: null, lockSql: "", locked: 0, order: [] }, over);

describe("grantWelcome", () => {
  it("writes 15 units that expire 30 days after the ACCOUNT was created, not after the call", async () => {
    reset();
    const created = new Date(NOW.getTime() - 5 * DAY);
    const r = await grantWelcome("user_a", created, on, H, NOW);
    expect(r).toEqual({ granted: true, expiresAt: new Date(created.getTime() + WELCOME_DAYS * DAY) });
    expect(state.values).toMatchObject({ userId: "user_a", source: "welcome", units: WELCOME_UNITS, externalId: "welcome:user_a" });
    expect(state.values?.expiresAt).toEqual(welcomeExpiry(created));
    expect(WELCOME_UNITS).toBe(15);
  });

  it("takes the account's lock, reads the tombstone and its own lot, claims the address, then inserts", async () => {
    reset();
    await grantWelcome("user_a", NOW, on, H, NOW);
    expect(state.order).toEqual(["lock", "tombstone", "held", "claim", "insert"]);
  });

  it("locks the account's invite lock and looks the tombstone up by the account id's hash", async () => {
    reset();
    await grantWelcome("user_a", NOW, on, H, NOW);
    expect(state.lockSql).toContain("invites:user_a");
    expect(dialect.sqlToQuery(state.where as never).params).toEqual([tombstoneHash("user_a")]);
  });

  it("writes nothing for a deleted account", async () => {
    reset({ tombstone: true });
    expect(await grantWelcome("user_a", NOW, on, H, NOW)).toEqual({ granted: false, reason: "deleted" });
    expect(state.values).toBeNull();
  });

  it("answers `already` when the unique index absorbs the insert (a redelivery, a backfill)", async () => {
    reset({ conflict: true });
    expect(await grantWelcome("user_a", NOW, on, H, NOW)).toEqual({ granted: false, reason: "already" });
    // The claim written a moment earlier is given back: a mailbox is never burned without a lot behind it.
    expect([state.released, state.claimed.has(H)]).toEqual([1, false]);
  });

  it("gives an account past its 30 days nothing, and does not touch the database", async () => {
    reset();
    const old = new Date(NOW.getTime() - WELCOME_DAYS * DAY);
    expect(await grantWelcome("user_a", old, on, H, NOW)).toEqual({ granted: false, reason: "expired" });
    expect(state.locked).toBe(0);
  });

  it("writes nothing while its switch, or its parent, is off", async () => {
    reset();
    const noSwitch = { PAYMENTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    const noParent = { WELCOME_CREDITS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    expect(await grantWelcome("user_a", NOW, noSwitch, H, NOW)).toEqual({ granted: false, reason: "switch" });
    expect(await grantWelcome("user_a", NOW, noParent, H, NOW)).toEqual({ granted: false, reason: "switch" });
    expect(state.locked).toBe(0);
  });

  describe("one lot per mailbox", () => {
    it("writes the claim with the lot, and gives a second account on the same address `alias` and no lot", async () => {
      reset();
      expect(await grantWelcome("user_a", NOW, on, H, NOW)).toMatchObject({ granted: true });
      expect(state.claimHash).toBe(H);
      expect(await grantWelcome("user_b", NOW, on, H, NOW)).toEqual({ granted: false, reason: "alias" });
      expect(state.lots).toBe(1);
    });

    it("two grants for one canonical address, run together, write exactly one lot", async () => {
      reset();
      const both = await Promise.all([grantWelcome("user_a", NOW, on, H, NOW), grantWelcome("user_b", NOW, on, H, NOW)]);
      expect(both.filter((r) => r.granted)).toHaveLength(1);
      expect(both.filter((r) => !r.granted && r.reason === "alias")).toHaveLength(1);
      expect(state.lots).toBe(1);
    });

    it("answers `already`, not `alias`, for an account that holds its lot (a redelivery with its own claim in place)", async () => {
      reset({ held: true, claimed: new Set([H]) });
      expect(await grantWelcome("user_a", NOW, on, H, NOW)).toEqual({ granted: false, reason: "already" });
      expect(state.order).not.toContain("claim");
    });

    it("grants nothing, and touches nothing, with no address hash (no verified address, or no key)", async () => {
      reset();
      expect(await grantWelcome("user_a", NOW, on, null, NOW)).toEqual({ granted: false, reason: "unclaimable" });
      expect(state.locked).toBe(0);
      expect(state.lots).toBe(0);
    });

    it("leaves a deleted account's claim in place: a re-sign-up on the same address gets nothing", async () => {
      reset({ claimed: new Set([H]) });
      expect(await grantWelcome("user_new_id", NOW, on, H, NOW)).toEqual({ granted: false, reason: "alias" });
    });
  });
});
