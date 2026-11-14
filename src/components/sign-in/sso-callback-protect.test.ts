// @vitest-environment node
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The Google callback takes Clerk's pending challenge step through `__internal_resolvePendingProtectCheck`, an internal
// function (see `sso-callback.tsx`). `@clerk/nextjs` is pinned exactly so a bump has to pass this test before it lands:
// it fails when the installed ClerkJS type no longer names the function.
describe("Clerk's pending-challenge step", () => {
  it("is still on the installed Clerk type", () => {
    const here = createRequire(import.meta.url);
    const fromNext = createRequire(here.resolve("@clerk/nextjs/package.json"));
    const shared = fromNext.resolve("@clerk/shared/package.json");
    const types = readFileSync(join(shared, "..", "dist", "types", "clerk.d.ts"), "utf8");
    expect(types).toContain("__internal_resolvePendingProtectCheck");
  });
});
