import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { storedFeedBranch, storedItemsByKeyQuery } from "./feed-items";

const dialect = new PgDialect();
const NOW = new Date("2026-10-22T12:00:00.000Z");

describe("storedItemsByKeyQuery", () => {
  it("reads nothing for no refs", () => {
    expect(storedItemsByKeyQuery("u1", [], NOW)).toBeNull();
  });

  const q = dialect.sqlToQuery(storedItemsByKeyQuery("u1", [{ kind: "price-drop", key: "item:id-1" }, { kind: "combo", key: "item:id-9" }], NOW)!);

  it("matches the outbox's own (kind, opaque key) pairs for the one reader", () => {
    expect(q.sql).toContain("(fi.kind, 'item:' || fi.id::text) in ((");
    expect(q.params).toEqual(expect.arrayContaining(["u1", "price-drop", "item:id-1", "combo", "item:id-9"]));
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

  it("answers the opaque feed key, never a writer's dedupe key (a trade match's names another account), and never unseen", () => {
    expect(q.sql).toContain("'item:' || fi.id::text as key");
    expect(q.sql).not.toContain("fi.dedupe_key as key");
    expect(q.sql).toContain("false as unseen");
  });
});
