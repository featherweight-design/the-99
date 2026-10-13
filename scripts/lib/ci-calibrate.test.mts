// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { compare, failingFiles, mutate } from "./ci-calibrate.mjs";

describe("mutate", () => {
  it("appends a module-level throw to code", () => {
    const out = mutate("src/a.ts", Buffer.from("export const a = 1;\n")).toString();
    expect(out.startsWith("export const a = 1;")).toBe(true);
    expect(out).toContain("throw new Error");
  });
  it("keeps only the second half of anything else", () => {
    expect(mutate("a.css", Buffer.from("abcdefgh")).toString()).toBe("efgh");
    expect(mutate("a.json", Buffer.from('{"a":1,"b":2}')).length).toBeLessThan(13);
  });
  it("honors an explicit mode over the extension", () => {
    expect(mutate("a.ts", Buffer.from("abcdefgh"), "half").toString()).toBe("efgh");
    expect(mutate("a.css", Buffer.from("abc"), "throw").toString()).toContain("throw");
    expect(() => mutate("a.ts", Buffer.from("x"), "bogus" as never)).toThrow(/unknown mutation mode/);
  });
  it.each(["a.ts", "a.tsx", "a.mts", "a.mjs"])("treats %s as code", (p) => {
    expect(mutate(p, Buffer.from("x")).toString()).toContain("throw");
  });
});

describe("compare", () => {
  it("reports a failing test the selector did not choose", () => {
    expect(compare({ selected: ["a.test.ts"], failing: ["a.test.ts", "b.test.ts"] }).missed).toEqual(["b.test.ts"]);
  });
  it("is clean when every failure was chosen", () => {
    expect(compare({ selected: ["a.test.ts", "c.test.ts"], failing: ["a.test.ts"] })).toEqual({ failing: 1, missed: [], informative: true });
  });
  it("calls a run with no failures uninformative rather than clean", () => {
    expect(compare({ selected: ["a"], failing: [] }).informative).toBe(false);
  });
});

describe("failingFiles", () => {
  it("keeps only failed files, relative to the root", () => {
    const report = { testResults: [
      { name: "/r/src/a.test.ts", status: "failed" },
      { name: "/r/src/b.test.ts", status: "passed" },
    ] };
    expect(failingFiles(report, "/r")).toEqual(["src/a.test.ts"]);
  });
});

describe("the case list", () => {
  const cases = JSON.parse(readFileSync(new URL("../ci-calibration-cases.json", import.meta.url), "utf8")) as { path: string; why: string; modes?: string[] }[];
  it("names files that exist and a reason for each", () => {
    for (const c of cases) {
      // Exact case: macOS resolves `w.svg` to `W.svg`, a Linux runner does not.
      const abs = new URL(`../../${c.path}`, import.meta.url).pathname;
      expect(readdirSync(dirname(abs)), c.path).toContain(basename(abs));
      expect(c.why.length).toBeGreaterThan(5);
    }
  });
});
