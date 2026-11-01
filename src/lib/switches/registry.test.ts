// The switch registry is the closed set the overrides table is checked against, so it must name
// every `*_ENABLED` variable the app reads, and nothing it does not.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PENDING_DROP_SWITCHES } from "./pending-drop";
import { ALL_FEATURES, SWITCH_NAMES, switchDefaultsOn, switchKind } from "./registry";

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

  // The set, plus All features' reserved name (2026-10-15), which the table holds and no variable carries, and the
  // deleted switches the CHECK keeps until their follow-up migration (two-step delete, `pending-drop.ts`).
  it("checks the overrides table against exactly this set", () => {
    const migrations = readdirSync(join(process.cwd(), "drizzle")).filter((f) => f.endsWith(".sql")).sort();
    // The newest migration that (re)states the constraint is the one in force.
    const sources = migrations.map((f) => readFileSync(join(process.cwd(), "drizzle", f), "utf8"));
    const last = sources.filter((s) => s.includes("flag_overrides_switch_check")).at(-1) ?? "";
    const listed = /flag_overrides_switch_check" CHECK \([^)]*in \(([^)]*)\)/.exec(last)?.[1] ?? "";
    const inForce = listed.split(",").map((s) => s.trim().replace(/'/g, ""));
    expect(inForce.sort()).toEqual([...SWITCH_NAMES, ...PENDING_DROP_SWITCHES, ALL_FEATURES].sort());
  });

  it("keeps a pending drop out of the registry, so nothing reads or writes it", () => {
    for (const n of PENDING_DROP_SWITCHES) expect(SWITCH_NAMES as readonly string[]).not.toContain(n);
  });

  // RATE_LIMIT counts requests (payments scope PR S), and NAV_STALL_LOG reports stuck loaders; no reader sees a difference.
  // ANALYSIS_TAB spends: it gates every Overview press (READINESS audit finding 2), and SWAP_TOOLS
  // gates Find a deck's read the same way.
  // PUBLIC_PAGES is the public card and commander pages (launch epic F3): a stranger has no account, so only the
  // app-wide answer can decide it, and the page never varies by visitor.
  // SCAN_LAB is the card-scan spike's measuring page (staging only, never linked).
  // MODEL_CALLS is the model-call kill switch: one answer for the whole app, never per reader.
  it("keeps plumbing app-wide only, and marks the switches that spend model calls", () => {
    expect(SWITCH_NAMES.filter((n) => switchKind(n) === "plumbing")).toEqual([
      "LIST_CACHE_ENABLED", "MODEL_CALLS_ENABLED", "NAV_STALL_LOG_ENABLED", "PUBLIC_PAGES_ENABLED",
      "RATE_LIMIT_ENABLED", "SCAN_LAB_ENABLED",
    ]);
    expect(SWITCH_NAMES.filter((n) => switchKind(n) === "model").sort()).toEqual(
      [
        "ANALYSIS_TAB_ENABLED", "HELP_ME_CHOOSE_ENABLED", "OVERVIEW_V2_ENABLED", "PROPOSED_CUTS_ENABLED",
        "SUGGESTED_CHANGES_V2_ENABLED", "SWAP_TOOLS_ENABLED", "TUNING_ENABLED",
      ],
    );
  });
});

describe("switches on by default", () => {
  it("is the model-call kill switch alone", () => {
    expect(SWITCH_NAMES.filter(switchDefaultsOn)).toEqual(["MODEL_CALLS_ENABLED"]);
  });
});
