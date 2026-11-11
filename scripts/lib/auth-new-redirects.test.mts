// The in-app sign-in and sign-up each lived at a `/new` address while they were unlinked; a bookmark, a link copied from
// one, or a Google way back that left then must still land, its query kept (Next passes a redirect's query through).
// Temporary, never permanent: a browser caches a 308 for good. Read from the source, not imported: next.config.ts wraps
// the config in Sentry's build plugin (as admin-flags-redirect.test.mts reads it).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = readFileSync(join(root, "next.config.ts"), "utf8");

describe("the /sign-in/new and /sign-up/new redirects", () => {
  it.each([["/sign-in/new", "/sign-in"], ["/sign-up/new", "/sign-up"]])("sends %s on to %s with a temporary redirect", (from, to) => {
    const entry = new RegExp(`\\{\\s*source:\\s*"${from}",\\s*destination:\\s*"${to}",\\s*permanent:\\s*false\\s*\\}`);
    expect(source).toMatch(entry);
  });

  it("leaves no page at either old path, so the redirect is the only answer there", () => {
    expect(existsSync(join(root, "src/app/sign-in/new/page.tsx"))).toBe(false);
    expect(existsSync(join(root, "src/app/sign-up/new/page.tsx"))).toBe(false);
    expect(existsSync(join(root, "src/app/sign-up/page.tsx"))).toBe(true);
    expect(existsSync(join(root, "src/app/sign-in/page.tsx"))).toBe(true);
  });
});
