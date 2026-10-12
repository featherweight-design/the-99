// A row the retired one-call engine wrote (Look deeper: `chips`, no `result`) settled and was
// charged, but holds nothing the results panel can draw. It has to read as no read at all, never
// as a failed one, and never as an answer to a new ask.
import { describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));
vi.mock("../../db", () => {
  const where = () => Promise.resolve(stub.rows);
  return { db: { select: () => ({ from: () => ({ where }) }) } };
});

const { loadTheRead } = await import("./run-store");

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
