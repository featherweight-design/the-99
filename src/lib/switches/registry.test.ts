// The switch registry is the closed set the overrides table is checked against, so it must name
// every `*_ENABLED` variable the app reads, and nothing it does not.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SWITCH_NAMES, switchKind } from "./registry";

const SRC = join(process.cwd(), "src");
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return files(p);
    return /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });

/** Every switch variable a flag function reads: `env.FOO_ENABLED`. */
function readVariables(): Set<string> {
  const out = new Set<string>();
  for (const f of files(SRC)) {
    for (const m of readFileSync(f, "utf8").matchAll(/\benv\.([A-Z0-9_]+_ENABLED)\b/g)) out.add(m[1]);
  }
  return out;
}

describe("the switch registry", () => {
  it("names every *_ENABLED variable the app reads, and none it does not", () => {
    expect([...SWITCH_NAMES].sort()).toEqual([...readVariables()].sort());
  });

  it("checks the overrides table against exactly this set", () => {
    const migrations = readdirSync(join(process.cwd(), "drizzle")).filter((f) => f.endsWith(".sql")).sort();
    // The newest migration that (re)states the constraint is the one in force.
    const sources = migrations.map((f) => readFileSync(join(process.cwd(), "drizzle", f), "utf8"));
    const last = sources.filter((s) => s.includes("flag_overrides_switch_check")).at(-1) ?? "";
    const listed = /flag_overrides_switch_check" CHECK \([^)]*in \(([^)]*)\)/.exec(last)?.[1] ?? "";
    expect(listed.split(",").map((s) => s.trim().replace(/'/g, "")).sort()).toEqual([...SWITCH_NAMES].sort());
  });

  // LABEL_ROLE_COUNTS is a scoring basis no reader sees as a feature (admin PR 6d-2): a per-account
  // override of it would add nothing and score one reader's stored set by a basis another's does not use.
  // RATE_LIMIT counts requests (payments scope PR S); no reader sees a difference.
  it("keeps plumbing to the list cache, the role-count basis and the request counter, and marks the switches that spend model calls", () => {
    expect(SWITCH_NAMES.filter((n) => switchKind(n) === "plumbing")).toEqual(["LABEL_ROLE_COUNTS_ENABLED", "LIST_CACHE_ENABLED", "RATE_LIMIT_ENABLED"]);
    expect(SWITCH_NAMES.filter((n) => switchKind(n) === "model").sort()).toEqual(
      ["FIND_A_DECK_READ_ENABLED", "HELP_ME_CHOOSE_ENABLED", "OVERVIEW_V2_ENABLED", "PROPOSED_CUTS_ENABLED", "TUNING_ENABLED"],
    );
  });
});
