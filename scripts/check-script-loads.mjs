// Fails when a `tsx scripts/<name>.ts` entry in package.json will not even load. tsx loads a `.ts` file as CommonJS here
// (no `"type": "module"`), and CommonJS has no top-level await: the `--diagnose` block of #2739 had one, esbuild refused
// the whole file, and every `Commander prose` run failed at load (2026-11-09) while tsc, lint and vitest stayed green.
// The transform is the one tsx runs, so a file it accepts here loads there. A `.mts` entry is ESM and is not checked.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
// esbuild is tsx's dependency, not ours: resolve it from tsx so this needs no direct dependency.
const { transformSync } = createRequire(require.resolve("tsx/package.json"))("esbuild");

const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
const entries = new Map();
for (const [name, cmd] of Object.entries(scripts)) {
  for (const m of cmd.matchAll(/\btsx\s+(scripts\/[\w./-]+\.ts)\b/g)) {
    if (!entries.has(m[1])) entries.set(m[1], name);
  }
}

// Entries already broken when this guard landed (it started with `probe-method-notice.ts`, since fixed). A ledger, not a pass: each
// is a script that cannot run today, and the guard fails when one starts to load, so the entry has to be removed rather than
// left to excuse the next regression.
const KNOWN_BROKEN = new Set([]);

let bad = 0;
for (const [path, name] of entries) {
  let loads = true;
  try {
    transformSync(readFileSync(path, "utf8"), { loader: "ts", format: "cjs", sourcefile: path });
  } catch (err) {
    loads = false;
    if (!KNOWN_BROKEN.has(path)) {
      bad++;
      console.error(`${path} (pnpm ${name}): ${String(err.message).split("\n").slice(0, 3).join(" | ")}`);
    }
  }
  if (loads && KNOWN_BROKEN.has(path)) {
    bad++;
    console.error(`${path} now loads: remove it from KNOWN_BROKEN.`);
  }
}
if (bad > 0) {
  console.error(`\n${bad} script(s) will not load under tsx. Top-level await needs an async function or a promise chain.`);
  process.exit(1);
}
console.log(`every tsx script entry transforms as CommonJS: ${entries.size} read, ${KNOWN_BROKEN.size} on the known-broken ledger`);
