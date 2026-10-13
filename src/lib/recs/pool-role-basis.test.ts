import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { readFileSync } from "node:fs";
import { loadPoolRoleBasis, loadSharedPoolRoleBasis, type PoolRoleBasis } from "./pool-role-basis";

const cards = [{ oracleId: "a" }, { oracleId: "b" }];

describe("loadPoolRoleBasis", () => {
  it("reads nothing and counts by the classifier when the switch is off", async () => {
    const read = vi.fn();
    const got = await loadPoolRoleBasis(cards, false, read);
    expect(got).toEqual({ basis: "classifier", roleSets: undefined, fellBack: false });
    expect(read).not.toHaveBeenCalled();
  });

  it("returns the label sets and the labels basis together when on", async () => {
    const sets = new Map([["a", ["ramp" as const]]]);
    const read = vi.fn().mockResolvedValue(sets);
    const got = await loadPoolRoleBasis(cards, true, read);
    expect(got.basis).toBe("labels");
    expect(got.roleSets).toBe(sets);
    expect(got.fellBack).toBe(false);
    expect(read).toHaveBeenCalledWith(["a", "b"]);
  });

  it("falls to the classifier on BOTH sides when the read fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const got = await loadPoolRoleBasis(cards, true, vi.fn().mockRejectedValue(new Error("down")));
    expect(got).toEqual({ basis: "classifier", roleSets: undefined, fellBack: true });
  });
});

describe("loadSharedPoolRoleBasis", () => {
  const memo = () => new Map<string, Promise<PoolRoleBasis>>();

  it("reads the labels once for the callers of one request, and hands them all the same answer", async () => {
    const m = memo();
    const read = vi.fn().mockResolvedValue(new Map([["a", ["ramp" as const]]]));
    const [list, free, detail] = await Promise.all([
      loadSharedPoolRoleBasis("u1", cards, true, read, m),
      loadSharedPoolRoleBasis("u1", cards, true, read, m),
      loadSharedPoolRoleBasis("u1", [...cards], true, read, m),
    ]);
    expect(read).toHaveBeenCalledTimes(1);
    expect(free).toBe(list);
    expect(detail).toBe(list);
  });

  it("shares a FAILED read too, so no caller counts by labels beside one that fell back", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const m = memo();
    const read = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValue(new Map());
    const first = await loadSharedPoolRoleBasis("u1", cards, true, read, m);
    const second = await loadSharedPoolRoleBasis("u1", cards, true, read, m);
    expect(first.fellBack).toBe(true);
    expect(second.fellBack).toBe(true);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("keeps a different user, a different basis and a different pool apart", async () => {
    const m = memo();
    const read = vi.fn().mockResolvedValue(new Map());
    await loadSharedPoolRoleBasis("u1", cards, true, read, m);
    await loadSharedPoolRoleBasis("u2", cards, true, read, m);
    await loadSharedPoolRoleBasis("u1", cards, false, read, m);
    await loadSharedPoolRoleBasis("u1", [{ oracleId: "a" }], true, read, m);
    expect(read).toHaveBeenCalledTimes(3); // the classifier basis never reads
    // And a switch-off caller never gets the labels answer a switch-on caller of the same user stored.
    expect((await loadSharedPoolRoleBasis("u1", cards, false, read, m)).basis).toBe("classifier");
    expect((await loadSharedPoolRoleBasis("u1", cards, true, read, m)).basis).toBe("labels");
  });

  it("is what the ranked list, the free ranking and the detail score call, never the raw read", () => {
    for (const f of ["recommend.ts", "free-ranking.ts"]) {
      const src = readFileSync(`${process.cwd()}/src/lib/recs/${f}`, "utf8");
      expect(src, f).toContain("loadSharedPoolRoleBasis(");
      expect(src, f).not.toMatch(/[^d]loadPoolRoleBasis\(/);
    }
  });
});
