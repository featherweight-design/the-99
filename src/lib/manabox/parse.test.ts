import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCollectionCsv } from "./parse";

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__");
const manabox = readFileSync(join(fixturesDir, "sample.csv"), "utf8");
const moxfield = readFileSync(join(fixturesDir, "moxfield.csv"), "utf8");
const archidekt = readFileSync(join(fixturesDir, "archidekt.csv"), "utf8");
const plain = readFileSync(join(fixturesDir, "plain.csv"), "utf8");

describe("parseCollectionCsv", () => {
  it("parses the ManaBox export shape (all six columns present)", () => {
    const { rows } = parseCollectionCsv(manabox);
    expect(rows[0]).toEqual({
      name: "Sol Ring", setCode: "C21", quantity: 2,
      scryfallId: "83f43730-1c1f-4150-8771-d901c54bedd4",
      foil: false, condition: "near_mint",
      line: 2,
    });
  });

  it("carries the source line number on each row (header is line 1)", () => {
    const { rows } = parseCollectionCsv(manabox);
    expect(rows.map((r) => r.line)).toEqual([2, 3, 4]);
  });

  it("treats foil=`foil` as foil:true and foil=`normal` as foil:false", () => {
    const { rows } = parseCollectionCsv(manabox);
    expect(rows[2].foil).toBe(true);   // Lightning Bolt row is "foil"
    expect(rows[0].foil).toBe(false);  // Sol Ring row is "normal"
  });

  it("parses Moxfield-style headers (Count/Name/Edition/Foil, quoted fields)", () => {
    const { rows, errors } = parseCollectionCsv(moxfield);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ name: "Sol Ring", quantity: 2, setCode: "c21", foil: false });
    expect(rows[2]).toMatchObject({ name: "Lightning Bolt", foil: true });
  });

  it("parses Archidekt-style headers (Quantity/Name/Edition/Finish)", () => {
    const { rows } = parseCollectionCsv(archidekt);
    expect(rows[0]).toMatchObject({ name: "Sol Ring", quantity: 2, setCode: "C21", foil: false });
    expect(rows[1]).toMatchObject({ name: "Lightning Bolt", foil: true });
  });

  it("parses a minimal plain CSV (Card Name + Qty only)", () => {
    const { rows, errors } = parseCollectionCsv(plain);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      name: "Sol Ring", setCode: "", quantity: 2,
      scryfallId: null, foil: false, condition: null, line: 2,
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

  it("reports empty file as a parse error on line 1", () => {
    const { rows, errors } = parseCollectionCsv("");
    expect(rows).toHaveLength(0);
    expect(errors[0].line).toBe(1);
    expect(errors[0].reason).toMatch(/empty/i);
  });
});
