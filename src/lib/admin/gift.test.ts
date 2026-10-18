import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));
vi.mock("./accounts", () => ({ readIdentity: vi.fn() }));

import { PgDialect } from "drizzle-orm/pg-core";
import { accountTombstones, adminEvents, creditGrants } from "../../db/schema";
import { tombstoneHash } from "../account/purge";
import { GIFT_NOTE_MAX, GIFT_UNITS_MAX, grantGift, validateGift, type GiftDeps } from "./gift";

const dialect = new PgDialect();
const ACTION = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const good = { accountId: "user_a", units: 10, note: "  refund for a failed run  ", actionId: ACTION };

/** A transaction played by hand: the lock, the tombstone read, the lot insert (absorbed on a repeat) and the event. */
function fakeTx(opts: { tombstone?: boolean; prior?: { id: string; userId: string; source: string } | null } = {}) {
  const order: string[] = [];
  const inserts: { table: unknown; values: Record<string, unknown> }[] = [];
  let tombstoneWhere: unknown;
  const tx = {
    execute: async () => { order.push("lock"); },
    select: () => ({
      from: (t: unknown) => ({
        where: async (cond: unknown) => {
          if (t === accountTombstones) {
            order.push("tombstone");
            tombstoneWhere = cond;
            return opts.tombstone ? [{ id: "h" }] : [];
          }
          order.push("prior");
          return opts.prior ? [opts.prior] : [];
        },
      }),
    }),
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => {
        inserts.push({ table, values });
        order.push(table === creditGrants ? "lot" : table === adminEvents ? "event" : "other");
        return {
          onConflictDoNothing: () => ({ returning: async () => (opts.prior !== undefined ? [] : [{ id: "lot-1" }]) }),
          then: (res: (v: unknown) => void) => res(undefined),
        };
      },
    }),
  };
  const deps: GiftDeps = { accountExists: async () => true, transaction: (async (fn: (t: typeof tx) => unknown) => fn(tx)) as never };
  return { deps, order, inserts, tombstoneWhere: () => tombstoneWhere };
}

describe("validateGift", () => {
  it("takes 1 to 500 whole units, a trimmed note up to 500 characters, and a uuid action id", () => {
    expect(validateGift(good)).toEqual({ ok: true, gift: { accountId: "user_a", units: 10, note: "refund for a failed run", actionId: ACTION } });
    for (const units of [0, GIFT_UNITS_MAX + 1, 2.5, "10"]) expect(validateGift({ ...good, units })).toEqual({ ok: false, error: "units" });
    expect(validateGift({ ...good, units: GIFT_UNITS_MAX }).ok).toBe(true);
    for (const note of ["", "   ", "x".repeat(GIFT_NOTE_MAX + 1), 5]) expect(validateGift({ ...good, note })).toEqual({ ok: false, error: "note" });
    for (const accountId of ["", " ", 7, "u".repeat(201)]) expect(validateGift({ ...good, accountId })).toEqual({ ok: false, error: "account" });
    for (const actionId of ["", "not-a-uuid", 1]) expect(validateGift({ ...good, actionId })).toEqual({ ok: false, error: "action" });
  });
});

describe("grantGift", () => {
  it("writes a gift lot that never expires, keyed on the action, and the credits_granted event, in one transaction", async () => {
    const f = fakeTx();
    expect(await grantGift("user_admin", good, f.deps)).toEqual({ ok: true, id: "lot-1", repeated: false });
    expect(f.order).toEqual(["lock", "tombstone", "lot", "event"]);
    expect(dialect.sqlToQuery(f.tombstoneWhere() as never).params).toEqual([tombstoneHash("user_a")]);
    expect(f.inserts[0].values).toEqual({ userId: "user_a", source: "gift", units: 10, externalId: `gift:${ACTION}` });
    expect(f.inserts[1].values).toEqual({ actorId: "user_admin", kind: "credits_granted", userId: "user_a", newValue: "10", note: "refund for a failed run" });
  });

  it("answers a repeat of the same action with the lot it wrote, and records nothing more", async () => {
    const f = fakeTx({ prior: { id: "lot-0", userId: "user_a", source: "gift" } });
    expect(await grantGift("user_admin", good, f.deps)).toEqual({ ok: true, id: "lot-0", repeated: true });
    expect(f.order).toEqual(["lock", "tombstone", "lot", "prior"]);
  });

  it("refuses an action id already spent on another account or source", async () => {
    const f = fakeTx({ prior: { id: "lot-0", userId: "user_b", source: "gift" } });
    expect(await grantGift("user_admin", good, f.deps)).toEqual({ ok: false, error: "action" });
  });

  it("refuses an account Clerk does not know, or a deleted one, writing nothing", async () => {
    const f = fakeTx();
    expect(await grantGift("user_admin", good, { ...f.deps, accountExists: async () => false })).toEqual({ ok: false, error: "unknown" });
    expect(f.order).toEqual([]);
    const gone = fakeTx({ tombstone: true });
    expect(await grantGift("user_admin", good, gone.deps)).toEqual({ ok: false, error: "deleted" });
    expect(gone.order).toEqual(["lock", "tombstone"]);
  });

  it("grants nothing when Clerk cannot be read or the write fails", async () => {
    const f = fakeTx();
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await grantGift("user_admin", good, { ...f.deps, accountExists: async () => { throw new Error("down"); } })).toEqual({ ok: false, error: "failed" });
    expect(await grantGift("user_admin", good, { ...f.deps, transaction: (async () => { throw new Error("boom"); }) as never })).toEqual({ ok: false, error: "failed" });
    quiet.mockRestore();
  });

  it("refuses bad input before reading anything", async () => {
    const f = fakeTx();
    const exists = vi.fn(async () => true);
    expect(await grantGift("user_admin", { ...good, units: 0 }, { ...f.deps, accountExists: exists })).toEqual({ ok: false, error: "units" });
    expect(exists).not.toHaveBeenCalled();
  });
});
