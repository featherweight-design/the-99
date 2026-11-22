import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { fromColumns, toColumns } from "./columns";

const U1 = "c1466ae6-9dbc-4ea3-9f6e-3f5d0a1b2c3d";
const U2 = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

describe("toColumns / fromColumns", () => {
  it("round-trips records, telling an absent key from a null one", () => {
    const rows = [
      { id: U1, art: `${U2}?123`, price: 80, tags: ["a"], note: null },
      { id: U2, art: null, tags: [], note: "x" },
      { id: "not-a-uuid", art: `${U1}`, price: 0 },
    ];
    const back = fromColumns(toColumns(rows));
    expect(back).toEqual(rows);
    expect(Object.hasOwn(back[1], "price")).toBe(false);
    expect(back[1]).toHaveProperty("art", null);
  });

  it("stores a repeated value once, and a UUID column at 22 characters", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ type: i % 2 ? "Instant" : "Sorcery", id: U1.replace("c1466ae6", `c1466a${i}0`) }));
    const { cols } = toColumns(rows);
    expect(cols.type.d).toEqual(["Sorcery", "Instant"]);
    expect(cols.type.v).toHaveLength(10);
    expect(cols.id.u).toBe(1);
    expect(cols.id.v.every((v) => (v as string).length === 22)).toBe(true);
    expect(fromColumns(toColumns(rows))).toEqual(rows);
  });

  it("leaves a column of mixed strings as it came, and counts an undefined value as absent", () => {
    const rows = [{ k: U1, u: undefined }, { k: "plain" }];
    const table = toColumns(rows);
    expect(table.cols.k.u).toBeUndefined();
    expect(table.cols.u).toMatchObject({ v: [], x: [] });
    expect(fromColumns(table)).toEqual([{ k: U1 }, { k: "plain" }]);
  });

  it("round-trips no records", () => {
    expect(fromColumns(toColumns([]))).toEqual([]);
  });

  // The browser decodes with this file (and `collection/list-wire.ts`), where Buffer and node:
  // modules do not exist.
  it("stays free of Node-only APIs, since the browser runs it", () => {
    for (const file of ["./columns.ts", "../collection/list-wire.ts"]) {
      const text = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(text).not.toMatch(/\bBuffer\b|from "node:/);
    }
  });
});
