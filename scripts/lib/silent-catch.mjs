// A client component that catches an error and settles to a failed view, a toast or nothing leaves the browser's
// failure invisible: Sentry never sees it. `captureClientError(tag, err)` (src/lib/sentry/capture.ts) reports the
// unexpected ones. This guard finds every client catch that neither reports nor rethrows.
//
// Scope: non-test files under `src` that open with the "use client" directive. A site is a `catch` clause or a
// `.catch(` call. It is handled when its text names `captureClientError` or throws. A site for an EXPECTED outcome
// stays silent with a marker comment on its line, the line above it or inside it:
//     // silent-catch: expected: refusal | out-of-credits | abort | offline
// A marker with no reason, or a reason outside that list, is a finding.
//
// Known limit: a file without the directive that still runs in the browser (a plain module a client file imports) is
// not scanned. Server code is out of scope: `captureServerError` covers it.
//
// The baseline (scripts/silent-catch-baseline.json) is a RATCHET of the silent sites that existed when the guard
// landed, per file. A file may not exceed its count, and a count above the real number is stale and fails too, so
// each sweep PR must shrink it. The sweep ends with an empty baseline and the guard is absolute.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";

export const REASONS = ["refusal", "out-of-credits", "abort", "offline"];
const MARKER = /silent-catch:/;
const VALID_MARKER = new RegExp(`silent-catch:\\s*expected:\\s*(?:${REASONS.join("|")})\\b`);

const isClientFile = (text) => /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(text.slice(0, 600));

/** Every catch site in a file: `{ line, kind, handled, marker }`, marker "none" | "valid" | "invalid". */
export function catchSites(text, path = "x.tsx") {
  const kind = path.endsWith(".ts") || path.endsWith(".mts") ? ts.ScriptKind.TS : ts.ScriptKind.TSX;
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  const lines = text.split("\n");
  const sites = [];
  const hasThrow = (n) => {
    let found = false;
    const w = (c) => {
      if (found) return;
      if (ts.isThrowStatement(c)) found = true;
      else ts.forEachChild(c, w);
    };
    w(n);
    return found;
  };
  const add = (siteNode, anchor, label) => {
    const body = siteNode.getText(sf);
    const startLine = sf.getLineAndCharacterOfPosition(anchor.getStart(sf)).line;
    const endLine = sf.getLineAndCharacterOfPosition(siteNode.getEnd()).line;
    const window = lines.slice(Math.max(0, startLine - 1), endLine + 1).join("\n");
    const marker = !MARKER.test(window) ? "none" : VALID_MARKER.test(window) ? "valid" : "invalid";
    sites.push({ line: startLine + 1, kind: label, handled: body.includes("captureClientError") || hasThrow(siteNode), marker });
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

/** Findings are `{ path, kind, detail }`, kind "marker" | "new" | "grew" | "stale". */
export function silentCatchFindings({ counts, bad }, baseline) {
  const findings = [];
  for (const { path, line } of bad) {
    findings.push({ path: `${path}:${line}`, kind: "marker", detail: `a silent-catch marker needs "expected: <${REASONS.join(" | ")}>"` });
  }
  for (const [path, n] of Object.entries(counts)) {
    const allowed = baseline[path] ?? 0;
    if (n > allowed) {
      findings.push({
        path,
        kind: allowed === 0 ? "new" : "grew",
        detail: `${n - allowed} client catch(es) that neither report nor rethrow: call captureClientError(tag, err), or mark an expected outcome with // silent-catch: expected: <${REASONS.join(" | ")}>`,
      });
    }
  }
  for (const [path, allowed] of Object.entries(baseline)) {
    const n = counts[path] ?? 0;
    if (n < allowed) findings.push({ path, kind: "stale", detail: `baseline says ${allowed} silent site(s), found ${n}: lower it in scripts/silent-catch-baseline.json` });
  }
  return findings;
}
