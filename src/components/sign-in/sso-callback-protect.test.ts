// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

// The Google callback takes Clerk's pending challenge step through `__internal_resolvePendingProtectCheck`, an internal
// function (see `sso-callback.tsx`). `@clerk/nextjs` is pinned exactly so a bump has to pass this test before it lands:
// it fails when the installed ClerkJS type no longer names the function.

/** The directory of the package an entry file belongs to: Clerk's `exports` maps hide `package.json`, so walk up to it. */
function packageDir(entry: string, name: string): string {
  let dir = dirname(entry);
  while (!existsSync(join(dir, "package.json")) || JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).name !== name) {
    const up = dirname(dir);
    if (up === dir) throw new Error(`no ${name} package above ${entry}`);
    dir = up;
  }
  return dir;
}

describe("Clerk's pending-challenge step", () => {
  it("is still on the installed Clerk type", () => {
    const here = createRequire(import.meta.url);
    const nextDir = packageDir(here.resolve("@clerk/nextjs"), "@clerk/nextjs");
    const sharedDir = packageDir(createRequire(join(nextDir, "package.json")).resolve("@clerk/shared"), "@clerk/shared");
    const types = readFileSync(join(sharedDir, "dist", "types", "clerk.d.ts"), "utf8");
    expect(types).toContain("__internal_resolvePendingProtectCheck");
  });
});
