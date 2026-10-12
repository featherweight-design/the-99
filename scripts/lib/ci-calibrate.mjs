// Calibration for the CI test selector (`scripts/lib/ci-select.mjs`). Break one file, run the WHOLE
// suite, and ask whether every test that went red was in the selector's choice. A test that fails and
// was not selected is a miss: it would have merged red under the switch.
//
// The breakage has to be one a reader of the file notices. Code gets a module-level throw, which
// fails everything that imports it; anything else (css, sql, json, svg, a binary, yaml, markdown) loses
// its first half, which breaks the parse of the formats a guard reads and removes the tokens it looks for.

const CODE = /\.(ts|tsx|mts|mjs|js|jsx)$/;

/** @param {string} path @param {Buffer} content @returns {Buffer} */
export function mutate(path, content) {
  if (CODE.test(path)) {
    return Buffer.concat([content, Buffer.from('\nthrow new Error("ci-calibration: deliberately broken");\n')]);
  }
  return content.subarray(Math.floor(content.length / 2));
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
