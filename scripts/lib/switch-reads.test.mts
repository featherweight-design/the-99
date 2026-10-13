import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALLOWED, DEFAULTS_PENDING, PENDING, envDefaultsIn, switchReadFindings, switchReadsIn } from "./switch-reads.mjs";

const lines = (src: string, path = "x.ts") => switchReadsIn(path, src).map((f) => f.line);

describe("switchReadsIn", () => {
  it("finds process.env handed to a flag function, or to any call", () => {
    expect(lines("const on = deckNotesEnabled(process.env);")).toEqual([1]);
    expect(lines("x;\nawait loadThing(u, process.env, tx);")).toEqual([2]);
    expect(lines('const on = tuningEnabled(process["env"]);')).toEqual([1]);
  });

  it("finds a spread or copy of it, and a fallback to it", () => {
    expect(lines("fooEnabled({ ...process.env, FOO: 'true' });")).toEqual([1]);
    expect(lines("fooEnabled(Object.assign({}, process.env));")).toEqual([1]);
    expect(lines("fooEnabled(env ?? process.env);")).toEqual([1]);
    expect(lines("fooEnabled(user ? env : process.env);")).toEqual([1]);
  });

  it("finds it bound first and handed on later, or passed as an option or a prop", () => {
    expect(lines("const e = process.env;\nfooEnabled(e);")).toEqual([1]);
    expect(lines("let e;\ne = process.env;")).toEqual([2]);
    expect(lines("function f() { return process.env; }")).toEqual([1]);
    expect(lines("load(u, { oracleIds, env: process.env });")).toEqual([1]);
    expect(lines("const x = <Page env={process.env} />;", "x.tsx")).toEqual([1]);
  });

  it("does not report a member read, an `in` test, a destructuring read or a default", () => {
    expect(lines("const a = process.env.FOO === 'true';")).toEqual([]);
    expect(lines("const b = process.env[key];")).toEqual([]);
    expect(lines("const c = key in process.env;")).toEqual([]);
    expect(lines("const { FOO, BAR } = process.env;")).toEqual([]);
    expect(lines("export function f(env: NodeJS.ProcessEnv = process.env) {}")).toEqual([]);
    expect(lines("export function P({ env = process.env }: { env?: NodeJS.ProcessEnv }) {}")).toEqual([]);
    expect(lines("// fooEnabled(process.env)\n/* process.env */")).toEqual([]);
  });

  it("reports a binding default in a VARIABLE, which only a parameter's binding default is exempt from", () => {
    expect(lines("const { env = process.env } = opts;")).toEqual([1]);
    expect(lines("const { a: { env = process.env } } = opts;")).toEqual([1]);
    expect(lines("export function f({ a: { env = process.env } }: Opts) {}")).toEqual([]);
  });

  it("reports a rest element over process.env, which is a copy of it", () => {
    expect(lines("const { ...e } = process.env;")).toEqual([1]);
    expect(lines("const { FOO, ...rest } = process.env;")).toEqual([1]);
  });

  it("reports a call made INSIDE a default, which is a call like any other", () => {
    expect(lines("export function f(basis = roleBasisFromEnv(process.env)) {}")).toEqual([1]);
  });
});

describe("envDefaultsIn", () => {
  it("counts parameter defaults, destructured ones included, and nothing else", () => {
    const src = [
      "export function a(env: NodeJS.ProcessEnv = process.env) {}",
      "export function B({ env = process.env }: P) {}",
      "export const c = (u: string, env = process.env) => u;",
      "const { env = process.env } = opts;",
      "fooEnabled(process.env);",
      "const x = process.env.FOO;",
    ].join("\n");
    expect(envDefaultsIn("x.ts", src)).toEqual([1, 2, 3]);
  });
});

