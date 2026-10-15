import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { DECK_SOURCE_PREFIX } from "./deck-source";
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

// An import's own-these-cards add (no-collection entry) is titled by its deck, read now by the id its
// `deck:<uuid>` source names and scoped to the entry's own player, as the Shopping deck is.
describe("listColumns: the deck an import's add came from", () => {
  const { sql } = new PgDialect().sqlToQuery(listColumns as SQL);

  it("reads the deck's name by the id in the entry's own source, scoped to the entry's player", () => {
    expect(sql).toContain("then substr(h.source, 6) end as deck_add_id");
    expect(sql).toMatch(/select d\.name from decks d\s+where d\.user_id = h\.user_id\s+and d\.id = case when h\.source ~ '\^deck:\[0-9a-f\]\{8\}[^']*\$' then substr\(h\.source, 6\)::uuid end\s+\) as deck_add_name/);
  });

  // Every substr in the query starts one past the prefix the writer stamps, so the id it reads is the uuid and not
  // the prefix's last character in front of it (which would fail the `::uuid` cast).
  it("takes the id from just after the prefix the source is written with", () => {
    // The deck branch's own substr: the one after a `^deck:` match (shopping and precon sources have theirs).
    const starts = [...sql.matchAll(/'\^deck:[^']*' then substr\(h\.source, (\d+)\)/g)].map((m) => Number(m[1]));
    expect(starts.length).toBeGreaterThan(0);
    for (const n of starts) expect(n).toBe(DECK_SOURCE_PREFIX.length + 1);
  });
});
