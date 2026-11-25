// An editor may drop a fill-in from a copy leaf's text, which leaves its parameter unused, so `eslint.config.mjs` turns
// off the unused-argument check in copy files. This pins that exemption to copy files alone, with every other option of
// the shared rule unchanged.
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const RULE = "@typescript-eslint/no-unused-vars";
const eslint = new ESLint({ cwd: process.cwd() });
const optionsFor = async (file: string) => ((await eslint.calculateConfigForFile(file)) as { rules: Record<string, unknown[]> }).rules[RULE];

// Loading the whole flat config is slow on a cold runner.
describe("the unused-argument exemption", { timeout: 60_000 }, () => {
  it("applies to copy files, and differs from the shared rule only in args", async () => {
    const [copyLevel, copy] = (await optionsFor("src/lib/copy/landing.ts")) as [unknown, Record<string, unknown>];
    const [baseLevel, base] = (await optionsFor("src/lib/copy-editor/edits.ts")) as [unknown, Record<string, unknown>];
    expect(copy.args).toBe("none");
    expect(copyLevel).toEqual(baseLevel);
    const { args: _a, ...copyRest } = copy;
    const { args: _b, ...baseRest } = base;
    expect(copyRest).toEqual(baseRest);
  });
  it.each(["src/lib/copy-editor/edits.ts", "src/lib/decks/deck.ts", "src/components/copy-editor/fill-field.tsx", "scripts/lib/copy-sheet/sheet.mts", "src/lib/copy/copy.test.ts"])(
    "does not reach %s",
    async (file) => {
      const [, options] = (await optionsFor(file)) as [unknown, Record<string, unknown>];
      expect(options.args).not.toBe("none");
    },
  );
});
