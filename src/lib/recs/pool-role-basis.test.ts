import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { readFileSync } from "node:fs";
import { loadPoolRoleBasis, loadSharedPoolRoleBasis, type PoolRoleBasis } from "./pool-role-basis";

const cards = [{ oracleId: "a" }, { oracleId: "b" }];

describe("loadPoolRoleBasis", () => {
  it("returns the label sets and the labels basis together", async () => {
    const sets = new Map([["a", ["ramp" as const]]]);
    const read = vi.fn().mockResolvedValue(sets);
    const got = await loadPoolRoleBasis(cards, read);
    expect(got.basis).toBe("labels");
    expect(got.roleSets).toBe(sets);
    expect(got.fellBack).toBe(false);
    expect(read).toHaveBeenCalledWith(["a", "b"]);
  });

  it("falls to the classifier on BOTH sides when the read fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const got = await loadPoolRoleBasis(cards, vi.fn().mockRejectedValue(new Error("down")));
    expect(got).toEqual({ basis: "classifier", roleSets: undefined, fellBack: true });
  });
});

describe("loadSharedPoolRoleBasis", () => {
  const memo = () => new Map<string, Promise<PoolRoleBasis>>();

  it("reads the labels once for the callers of one request, and hands them all the same answer", async () => {
    const m = memo();
    const read = vi.fn().mockResolvedValue(new Map([["a", ["ramp" as const]]]));
    const [list, free, detail] = await Promise.all([
      loadSharedPoolRoleBasis("u1", cards, read, m),
      loadSharedPoolRoleBasis("u1", cards, read, m),
      loadSharedPoolRoleBasis("u1", [...cards], read, m),
    ]);
    expect(read).toHaveBeenCalledTimes(1);
    expect(free).toBe(list);
    expect(detail).toBe(list);
  });

  it("shares a FAILED read too, so no caller counts by labels beside one that fell back", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const m = memo();
    const read = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValue(new Map());
    const first = await loadSharedPoolRoleBasis("u1", cards, read, m);
    const second = await loadSharedPoolRoleBasis("u1", cards, read, m);
    expect(first.fellBack).toBe(true);
    expect(second.fellBack).toBe(true);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("keeps a different user and a different pool apart", async () => {
    const m = memo();
    const read = vi.fn().mockResolvedValue(new Map());
    await loadSharedPoolRoleBasis("u1", cards, read, m);
    await loadSharedPoolRoleBasis("u2", cards, read, m);
    await loadSharedPoolRoleBasis("u1", [{ oracleId: "a" }], read, m);
    expect(read).toHaveBeenCalledTimes(3);
    expect((await loadSharedPoolRoleBasis("u1", cards, read, m)).basis).toBe("labels");
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("is what the ranked list, the free ranking, the detail score and the discovery list call, never the raw read", () => {
    for (const f of ["recs/recommend.ts", "recs/free-ranking.ts", "discovery/list.ts"]) {
      const src = readFileSync(`${process.cwd()}/src/lib/${f}`, "utf8");
      expect(src, f).toContain("loadSharedPoolRoleBasis(");
      expect(src, f).not.toMatch(/[^d]loadPoolRoleBasis\(/);
    }
  });
});
