import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { listColumns } from "./history";

// A correlated subquery in a raw projection must alias and qualify both sides (AGENTS.md). The precon's name is read
// for an entry whose source is `precon:<file name>`, from `precons`, joined on that file name and nothing else.
describe("listColumns: the precon an add came from", () => {
  const { sql } = new PgDialect().sqlToQuery(listColumns as SQL);

  it("reads the precon's name by the file name in the entry's own source", () => {
    expect(sql).toContain("select p.name from precons p");
    expect(sql).toContain("h.source like 'precon:%' and p.file_name = substr(h.source, 8)");
    expect(sql).toContain(") as precon_name");
  });

  it("takes the file name after the prefix, whose length is seven", () => {
    // `precon:` is 7 characters, so substr from 8 is the first character of the file name.
    expect("precon:".length).toBe(7);
  });
});
