import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { freeRoom, hasCredit, paidRoom, PAID_DAILY_LIMIT } from "./allowance-rule";

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
// Matched over the WHOLE text, never line by line: `\s` spans a line break, so a comparison a
// formatter splits across two lines is still found.
const COMPARISON = new RegExp(
  String.raw`\bused\b\s*${OPS}\s*[\w.?!]*\blimit\b|\blimit\b\s*${OPS}\s*[\w.?!]*\bused\b`,
  "g",
);
// The paid limit's own pair, decided by `paidRoom` alone.
const PAID_COMPARISON = new RegExp(
  String.raw`\bpaidUsed(?:Today)?\b\s*${OPS}\s*[\w.?!]*\bpaidLimit\b|\bpaidLimit\b\s*${OPS}\s*[\w.?!]*\bpaidUsed(?:Today)?\b`,
  "g",
);
const BY_HAND = /\blimit\b\s*-\s*[\w.?!]*\bused\b/g;
const ON_THE_COUNT = new RegExp(
  String.raw`freeCount\([^)]*\)\s*${OPS}|${OPS}\s*freeCount\(|\bleft\b\s*${OPS}\s*\d|\d\s*${OPS}\s*\bleft\b`,
  "g",
);

function comparisons(text: string): string[] {
  const patterns = text.includes("freeCount(") ? [COMPARISON, BY_HAND, PAID_COMPARISON, ON_THE_COUNT] : [COMPARISON, BY_HAND, PAID_COMPARISON];
  return patterns.flatMap((re) => [...text.matchAll(re)].map((m) => m[0].replace(/\s+/g, " ")));
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
      "const spent = !freeLeft && (left === 0 || !!allowance.ownerShare);\nconst left = freeCount(a);",
      "if (freeCount(a) > 0) return",
      "if (a.paidUsedToday >= a.paidLimit) return",
      "return paidLimit > paidUsed;",
      // Split by a formatter across two lines.
      "if (\n  state.allowance.used >=\n  state.allowance.limit\n) {",
      "const left = Math.max(0, allowance.limit -\n  allowance.used);",
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

describe("the paid limit", () => {
  it("paidRoom is open below the limit and shut at it", () => {
    expect(paidRoom({ paidUsed: PAID_DAILY_LIMIT - 1, paidLimit: PAID_DAILY_LIMIT })).toBe(true);
    expect(paidRoom({ paidUsed: PAID_DAILY_LIMIT, paidLimit: PAID_DAILY_LIMIT })).toBe(false);
  });

  it("is twenty a day", () => {
    expect(PAID_DAILY_LIMIT).toBe(20);
  });

  it("never refuses a run the free allowance can fund", () => {
    expect(hasCredit({ used: 4, limit: 5, plan: 0, pack: 0, paidUsedToday: 20, paidLimit: 20 })).toBe(true);
  });

  it("shuts paid credits at the limit once the free allowance is spent", () => {
    expect(hasCredit({ used: 5, limit: 5, pack: 9, paidUsedToday: 20, paidLimit: 20 })).toBe(false);
    expect(hasCredit({ used: 5, limit: 5, pack: 9, paidUsedToday: 19, paidLimit: 20 })).toBe(true);
  });

  it("applies no limit to an Allowance that never read the counter", () => {
    expect(hasCredit({ used: 5, limit: 5, pack: 9 })).toBe(true);
  });
});

/**
 * CREDITS ARE SUMMED, NEVER COUNTED (Suggested changes v2 pricing, Hugh 2026-10-30). A run over 10 swaps costs 2 credits
 * and is still ONE `model_calls` row (`units` = 2), so a counter that takes `count(*)` over the ledger's rows charges it
 * one: the free window, a lot's balance, the paid limit and every reader of them sum `model_calls.units`. This fails on
 * any SQL `count(` whose table (the first `from` after it, comments aside) is `model_calls`, unless its alias is one of
 * the counters below that count presses or accounts on purpose and are never a balance.
 */
const LEDGER_TABLES = new Set(["modelCalls", "model_calls"]);
const FROM = /\.from\(\s*(\w+)|\bfrom\s+(?:\$\{\s*(\w+)\s*\}|"?(\w+)"?)/;
/** `file:alias` of every count over the ledger that is not a credit counter, with why. */
const NOT_CREDITS = new Set([
  // The Costs page: runs and accounts in a month, for dollars per run. Never a balance.
  "lib/admin/costs.ts:runs",
  "lib/admin/costs.ts:playerAccounts",
  "lib/admin/costs.ts:previousRuns",
  // The admin account page's presses per feature this month, refunds included: a press count, not credits.
  "lib/admin/account-page.ts:presses",
]);
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|\s)\/\/.*$/gm, "$1");

/** The alias of every `count(` over the ledger in `text` ("" when it has none). */
function ledgerCounts(raw: string): string[] {
  const text = stripComments(raw);
  const found: string[] = [];
  for (const m of text.matchAll(/\bcount\(/g)) {
    const from = text.slice(m.index, m.index + 2000).match(FROM);
    const table = from ? from[1] ?? from[2] ?? from[3] : null;
    if (!table || !LEDGER_TABLES.has(table)) continue;
    found.push(text.slice(Math.max(0, m.index - 200), m.index).match(/(\w+)\s*:\s*sql(?:<[^`]*?>)?`[^`]*$/)?.[1] ?? "");
  }
  return found;
}

describe("credits over model_calls are summed units, never counted rows", () => {
  it("no source file counts ledger rows as credits", () => {
    const found = sourceFiles(SRC).flatMap((path) => {
      const file = relative(SRC, path);
      return ledgerCounts(readFileSync(path, "utf8")).map((alias) => `${file}:${alias}`).filter((key) => !NOT_CREDITS.has(key));
    });
    expect(found).toEqual([]);
  });

  it("sees the shapes the counters were written in, and not a sum or another table", () => {
    for (const shape of [
      "spent: sql<string>`count(*) filter (where ${modelCalls.status} = 'spent')`,\n reserved: x,\n })\n .from(modelCalls)",
      "spent: sql<number>`(\n select count(*) from ${modelCalls} mc\n where mc.status = 'spent')::int`",
      "const { rows } = await tx.execute(sql`select count(*) as n from model_calls where user_id = ${id}`);",
      "used: sql<number>`count(${modelCalls.id})::int`,\n}).from(modelCalls)",
    ]) expect(ledgerCounts(shape)).toHaveLength(1);
    for (const fine of [
      "spent: sql<string>`coalesce(sum(${modelCalls.units}) filter (where ${modelCalls.status} = 'spent'), 0)`,\n }).from(modelCalls)",
      "cards: sql<number>`count(*)::int`,\n}).from(deckCards)",
      // A comment naming the ledger is not its table.
      "n: sql<number>`count(*)::int`, // not from model_calls\n}).from(decks)",
    ]) expect(ledgerCounts(fine)).toEqual([]);
  });

  it("names every exemption it still needs, so none outlives its counter", () => {
    const seen = new Set(sourceFiles(SRC).flatMap((path) => ledgerCounts(readFileSync(path, "utf8")).map((alias) => `${relative(SRC, path)}:${alias}`)));
    expect([...NOT_CREDITS].filter((key) => !seen.has(key))).toEqual([]);
  });
});
