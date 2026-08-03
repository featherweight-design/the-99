// `src/db/index.ts` throws at module init when DATABASE_URL is absent, which
// in a browser it always is. So a "use client" component that value-imports
// (not type-imports) anything reaching the db client ships that throw to the
// user and the page dies on hydration. Nothing else catches this: it typechecks,
// it lints, it builds, and the server render is fine.
//
// This shipped once — PR #146 imported statusPill from lib/decks/read, killing
// /decks/[id]. The fix is to move the pure helper into a db-free module.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DB_ENTRY = resolve(SRC, "db/index.ts");

function allSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return allSourceFiles(full);
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [full] : [];
  });
}

/** Resolved targets of value imports only — `import type` is erased at build. */
function valueImports(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const specifiers: string[] = [];
  // The clause may span lines but never a quote or a semicolon. Without that
  // restriction a match starting at one import can run past its own specifier
  // into the next statement and swallow that statement's `type` keyword.
  const pattern = /import\s+(type\s+)?([^"';]*?)from\s+["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) {
    const [, typeKeyword, clause, specifier] = match;
    if (typeKeyword) continue;
    // Bare package specifiers stop the walk; everything else is first-party.
    if (!specifier.startsWith(".") && !specifier.startsWith("@/")) continue;
    // `import { type Foo, bar }` still emits a runtime import for `bar`; a
    // clause whose every binding is type-only does not.
    const bindings = clause.replace(/[{}]/g, "").split(",").map((b) => b.trim()).filter(Boolean);
    if (bindings.length > 0 && bindings.every((b) => b.startsWith("type "))) continue;
    specifiers.push(specifier);
  }

  return specifiers.flatMap((specifier) => {
    // `@/*` maps to `./src/*` (tsconfig paths).
    const base = specifier.startsWith("@/")
      ? resolve(SRC, specifier.slice(2))
      : resolve(dirname(file), specifier);
    for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
      try {
        if (statSync(candidate).isFile()) return [candidate];
      } catch {
        // Not this extension; try the next.
      }
    }
    return [];
  });
}

function hasDirective(file: string, directive: string): boolean {
  return new RegExp(`^\\s*["']${directive}["']`, "m").test(readFileSync(file, "utf8"));
}

function reachesDb(file: string, seen = new Set<string>()): boolean {
  if (file === DB_ENTRY) return true;
  if (seen.has(file)) return false;
  seen.add(file);
  return valueImports(file).some(
    // A "use server" module is a boundary, not a dependency: the client bundle
    // gets an RPC stub, never the module body. Importing one is the correct way
    // for a client component to reach the database.
    (next) => !hasDirective(next, "use server") && reachesDb(next, seen),
  );
}

describe("client bundle safety", () => {
  it("no 'use client' module value-imports its way to the db client", () => {
    const offenders = allSourceFiles(SRC)
      .filter((file) => hasDirective(file, "use client"))
      .filter((file) => reachesDb(file))
      .map((file) => file.slice(SRC.length + 1));

    expect(offenders).toEqual([]);
  });
});
