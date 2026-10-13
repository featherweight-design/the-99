// The client module graph a route ships, computed from source.
//
// A server module's imports stay on the server. A `"use client"` module is where the browser bundle
// starts, and everything it imports by value comes with it, except a `"use server"` module, which a
// client sees only as a reference to an action. So the graph is: walk from the route through
// anything that is not a client module, collect the client modules it reaches, then walk from those,
// stopping at server-action files. Type-only imports are erased and dynamic `import()` is a separate
// chunk, so neither is followed.
//
// Why it exists: `deck-tuning.ts` (the Tuning panels' strings) shipped at startup on Home because the
// deck header's description edit imported its character counter. Nothing in the source says a
// 19KB module rides on a one-line import; the graph does.
import fs from "node:fs";
import ts from "typescript";
import { resolveSpecifier } from "./imports.mjs";

const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx"];

function resolveFile(base) {
  return EXTENSIONS.map((e) => base + e).find((f) => fs.existsSync(f)) ?? null;
}

const directives = new Map();

/** "client", "server" or null: the file's top directive, comments allowed before it. */
export function directiveOf(source) {
  // The whole file, not a head slice: a long header comment may precede the directive.
  const hit = directives.get(source);
  if (hit !== undefined) return hit;
  const found = readDirective(source);
  directives.set(source, found);
  return found;
}

function readDirective(source) {
  const sf = ts.createSourceFile("x.tsx", source, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
  for (const st of sf.statements) {
    if (!ts.isExpressionStatement(st) || !ts.isStringLiteral(st.expression)) return null;
    const text = st.expression.text;
    if (text === "use client") return "client";
    if (text === "use server") return "server";
  }
  return null;
}

const parsedImports = new Map();

/** Repo-relative files this file imports as values, in source order. Memoized on the source text. */
export function valueImports(file, source) {
  const hit = parsedImports.get(file);
  if (hit?.source === source) return hit.imports;
  const imports = readValueImports(file, source);
  parsedImports.set(file, { source, imports });
  return imports;
}

function readValueImports(file, source) {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out = [];
  for (const st of sf.statements) {
    let spec = null;
    if (ts.isImportDeclaration(st)) {
      const clause = st.importClause;
      if (clause?.isTypeOnly) continue;
      const named = clause?.namedBindings;
      if (clause && !clause.name && named && ts.isNamedImports(named) && named.elements.every((e) => e.isTypeOnly)) continue;
      spec = st.moduleSpecifier.text;
    } else if (ts.isExportDeclaration(st) && st.moduleSpecifier && !st.isTypeOnly) {
      spec = st.moduleSpecifier.text;
    }
    if (spec === null) continue;
    const base = resolveSpecifier(file, spec);
    const resolved = base && resolveFile(base);
    if (resolved) out.push(resolved);
  }
  return out;
}

/**
 * The client graph reached from `entries` (server entry files, e.g. a layout and a page).
 * Returns every client-bundle file and, for each, the file that pulled it in.
 */
export function clientGraph(entries, read = (f) => fs.readFileSync(f, "utf8")) {
  const seenServer = new Set(entries);
  const queue = [...entries];
  const roots = [];
  while (queue.length) {
    const file = queue.shift();
    for (const dep of valueImports(file, read(file))) {
      if (seenServer.has(dep)) continue;
      seenServer.add(dep);
      const kind = directiveOf(read(dep));
      if (kind === "client") roots.push(dep);
      else if (kind !== "server") queue.push(dep);
    }
  }
  const files = new Set(roots);
  const via = new Map();
  const next = [...roots];
  while (next.length) {
    const file = next.shift();
    for (const dep of valueImports(file, read(file))) {
      if (files.has(dep) || directiveOf(read(dep)) === "server") continue;
      files.add(dep);
      via.set(dep, file);
      next.push(dep);
    }
  }
  return { files, via };
}

/** The chain from a client root to `file`, root first. */
export function chainTo(file, via) {
  const chain = [];
  for (let f = file; f; f = via.get(f)) chain.unshift(f);
  return chain;
}
