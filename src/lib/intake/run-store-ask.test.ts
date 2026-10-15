// A started read is stored with the ask it was made from (History), in the insert that reserves its credit.
import { describe, expect, it, vi } from "vitest";

const seen = vi.hoisted(() => ({ values: [] as Record<string, unknown>[] }));
vi.mock("../../db", () => {
  const select = () => {
    const c: Record<string, unknown> = { from: () => c, where: () => c, orderBy: () => c, limit: () => Promise.resolve([]) };
    return c;
  };
  const tx = {
    execute: async () => ({ rows: [] }),
    select,
    update: () => ({ set: () => ({ where: () => ({ returning: async () => [] }) }) }),
    insert: () => ({ values: (v: Record<string, unknown>) => { seen.values.push(v); return { returning: async () => [{ id: "new-read" }] }; } }),
  };
  return { db: { select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }), transaction: async (cb: (t: typeof tx) => unknown) => cb(tx) } };
});
vi.mock("../model/allowance", async (actual) => ({
  ...(await actual<typeof import("../model/allowance")>()),
  reserveModelCall: vi.fn(async () => ({ id: "call-1" })),
  settleModelCall: vi.fn(),
}));

const { startRead } = await import("./run-store");

describe("startRead", () => {
  it("writes the ask into the pending row", async () => {
    seen.values.length = 0;
    const r = await startRead("u", "hash", "model", { ask: "w=spooky&v=results" });
    expect(r.kind).toBe("started");
    expect(seen.values).toHaveLength(1);
    expect(seen.values[0]).toMatchObject({ userId: "u", wordsHash: "hash", status: "pending", ask: "w=spooky&v=results" });
  });

  it("stores no ask for a caller that sends none, never undefined", async () => {
    seen.values.length = 0;
    await startRead("u", "hash", "model");
    expect(seen.values[0]).toHaveProperty("ask", null);
  });
});