describe("the lists", () => {
  it("give every entry a reason, and never list one file twice", () => {
    for (const entry of [...ALLOWED, ...PENDING]) expect(entry.reason.length, entry.path).toBeGreaterThan(20);
    for (const entry of PENDING) expect(["7b", "7c", "7d"]).toContain(entry.pr);
    const paths = [...ALLOWED, ...PENDING].map((e) => e.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const [path, entry] of Object.entries(DEFAULTS_PENDING) as [string, { count: number; pr: string; reason?: string }][]) {
      expect(entry.count, path).toBeGreaterThan(0);
      expect(["7b", "7c", "7d", "keep"], path).toContain(entry.pr);
      if (entry.pr === "keep") expect(entry.reason?.length ?? 0, path).toBeGreaterThan(20);
    }
  });
});

describe("the shipped tree", () => {
  it("hands process.env on nowhere in src but the resolver and the listed files", async () => {
    const { files, findings, drift } = await switchReadFindings(process.cwd());
    expect(files).toBeGreaterThan(500);
    expect(findings).toEqual([]);
    expect(drift).toEqual([]);
    // Parsing every file in src with the TypeScript parser takes about a second alone, and several under a loaded run.
  }, 60_000);
});

describe("a fixture tree", () => {
  const tree = (files: Record<string, string>) => {
    const root = mkdtempSync(join(tmpdir(), "switch-reads-"));
    for (const [path, body] of Object.entries(files)) {
      mkdirSync(join(root, path, ".."), { recursive: true });
      writeFileSync(join(root, path), body);
    }
    return root;
  };

  it("reports a new finding, skips the resolver and tests, and holds a listed file to its count", async () => {
    const root = tree({
      "src/app/bad.ts": "export const on = fooEnabled(process.env);\n",
      "src/app/ok.ts": "export const on = fooEnabled(env);\n",
      "src/lib/switches/resolve.ts": "export const base = { ...process.env };\n",
      "src/app/bad.test.ts": "fooEnabled(process.env);\n",
      "src/app/listed.ts": "a(process.env);\nb(process.env);\n",
      "src/app/kept.ts": "a(process.env);\n",
    });
    try {
      const allowed = [{ path: "src/app/kept.ts", count: 1, reason: "a reason long enough to read" }];
      const pending = [
        { path: "src/app/listed.ts", count: 1, pr: "7d", reason: "a reason long enough to read" },
        { path: "src/app/converted.ts", count: 1, pr: "7b", reason: "a reason long enough to read" },
      ];
      const { files, findings, drift } = await switchReadFindings(root, { allowed, pending, defaults: {} });
      expect(files).toBe(4);
      expect(findings.map((f) => `${f.path}:${f.line}`)).toEqual(["src/app/bad.ts:1"]);
      expect(drift.map((d) => `${d.path} ${d.expected}->${d.found}`).sort()).toEqual([
        "src/app/converted.ts 1->0",
        "src/app/listed.ts 1->2",
      ]);
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  it("holds parameter defaults to their listed counts: a new one fails, a removed one forces the entry down", async () => {
    const root = tree({
      "src/lib/new.ts": "export function f(env: NodeJS.ProcessEnv = process.env) {}\n",
      "src/lib/listed.ts": "export function f(env = process.env) {}\nexport function g({ env = process.env }: P) {}\n",
      "src/lib/shrunk.ts": "export function f(env: NodeJS.ProcessEnv) {}\n",
      "src/lib/exact.ts": "export function f(env = process.env) {}\n",
    });
    try {
      const defaults = {
        "src/lib/listed.ts": { count: 1, pr: "7b" },
        "src/lib/shrunk.ts": { count: 1, pr: "7c" },
        "src/lib/exact.ts": { count: 1, pr: "7d" },
      };
      const { findings, drift } = await switchReadFindings(root, { allowed: [], pending: [], defaults });
      expect(findings).toEqual([]);
      expect(drift.map((d) => `${d.path} ${d.expected}->${d.found}`).sort()).toEqual([
        "src/lib/listed.ts 1->2",
        "src/lib/new.ts 0->1",
        "src/lib/shrunk.ts 1->0",
      ]);
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  it("fails when the tree to scan is missing, rather than reporting zero files and passing", async () => {
    const root = mkdtempSync(join(tmpdir(), "switch-reads-"));
    try {
      await expect(switchReadFindings(root)).rejects.toThrow(/ENOENT/);
    } finally {
      rmSync(root, { recursive: true });
    }
  });
});
