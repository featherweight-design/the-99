import { PgDialect } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { cards } from "../../db/schema";
import {
  buildCommanderPrintings,
  filePrintedIn,
  isPrintedIn,
  lanePrintedIn,
  normalizeSetCodes,
} from "./printed-in";
import { printedIn } from "./printed-in-sql";

const rows = [
  { oracle_id: "a", set_code: "hob", name: "Hobbits", released_at: "2026-09-01" },
  { oracle_id: "a", set_code: "cmm", name: "Commander Masters", released_at: "2023-08-04" },
  { oracle_id: "b", set_code: "HOC", name: "Hobbit Commander", released_at: "2026-09-01" },
  { oracle_id: "c", set_code: "cmm", name: "Commander Masters", released_at: "2023-08-04" },
  { oracle_id: "c", set_code: "pxyz", name: null, released_at: null },
];

describe("normalizeSetCodes", () => {
  it("lower-cases, trims, dedupes and sorts", () => {
    expect(normalizeSetCodes([" HOB", "hoc", "hob", ""])).toEqual(["hob", "hoc"]);
  });
});

describe("printedIn", () => {
  const render = (codes: string[]) =>
    new PgDialect().sqlToQuery(printedIn(cards.oracleId, codes));

  it("correlates the aliased inner table against the outer, qualified column", () => {
    const q = render(["HOB"]);
    expect(q.sql).toContain('pi.oracle_id = "cards"."oracle_id"');
    expect(q.sql).toContain("pi.set_code = any(");
    expect(q.params).toEqual([["hob"]]);
  });

  it("is no filter at all for an empty selection", () => {
    expect(render([]).sql).toBe("true");
  });

  // H35, PR 4a (deck tuning's hard filters): Drizzle drops the qualifier from a bare column
  // reference interpolated into the projection of a single-table select (AGENTS.md, "A
  // correlated subquery in a single-table select must alias and qualify"). `printedIn`'s own
  // isolated render above is correctly qualified; this pins the ACTUAL call site's shape —
  // embedded as a projection value beside other real columns, rather than rendered alone — since
  // that embedding is exactly where the rule bites and a passing isolated test cannot see it.
  it("stays qualified once embedded in a real multi-column projection", () => {
    const q = db
      .select({
        oracleId: cards.oracleId,
        name: cards.name,
        printedInSelectedSets: sql<boolean>`${printedIn(cards.oracleId, ["lea"])}`,
      })
      .from(cards)
      .toSQL();
    expect(q.sql).toContain('pi.oracle_id = "cards"."oracle_id"');
    expect(q.sql).not.toMatch(/pi\.oracle_id = "oracle_id"/);
  });
});

describe("buildCommanderPrintings", () => {
  const index = buildCommanderPrintings(rows);

  it("orders sets newest first, ties by code, undated last, and lower-cases codes", () => {
    expect(index.sets.map((s) => s.code)).toEqual(["hob", "hoc", "cmm", "pxyz"]);
  });

  it("falls back to the upper-cased code for a set with no name", () => {
    expect(index.sets[3]).toEqual({ code: "pxyz", name: "PXYZ" });
  });

  it("lists each card's sets once, in set order", () => {
    expect(index.byOracle).toEqual({ a: [0, 2], b: [1], c: [2, 3] });
  });
});

describe("lanePrintedIn", () => {
  const index = buildCommanderPrintings(rows);

  it("ships only the sets the lane's rows were printed in, aligned to the rows", () => {
    const lane = lanePrintedIn(["c", "b", "zz"], index);
    expect(lane.sets.map((s) => s.code)).toEqual(["hoc", "cmm", "pxyz"]);
    expect(lane.rows).toEqual([[1, 2], [0], []]);
  });
});

describe("isPrintedIn", () => {
  const index = buildCommanderPrintings(rows);
  const filed = filePrintedIn(new Map(), ["a", "b", "c"], lanePrintedIn(["a", "b", "c"], index));

  it("matches a card printed in ANY selected set", () => {
    expect(isPrintedIn(filed, "a", ["hoc", "cmm"])).toBe(true);
    expect(isPrintedIn(filed, "b", ["hoc", "cmm"])).toBe(true);
    expect(isPrintedIn(filed, "a", ["hoc"])).toBe(false);
  });

  it("keeps every row for an empty selection, and matches nothing for an unknown row or code", () => {
    expect(isPrintedIn(filed, "zz", [])).toBe(true);
    expect(isPrintedIn(filed, "zz", ["hob"])).toBe(false);
    expect(isPrintedIn(filed, "a", ["nope"])).toBe(false);
  });

  it("files a second ranking's rows beside the first", () => {
    const more = filePrintedIn(new Map(filed), ["c"], lanePrintedIn(["c"], index));
    expect(more.get("a")).toEqual(["hob", "cmm"]);
    expect(more.get("c")).toEqual(["cmm", "pxyz"]);
  });
});
