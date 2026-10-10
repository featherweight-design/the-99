import { describe, expect, it } from "vitest";

import { publishRun, publishWave } from "./publish";

// A label publish retires the persisted commander scores in the SAME transaction (labels-everywhere
// PR 5): scores count a collection by these labels, and `commander_scores` records no label
// generation. The fake transaction records what was deleted and which locks were taken.
function fake(stagedIds: string[]) {
  const deleted: string[] = [];
  const executed: string[] = [];
  const nameOf = (t: unknown) => (t as Record<symbol, string>)[Symbol.for("drizzle:Name")];
  const render = (q: { queryChunks?: unknown[] }) =>
    (q.queryChunks ?? []).map((c) => (typeof c === "object" && c && "value" in c ? String((c as { value: unknown }).value) : "")).join("");
  const tx = {
    execute: async (q: { queryChunks?: unknown[] }) => { executed.push(render(q)); return { rows: [] }; },
    select: () => ({ from: () => ({ where: async () => stagedIds.map((id) => ({ id })) }) }),
    delete: (t: unknown) => {
      deleted.push(nameOf(t));
      return { where: async () => undefined, then: (r: (v: unknown) => unknown) => r(undefined) };
    },
  };
  const db = { transaction: async <T,>(cb: (t: typeof tx) => Promise<T>) => cb(tx) };
  return { db, tx, deleted, executed };
}

describe("a label publish", () => {
  it("publishRun retires the persisted scores in its transaction", async () => {
    const f = fake(["a", "b"]);
    expect(await publishRun(f.db as never, "run-1")).toBe(2);
    expect(f.deleted).toContain("commander_scores");
    // The score clear's own lock (`hashtextextended`), distinct from the run's (`hashtext`).
    expect(f.executed.some((e) => e.includes("hashtextextended"))).toBe(true);
  });

  it("publishWave retires them too", async () => {
    const f = fake(["a"]);
    expect(await publishWave(f.tx as never, "run-1", ["a"])).toBe(1);
    expect(f.deleted).toContain("commander_scores");
  });

  it("retires nothing when nothing was staged", async () => {
    const f = fake([]);
    expect(await publishRun(f.db as never, "run-1")).toBe(0);
    expect(f.deleted).not.toContain("commander_scores");
  });
});
