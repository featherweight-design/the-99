import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { looksLikeCsv, parseCollectionCsv } from "./parse";

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__");
const manabox = readFileSync(join(fixturesDir, "sample.csv"), "utf8");
const moxfield = readFileSync(join(fixturesDir, "moxfield.csv"), "utf8");
const archidekt = readFileSync(join(fixturesDir, "archidekt.csv"), "utf8");
const plain = readFileSync(join(fixturesDir, "plain.csv"), "utf8");

describe("parseCollectionCsv", () => {
  it("parses the ManaBox export shape (all seven columns present)", () => {
    const { rows } = parseCollectionCsv(manabox);
    expect(rows[0]).toEqual({
      name: "Sol Ring", setCode: "c21", collectorNumber: "263", quantity: 2,
      scryfallId: "83f43730-1c1f-4150-8771-d901c54bedd4",
      finish: "nonfoil", condition: "near_mint",
      line: 2,
    });
  });

  it("picks up the Collector number column", () => {
    const { rows } = parseCollectionCsv(manabox);
    expect(rows.map((r) => r.collectorNumber)).toEqual(["263", "7", "97"]);
  });

  it("keeps collector numbers as text (\"12a\", \"★\" are legal Scryfall values)", () => {
    const { rows } = parseCollectionCsv("Name,Quantity,Collector number\nDelver,1,12a\nPlains,1,★\n");
    expect(rows.map((r) => r.collectorNumber)).toEqual(["12a", "★"]);
  });

  it("accepts the alternative collector-number headers", () => {
    for (const header of ["Collector No", "Number", "CN"]) {
      const { rows } = parseCollectionCsv(`Name,Quantity,${header}\nSol Ring,1,263\n`);
      expect(rows[0].collectorNumber).toBe("263");
    }
  });

  it("leaves collectorNumber empty when the export has no such column", () => {
    const { rows } = parseCollectionCsv(plain);
    expect(rows[0].collectorNumber).toBe("");
  });

  it("still prefers `Set code` over `Set name` when both are present", () => {
    // findHeaderIndex tries candidates in order, so "set code" must stay ahead of "set".
    const { rows } = parseCollectionCsv(manabox);
    expect(rows[0].setCode).toBe("c21");   // not "commander 2021"
  });

  it("lowercases set codes so the printings join is exact (§3.3)", () => {
    const { rows } = parseCollectionCsv(manabox);
    expect(rows.map((r) => r.setCode)).toEqual(["c21", "c14", "2xm"]);
  });

  it("maps the Foil column onto Scryfall's finish vocabulary", () => {
    const { rows } = parseCollectionCsv(
      "Name,Quantity,Foil\nA,1,normal\nB,1,foil\nC,1,etched\nD,1,\nE,1,Foil Etched\n",
    );
    expect(rows.map((r) => r.finish)).toEqual(["nonfoil", "foil", "etched", "nonfoil", "etched"]);
  });

  it("reads a boolean-encoded Foil column, where 1 is foil and 0 is not", () => {
    // The old boolean allowlisted the non-foil values, so "1" was foil by falling through.
    // Inverting the allowlist drops that unless "1" is listed explicitly.
    const { rows } = parseCollectionCsv("Name,Quantity,Foil\nA,1,1\nB,1,0\n");
    expect(rows.map((r) => r.finish)).toEqual(["foil", "nonfoil"]);
  });

  it("falls back to nonfoil for any unrecognized finish value", () => {
    // Unknown strings must not become foil: that is what keeps the non-ManaBox exports
    // (Moxfield, Archidekt, Deckbox, bare Name,Qty) importing as they always have.
    const { rows } = parseCollectionCsv("Name,Quantity,Foil\nA,1,shiny\nB,1,0\nC,1,rainbow\n");
    expect(rows.map((r) => r.finish)).toEqual(["nonfoil", "nonfoil", "nonfoil"]);
  });

  it("carries the source line number on each row (header is line 1)", () => {
    const { rows } = parseCollectionCsv(manabox);
    expect(rows.map((r) => r.line)).toEqual([2, 3, 4]);
  });

  it("treats foil=`foil` as finish foil and foil=`normal` as finish nonfoil", () => {
    const { rows } = parseCollectionCsv(manabox);
    expect(rows[2].finish).toBe("foil");      // Lightning Bolt row is "foil"
    expect(rows[0].finish).toBe("nonfoil");   // Sol Ring row is "normal"
  });

  it("parses Moxfield-style headers (Count/Name/Edition/Foil, quoted fields)", () => {
    const { rows, errors } = parseCollectionCsv(moxfield);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ name: "Sol Ring", quantity: 2, setCode: "c21", finish: "nonfoil" });
    expect(rows[2]).toMatchObject({ name: "Lightning Bolt", finish: "foil" });
  });

  it("parses Archidekt-style headers (Quantity/Name/Edition/Finish)", () => {
    const { rows } = parseCollectionCsv(archidekt);
    expect(rows[0]).toMatchObject({ name: "Sol Ring", quantity: 2, setCode: "c21", finish: "nonfoil" });
    expect(rows[1]).toMatchObject({ name: "Lightning Bolt", finish: "foil" });
  });

  it("parses a minimal plain CSV (Card Name + Qty only)", () => {
    const { rows, errors } = parseCollectionCsv(plain);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      name: "Sol Ring", setCode: "", collectorNumber: "", quantity: 2,
      scryfallId: null, finish: "nonfoil", condition: null, line: 2,
    });
  });

  it("matches headers case-insensitively", () => {
    const { rows } = parseCollectionCsv("name,qty\nSol Ring,3\n");
    expect(rows[0]).toMatchObject({ name: "Sol Ring", quantity: 3 });
  });

  it("rejects a CSV missing a Name column", () => {
    const { rows, errors } = parseCollectionCsv("Foo,Quantity\nBar,1\n");
    expect(rows).toHaveLength(0);
    expect(errors[0].reason).toMatch(/name/i);
    expect(errors[0].line).toBe(1);
  });

  it("rejects a CSV missing a Quantity column", () => {
    const { rows, errors } = parseCollectionCsv("Name,Foo\nSol Ring,x\n");
    expect(rows).toHaveLength(0);
    expect(errors[0].reason).toMatch(/quantity/i);
    expect(errors[0].line).toBe(1);
  });

  it("reports rows with invalid quantity as errors with line numbers", () => {
    const { rows, errors } = parseCollectionCsv(manabox);
    expect(rows).toHaveLength(3);
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(5);
    expect(errors[0].reason).toMatch(/quantity/i);
  });

  it("rejects quantities above the 10,000 cap", () => {
    const { rows, errors } = parseCollectionCsv("Name,Quantity\nSol Ring,10001\nArcane Signet,10000\n");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Arcane Signet", quantity: 10_000 });
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toMatch(/quantity/i);
  });

  it("handles CRLF line endings", () => {
    const { rows, errors } = parseCollectionCsv("Name,Quantity,Foil\r\nSol Ring,2,foil\r\nArcane Signet,1,\r\n");
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ name: "Sol Ring", quantity: 2, finish: "foil", line: 2 });
    expect(rows[1]).toMatchObject({ name: "Arcane Signet", quantity: 1, finish: "nonfoil", line: 3 });
  });

  it("uses the first match when a header appears twice", () => {
    const { rows, errors } = parseCollectionCsv("Name,Name,Quantity\nSol Ring,Wrong,3\n");
    expect(errors).toHaveLength(0);
    expect(rows[0]).toMatchObject({ name: "Sol Ring", quantity: 3 });
  });

  it("reports empty file as a parse error on line 1", () => {
    const { rows, errors } = parseCollectionCsv("");
    expect(rows).toHaveLength(0);
    expect(errors[0].line).toBe(1);
    expect(errors[0].reason).toMatch(/empty/i);
  });
});

