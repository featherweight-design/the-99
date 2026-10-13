// Which tests a pull request needs to run. Pure functions; `scripts/ci-select.mjs` does the git and
// vitest I/O around them. Plan: boards/plan-ci-affected-tests-2026-10-12.md.
//
// `vitest related` follows the import graph, and this repo's guards do not import what they check:
// they READ it (a whole-tree walk, globals.css, a migration, a fixture, a workflow). Measured on the
// last 25 merged PRs, the bare graph skipped 10 to 28 such guards in 23 of them. So a selection is
// `related` UNION every test file that touches the filesystem or a child process, and the
// union is COMPUTED from the test sources rather than listed, because a list built by reading has a tail.

// A test file is in the always set when its source mentions any of these. `import.meta.url` and
// `fileURLToPath` catch a test that locates a file and hands the path to a helper (seed-collection.test.ts
// reads data/the-vault.csv through `readCsv`), which names no fs API itself.
export const ALWAYS_PATTERN =
  /node:fs|fs\/promises|node:child_process|child_process|process\.cwd\(\)|import\.meta\.dirname|readFileSync|readdirSync|readFile\(|existsSync|statSync|import\.meta\.url|fileURLToPath|__dirname/;

// A change to any of these can alter what every test means, and none of them is in the import graph
// (or, for the lockfile and configs, vitest's own trigger does not fire for them: measured).
const GLOBAL_EXACT = new Set(["pnpm-lock.yaml", "pnpm-workspace.yaml", ".nvmrc", "vitest.setup.ts"]);
const GLOBAL_PATTERNS = [
  /^(vitest|vite)\.config\./,
  /^tsconfig[^/]*\.json$/,
  /^postcss\.config\./,
  /^next\.config\./,
  /^eslint\.config\./,
  /^\.github\/workflows\/ci\.yml$/,
  /^scripts\/clock-shift\.mjs$/,
  /^scripts\/ci-select\.mjs$/,
  /^scripts\/lib\/ci-select\.mjs$/,
];

// package.json changes on most PRs (a new `probe:*` script). Only the fields that change what is
// installed or how it resolves can change a test's result.
const PACKAGE_FIELDS = [
  "dependencies", "devDependencies", "optionalDependencies", "peerDependencies",
  "pnpm", "packageManager", "engines", "type", "overrides",
];

export function packageDepsChanged(before, after) {
  const a = before ?? {};
  const b = after ?? {};
  return PACKAGE_FIELDS.some((k) => JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null));
}

export function globalReason(path) {
  if (GLOBAL_EXACT.has(path)) return path;
  return GLOBAL_PATTERNS.some((re) => re.test(path)) ? path : null;
}

// Test files whose source reads the tree. `sources` is `[{ path, text }]`.
export function alwaysSet(sources) {
  return sources.filter((s) => ALWAYS_PATTERN.test(s.text)).map((s) => s.path).sort();
}

export const SHARD_SIZE = 170;
export const MAX_SHARDS = 6;

export function shardsFor(count) {
  if (count <= 0) return 0;
  return Math.min(MAX_SHARDS, Math.ceil(count / SHARD_SIZE));
}

// `event`: the GitHub event name. `changed`: paths in the PR. `packageChanged`: result of
// packageDepsChanged. `related`: test files vitest selected from the import graph. `always`: from
// alwaysSet. `allTests`: every test file. `forceFull`: the ci:full label.
/**
 * @param {{ event?: string, changed: string[], packageChanged?: boolean, related?: string[],
 *   always?: string[], allTests?: string[], forceFull?: boolean }} input
 */
export function decide({ event, changed, packageChanged = false, related = [], always = [], allTests = [], forceFull = false }) {
  if (event !== "pull_request") return { mode: "full", reason: `event is ${event || "unknown"}, not a pull request`, files: allTests };
  if (forceFull) return { mode: "full", reason: "ci:full label", files: allTests };
  const hit = changed.map(globalReason).find(Boolean);
  if (hit) return { mode: "full", reason: `global file changed: ${hit}`, files: allTests };
  if (packageChanged) return { mode: "full", reason: "package.json dependency fields changed", files: allTests };
  const files = [...new Set([...related, ...always])].sort();
  if (files.length === 0) return { mode: "none", reason: "nothing selected", files };
  return { mode: "affected", reason: `${related.length} related + always set`, files };
}
