// A server module that value-imports anything but a component from a "use client" module gets a client
// reference, not the value: a constant reads as a proxy (a comparison against it is always false, a
// `.has()` on it throws) and a function throws when called. It typechecks, lints and builds, and fails only
// at render. This shipped once: About PR 5 (#2340) read a constant off a client module from a server file.
//
// A component (`PascalCase` with a lowercase letter) is the one thing a server module may take from a client
// module, because the server only renders it. Anything else is a finding: move the value to a module with no
// directive. Type-only imports are erased at build and are left out.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const SOURCE_FILE = /\.tsx?$/;
const TEST_FILE = /\.test\.tsx?$/;

export const hasUseClient = (source) => /^\s*["']use client["']/m.test(source);

/** A name a server may import from a client module: PascalCase with a lowercase letter, so `HomeView` yes, `HOME_ROWS` and `useThing` no. */
export const isComponentName = (name) => /^[A-Z][A-Za-z0-9]*$/.test(name) && /[a-z]/.test(name);

/**
 * Every value binding this source takes from a first-party specifier, with its imported name: a default import
 * is named by its local name (the module's own name for it is not visible here), `{ a as b }` by `a`. A
 * type-only import or binding is left out, as is a namespace import (nothing in it is named).
 * @returns {{ spec: string, name: string }[]}
 */
export function valueBindings(source) {
  const out = [];
  const pattern = /^[ \t]*(import|export)\s+(type\s+)?([^"';]*?)\s*from\s+["']([^"']+)["']/gms;
  for (const [, , typeKeyword, clause, spec] of source.matchAll(pattern)) {
    if (typeKeyword || (!spec.startsWith(".") && !spec.startsWith("@/"))) continue;
    const trimmed = clause.trim();
    if (trimmed.startsWith("*")) continue;
    const named = /\{([^}]*)\}/.exec(trimmed);
    const defaultName = trimmed.replace(/\{[^}]*\}/, "").replace(/,/g, "").trim();
    if (defaultName) out.push({ spec, name: defaultName });
    for (const binding of (named?.[1] ?? "").split(",").map((b) => b.trim()).filter(Boolean)) {
      if (binding.startsWith("type ")) continue;
      out.push({ spec, name: binding.split(/\s+as\s+/)[0].trim() });
    }
  }
  return out;
}

function resolveSpec(root, fromFile, spec) {
  const base = spec.startsWith("@/") ? resolve(root, "src", spec.slice(2)) : resolve(dirname(fromFile), spec);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch { /* not this one */ }
  }
  return null;
}

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return SOURCE_FILE.test(entry) && !TEST_FILE.test(entry) ? [full] : [];
  });
}

/** Next's server entry points under `src/app`, plus the request proxy: where a server module graph starts. */
const ENTRY = /(^|\/)(src\/app\/.*(page|layout|route|loading|error|not-found|template|default|global-error|robots|manifest|sitemap|icon|apple-icon|opengraph-image|twitter-image)\.tsx?|src\/(proxy|middleware|instrumentation)\.ts)$/;
const isEntry = (root, file, source) => ENTRY.test(file.slice(root.length + 1)) || /^\s*["']use server["']/m.test(source);

/**
 * Findings across a tree: a module the server can reach without crossing a client boundary (from a page, layout,
 * route, the proxy or a "use server" file) that takes a non-component from a "use client" module. A module only
 * client code reaches may take what it likes from one, so it is not asked. `files` maps a path to its source
 * (tests pass fixtures); omitted, it reads `<root>/src`.
 * @param {string} [root]
 * @param {Map<string, string> | null} [files]
 * @returns {{ path: string, name: string, from: string }[]}
 */
export function clientValueFindings(root = process.cwd(), files = null) {
  const sources = files ?? new Map(sourceFiles(resolve(root, "src")).map((f) => [f, readFileSync(f, "utf8")]));
  const clientFiles = new Set([...sources].filter(([, s]) => hasUseClient(s)).map(([f]) => f));
  const target = (file, spec) => resolveSpec(root, file, spec) ?? (files ? [".ts", ".tsx"].map((e) => resolve(dirname(file), spec) + e).find((k) => sources.has(k)) : null) ?? null;
  const findings = [];
  const seen = new Set();
  const stack = [...sources].filter(([f, s]) => !clientFiles.has(f) && isEntry(root, f, s)).map(([f]) => f);
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const { spec, name } of valueBindings(sources.get(file) ?? "")) {
      const next = target(file, spec);
      if (!next || !sources.has(next)) continue;
      if (clientFiles.has(next)) {
        if (!isComponentName(name)) findings.push({ path: file.startsWith(root) ? file.slice(root.length + 1) : file, name, from: spec });
      } else stack.push(next);
    }
  }
  return findings;
}
