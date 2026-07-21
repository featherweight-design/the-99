import { describe, expect, it } from "vitest";
import {
  escapeRegex,
  filterParseErrors,
  filterUnmatched,
  findMatchRanges,
} from "./issue-filter";

describe("filterUnmatched", () => {
  const rows = [
    { name: "Sol Ring", setCode: "C21", line: 2, quantity: 1 },
    { name: "Lightning Bolt", setCode: "LEA", line: 3, quantity: 4 },
    { name: "sol land", setCode: "", line: 4, quantity: 1 },
  ];

  it("returns all rows for empty query", () => {
    expect(filterUnmatched(rows, "")).toHaveLength(3);
  });

  it("matches case-insensitively on name", () => {
    expect(filterUnmatched(rows, "SOL").map((r) => r.name)).toEqual([
      "Sol Ring",
      "sol land",
    ]);
  });

  it("does not match on setCode or line", () => {
    expect(filterUnmatched(rows, "C21")).toEqual([]);
    expect(filterUnmatched(rows, "3")).toEqual([]);
  });

  it("trims whitespace-only query to empty (returns all)", () => {
    expect(filterUnmatched(rows, "   ")).toHaveLength(3);
  });
});

describe("filterParseErrors", () => {
  const rows = [
    { line: 1902, reason: "missing card name" },
    { line: 2210, reason: `invalid quantity "two"` },
    { line: 2554, reason: `expected at least 2 columns, got 1` },
  ];

  it("matches case-insensitively on reason", () => {
    expect(filterParseErrors(rows, "QUANTITY").map((r) => r.line)).toEqual([2210]);
  });

  it("matches on stringified line number", () => {
    expect(filterParseErrors(rows, "2210").map((r) => r.line)).toEqual([2210]);
  });

  it("matches partial line number", () => {
    expect(filterParseErrors(rows, "22").map((r) => r.line)).toEqual([2210]);
  });

  it("returns all rows for empty query", () => {
    expect(filterParseErrors(rows, "")).toHaveLength(3);
  });
});

describe("findMatchRanges", () => {
  it("returns all case-insensitive runs, not just the first", () => {
    expect(findMatchRanges("Sol Ring sol ring", "sol")).toEqual([
      [0, 3],
      [9, 12],
    ]);
  });

  it("returns [] for empty query", () => {
    expect(findMatchRanges("Sol Ring", "")).toEqual([]);
  });

  it("returns [] for whitespace-only query", () => {
    expect(findMatchRanges("Sol Ring", "   ")).toEqual([]);
  });

  it("returns [] when text has no matches", () => {
    expect(findMatchRanges("Sol Ring", "bolt")).toEqual([]);
  });

  it("escapes regex metacharacters in the query", () => {
    expect(findMatchRanges(`quantity "two"`, `"two"`)).toEqual([[9, 14]]);
    expect(findMatchRanges("a.b.c", "a.b")).toEqual([[0, 3]]);
    // ".b" is a literal 2-char match at positions 1..3 and 3..5; overlaps
    // suppressed by advancing past each match.
    expect(findMatchRanges("a.b.c", ".b")).toEqual([[1, 3]]);
  });

  it("handles overlapping potential matches by advancing past each match", () => {
    expect(findMatchRanges("aaaa", "aa")).toEqual([
      [0, 2],
      [2, 4],
    ]);
  });
});

describe("escapeRegex", () => {
  it("escapes regex metacharacters", () => {
    expect(escapeRegex(`.*+?^${"$"}{}()|[]\\`)).toBe(
      `\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\`,
    );
  });

  it("leaves plain text alone", () => {
    expect(escapeRegex("Sol Ring")).toBe("Sol Ring");
  });
});
