import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readLabelList } from "./label-list";

const dirWith = (body: string) => {
  const dir = mkdtempSync(join(tmpdir(), "label-list-"));
  writeFileSync(join(dir, "x.json"), body);
  return dir;
};
const ID = "904fdc61-e190-4ba5-8e34-2b18fa0584f2";

describe("readLabelList", () => {
  it("reads the committed v8 trial: the 298 v7 misses and 94 controls, no id twice", () => {
    expect(readLabelList("v8-trial")).toHaveLength(392);
  });

  it("returns the ids in file order", () => {
    expect(readLabelList("x", dirWith(JSON.stringify([{ oracleId: ID, name: "A" }])))).toEqual([ID]);
  });

  it("refuses an empty list, a row with no uuid, and an id named twice", () => {
    expect(() => readLabelList("x", dirWith("[]"))).toThrow(/non-empty/);
    expect(() => readLabelList("x", dirWith(JSON.stringify([{ name: "A" }])))).toThrow(/row 0/);
    expect(() => readLabelList("x", dirWith(JSON.stringify([{ oracleId: "nope" }])))).toThrow(/row 0/);
    expect(() => readLabelList("x", dirWith(JSON.stringify([{ oracleId: ID }, { oracleId: ID }])))).toThrow(/twice/);
  });
});
