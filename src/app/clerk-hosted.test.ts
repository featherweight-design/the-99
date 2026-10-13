// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Hugh, 2026-10-12: signing in and managing the account open Clerk's HOSTED pages, and the app loads
// none of Clerk's prebuilt UI. The two halves hold each other up: with the UI off, a modal-mode
// button calls `openSignIn` on a Clerk with no UI components, which throws, and a signed-out reader
// could not sign in. So both are pinned in the source.
const HERE = dirname(fileURLToPath(import.meta.url));
const read = (f: string) => readFileSync(join(HERE, f), "utf8");

describe("Clerk's hosted pages", () => {
  it("never fetches Clerk's prebuilt UI", () => {
    expect(read("layout.tsx")).toMatch(/<ClerkProvider[^>]*prefetchUI=\{false\}/);
  });

  it("signs in by redirect, never by modal", () => {
    const page = read("page.tsx");
    expect(page).toContain('<SignInButton mode="redirect">');
    expect(page).not.toMatch(/mode="modal"/);
  });
});
