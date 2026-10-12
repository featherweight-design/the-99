// The eval scripts read their ledger limits from `src/lib/eval/ledger-limits.ts` and restate none
// of them, so any reader of that table (the admin Costs page is the planned one) cannot show a
// limit nothing enforces.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ASK_AT_USD, DEFAULT_LIMITS, HARD_CAP_USD, OVERVIEW_ACCURACY_LIMITS } from "./ledger.mjs";

const EVAL = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPTS = join(EVAL, "..");
const source = (f: string) => readFileSync(join(EVAL, f), "utf8");

describe("eval ledger limits, one source", () => {
  it("keeps the shared ledger's exports at their old values", () => {
    expect([HARD_CAP_USD, ASK_AT_USD]).toEqual([25, 15]);
    expect(DEFAULT_LIMITS).toEqual({ hardCapUsd: 25, askAtUsd: 15 });
    expect(OVERVIEW_ACCURACY_LIMITS).toEqual({ hardCapUsd: 15, askAtUsd: 11 });
  });

  it.each([
    ["tuning-lists.mts", /const LIMITS = LEDGER_LIMITS\["ledger-tuning-lists\.jsonl"\];/],
    ["cuts-model.mts", /const CAP_USD = LEDGER_LIMITS\["ledger-cuts\.jsonl"\]\.hardCapUsd;\nconst ASK_AT_USD = LEDGER_LIMITS\["ledger-cuts\.jsonl"\]\.askAtUsd;/],
    ["cuts-blind.mts", /const CAP_USD = LEDGER_LIMITS\["ledger-cuts\.jsonl"\]\.hardCapUsd;\nconst ASK_AT_USD = LEDGER_LIMITS\["ledger-cuts\.jsonl"\]\.askAtUsd;/],
    ["intake-read.mts", /const CAP_USD = LEDGER_LIMITS\["ledger-help-me-choose\.jsonl"\]\.hardCapUsd;/],
    ["fits-read.mts", /const CAP_USD = LEDGER_LIMITS\["ledger-find-a-deck\.jsonl"\]\.hardCapUsd;/],
    ["cuts-plan.mts", /const LEDGER_CUTS_CAP = LEDGER_LIMITS\["ledger-cuts\.jsonl"\]\.hardCapUsd;/],
    ["../probe-tuning-owned.mts", /const TUNING_CAP = LEDGER_LIMITS\["ledger-tuning-lists\.jsonl"\]\.hardCapUsd;/],
  ])("%s reads its limits from the table", (file, wiring) => {
    const s = source(file);
    expect(s).toMatch(wiring);
    expect(s).not.toMatch(/const (CAP_USD|ASK_AT_USD|LIMITS) = [\d{]/);
  });

  it("finds no script or probe that writes a ledger limit as a number of its own", () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = join(dir, e.name);
        if (e.isDirectory()) return e.name === "node_modules" ? [] : walk(p);
        return /\.(m?ts|mjs)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
      });
    const offenders = walk(SCRIPTS).filter((p) => /(hardCapUsd|askAtUsd):\s*\d/.test(readFileSync(p, "utf8")));
    expect(offenders).toEqual([]);
  });
});
