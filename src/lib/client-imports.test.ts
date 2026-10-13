// @vitest-environment node
//
// No client component may reach the database layer through its imports. Every `"use client"`
// module and everything it imports by value ships to the browser, so a pure helper living beside
// a query (`cssUrl` beside the collection reads in `browse.ts`) put drizzle-orm's core in the
// startup bundle of every route, with the Neon driver and the schema as lazy chunks behind it
// (measured on staging, 2026-10-13: 12KB gzipped on every first load, sharing a slow phone's line
// with the stylesheet first paint waits on). The bundler cannot say so; this reads the source.
//
// It follows value imports and `export ... from`, dynamic `import()` included (a lazy chunk is
// still shipped), and skips `import type`, type-only specifiers, and `"use server"` modules,
// which a client receives as references rather than code.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(path);
  }
  return out;
}

const tree = new Map(walk(SRC).map((path) => [path, readFileSync(path, "utf8")]));

const directive = (source: string, name: string) =>
  new RegExp(`^(?:\\s*(?://[^\\n]*\\n|/\\*[\\s\\S]*?\\*/))*\\s*["']${name}["']`).test(source);

/** A specifier resolved to a source file, or `npm:<package>` for anything outside `src`. */
function resolve(files: Map<string, string>, from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = normalize(join(dirname(from), spec));
  else return `npm:${spec}`;
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (files.has(base + ext)) return base + ext;
  }
  return null;
}

const STATIC = /^\s*(import|export)\s+(type\s+)?([^'";]*?)\s*from\s*["']([^"']+)["']|^\s*import\s*["']([^"']+)["']/gm;
// A runtime `import()`, never a type: `import("x").Name` and `typeof import("x")` name a type and
// load nothing. A runtime import's only members are a promise's: `.then`, `.catch` and `.finally`.
// A backtick specifier counts when it interpolates nothing, since it is then a plain string.
const DYNAMIC = /(?<!typeof\s+)\bimport\(\s*(["'`])((?:(?!\1|\$\{).)+)\1\s*\)(?!\s*\.\s*(?!(?:then|catch|finally)\b)[A-Za-z_$])/g;

/** True when an import clause brings in at least one value, not only types. */
function bringsValues(clause: string): boolean {
  const named = clause.match(/^\{([\s\S]*)\}$/);
  if (!named) return true;
  return named[1].split(",").map((s) => s.trim()).filter(Boolean).some((s) => !s.startsWith("type "));
}

export function valueImports(path: string, source: string, files: Map<string, string> = tree): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(STATIC)) {
    if (m[5]) out.push(m[5]);
    else if (!m[2] && bringsValues(m[3].trim())) out.push(m[4]);
  }
  for (const m of source.matchAll(DYNAMIC)) out.push(m[2]);
  return out.map((spec) => resolve(files, path, spec)).filter((r): r is string => r !== null);
}

const SERVER_ONLY = (target: string) =>
  /^npm:(drizzle-orm|@neondatabase\/serverless)(\/|$)/.test(target)
  || relative(SRC, target).startsWith("db/")
  // Reads ADMIN_GITHUB_TOKEN: the token must never reach a client bundle.
  || relative(SRC, target) === "lib/admin/github-variables.ts";

/** Every client module that reaches a server-only module, with the path it takes. */
export function leaks(files: Map<string, string> = tree): string[] {
  const found: string[] = [];
  for (const [entry, source] of files) {
    if (!directive(source, "use client")) continue;
    const prev = new Map<string, string | null>([[entry, null]]);
    const queue = [entry];
    while (queue.length > 0) {
      const at = queue.shift()!;
      if (SERVER_ONLY(at)) {
        const chain: string[] = [];
        for (let x: string | null = at; x; x = prev.get(x) ?? null) chain.unshift(x.startsWith("npm:") ? x : relative(SRC, x));
        found.push(chain.join(" -> "));
        break;
      }
      if (at.startsWith("npm:")) continue;
      const text = files.get(at)!;
      if (at !== entry && directive(text, "use server")) continue;
      for (const next of valueImports(at, text, files)) {
        if (!prev.has(next)) {
          prev.set(next, at);
          queue.push(next);
        }
      }
    }
  }
  return found;
}

describe("client imports", () => {
  it("never reach drizzle-orm, the Neon driver, src/db or the GitHub token reader", () => {
    expect(leaks()).toEqual([]);
  });

  // The walk's own failure paths: each is a form that, unread, would pass a leak.
  it("follows named, default, re-exported and dynamic imports, and skips type-only ones", () => {
    const at = join(SRC, "lib/x.ts");
    const source = [
      'import { a, type B } from "drizzle-orm";',
      'import type { C } from "../db";',
      'import { type D } from "../db/schema";',
      'export { e } from "@neondatabase/serverless";',
      'const m = await import("../db");',
      "const n = await import(`../db/schema`);",
      "const o = await import(`../db/${name}`);",
      'void import("drizzle-orm/pg-core").catch(() => {});',
      'void import("@neondatabase/serverless/x").finally(() => {});',
      'export const ROWS: import("../db/schema").HistoryRow[] = [];',
      'type T = typeof import("drizzle-orm");',
    ].join("\n");
    expect(valueImports(at, source)).toEqual(["npm:drizzle-orm", "npm:@neondatabase/serverless", join(SRC, "db/index.ts"), join(SRC, "db/schema.ts"),
      "npm:drizzle-orm/pg-core", "npm:@neondatabase/serverless/x"]);
  });

  it("reports a client module that reaches src/db, and skips a \"use server\" module", () => {
    const at = (p: string) => join(SRC, p);
    const files = new Map([
      [at("components/a.tsx"), '"use client";\nimport { f } from "../lib/helper";\nimport { act } from "../app/actions";'],
      [at("lib/helper.ts"), 'export { rows } from "../db/rows";'],
      [at("db/rows.ts"), "export const rows = 1;"],
      [at("app/actions.ts"), '"use server";\nimport { db } from "../db";'],
      [at("db/index.ts"), "export const db = 1;"],
      [at("components/b.tsx"), '"use client";\nimport { act } from "../app/actions";'],
    ]);
    expect(leaks(files)).toEqual(["components/a.tsx -> lib/helper.ts -> db/rows.ts"]);
  });
});
