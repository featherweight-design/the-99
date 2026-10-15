// The ticked import's receipt rule: only this deck's own standing add draws one, and it counts the copies it added.
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));
const { importAddCopies } = await import("./import-add-receipt");

const row = (before: number | null, after: number | null) => ({
  oracleId: "o", setCode: "", collectorNumber: "", finish: "nonfoil", name: "Sol Ring",
  before: before === null ? null : { quantity: before }, after: after === null ? null : { quantity: after },
});
const entry = (over = {}) => ({ source: "deck:d1", kind: "add", revertedBy: null, rows: [row(null, 2), row(1, 4)], ...over });

describe("importAddCopies", () => {
  it("counts the copies the add raised", () => {
    expect(importAddCopies(entry() as never, "d1")).toBe(5);
  });

  it("answers nothing for another deck, another kind, a revert, or a pruned entry", () => {
    expect(importAddCopies(entry() as never, "d2")).toBeNull();
    expect(importAddCopies(entry({ source: "precon:abc" }) as never, "d1")).toBeNull();
    expect(importAddCopies(entry({ kind: "edit" }) as never, "d1")).toBeNull();
    expect(importAddCopies(entry({ revertedBy: "r1" }) as never, "d1")).toBeNull();
    expect(importAddCopies(entry({ rows: null }) as never, "d1")).toBeNull();
    expect(importAddCopies(undefined, "d1")).toBeNull();
  });

  it("answers nothing for an add that raised nothing", () => {
    expect(importAddCopies(entry({ rows: [row(2, 2)] }) as never, "d1")).toBeNull();
  });
});
