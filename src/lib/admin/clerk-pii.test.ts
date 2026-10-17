// Admin R3, ruling 4: masking happens on the server, at the one place Clerk's user records enter the admin
// (`listAccounts` in accounts.ts). No other admin module may read a Clerk user's name or email fields, or a raw
// value could reach a page payload around the mask. Reads the tree through `node:fs`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOTS = ["src/lib/admin", "src/app/admin", "src/components/admin"];
/** The modules allowed to read them: accounts.ts reads Clerk; mask.ts is the masking rule those values pass through. */
const ALLOWED = new Set(["src/lib/admin/accounts.ts", "src/lib/admin/mask.ts"]);
const FIELDS = /primaryEmailAddress|emailAddresses|\.firstName\b|\.lastName\b|\.fullName\b|\bgetUserList\b|\bgetUser\(/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("Clerk user PII in the admin", () => {
  it("is read in accounts.ts and nowhere else", () => {
    const readers = ROOTS.flatMap(files).filter((f) => !ALLOWED.has(f) && FIELDS.test(readFileSync(f, "utf8")));
    expect(readers).toEqual([]);
  });

  it("is read in accounts.ts, so the sweep is looking at the right tree", () => {
    expect(FIELDS.test(readFileSync("src/lib/admin/accounts.ts", "utf8"))).toBe(true);
  });
});
