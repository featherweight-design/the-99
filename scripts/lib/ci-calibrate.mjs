// Calibration for the CI test selector (`scripts/lib/ci-select.mjs`). Break one file, run the WHOLE
// suite, and ask whether every test that went red was in the selector's choice. A test that fails and
// was not selected is a miss: it would have merged red under the switch.
//
// The breakage has to be one a reader of the file notices. Code gets a module-level throw, which
// fails everything that imports it; anything else (css, sql, json, svg, a binary, yaml, markdown) loses
// its first half, which breaks the parse of the formats a guard reads and removes the tokens it looks for.

const CODE = /\.(ts|tsx|mts|mjs|js|jsx)$/;

/**
 * `throw` appends a module-level throw (fails everything that IMPORTS the file); `half` keeps only the
 * second half (breaks a parse, and removes the text a guard READING the file looks for). `auto` is
 * `throw` for code and `half` for everything else. A source file a guard reads as text needs both: the
 * throw leaves its regexes intact, so only `half` can turn that guard red.
 * @param {string} path @param {Buffer} content @param {"auto" | "throw" | "half"} [mode]
 * @returns {Buffer}
 */
export function mutate(path, content, mode = "auto") {
  const how = mode === "auto" ? (CODE.test(path) ? "throw" : "half") : mode;
  if (how === "throw") {
    return Buffer.concat([content, Buffer.from('\nthrow new Error("ci-calibration: deliberately broken");\n')]);
  }
  if (how === "half") return content.subarray(Math.floor(content.length / 2));
  throw new Error(`unknown mutation mode: ${mode}`);
}

/**
 * @param {{ selected: string[], failing: string[] }} input
 * `informative` is false when nothing failed: that breakage proves nothing about the selector.
 */
export function compare({ selected, failing }) {
  const chosen = new Set(selected);
  const missed = failing.filter((f) => !chosen.has(f)).sort();
  return { failing: failing.length, missed, informative: failing.length > 0 };
}

/** Test files with a failed status in a vitest `--reporter=json` document, relative to `root`. */
export function failingFiles(report, root) {
  const prefix = root.endsWith("/") ? root : `${root}/`;
  return (report.testResults ?? [])
    .filter((r) => r.status === "failed")
    .map((r) => (r.name.startsWith(prefix) ? r.name.slice(prefix.length) : r.name))
    .sort();
}

/**
 * The first failure message of each named file, cut to `max` characters, from a vitest json report.
 * A miss that cannot be read cannot be judged a flake or a gap in the selector.
 */
export function failureSummary(report, files, root, max = 400) {
  const prefix = root.endsWith("/") ? root : `${root}/`;
  const want = new Set(files);
  /** @type {Record<string, string>} */
  const out = {};
  for (const r of report.testResults ?? []) {
    const rel = r.name.startsWith(prefix) ? r.name.slice(prefix.length) : r.name;
    if (!want.has(rel) || r.status !== "failed") continue;
    const msg = (r.assertionResults ?? []).flatMap((a) => a.failureMessages ?? [])[0] ?? r.message ?? "(no message)";
    out[rel] = String(msg).replace(/\u001b\[[0-9;]*m/g, "").slice(0, max);
  }
  return out;
}

/**
 * Split the files the selector missed by whether they fail when run by themselves.
 * `aloneFailing` is the set that failed alone, or null when a rerun produced no report: with nothing to
 * clear them, every candidate stays a real miss.
 * @param {string[]} missed @param {string[] | null} aloneFailing
 */
export function splitMisses(missed, aloneFailing) {
  if (aloneFailing === null) return { real: missed, loadSensitive: [] };
  return {
    real: missed.filter((f) => aloneFailing.includes(f)),
    loadSensitive: missed.filter((f) => !aloneFailing.includes(f)),
  };
}

/**
 * Run each missed file by itself and split the misses. `runAlone(file)` returns the files that failed in
 * that run, or null when it produced no report. Any null leaves every candidate a real miss.
 * @param {string[]} missed @param {(file: string) => string[] | null} runAlone
 */
export function recheckAlone(missed, runAlone) {
  const aloneFailing = [];
  for (const file of missed) {
    const got = runAlone(file);
    if (got === null) return splitMisses(missed, null);
    if (got.includes(file)) aloneFailing.push(file);
  }
  return splitMisses(missed, aloneFailing);
}
