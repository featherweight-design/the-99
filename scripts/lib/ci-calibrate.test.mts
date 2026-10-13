// @vitest-environment node
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { basename, dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { compare, failingFiles, failureSummary, mutate, recheckAlone, splitMisses } from "./ci-calibrate.mjs";

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

describe("failureSummary", () => {
  it("returns the first message of each named failed file, without colour codes", () => {
    const report = { testResults: [
      { name: "/r/a.test.ts", status: "failed", assertionResults: [{ failureMessages: ["\u001b[31mTimeout\u001b[39m after 5000ms", "second"] }] },
      { name: "/r/b.test.ts", status: "failed", assertionResults: [{ failureMessages: ["other"] }] },
      { name: "/r/c.test.ts", status: "passed", assertionResults: [] },
    ] };
    expect(failureSummary(report, ["a.test.ts", "c.test.ts"], "/r")).toEqual({ "a.test.ts": "Timeout after 5000ms" });
  });
  it("cuts a long message", () => {
    const report = { testResults: [{ name: "/r/a.test.ts", status: "failed", assertionResults: [{ failureMessages: ["x".repeat(900)] }] }] };
    expect(failureSummary(report, ["a.test.ts"], "/r", 50)["a.test.ts"]).toHaveLength(50);
  });
});

describe("splitMisses", () => {
  it("keeps as real only the files that also fail alone", () => {
    expect(splitMisses(["a", "b", "c"], ["b"])).toEqual({ real: ["b"], loadSensitive: ["a", "c"] });
  });
  it("calls everything real when a rerun left no report", () => {
    expect(splitMisses(["a", "b"], null)).toEqual({ real: ["a", "b"], loadSensitive: [] });
  });
  it("a file that fails alone is never cleared", () => {
    expect(splitMisses(["a"], ["a"]).loadSensitive).toEqual([]);
  });
});

describe("recheckAlone", () => {
  it("clears a file whose isolated run passes and keeps one whose run fails", () => {
    const ran: string[] = [];
    const out = recheckAlone(["a", "b"], (f) => { ran.push(f); return f === "b" ? ["b"] : []; });
    expect(out).toEqual({ real: ["b"], loadSensitive: ["a"] });
    expect(ran).toEqual(["a", "b"]); // each file is run by itself, one call per file
  });
  it("keeps every candidate real when any rerun produced no report", () => {
    expect(recheckAlone(["a", "b"], (f) => (f === "a" ? [] : null))).toEqual({ real: ["a", "b"], loadSensitive: [] });
  });
  it("does not clear a file because ANOTHER file failed in its run", () => {
    expect(recheckAlone(["a"], () => ["z"])).toEqual({ real: [], loadSensitive: ["a"] });
  });
});

// The CLI end to end, with a fake `pnpm` on PATH that "runs vitest" by writing a report in which only the
// files named in FAIL_ALONE fail. Proves the process invokes an isolated run per missed file and that the
// exit code follows the real misses, not the full run's.
describe("ci-calibrate compare (CLI)", () => {
  const CLI = new URL("../ci-calibrate.mjs", import.meta.url).pathname;
  function run(failAlone: string[]) {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), "cal-")));
    const bin = join(dir, "bin");
    spawnSync("mkdir", ["-p", bin]);
    // fake pnpm: the last argument is the file under test; it writes recheck-results.json in the cwd
    const fake = [
      "#!/usr/bin/env node",
      "const fs = require('fs');",
      "const file = process.argv[process.argv.length - 1];",
      "const failing = (process.env.FAIL_ALONE || '').split(' ').includes(file);",
      "fs.writeFileSync('recheck-results.json', JSON.stringify({ testResults: [{ name: process.cwd() + '/' + file, status: failing ? 'failed' : 'passed', assertionResults: [] }] }));",
      "",
    ].join("\n");
    writeFileSync(join(bin, "pnpm"), fake);
    chmodSync(join(bin, "pnpm"), 0o755);
    writeFileSync(join(dir, "selection.txt"), "chosen.test.ts\n");
    const report = { testResults: [
      { name: `${dir}/chosen.test.ts`, status: "failed", assertionResults: [] },
      { name: `${dir}/missed-a.test.ts`, status: "failed", assertionResults: [{ failureMessages: ["Timeout"] }] },
      { name: `${dir}/missed-b.test.ts`, status: "failed", assertionResults: [{ failureMessages: ["boom"] }] },
    ] };
    writeFileSync(join(dir, "results.json"), JSON.stringify(report));
    const r = spawnSync("node", [CLI, "compare", "selection.txt", "results.json", "case"], {
      cwd: dir, encoding: "utf8", env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAIL_ALONE: failAlone.join(" ") },
    });
    return { code: r.status, out: r.stdout };
  }
  it("exits 0 and reports load-sensitive when every miss passes alone", () => {
    const r = run([]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("missed by the selector: 0");
    expect(r.out).toContain("load-sensitive");
  });
  it("exits 1 naming a miss that also fails alone, and still clears the other", () => {
    const r = run(["missed-b.test.ts"]);
    expect(r.code).toBe(1);
    expect(r.out).toContain("missed by the selector: 1");
    expect(r.out).toMatch(/missed-b\.test\.ts: boom/);
    expect(r.out).toMatch(/load-sensitive[\s\S]*missed-a\.test\.ts: Timeout/);
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
