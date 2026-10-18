import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// A Clerk BACKEND call is a network round trip to Clerk's API (~125 ms measured on staging, 2026-10-18): `currentUser()` and
// everything on `clerkClient()`. `auth()` is not one: it verifies the session token locally. A call on a request path is
// a cost every request pays, so each one is listed here WITH its frequency and why the data lives only in Clerk. A new one is a
// deliberate, reviewed diff to this table, not an import added in passing. Found by import, not by grep: a name in a comment
// or a string is not a call.
const ALLOWED: Record<string, { names: string[]; why: string }> = {
  "src/app/friends/page.tsx": { names: ["currentUser"], why: "/friends, only for a missing or young profile (profileNeedsClerk): the first name and the invitation reservation" },
  "src/app/friends/sender-profile.ts": { names: ["currentUser"], why: "a sender action, only for a missing or young profile: the first name and the invitation reservation" },
  "src/app/credits/actions.ts": { names: ["currentUser"], why: "Buy: the VERIFIED primary email lives only in Clerk, and Stripe's round trip that follows dwarfs it; once per purchase" },
  "src/lib/admin/accounts.ts": { names: ["clerkClient"], why: "the admin Accounts pages: emails and sign-in times live only in Clerk; admin only" },
  "src/lib/invites/clerk.ts": { names: ["clerkClient"], why: "email invitations and the 'already has an account' check: Clerk owns invitations; once per email invite" },
};

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

/** The Backend-call names a file imports from the Clerk server package. */
export function backendImports(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']@clerk\/(?:nextjs\/server|backend)["']/g)) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/)[0];
      if (name === "currentUser" || name === "clerkClient" || name === "createClerkClient") out.push(name);
    }
  }
  return out.sort();
}

describe("Clerk Backend calls on the server", () => {
  it("are imported only where the table above says, with the names it says", () => {
    const found: Record<string, string[]> = {};
    for (const file of sources(join(process.cwd(), "src"))) {
      const names = backendImports(readFileSync(file, "utf8"));
      if (names.length > 0) found[file.slice(process.cwd().length + 1)] = names;
    }
    expect(found).toEqual(Object.fromEntries(Object.entries(ALLOWED).map(([f, v]) => [f, [...v.names].sort()])));
  });

  it("sees an aliased and a multi-name import, and ignores auth() and a comment", () => {
    expect(backendImports('import { auth, currentUser as me } from "@clerk/nextjs/server";')).toEqual(["currentUser"]);
    expect(backendImports('import {\n  clerkClient,\n  auth,\n} from "@clerk/nextjs/server";')).toEqual(["clerkClient"]);
    expect(backendImports('import { auth } from "@clerk/nextjs/server";\n// currentUser() is not called')).toEqual([]);
    expect(backendImports('import { useUser } from "@clerk/nextjs";')).toEqual([]);
  });
});
