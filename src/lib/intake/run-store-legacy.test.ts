// A row the retired one-call engine wrote (Look deeper: `chips`, no `result`) settled and was
// charged, but holds nothing the results panel can draw. It has to read as no read at all, never
// as a failed one, and never as an answer to a new ask.
import { describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));
vi.mock("../../db", () => {
  const where = () => Promise.resolve(stub.rows);
  // A transaction's handle: a select resolves to the stored rows, an update reaps nothing, an insert
  // returns the new read's id.
  const select = () => {
    const c: Record<string, unknown> = { from: () => c, where: () => c, orderBy: () => c, limit: () => Promise.resolve(stub.rows) };
    return c;
  };
  const tx = {
    execute: async () => ({ rows: [] }),
    select,
    update: () => ({ set: () => ({ where: () => ({ returning: async () => [] }) }) }),
    delete: () => ({ where: () => ({ returning: async () => [] }) }),
    insert: () => ({ values: () => ({ returning: async () => [{ id: "new-read" }] }) }),
  };
  return { db: { select: () => ({ from: () => ({ where }) }), transaction: async (cb: (t: typeof tx) => unknown) => cb(tx) } };
});
vi.mock("../model/allowance", async (actual) => ({
  ...(await actual<typeof import("../model/allowance")>()),
  reserveModelCall: vi.fn(async () => ({ id: "call-1" })),
  settleModelCall: vi.fn(),
}));

const { loadTheRead, startRead } = await import("./run-store");

const READ = "0000aaaa-0000-4000-8000-0000000000dd";
const legacy = (status: string, errorClass: string | null) => ({
  status, errorClass, phase: null, result: null, createdAt: new Date("2026-09-30T00:00:00Z"),
  chips: { chips: [{ kind: "theme", slug: "dinosaurs", label: "Dinosaurs" }], notUsed: [], notUnderstood: [] },
});

describe("a Look deeper row from the retired one-call engine", () => {
  it("reads as no read when it settled ok", async () => {
    stub.rows = [legacy("ok", null)];
    expect(await loadTheRead(READ, "user_1")).toEqual({ kind: "none" });
  });

  it("reads as no read when it found nothing and was refunded", async () => {
    stub.rows = [legacy("failed", "nothing_valid")];
    expect(await loadTheRead(READ, "user_1")).toEqual({ kind: "none" });
  });

  it("still reads a two-step row by its result", async () => {
    const result = { picks: [], pool: 3, weighed: 3 };
    stub.rows = [{ ...legacy("ok", null), chips: null, result }];
    expect(await loadTheRead(READ, "user_1")).toEqual({ kind: "done", result });
  });
});

describe("a new press whose ask matches a retired one-call row", () => {
  it("starts a new read instead of answering from the row's missing result", async () => {
    stub.rows = [{ id: "old", ...legacy("ok", null) }];
    expect(await startRead("user_1", "hash", "claude-sonnet-5-5")).toMatchObject({ kind: "started", readId: "new-read" });
  });

  it("still answers from a two-step row's result", async () => {
    const result = { picks: [], pool: 3, weighed: 3 };
    stub.rows = [{ id: "old", status: "ok", result }];
    expect(await startRead("user_1", "hash", "claude-sonnet-5-5")).toEqual({ kind: "stored", readId: "old", useful: true, result });
  });
});
