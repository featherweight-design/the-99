// @vitest-environment node
//
// One rule: A STEP MUST DO SOMETHING, AND THE RUNNER MUST BE ABLE TO SEE WHAT.
// Every case here is the same failure wearing a different hat — a step the
// runner skips, leaving the page as it was while the cell is photographed and
// counted as reached. That is what a contact sheet is worst at: nothing about
// the picture looks wrong.
import { describe, expect, it } from "vitest";
import { inventoryProblems, STEP_KEYS } from "./steps.mjs";

const inv = (...steps: Record<string, unknown>[]) => ({ rows: [{ id: "row", steps }] });
const first = (...steps: Record<string, unknown>[]) => inventoryProblems(inv(...steps))[0] ?? "";

describe("inventoryProblems", () => {
  it("passes every step the runner actually reads", () => {
    expect(inventoryProblems(inv(
      { goto: "/decks", wait: "main", settle: 100 },
      { click: "button", scroll: 40 },
      { clickRole: "button", name: "^Filters$" },
      { fill: "input", text: "hobbi" },
      { scroll: "bottom" },
    ))).toEqual([]);
  });

  it("keeps its vocabulary in step with the runner", () => {
    // The set is the contract `contact-sheet.mjs`'s `run` reads. A verb added
    // there and not here throws on the inventory that first uses it.
    expect([...STEP_KEYS].sort()).toEqual(
      ["click", "clickRole", "fill", "goto", "name", "scroll", "settle", "text", "wait"],
    );
  });

  it("names an unknown key rather than skipping the step", () => {
    expect(first({ clik: "button" })).toContain("unknown step key clik");
    expect(first({ clik: "button" })).toContain("Known:");
  });

  it("adds the migration note only for the key it is about", () => {
    expect(first({ clickIfPresent: "button" })).toContain("`clickIfPresent` was removed");
    expect(first({ clik: "button" })).not.toContain("clickIfPresent");
  });

  it("refuses an empty selector, which the runner would skip", () => {
    expect(first({ click: "" })).toContain("must not be empty");
    expect(first({ clickRole: "", name: "x" })).toContain("must not be empty");
    expect(first({ fill: "" })).toContain("must not be empty");
  });

  it("refuses a value of the wrong type", () => {
    expect(first({ click: 7 })).toContain("must be a string");
    expect(first({ settle: "soon" })).toContain("must be a number");
    expect(first({ scroll: "up" })).toContain('must be a number or "bottom"');
  });

  it("refuses a clickRole with no name", () => {
    // `new RegExp(undefined)` is `/(?:)/`, which matches everything — so the
    // first control on the page wins and the cell reports itself reached.
    expect(first({ clickRole: "button" })).toContain("needs `name`");
  });

  it("refuses a field whose verb is not there", () => {
    // `run` never reads a bare `name` or `text`, so the step does nothing.
    expect(first({ name: "^Filters$" })).toContain("belongs to `clickRole`");
    expect(first({ text: "hobbi" })).toContain("belongs to `fill`");
  });

  it("refuses an empty or non-string name, which would match everything", () => {
    // An owned field skipping validation is how `{ clickRole, name: "" }` passed:
    // `new RegExp("")` matches every accessible name, and `.first()` presses
    // whatever is at the top of the page.
    expect(first({ clickRole: "button", name: "" })).toContain("must not be empty");
    expect(first({ clickRole: "button", name: "" })).toContain("every name on the page");
    expect(first({ clickRole: "button", name: 7 })).toContain("must be a string");
    expect(first({ fill: "input", text: 7 })).toContain("must be a string");
  });

  it("refuses a name that is not a valid pattern", () => {
    // `run` hands it to `new RegExp`, so `"["` is a valid non-empty string that
    // throws AFTER sign-in — a preflight that let the thing through.
    expect(first({ clickRole: "button", name: "[" }))
      .toContain("is not a valid regular expression");
    expect(first({ clickRole: "button", name: "^Filters$" })).toBe("");
  });

  it("refuses an inventory with no rows", () => {
    // It walks nothing, writes a blank sheet and exits 0 — the same silent
    // success one level up.
    expect(inventoryProblems({ feature: "x", rows: [] })[0]).toContain("has no rows");
    expect(inventoryProblems({ feature: "x" })[0]).toContain("has no rows");
  });

  it("refuses an empty step and a row with no steps", () => {
    // The page is shared between rows, so either one photographs whatever the
    // row before left on screen.
    expect(first({})).toContain("empty step");
    expect(inventoryProblems({ rows: [{ id: "a" }] })[0]).toContain("has no steps");
    expect(inventoryProblems({ rows: [{ id: "a", steps: [] }] })[0]).toContain("has no steps");
  });

  it("reports every row, not the first bad one", () => {
    const many = {
      rows: [
        { id: "a", steps: [{ clik: 1 }] },
        { id: "b", steps: [{ clickRole: "button" }] },
      ],
    };
    expect(inventoryProblems(many).map((p) => p.split(":")[0])).toEqual(["a", "b"]);
  });
});
