// An internal link never opens a new tab (#2982): in the installed app `target="_blank"` hands the URL to the system
// browser, so the player leaves the app and loses the screen they were on. External links (a literal `https://`, a
// source's URL helper) may open a new tab; an href that is a literal path or a `/` template may not.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : [];
  });
}

/** Each `target="_blank"` whose nearest `href` above it (within 6 lines) is a path inside the app. */
export function internalNewTabLinks(source: string): number[] {
  const lines = source.split("\n");
  const hits: number[] = [];
  lines.forEach((line, i) => {
    if (!line.includes('target="_blank"')) return;
    for (let j = i; j >= Math.max(0, i - 6); j--) {
      const m = /href=(?:"(\/[^"]*)"|\{`(\/[^`]*)`\}|\{"(\/[^"]*)"\})/.exec(lines[j]);
      if (m) { hits.push(i + 1); return; }
      if (/href=/.test(lines[j])) return;
    }
  });
  return hits;
}

describe("internal links stay in the app", () => {
  it("finds an internal href with a new tab, and leaves an external one alone", () => {
    expect(internalNewTabLinks('<Link\n  href={`/decks/${id}`}\n  target="_blank"\n/>')).toEqual([3]);
    expect(internalNewTabLinks('<a href="/friends" target="_blank">')).toEqual([1]);
    expect(internalNewTabLinks('<a\n  href="https://example.com"\n  target="_blank"\n/>')).toEqual([]);
    expect(internalNewTabLinks("<a\n  href={SOURCE.url(id)}\n  target=\"_blank\"\n/>")).toEqual([]);
  });

  it("has no component that opens an app path in a new tab", () => {
    const bad = files(ROOT).flatMap((f) => internalNewTabLinks(readFileSync(f, "utf8")).map((n) => `${f.slice(ROOT.length + 1)}:${n}`));
    expect(bad).toEqual([]);
  });
});
