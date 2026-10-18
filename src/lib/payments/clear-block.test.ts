// Let them buy (admin plan A3): the block is cleared only where it is set, the event names the account and when the
// block was set, and a repeat clears and records nothing.
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { adminEvents, stripeCustomers } from "../../db/schema";
import { clearPurchaseBlock, type ClearBlockDeps } from "./clear-block";

function fakeTx(blockedAt: Date | null) {
  const order: string[] = [];
  const writes: { table: unknown; values: Record<string, unknown> }[] = [];
  let locked = false;
  const tx = {
    select: () => ({ from: () => ({ where: () => ({ for: async (mode: string) => { locked = mode === "update"; order.push("read"); return blockedAt ? [{ at: blockedAt }] : []; } }) }) }),
    update: (table: unknown) => ({ set: (values: Record<string, unknown>) => ({ where: async () => { order.push("clear"); writes.push({ table, values }); } }) }),
    insert: (table: unknown) => ({ values: async (values: Record<string, unknown>) => { order.push("event"); writes.push({ table, values }); } }),
  };
  const deps: ClearBlockDeps = { transaction: (async (fn: (t: typeof tx) => unknown) => fn(tx)) as never };
  return { deps, order, writes, locked: () => locked };
}

describe("clearPurchaseBlock", () => {
  it("reads the block for update, clears it, and records when it was set, naming only the account", async () => {
    const at = new Date("2026-10-12T09:30:00Z");
    const f = fakeTx(at);
    expect(await clearPurchaseBlock("u_admin", "u_mara", f.deps)).toEqual({ ok: true, cleared: true });
    expect(f.order).toEqual(["read", "clear", "event"]);
    expect(f.locked()).toBe(true);
    expect(f.writes[0]).toEqual({ table: stripeCustomers, values: { purchaseBlockedAt: null } });
    expect(f.writes[1]).toEqual({ table: adminEvents, values: { actorId: "u_admin", kind: "purchase_block_cleared", userId: "u_mara", oldValue: "2026-10-12T09:30:00.000Z" } });
  });

  it("clears and records nothing for an account that is not paused", async () => {
    const f = fakeTx(null);
    expect(await clearPurchaseBlock("u_admin", "u_mara", f.deps)).toEqual({ ok: true, cleared: false });
    expect(f.order).toEqual(["read"]);
  });

  it("refuses a bad account before reading, and answers a failed write as nothing changed", async () => {
    const f = fakeTx(new Date());
    expect(await clearPurchaseBlock("u_admin", "", f.deps)).toEqual({ ok: false, error: "account" });
    expect(f.order).toEqual([]);
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await clearPurchaseBlock("u_admin", "u_mara", { transaction: (async () => { throw new Error("boom"); }) as never })).toEqual({ ok: false, error: "failed" });
    quiet.mockRestore();
  });
});
