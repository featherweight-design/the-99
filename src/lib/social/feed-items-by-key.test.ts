import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { storedFeedBranch, storedItemsByKeyQuery } from "./feed-items";

const dialect = new PgDialect();
const NOW = new Date("2026-10-22T12:00:00.000Z");

describe("storedItemsByKeyQuery", () => {
  it("reads nothing for no refs", () => {
    expect(storedItemsByKeyQuery("u1", [], NOW)).toBeNull();
  });

  const q = dialect.sqlToQuery(storedItemsByKeyQuery("u1", [{ kind: "price-drop", key: "k1" }, { kind: "combo", key: "v9" }], NOW)!);

  it("matches the writers' own (kind, key) pairs for the one reader", () => {
    expect(q.sql).toContain("(fi.kind, fi.dedupe_key) in ((");
    expect(q.params).toEqual(expect.arrayContaining(["u1", "price-drop", "k1", "combo", "v9"]));
  });

  it("does not depend on the reader's FEED toggles", () => {
    expect(q.sql).not.toContain("feed_kinds");
    expect(q.sql).not.toContain("fup");
  });

  it("keeps every standing rule the feed's branch has", () => {
    const feed = dialect.sqlToQuery(storedFeedBranch("u1", ["trade-match", "spare-request"], NOW)).sql;
    for (const rule of ["fsr.status = 'open'", "from \"spare_keep\" sk", "from \"friend_links\" gl"]) {
      expect(feed).toContain(rule);
      expect(q.sql).toContain(rule);
    }
  });

  it("answers the key as the dedupe key and never unseen", () => {
    expect(q.sql).toContain("fi.dedupe_key as key");
    expect(q.sql).toContain("false as unseen");
  });
});
