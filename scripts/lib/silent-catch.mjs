// A client component that catches an error and settles to a failed view, a toast or nothing leaves the browser's
// failure invisible: Sentry never sees it. `captureClientError(tag, err)` (src/lib/sentry/capture-client.ts) reports the
// unexpected ones. This guard finds every client catch that neither reports nor rethrows.
//
// Scope: non-test files under `src` that open with the "use client" directive. A site is a `catch` clause or a
// `.catch(` call. It is handled when its text names `captureClientError` or throws. A site for an EXPECTED outcome
// stays silent with a marker comment on its line, the line above it or inside it:
//     // silent-catch: expected: refusal | out-of-credits | abort | offline
// A marker with no reason, or a reason outside that list, is a finding.
//
// Known limits: the `.then(ok, onRejected)` form is not scanned; a file without the directive that still runs in the browser (a plain module a client file imports) is
// not scanned. Server code is out of scope: `captureServerError` covers it.
//
// The guard is absolute: there is no baseline, so any unreported, unmarked client catch is a finding.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";

export const REASONS = ["refusal", "out-of-credits", "abort", "offline"];
const MARKER = /silent-catch:/;
const VALID_MARKER = new RegExp(`silent-catch:\\s*expected:\\s*(?:${REASONS.join("|")})\\b`);

const isClientFile = (text) => /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(text.slice(0, 2000));

/** Every catch site in a file: `{ line, kind, handled, marker }`, marker "none" | "valid" | "invalid". */
export function catchSites(text, path = "x.tsx") {
  const kind = path.endsWith(".ts") || path.endsWith(".mts") ? ts.ScriptKind.TS : ts.ScriptKind.TSX;
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  const lines = text.split("\n");
  const sites = [];
  // Reports or rethrows in the site's own code: a comment, or a nested function that merely contains a throw, does not count.
  const isFn = (c) => ts.isFunctionLike(c);
  const handles = (root) => {
    let found = false;
    const w = (c) => {
      if (found) return;
      if (ts.isThrowStatement(c) || (ts.isCallExpression(c) && ts.isIdentifier(c.expression) && c.expression.text === "captureClientError")) {
        found = true;
        return;
      }
      if (c !== root && isFn(c)) return;
      ts.forEachChild(c, w);
    };
    w(root);
    return found;
  };
  const add = (siteNode, anchor, label) => {
    const startLine = sf.getLineAndCharacterOfPosition(anchor.getStart(sf)).line;
    const endLine = sf.getLineAndCharacterOfPosition(siteNode.getEnd()).line;
    // The line above counts only when it is a comment line of its own, so a trailing marker covers its own site alone.
    const above = startLine > 0 && /^\s*\/[/*]/.test(lines[startLine - 1]) ? lines[startLine - 1] : "";
    const window = [above, ...lines.slice(startLine, endLine + 1)].join("\n");
    const marker = !MARKER.test(window) ? "none" : VALID_MARKER.test(window) ? "valid" : "invalid";
    sites.push({ line: startLine + 1, kind: label, handled: handles(siteNode), marker });
  };
  const walk = (n) => {
    if (ts.isCatchClause(n)) add(n, n, "catch");
    else if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === "catch") {
      add(n.arguments.length ? n.arguments[0] : n, n.expression.name, ".catch");
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return sites;
}

async function* walkDir(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walkDir(p);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) yield p;
  }
}

/** `{ files, counts, bad }`: counts is the silent (unmarked, unhandled) site count per file, bad the invalid markers. */
export async function scanSilentCatches(root = "src") {
  const counts = {};
  const bad = [];
  let files = 0;
  for await (const path of walkDir(root)) {
    const text = await readFile(path, "utf8");
    if (!text.includes("catch") || !isClientFile(text)) continue;
    files += 1;
    for (const s of catchSites(text, path)) {
      if (s.marker === "invalid") bad.push({ path, line: s.line });
      else if (!s.handled && s.marker === "none") counts[path] = (counts[path] ?? 0) + 1;
    }
  }
  return { files, counts, bad };
}

/** Findings are `{ path, kind, detail }`, kind "marker" | "new". */
export function silentCatchFindings({ counts, bad }) {
  const findings = [];
  for (const { path, line } of bad) {
    findings.push({ path: `${path}:${line}`, kind: "marker", detail: `a silent-catch marker needs "expected: <${REASONS.join(" | ")}>"` });
  }
  for (const [path, n] of Object.entries(counts)) {
    findings.push({
      path,
      kind: "new",
      detail: `${n} client catch(es) that neither report nor rethrow: call captureClientError(tag, err), or mark an expected outcome with // silent-catch: expected: <${REASONS.join(" | ")}>`,
    });
  }
  return findings;
}
