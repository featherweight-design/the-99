// Friend trades PR 4 ships the actions with no caller: the sheet, the Spares tab and the rows that press them are
// PRs 5 to 7. Until then nothing under src/app or src/components may import them, so no half-built surface can reach a
// player. PR 5 deletes this test in the same change that adds the first caller. Reads the tree through `node:fs`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOTS = ["src/app", "src/components"];
const IMPORTS = /from\s+["'][^"']*\/trade-actions["']/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("trade actions before PR 5", () => {
  it("are imported by no route or component", () => {
    expect(ROOTS.flatMap(files).filter((f) => IMPORTS.test(readFileSync(f, "utf8")))).toEqual([]);
  });

  it("exist where the sweep looks", () => {
    expect(readFileSync("src/app/friends/trade-actions.ts", "utf8")).toContain('"use server"');
  });
});
