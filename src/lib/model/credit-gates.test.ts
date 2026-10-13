import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { freeRoom, hasCredit } from "./allowance-rule";

/**
 * "Out of credits" is decided in ONE place (payments plan, PR L2): `freeRoom` and `hasCredit` in
 * `allowance-rule.ts`. A gate that compares `used` against `limit` itself never sees a paid lot, so a
 * player holding paid credits is told they are spent while the reservation would fund the run. That
 * is how L shipped: three server gates and six panel sites each held their own comparison, two of
 * them on a free count taken first (`left === 0`). This test reads every source file under `src/`
 * (tests aside) and fails, anywhere but the rule file, on:
 *  - a comparison of `used` against `limit`;
 *  - the free count worked out by hand (`limit - used`): `freeCount` is the one subtraction;
 *  - a comparison on the free count (`freeCount(...)` itself, or `left` in a file that calls it),
 *    which is a gate on the free allowance alone.
 */
const SRC = join(process.cwd(), "src");
const RULE_FILE = "lib/model/allowance-rule.ts";
const OPS = String.raw`(?:>=|<=|===|!==|==|!=|<|>)`;
const COMPARISON = new RegExp(
  String.raw`\bused\b\s*${OPS}\s*[\w.?!]*\blimit\b|\blimit\b\s*${OPS}\s*[\w.?!]*\bused\b`,
);
const BY_HAND = /\blimit\b\s*-\s*[\w.?!]*\bused\b/;
const ON_THE_COUNT = new RegExp(
  String.raw`freeCount\([^)]*\)\s*${OPS}|${OPS}\s*freeCount\(|\bleft\b\s*${OPS}\s*\d|\d\s*${OPS}\s*\bleft\b`,
);

function comparisons(text: string): string[] {
  const countsFree = text.includes("freeCount(");
  return text.split("\n")
    .filter((line) => COMPARISON.test(line) || BY_HAND.test(line) || (countsFree && ON_THE_COUNT.test(line)))
    .map((l) => l.trim());
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__fixtures__" ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("out of credits is decided by allowance-rule.ts alone", () => {
  it("no source file outside the rule compares used against limit", () => {
    const found = sourceFiles(SRC)
      .map((path) => ({ file: relative(SRC, path), lines: comparisons(readFileSync(path, "utf8")) }))
      .filter((f) => f.file !== RULE_FILE && f.lines.length > 0);
    expect(found).toEqual([]);
  });

  it("sees every shape the gates were written in, and not an unrelated limit", () => {
    for (const shape of [
      "if (state.allowance.used >= state.allowance.limit) {",
      "a.ownerShare ? \"ownerShare\" : a.used >= a.limit ? \"allowance\" : null;",
      "&& allowance.used < allowance.limit;",
      "const spent = s.used >= s.limit;",
      "if (allowance.limit <= allowance.used) return",
      "const left = Math.max(0, allowance.limit - allowance.used);",
      "default: return creditsCopy.first(s.limit - s.used, s.limit, next);",
      "const left = freeCount(allowance);\nif (left > 0) return {",
      "const spent = !freeLeft && (left === 0 || !!allowance.paused);\nconst left = freeCount(a);",
      "if (freeCount(a) > 0) return",
    ]) expect(comparisons(shape)).toHaveLength(1);
    for (const fine of [
      "const left = freeCount(allowance);",
      "if (used >= perMinute) return false;",
      // `left` in a file that never counts free credits is someone else's word.
      "if (left > 0) return",
    ]) expect(comparisons(fine)).toEqual([]);
  });

  it("reads the rule file it exempts, so the exemption cannot outlive the file", () => {
    expect(comparisons(readFileSync(join(SRC, RULE_FILE), "utf8")).length).toBeGreaterThan(0);
  });
});

describe("freeRoom and hasCredit", () => {
  it("free room is the free allowance alone", () => {
    expect(freeRoom({ used: 4, limit: 5 })).toBe(true);
    expect(freeRoom({ used: 5, limit: 5 })).toBe(false);
  });

  it("a paid lot keeps a press open once the free allowance is spent", () => {
    expect(hasCredit({ used: 5, limit: 5 })).toBe(false);
    expect(hasCredit({ used: 5, limit: 5, plan: 0, pack: 0 })).toBe(false);
    expect(hasCredit({ used: 5, limit: 5, plan: 1 })).toBe(true);
    expect(hasCredit({ used: 7, limit: 5, pack: 3 })).toBe(true);
    expect(hasCredit({ used: 0, limit: 5 })).toBe(true);
  });
});
