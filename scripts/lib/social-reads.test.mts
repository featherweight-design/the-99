import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  it("covers pod_spare_shares, by binding and by name", () => {
    expect(socialReadsIn(`import { podSpareShares } from "../../db/schema";`)).toEqual([{ line: 1, why: "imports podSpareShares" }]);
    expect(socialReadsIn("sql`delete from pod_spare_shares where user_id = ${id}`").map((f) => f.why)).toEqual(["names pod_spare_shares in SQL"]);
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

describe("a file that is gone between the listing and the read", () => {
  // Other tests in the same run write and remove temporary fixture trees under src/ (list-cache-tables.test.mts), and the
  // scan used to meet one half-way as an ENOENT and fail. A dangling symlink is the same state, made on purpose: listed
  // as a source file, gone when read.
  it("is skipped, while a real violation beside it is still found", async () => {
    const root = mkdtempSync(join(tmpdir(), "social-reads-"));
    try {
      mkdirSync(join(root, "src/app"), { recursive: true });
      writeFileSync(join(root, "src/app/bad.ts"), `import { friendLinks } from "../db/schema";\n`);
      writeFileSync(join(root, "src/app/ok.ts"), "export const x = 1;\n");
      symlinkSync(join(root, "src/app/never-existed.ts"), join(root, "src/app/vanished.ts"));
      const { files, findings } = await socialReadFindings(root);
      expect(findings).toEqual([{ path: "src/app/bad.ts", line: 1, why: "imports friendLinks" }]);
      expect(files).toBe(2);
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  it("still fails when the tree to scan is itself missing, rather than reporting zero files and passing", async () => {
    const root = mkdtempSync(join(tmpdir(), "social-reads-"));
    try {
      await expect(socialReadFindings(root)).rejects.toThrow(/ENOENT/);
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  it("still throws on an error that is not a missing file", async () => {
    const root = mkdtempSync(join(tmpdir(), "social-reads-"));
    try {
      mkdirSync(join(root, "src"), { recursive: true });
      writeFileSync(join(root, "src/file-as-dir"), "x");
      await expect(socialReadFindings(root, "src/file-as-dir")).rejects.toThrow();
    } finally {
      rmSync(root, { recursive: true });
    }
  });
});
