import { describe, expect, it } from "vitest";
import { parsePasteList } from "./paste";

describe("parsePasteList", () => {
  it("parses `N Name` lines", () => {
    const { rows, errors } = parsePasteList("3 Sol Ring\n1 Cultivate\n");
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { name: "Sol Ring", setCode: "", quantity: 3, scryfallId: null, foil: false, condition: null },
      { name: "Cultivate", setCode: "", quantity: 1, scryfallId: null, foil: false, condition: null },
    ]);
  });

  it("parses `Nx Name` and `NX Name`", () => {
    const { rows } = parsePasteList("2x Sol Ring\n4X Cultivate\n");
    expect(rows.map((r) => [r.quantity, r.name])).toEqual([
      [2, "Sol Ring"],
      [4, "Cultivate"],
    ]);
  });

  it("treats a bare name as quantity 1", () => {
    const { rows } = parsePasteList("Sol Ring\n");
    expect(rows).toEqual([
      { name: "Sol Ring", setCode: "", quantity: 1, scryfallId: null, foil: false, condition: null },
    ]);
  });

  it("skips blank lines and trims whitespace", () => {
    const { rows, errors } = parsePasteList("\n  3 Sol Ring  \n\n  Cultivate\n\n");
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Sol Ring");
    expect(rows[1].name).toBe("Cultivate");
  });

  it("reports quantity <= 0 as an error with the source line number", () => {
    const { rows, errors } = parsePasteList("1 Sol Ring\n0 Cultivate\n");
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([
      { line: 2, raw: "0 Cultivate", reason: expect.stringMatching(/quantity/i) },
    ]);
  });

  it("reports a lone number with no name as an error", () => {
    const { rows, errors } = parsePasteList("3\n");
    expect(rows).toHaveLength(0);
    expect(errors[0].reason).toMatch(/name/i);
    expect(errors[0].line).toBe(1);
  });

  it("reports an oversized quantity as an error", () => {
    const { rows, errors } = parsePasteList("9999999999 Sol Ring\n");
    expect(rows).toHaveLength(0);
    expect(errors[0].reason).toMatch(/quantity/i);
  });

  it("reports a negative quantity as an error instead of treating it as a name", () => {
    const { rows, errors } = parsePasteList("-1 Sol Ring\n");
    expect(rows).toHaveLength(0);
    expect(errors[0].reason).toMatch(/quantity/i);
    expect(errors[0].line).toBe(1);
  });

  it("produces rows compatible with matchRows: scryfallId is null (not empty string)", () => {
    // Contract test: matchRows uses `row.scryfallId && ...` then `??` fallback;
    // "" would short-circuit both operators and drop every row into `unmatched`.
    const { rows } = parsePasteList("1 Sol Ring\n");
    expect(rows[0].scryfallId).toBeNull();
  });
});
