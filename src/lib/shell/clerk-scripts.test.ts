// @vitest-environment node
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";
import { CLERK_JS_VERSION, CLERK_UI_VERSION } from "./clerk-scripts";

// `@clerk/shared` is not a dependency of this app, only of `@clerk/nextjs`, so it is found beside it.
const nextjs = realpathSync(join(process.cwd(), "node_modules/@clerk/nextjs"));
const loader = readFileSync(join(nextjs, "../shared/dist/loadClerkJsScript.mjs"), "utf8");
const selector = readFileSync(join(nextjs, "../shared/dist/versionSelector.mjs"), "utf8");

/** The release each script's selector defaults to when no version is given, as the SDK ships it. */
const sdkDefault = {
  js: selector.match(/versionSelector = \(clerkJSVersion, packageVersion = "([^"]+)"\)/)?.[1],
  ui: loader.match(/versionSelector\(__internal_clerkUIVersion, "([^"]+)"\)/)?.[1],
};
const major = (v: string | undefined) => v?.split(".")[0];

describe("the pinned Clerk script versions", () => {
  it("are in the major the installed SDK asks for", () => {
    expect(sdkDefault.js, "clerk-js default not found in @clerk/shared").toBeDefined();
    expect(sdkDefault.ui, "ui default not found in @clerk/shared").toBeDefined();
    expect(major(CLERK_JS_VERSION)).toBe(major(sdkDefault.js));
    expect(major(CLERK_UI_VERSION)).toBe(major(sdkDefault.ui));
  });

  it("are exact releases, which the frontend API serves with no redirect", () => {
    for (const v of [CLERK_JS_VERSION, CLERK_UI_VERSION]) expect(v).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("reach the browser through the variables the SDK reads", () => {
    expect(nextConfig.env).toMatchObject({
      NEXT_PUBLIC_CLERK_JS_VERSION: CLERK_JS_VERSION,
      NEXT_PUBLIC_CLERK_UI_VERSION: CLERK_UI_VERSION,
    });
  });
});
