import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseManaBoxCsv } from "./parse";

// import.meta.url, not __dirname: Vitest runs tests as ESM, where __dirname is undefined.
const csv = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "__fixtures__", "sample.csv"), "utf8");

describe("parseManaBoxCsv", () => {
  it("parses valid rows with name, set, quantity, scryfall id, foil, condition", () => {
    const { rows } = parseManaBoxCsv(csv);
    expect(rows[0]).toEqual({
      name: "Sol Ring", setCode: "C21", quantity: 2,
      scryfallId: "83f43730-1c1f-4150-8771-d901c54bedd4",
      foil: false, condition: "near_mint",
    });
  });

  it("handles quoted fields and foil flag", () => {
    const { rows } = parseManaBoxCsv(csv);
    expect(rows[1].name).toBe("Fell the Mighty");
    expect(rows[2].foil).toBe(true);
    expect(rows[2].scryfallId).toBeNull();
  });

  it("reports rows with invalid quantity as errors with line numbers", () => {
    const { rows, errors } = parseManaBoxCsv(csv);
    expect(rows).toHaveLength(3);
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(5);
    expect(errors[0].reason).toMatch(/quantity/i);
  });

  it("rejects a CSV without the expected header", () => {
    const { rows, errors } = parseManaBoxCsv("foo,bar\n1,2\n");
    expect(rows).toHaveLength(0);
    expect(errors[0].reason).toMatch(/header/i);
  });

  it("reports rows with too few columns as errors instead of throwing", () => {
    const { rows, errors } = parseManaBoxCsv(csv.split("\n")[0] + "\nJust a name\n");
    expect(rows).toHaveLength(0);
    expect(errors[0].line).toBe(2);
    expect(errors[0].reason).toMatch(/columns/i);
  });
});
