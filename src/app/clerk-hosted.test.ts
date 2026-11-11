// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SIGN_IN_PATH, SIGN_UP_PATH } from "../components/public/links";
import { TASK_URLS } from "../lib/auth/session-tasks";

// Hugh, 2026-10-12: the app loads none of Clerk's prebuilt UI; managing the account opens Clerk's HOSTED page, and signing in
// is the app's own page at `/sign-in` (the cutover, Small items 11). The halves hold each other up: with the UI off, a
// modal-mode button calls `openSignIn` on a Clerk with no UI components, which throws, and a signed-out reader could not sign
// in; a redirect-mode button reaches the app's page only because the provider names it as `signInUrl`. So all of it is pinned
// in the source.
const HERE = dirname(fileURLToPath(import.meta.url));
const read = (f: string) => readFileSync(join(HERE, f), "utf8");

describe("Clerk's UI and the app's sign-in", () => {
  it("never fetches Clerk's prebuilt UI", () => {
    expect(read("layout.tsx")).toMatch(/<ClerkProvider[^>]*prefetchUI=\{false\}/);
  });

  it("sends Clerk's sign-in and sign-up to the app's own pages", () => {
    expect(SIGN_IN_PATH).toBe("/sign-in");
    expect(SIGN_UP_PATH).toBe("/sign-up");
    const layout = read("layout.tsx");
    expect(layout).toMatch(/<ClerkProvider[^>]*signInUrl=\{SIGN_IN_PATH\}/);
    expect(layout).toMatch(/<ClerkProvider[^>]*signUpUrl=\{SIGN_UP_PATH\}/);
    // A session pending on a task goes to `/sign-in/tasks/<key>`, which hands it to Clerk's hosted task page: every task
    // Clerk names is mapped there, and the layout passes that map.
    expect(TASK_URLS).toEqual({
      "choose-organization": "/sign-in/tasks/choose-organization",
      "reset-password": "/sign-in/tasks/reset-password",
      "setup-mfa": "/sign-in/tasks/setup-mfa",
    });
    expect(layout).toMatch(/<ClerkProvider[^>]*taskUrls=\{TASK_URLS\}/);
    expect(layout).toContain('import { TASK_URLS } from "../lib/auth/session-tasks";');
    expect(read("../proxy.ts")).toMatch(/signInUrl: SIGN_IN_PATH,\s*signUpUrl: SIGN_UP_PATH,/);
  });

  it("signs in by redirect, never by modal", () => {
    const page = read("page.tsx");
    expect(page).toContain('<SignInButton mode="redirect">');
    expect(page).not.toMatch(/mode="modal"/);
  });

  it("signs in by redirect on the newcomer's, the friend link's and the legal pages too", () => {
    for (const f of ["sign-up/page.tsx", "../components/join/join-flow.tsx", "friend/[token]/page.tsx", "../components/legal/legal-header.tsx"]) {
      const src = read(f);
      expect(src, f).toMatch(/<SignInButton mode="redirect"/);
      expect(src, f).not.toMatch(/mode="modal"/);
    }
  });
});
