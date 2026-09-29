import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The `fetch` job in `Catalog refresh` runs `catalog:fetch` with no database and no DATABASE_URL,
// and `src/db` throws at module load without one. So nothing this script imports, however deep,
// may reach `src/db`: one such import fails every run and skips both refresh legs. The unit tests
// cannot see it, because they mock `src/db`; this walks the real import graph instead.
const ROOT = resolve(import.meta.dirname, "..", "..");
const DB = join(ROOT, "src", "db", "index.ts");

function resolveImport(from: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const base = resolve(dirname(from), spec);
  for (const c of [base, `${base}.ts`, `${base}.mts`, `${base}.mjs`, join(base, "index.ts")]) {
    if (existsSync(c) && !c.endsWith("/")) try { readFileSync(c); return c; } catch { /* a directory */ }
  }
  return null;
}

function pathToDb(entry: string): string[] | null {
  const seen = new Set<string>();
  const walk = (file: string, trail: string[]): string[] | null => {
    if (file === DB) return [...trail, file];
    if (seen.has(file)) return null;
    seen.add(file);
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s+["']([^"']+)["']|^\s*import\s+["']([^"']+)["']/gm)) {
      const next = resolveImport(file, m[1] ?? m[2]);
      if (next) { const hit = walk(next, [...trail, file]); if (hit) return hit; }
    }
    return null;
  };
  return walk(entry, []);
}

describe("catalog:fetch needs no database", () => {
  it("imports nothing that reaches src/db", () => {
    const hit = pathToDb(join(ROOT, "scripts", "catalog-fetch.ts"));
    expect(hit?.map((f) => f.slice(ROOT.length + 1)) ?? null).toBeNull();
  });
});
