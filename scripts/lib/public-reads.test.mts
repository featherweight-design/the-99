import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALLOWED_TABLES, codeOnly, judge, publicEntries, publicReadFindings } from "./public-reads.mjs";

const run = (files: Record<string, string>) => judge(Object.keys(files), (f) => files[f]);

describe("the public loaders, as they stand", () => {
  it("read the allowlisted catalog tables only, reach no forbidden directory and call no request API", () => {
    const { files, findings } = publicReadFindings();
    expect(findings).toEqual([]);
    expect(files).toBeGreaterThan(publicEntries().length - 1);
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

  it("passes the allowlist and ignores a comment that names a cookie or a table", () => {
    const ok = `// reads no cookies() and never touches pods\n/* auth() is not called */\nimport { cards } from "../../db/schema";\nexport const q = db.select().from(cards);`;
    expect(run({ "src/lib/public/a.ts": ok })).toEqual([]);
    expect([...ALLOWED_TABLES].sort()).toEqual(["card_bracket_flags", "cards", "commander_support", "commander_support_cards", "printings", "sets"]);
  });
});
