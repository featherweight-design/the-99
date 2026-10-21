import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
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

// A dot entry is never source: list-cache-tables.test.mts makes `.switch-*` temp dirs under src/lib while this walks.
function sources(dir: string): string[] {
  return readdirSync(dir).filter((name) => !name.startsWith(".")).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const CLERK_SERVER = new Set(["@clerk/nextjs/server", "@clerk/backend"]);
const BACKEND_NAMES = new Set(["currentUser", "clerkClient", "createClerkClient"]);

/**
 * The Backend-call names a file takes from the Clerk server packages, from the parse tree: a named import (the ORIGINAL name,
 * whatever it is aliased to), a re-export, and a namespace or default import or a dynamic `import()` of the package, which
 * cannot be told apart from a Backend call by name and so reads as `*` and fails until it is listed. A comment, a string
 * and a comment inside an import specifier are not imports.
 */
export function backendImports(text: string): string[] {
  const sf = ts.createSourceFile("x.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: string[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && CLERK_SERVER.has(n.moduleSpecifier.text) && !n.importClause?.isTypeOnly) {
      const c = n.importClause;
      if (c?.name) out.push("*");
      const b = c?.namedBindings;
      if (b && ts.isNamespaceImport(b)) out.push("*");
      if (b && ts.isNamedImports(b)) for (const e of b.elements) if (!e.isTypeOnly && BACKEND_NAMES.has((e.propertyName ?? e.name).text)) out.push((e.propertyName ?? e.name).text);
    } else if (ts.isExportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier) && CLERK_SERVER.has(n.moduleSpecifier.text)) {
      const ex = n.exportClause;
      if (!ex || ts.isNamespaceExport(ex)) out.push("*");
      else for (const e of ex.elements) if (BACKEND_NAMES.has((e.propertyName ?? e.name).text)) out.push((e.propertyName ?? e.name).text);
    } else if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteral(n.arguments[0]) && CLERK_SERVER.has(n.arguments[0].text)) {
      out.push("*");
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out.sort();
}

describe("Clerk Backend calls on the server", () => {
  // Reads and parses the whole source tree synchronously; vitest's 5s default is too short on a loaded machine
  // (it timed out at 8-20s under load), so this gets 30s. A false red, not a slow test.
  it("are imported only where the table above says, with the names it says", () => {
    const found: Record<string, string[]> = {};
    for (const file of sources(join(process.cwd(), "src"))) {
      const names = backendImports(readFileSync(file, "utf8"));
      if (names.length > 0) found[file.slice(process.cwd().length + 1)] = names;
    }
    expect(found).toEqual(Object.fromEntries(Object.entries(ALLOWED).map(([f, v]) => [f, [...v.names].sort()])));
  }, 30_000);

  it("sees an aliased, multi-line and re-exported import, and ignores auth(), type imports, comments and strings", () => {
    expect(backendImports('import { auth, currentUser as me } from "@clerk/nextjs/server";')).toEqual(["currentUser"]);
    expect(backendImports('import {\n  clerkClient,\n  auth,\n} from "@clerk/nextjs/server";')).toEqual(["clerkClient"]);
    expect(backendImports('import { /* account lookup */ currentUser } from "@clerk/nextjs/server";')).toEqual(["currentUser"]);
    expect(backendImports('export { currentUser } from "@clerk/nextjs/server";')).toEqual(["currentUser"]);
    expect(backendImports('import { auth } from "@clerk/nextjs/server";\n// import { currentUser } from "@clerk/nextjs/server";\nconst s = \'import { clerkClient } from "@clerk/nextjs/server"\';')).toEqual([]);
    expect(backendImports('import type { currentUser } from "@clerk/nextjs/server";')).toEqual([]);
    expect(backendImports('import { useUser } from "@clerk/nextjs";')).toEqual([]);
  });

  it("reads a namespace import, a default import and a dynamic import as `*`, so each fails until it is listed", () => {
    expect(backendImports('import * as clerk from "@clerk/nextjs/server";')).toEqual(["*"]);
    expect(backendImports('import clerk from "@clerk/backend";')).toEqual(["*"]);
    expect(backendImports('const m = await import("@clerk/nextjs/server");')).toEqual(["*"]);
  });
});
