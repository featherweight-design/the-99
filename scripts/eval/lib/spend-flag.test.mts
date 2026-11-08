import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { describe, expect, it } from "vitest";

import { isDryRun, SPEND_OPTIONS } from "./spend-flag.mjs";

const parse = (argv: string[]) => parseArgs({ args: argv, options: SPEND_OPTIONS }).values;

describe("the eval spend switch", () => {
  it("is dry with no flags, and with --dry-run", () => {
    expect(isDryRun(parse([]))).toBe(true);
    expect(isDryRun(parse(["--dry-run"]))).toBe(true);
  });

  it("spends only on --spend, and --dry-run wins over it", () => {
    expect(isDryRun(parse(["--spend"]))).toBe(false);
    expect(isDryRun(parse(["--spend", "--dry-run"]))).toBe(true);
  });

  // Every eval that calls the model asks this switch, so none of them pays on a bare run
  // (Hugh, 2026-11-08). A script that drops the import would quietly go back to spending by default.
  it.each([
    "tuning", "synopsis", "repair", "tuning-lists", "tuning-focus", "tuning-model-arms", "tuning-blind-judge",
    "count-mechanism", "intake-read", "corpus", "smoke-v2", "labels-tiering", "overview-stages",
  ])("%s.mts decides its mode with isDryRun", (name) => {
    const src = readFileSync(join(process.cwd(), "scripts/eval", `${name}.mts`), "utf8");
    expect(src).toContain('from "./lib/spend-flag.mjs"');
    expect(src).toMatch(/isDryRun\(/);
    // No script reads the raw flags itself, which is how a bare run went on paying.
    expect(src).not.toMatch(/args\["dry-run"\]|args\.spend\b/);
  });
});
