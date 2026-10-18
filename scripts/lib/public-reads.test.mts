import { describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { importsOf, loaderFiles } from "./list-cache-tables.mjs";
import { ALLOWED_TABLES, codeOnly, judge, publicEntries, publicReadFindings } from "./public-reads.mjs";

const run = (files: Record<string, string>) => judge(Object.keys(files), (f) => files[f]);

describe("the public loaders, as they stand", () => {
  it("read the allowlisted catalog tables only, reach no forbidden directory and call no request API", () => {
    const { files, findings } = publicReadFindings();
    expect(findings).toEqual([]);
    // The walk really followed imports: a file the entries only reach transitively is among those read.
    expect(files).toBeGreaterThan(publicEntries().length);
  });

  it("are not wired to a route: the proxy's public list does not name the card or commander routes (yet)", () => {
    const proxy = codeOnly(readFileSync("src/proxy.ts", "utf8"));
    expect(proxy).not.toMatch(/["']\/(card|commander)s?\b/);
  });
});

describe("judge fails on what it must", () => {
  it("a table off the allowlist, by binding and by raw SQL, including one `user_id` never names", () => {
    expect(run({ "src/lib/public/a.ts": `import { pods } from "../../db/schema";\nexport const q = db.select().from(pods);` }).map((f) => f.why))
      .toEqual(["reads `pods`, which is not on the public allowlist"]);
    expect(run({ "src/lib/public/a.ts": "export const q = sql`select 1 from payment_records`;" }).map((f) => f.why))
      .toEqual(["reads `payment_records`, which is not on the public allowlist"]);
    expect(run({ "src/lib/public/a.ts": `import { collectionItems } from "../../db/schema";` }).length).toBe(1);
  });

  it("a reachable file in a forbidden directory", () => {
    const findings = run({ "src/lib/public/a.ts": "export {}", "src/lib/social/friends.ts": "export {}", "src/lib/switches/request.ts": "export {}" });
    expect(findings.map((f) => f.path)).toEqual(["src/lib/social/friends.ts", "src/lib/switches/request.ts"]);
  });

  it("a request API, the auth library, or an import from the app or components", () => {
    const why = (src: string) => run({ "src/lib/public/a.ts": src }).map((f) => f.why);
    expect(why(`import { headers } from "next/headers";`)).toContain("imports next/headers (a request API)");
    expect(why("const c = await cookies();")).toContain("calls cookies()");
    expect(why("const { userId } = await auth();")).toContain("calls auth()");
    expect(why(`import { currentUser } from "@clerk/nextjs/server";`)).toContain("imports the auth library");
    expect(why(`import { Card } from "../../components/cards/card";`)).toContain("imports from src/app or src/components");
  });

  it("an edge the walk cannot follow: a dynamic import, require, a side-effect import, or a file outside src/lib", () => {
    const why = (src: string) => run({ "src/lib/public/a.ts": src }).map((f) => f.why);
    expect(why('const m = await import("../social/friends");')).toContain("uses a dynamic import (the guard cannot follow it)");
    expect(why('const m = require("../social/friends");')).toContain("uses require (the guard cannot follow it)");
    expect(why('import "../social/boot";')).toContain("has a side-effect import (the guard cannot follow it)");
    expect(why('import { x } from "../../server/x";')).toContain("imports src/server/x, outside src/lib and src/db, which the guard does not read");
    expect(why('import { x } from "../bracket/flags-read";')).toEqual([]);
    expect(why('import { db } from "../../db";')).toEqual([]);
    expect(why('import { cards } from "../../db/schema";')).toEqual([]);
    // An aliased import is judged like the relative one, and a db HELPER is not the entry point or the schema.
    expect(why('import { x } from "@/server/reader";')).toContain("imports src/server/reader, outside src/lib and src/db, which the guard does not read");
    expect(why('import { x } from "@/lib/bracket/flags-read";')).toEqual([]);
    expect(why('import { x } from "../../db/catalog-helper";')).toContain("imports src/db/catalog-helper, outside src/lib and src/db, which the guard does not read");
  });

  it("the walk follows an INDENTED import, and the full walk finds what it leads to", () => {
    expect(importsOf('  import { x } from "../reader";\n\timport { y } from "../other";')).toEqual(["../reader", "../other"]);
    const dir = "src/lib/public/zz-fixture";
    try {
      mkdirSync(dir, { recursive: true });
      writeFileSync(`${dir}/entry.ts`, 'export const a = 1;\n  import { loadSecret } from "./helper";\n');
      writeFileSync(`${dir}/helper.ts`, "export const loadSecret = async () => cookies();\n");
      const files = loaderFiles([`${dir}/entry.ts`], {});
      expect(files).toContain(`${dir}/helper.ts`);
      expect(judge(files, (f) => readFileSync(f, "utf8")).map((f) => f.why)).toContain("calls cookies()");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("a barrel FILE named like a forbidden directory, and SQL the old pattern missed", () => {
    expect(run({ "src/lib/social.ts": "export {}" }).map((f) => f.path)).toEqual(["src/lib/social.ts"]);
    expect(run({ "src/lib/social/index.ts": "export {}" }).map((f) => f.path)).toEqual(["src/lib/social/index.ts"]);
    expect(run({ "src/lib/public/a.ts": "const q = sql`insert into pods values (1)`;" }).map((f) => f.why)).toEqual(["reads `pods`, which is not on the public allowlist"]);
    expect(run({ "src/lib/public/a.ts": 'const q = sql`select 1 from "public"."pods"`;' }).map((f) => f.why)).toEqual(["reads `pods`, which is not on the public allowlist"]);
  });

  it("a // inside a string does not hide the rest of its line", () => {
    expect(run({ "src/lib/public/a.ts": 'const s = " // "; const c = await cookies();' }).map((f) => f.why)).toContain("calls cookies()");
  });

  it("passes the allowlist and ignores a comment that names a cookie or a table", () => {
    const ok = `// reads no cookies() and never touches pods\n/* auth() is not called */\nimport { cards } from "../../db/schema";\nexport const q = db.select().from(cards);`;
    expect(run({ "src/lib/public/a.ts": ok })).toEqual([]);
    expect([...ALLOWED_TABLES].sort()).toEqual(["card_bracket_flags", "cards", "commander_support", "commander_support_cards", "printings", "sets"]);
  });
});
