import { describe, expect, it } from "vitest";
import { socialReadFindings, socialReadsIn } from "./social-reads.mjs";

describe("socialReadsIn", () => {
  it("finds a social table imported from the schema, under an alias too", () => {
    expect(socialReadsIn(`import { decks, friendLinks as fl } from "../../db/schema";`)).toEqual([{ line: 1, why: "imports friendLinks" }]);
  });

  it("finds a table read through a schema namespace", () => {
    const src = `import * as schema from "../db/schema";\nconst q = db.select().from(schema.podMembers);`;
    expect(socialReadsIn(src)).toEqual([{ line: 2, why: "reads schema.podMembers" }]);
  });

  it("finds the relational API, which needs no schema import", () => {
    expect(socialReadsIn(`const rows = await db.query.friendLinks.findMany();`)).toEqual([{ line: 1, why: "reads db.query.friendLinks" }]);
  });

  it("finds a table named in raw SQL, pods included where SQL names a table", () => {
    expect(socialReadsIn("sql`select * from friend_links where user_id = ${id}`").map((f) => f.why)).toEqual(["names friend_links in SQL"]);
    expect(socialReadsIn('sql`select 1 from "pods" p`').map((f) => f.why)).toEqual(['names from "pods" in SQL']);
    expect(socialReadsIn("sql`SELECT * FROM FRIEND_LINKS`").map((f) => f.why)).toEqual(["names FRIEND_LINKS in SQL"]);
  });

  it("does not read the word pods in copy, or a type-only import", () => {
    expect(socialReadsIn(`const line = "Your pods are where game nights start.";`)).toEqual([]);
    expect(socialReadsIn(`import type { pods } from "../db/schema";`)).toEqual([]);
    expect(socialReadsIn(`import { decks, type friendLinks } from "../db/schema";`)).toEqual([]);
  });
});

describe("the shipped tree", () => {
  it("reads the social tables only through src/lib/social", async () => {
    const { files, findings } = await socialReadFindings(process.cwd());
    expect(files).toBeGreaterThan(100);
    expect(findings).toEqual([]);
  });
});
