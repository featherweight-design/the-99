import { describe, expect, it } from "vitest";
import { parsePasteList } from "./paste";

describe("parsePasteList", () => {
  it("parses `N Name` lines", () => {
    const { rows, errors } = parsePasteList("3 Sol Ring\n1 Cultivate\n");
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { name: "Sol Ring", setCode: "", quantity: 3, collectorNumber: "", scryfallId: null, finish: "nonfoil", condition: null, line: 1 },
      { name: "Cultivate", setCode: "", quantity: 1, collectorNumber: "", scryfallId: null, finish: "nonfoil", condition: null, line: 2 },
    ]);
  });

  it("parses `Nx Name` and `NX Name`", () => {
    const { rows } = parsePasteList("2x Sol Ring\n4X Cultivate\n");
    expect(rows.map((r) => [r.quantity, r.name, r.line])).toEqual([
      [2, "Sol Ring", 1],
      [4, "Cultivate", 2],
    ]);
  });

  it("treats a bare name as quantity 1", () => {
    const { rows } = parsePasteList("Sol Ring\n");
    expect(rows).toEqual([
      { name: "Sol Ring", setCode: "", quantity: 1, collectorNumber: "", scryfallId: null, finish: "nonfoil", condition: null, line: 1 },
    ]);
  });

  it("carries the original 1-based source line even when blank lines precede it", () => {
    const { rows } = parsePasteList("\n\n3 Sol Ring\n\n1 Cultivate\n");
    expect(rows.map((r) => [r.name, r.line])).toEqual([
      ["Sol Ring", 3],
      ["Cultivate", 5],
    ]);
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
    const { rows } = parsePasteList("1 Sol Ring\n");
    expect(rows[0].scryfallId).toBeNull();
  });

  it("reads the ManaBox/Moxfield text export's set code and collector number", () => {
    const { rows, errors } = parsePasteList("1 Boggart Cursecrafter (ECL) 331\nDragonfly Swarm (TLA) 215\n");
    expect(errors).toEqual([]);
    expect(rows.map((r) => [r.name, r.setCode, r.collectorNumber, r.quantity])).toEqual([
      ["Boggart Cursecrafter", "ecl", "331", 1],
      ["Dragonfly Swarm", "tla", "215", 1],
    ]);
  });

  it("reads *F* and *E* as foil and etched, and keeps a comma in the name", () => {
    const { rows } = parsePasteList("2 Kiki-Jiki, Mirror Breaker (CHK) 175 *F*\n1 Sol Ring (CMM) 410 *E*\n");
    expect(rows.map((r) => [r.name, r.setCode, r.finish, r.quantity])).toEqual([
      ["Kiki-Jiki, Mirror Breaker", "chk", "foil", 2],
      ["Sol Ring", "cmm", "etched", 1],
    ]);
  });

  it("leaves a bare name and a parenthetical that is not a set code alone", () => {
    const { rows } = parsePasteList("1 Sol Ring\n1 Erase (Not the Urza's Legacy One)\n");
    expect(rows.map((r) => [r.name, r.setCode, r.collectorNumber, r.finish])).toEqual([
      ["Sol Ring", "", "", "nonfoil"],
      ["Erase (Not the Urza's Legacy One)", "", "", "nonfoil"],
    ]);
  });
});
