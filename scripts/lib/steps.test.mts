// @vitest-environment node
//
// Both problems these find are SILENT SKIPS — a step the runner does not read,
// and a role match with no name — which is the failure a contact sheet is worst
// at: the cell is photographed, nothing looks failed, and the route is in the
// wrong state. They are checked before the browser launches, which is also what
// makes them reachable from here.
import { describe, expect, it } from "vitest";
import { inventoryProblems } from "./steps.mjs";

const inv = (...steps: Record<string, unknown>[]) => ({ rows: [{ id: "row", steps }] });

describe("inventoryProblems", () => {
  it("passes every step key the runner actually reads", () => {
    expect(inventoryProblems(inv(
      { goto: "/decks", wait: "main", settle: 100 },
      { click: "button", scroll: 40 },
      { clickRole: "button", name: "^Filters$" },
      { fill: "input", text: "hobbi" },
      { scroll: "bottom" },
    ))).toEqual([]);
  });

  it("names an unknown key rather than skipping the step", () => {
    const [problem] = inventoryProblems(inv({ clik: "button" }));
    expect(problem).toContain("unknown step key clik");
    expect(problem).toContain("Known:");
  });

  it("adds the migration note only for the key it is about", () => {
    // Appended to every typo it buries the actual error: `clik` is not a row
    // that needs splitting by width.
    expect(inventoryProblems(inv({ clickIfPresent: "button" }))[0])
      .toContain("`clickIfPresent` was removed");
    expect(inventoryProblems(inv({ clik: "button" }))[0])
      .not.toContain("clickIfPresent");
  });

  it("refuses a clickRole with no name", () => {
    // `new RegExp(undefined)` is `/(?:)/`, which matches everything — so the
    // first control in the page wins and the cell reports itself reached.
    for (const name of [undefined, "", 7]) {
      const [problem] = inventoryProblems(inv({ clickRole: "button", name }));
      expect(problem).toContain("needs a non-empty `name`");
    }
  });

  it("reports every row, not the first bad one", () => {
    const many = { rows: [{ id: "a", steps: [{ clik: 1 }] }, { id: "b", steps: [{ clickRole: "button" }] }] };
    expect(inventoryProblems(many).map((p) => p.split(":")[0])).toEqual(["a", "b"]);
  });

  it("says nothing about a row with no steps", () => {
    expect(inventoryProblems({ rows: [{ id: "a" }] })).toEqual([]);
  });
});
