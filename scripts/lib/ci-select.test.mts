// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  alwaysSet, decide, globalReason, packageDepsChanged, shardsFor, SHARD_SIZE, MAX_SHARDS,
} from "./ci-select.mjs";

const base = { event: "pull_request", changed: ["src/lib/a.ts"], related: ["src/lib/a.test.ts"], always: ["src/lib/guard.test.ts"], allTests: ["x", "y", "z"] };

describe("decide", () => {
  it("selects related plus the always set, deduplicated and sorted", () => {
    const d = decide({ ...base, related: ["src/lib/b.test.ts", "src/lib/guard.test.ts"] });
    expect(d.mode).toBe("affected");
    expect(d.files).toEqual(["src/lib/b.test.ts", "src/lib/guard.test.ts"]);
  });
  it("runs everything on main and on any non-PR event", () => {
    expect(decide({ ...base, event: "push" })).toMatchObject({ mode: "full", files: base.allTests });
    expect(decide({ ...base, event: "" }).mode).toBe("full");
  });
  it("runs everything under the ci:full label", () => {
    expect(decide({ ...base, forceFull: true }).reason).toBe("ci:full label");
  });
  it.each([
    "pnpm-lock.yaml", "vitest.config.ts", "vitest.setup.ts", "tsconfig.json", ".github/workflows/ci.yml",
    "next.config.ts", "scripts/clock-shift.mjs", "scripts/ci-select.mjs", ".nvmrc", "eslint.config.mjs",
  ])("a change to %s forces the full suite", (p) => {
    expect(decide({ ...base, changed: ["src/lib/a.ts", p] })).toMatchObject({ mode: "full" });
    expect(globalReason(p)).toBe(p);
  });
  it("does not treat ordinary files as global", () => {
    for (const p of ["src/lib/a.ts", "package.json", "src/app/globals.css", "drizzle/0001_x.sql", "scripts/probe-x.mjs", ".github/workflows/card-labels.yml"]) {
      expect(globalReason(p)).toBeNull();
    }
  });
  it("runs everything only when package.json dependency fields moved", () => {
    expect(decide({ ...base, changed: ["package.json"], packageChanged: true }).mode).toBe("full");
    expect(decide({ ...base, changed: ["package.json"], packageChanged: false }).mode).toBe("affected");
  });
  it("reports none only when nothing at all is selected", () => {
    expect(decide({ ...base, related: [], always: [] }).mode).toBe("none");
  });
});

describe("packageDepsChanged", () => {
  const pkg = { scripts: { a: "x" }, dependencies: { next: "1" }, pnpm: { overrides: { a: "1" } }, packageManager: "pnpm@10" };
  it("ignores scripts", () => {
    expect(packageDepsChanged(pkg, { ...pkg, scripts: { a: "x", b: "y" } })).toBe(false);
  });
  it("does not ignore the test script, which CI runs", () => {
    const withTest = { ...pkg, scripts: { a: "x", test: "vitest run" } };
    expect(packageDepsChanged(withTest, { ...withTest, scripts: { a: "x", test: "vitest run --pool=threads" } })).toBe(true);
    expect(packageDepsChanged(pkg, withTest)).toBe(true);
  });
  it.each([
    ["dependencies", { dependencies: { next: "2" } }],
    ["devDependencies", { devDependencies: { vitest: "1" } }],
    ["pnpm overrides", { pnpm: { overrides: { a: "2" } } }],
    ["packageManager", { packageManager: "pnpm@11" }],
  ])("sees a change to %s", (_n, patch) => {
    expect(packageDepsChanged(pkg, { ...pkg, ...patch })).toBe(true);
  });
});

describe("alwaysSet", () => {
  const src = (text: string, path = "a.test.ts") => ({ path, text });
  it.each([
    'import { readFileSync } from "node:fs";',
    'const s = await readFile(join(process.cwd(), "x"))',
    'const { readFileSync } = await import("node:fs");',
    'import { spawnSync } from "node:child_process";',
    'const d = import.meta.dirname',
    'existsSync(p)',
    'const csv = fileURLToPath(new URL("../../../data/the-vault.csv", import.meta.url)); readCsv(csv)',
    'const here = dirname(__dirname)',
  ])("includes a test reading the tree: %s", (text) => {
    expect(alwaysSet([src(text)])).toEqual(["a.test.ts"]);
  });
  it("leaves out a plain unit test", () => {
    expect(alwaysSet([src('import { it } from "vitest"; it("x", () => {})')])).toEqual([]);
  });
});

describe("shardsFor", () => {
  it("scales with the selection and caps", () => {
    expect(shardsFor(0)).toBe(0);
    expect(shardsFor(1)).toBe(1);
    expect(shardsFor(SHARD_SIZE)).toBe(1);
    expect(shardsFor(SHARD_SIZE + 1)).toBe(2);
    expect(shardsFor(990)).toBe(MAX_SHARDS);
  });
});