describe("looksLikeCsv", () => {
  it("recognizes every fixture's own header row", () => {
    expect(looksLikeCsv(manabox)).toBe(true);
    expect(looksLikeCsv(moxfield)).toBe(true);
    expect(looksLikeCsv(archidekt)).toBe(true);
    expect(looksLikeCsv(plain)).toBe(true);
  });

  it("recognizes alternative header spellings, case-insensitively", () => {
    expect(looksLikeCsv("card name,count\nSol Ring,1\n")).toBe(true);
    expect(looksLikeCsv("NAME,QTY\nSol Ring,1\n")).toBe(true);
  });

  it("does not mistake a plain decklist for a CSV header", () => {
    expect(looksLikeCsv("1 Sol Ring\n1 Cultivate\n")).toBe(false);
    expect(looksLikeCsv("Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n1 Sol Ring")).toBe(false);
  });

  it("requires both Name and Quantity — a header with only one is not CSV", () => {
    expect(looksLikeCsv("Name\nSol Ring\n")).toBe(false);
    expect(looksLikeCsv("Quantity\n1\n")).toBe(false);
  });

  it("reads line 0 literally, exactly as parseCollectionCsv does — a leading blank line is not CSV", () => {
    expect(looksLikeCsv("\n\nName,Quantity\nSol Ring,1\n")).toBe(false);
  });

  it("is false for an empty string", () => {
    expect(looksLikeCsv("")).toBe(false);
  });
});
