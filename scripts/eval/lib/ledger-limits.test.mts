// The eval scripts read their ledger limits from `src/lib/eval/ledger-limits.ts` and restate none
// of them: the admin Costs page prints that table, so a script holding its own number would let
// the page show a limit nothing enforces.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ASK_AT_USD, DEFAULT_LIMITS, HARD_CAP_USD, OVERVIEW_ACCURACY_LIMITS } from "./ledger.mjs";

const EVAL = join(dirname(fileURLToPath(import.meta.url)), "..");
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
  ])("%s reads its limits from the table", (file, wiring) => {
    const s = source(file);
    expect(s).toMatch(wiring);
    expect(s).not.toMatch(/const (CAP_USD|ASK_AT_USD|LIMITS) = [\d{]/);
  });
});
