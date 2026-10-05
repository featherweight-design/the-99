import { describe, expect, it } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { lineAt, unresolvedCollisions } from "./border-collision.mjs";

// `node:fs/promises`'s `glob` isn't in the @types/node version this build's `tsc` resolves
// against (it fails `pnpm build`'s type check, though `pnpm typecheck` alone is lenient about
// it) — a plain recursive `readdir` sidesteps the typing gap entirely.
async function tsxFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await tsxFiles(full)));
    else if (entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx")) out.push(full);
  }
  return out;
}

describe("unresolvedCollisions", () => {
  it("flags a bare border-b with no companion color", () => {
    const text = '<div className="border-b border-solid" />';
    expect(unresolvedCollisions(text)).toEqual([{ side: "b", offsetInFile: text.indexOf("border-b") }]);
  });

  it("flags a bare border-r the same way", () => {
    const text = '<div className="border-r" />';
    expect(unresolvedCollisions(text)).toEqual([{ side: "r", offsetInFile: text.indexOf("border-r") }]);
  });

  it("does not flag border-b-[color:...] — the side-specific override wins", () => {
    const text = '<div className="border-b border-b-[color:var(--border)]" />';
    expect(unresolvedCollisions(text)).toEqual([]);
  });

  it("accepts a side-specific NAMED color utility as the override too, not just a bracket form", () => {
    const text = '<div className="border-b border-b-accent" />';
    expect(unresolvedCollisions(text)).toEqual([]);
  });

  it("still flags a GENERIC [border-color:...] companion — it loses to the collision, confirmed by compiling the real stylesheet", () => {
    const text = '<div className="border-b border-[color:var(--border)]" />';
    expect(unresolvedCollisions(text)).toEqual([{ side: "b", offsetInFile: text.indexOf("border-b") }]);
  });

  it("never flags border-t or border-l — no --color-t/--color-l theme token exists", () => {
    const text = '<div className="border-t border-l border-solid" />';
    expect(unresolvedCollisions(text)).toEqual([]);
  });

  it("does not flag border-b-0 / border-b-2 — width-scale utilities, not the bare collision", () => {
    const text = '<div className="border-x-0 border-b-0 border-t md:border-b-0" />';
    expect(unresolvedCollisions(text)).toEqual([]);
  });

  it("keeps a variant prefix out of the match but still flags the bare collision", () => {
    const text = '<div className="md:last:border-b md:border" />';
    expect(unresolvedCollisions(text)).toEqual([{ side: "b", offsetInFile: text.indexOf("border-b") }]);
  });

  it("is unaffected by a block comment of different length, proving offsets are not shifted", () => {
    const text = `/* a longer comment line that used to shift every later offset */\n<div className="border-b border-solid" />`;
    const found = unresolvedCollisions(text);
    expect(found).toHaveLength(1);
    expect(lineAt(text, found[0].offsetInFile)).toBe(2);
    expect(text.slice(found[0].offsetInFile, found[0].offsetInFile + 8)).toBe("border-b");
  });

  it("scans each class-string span independently — a fix in a sibling string does not reach it", () => {
    const text = '<div className={"border-b " + "border-b-[color:var(--x)]"} />';
    expect(unresolvedCollisions(text)).toHaveLength(1);
  });

  it("a literal `//` inside an earlier string does not desync later string spans (PR #1272 round 1)", () => {
    // The shape that defeated the old two-pass version: `stripComments` ran a standalone `//`
    // regex before string spans were found, so `name.split(" // ")` was read as a comment start,
    // blanking the rest of that line — including the string's own closing quote — and desyncing
    // every later quote pairing in the file. The real bare `border-b` after it went unreported.
    const text = [
      'function helper() { return name.split(" // ")[0]; }',
      '<p className="border-b border-[color:var(--border)]" />',
    ].join("\n");
    const found = unresolvedCollisions(text);
    expect(found).toHaveLength(1);
    expect(lineAt(text, found[0].offsetInFile)).toBe(2);
  });
});

describe("the shipped tree", () => {
  it("has no unresolved border-r/border-b collisions", async () => {
    const findings: string[] = [];
    for (const path of await tsxFiles("src")) {
      const source = await readFile(path, "utf8");
      for (const { side, offsetInFile } of unresolvedCollisions(source)) {
        findings.push(`${path}:${lineAt(source, offsetInFile)} bare "border-${side}"`);
      }
    }
    expect(findings).toEqual([]);
  });
});
