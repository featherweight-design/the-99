// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assertScratchBranch, LOCAL_DEV_BRANCH, PRODUCTION_BRANCH, STAGING_BRANCH } from "./scratch-branch.mjs";

/** Every script that wipes or reseeds the signed-in account's collection, history, uploads or decks wholesale. */
const WHOLE_ACCOUNT_WRITERS = [
  "probe-collection-sync-ui.mjs",
  "probe-issues-sheet.mjs",
  "probe-locked-nav.mjs",
  "probe-onboarding.mjs",
  "measure-collection-revert.ts",
];

describe("assertScratchBranch", () => {
  it.each([
    ["production", PRODUCTION_BRANCH],
    ["staging", STAGING_BRANCH],
    ["local-dev", LOCAL_DEV_BRANCH],
  ])("refuses %s", (name, id) => {
    expect(() => assertScratchBranch(id, "probe:x")).toThrow(new RegExp(`probe:x refuses ${name}`));
  });

  it("refuses an unknown branch", () => {
    expect(() => assertScratchBranch(null, "probe:x")).toThrow(/unknown branch/);
    expect(() => assertScratchBranch("", "probe:x")).toThrow(/unknown branch/);
  });

  it("lets a scratch branch through", () => {
    expect(() => assertScratchBranch("br-odd-block-a6sh086g", "probe:x")).not.toThrow();
  });
});

describe("whole-account writers", () => {
  it.each(WHOLE_ACCOUNT_WRITERS)("%s calls the shared guard and keeps no copy of it", (file) => {
    const src = readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), "utf8");
    expect(src).toMatch(/import \{[^}]*assertScratchBranch[^}]*\} from "\.\/lib\/scratch-branch\.mjs"/);
    expect(src).toMatch(/assertScratchBranch\(/);
    expect(src).not.toMatch(/branch === (PRODUCTION|STAGING)/);
  });
});
