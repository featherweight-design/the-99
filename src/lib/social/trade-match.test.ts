import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { tradeMatchFingerprint, tradeMatchKey, wishedForMatchQuery } from "./trade-match";

describe("wishedForMatchQuery", () => {
  const { sql, params } = new PgDialect().sqlToQuery(wishedForMatchQuery("viewer_1"));
  const q = sql.replace(/\s+/g, " ");

  it("reads only the viewer's own lines, and only while they want trade-match news: the feed kind on, or a device with its push on", () => {
    expect(q).toContain("where twi.user_id = $");
    expect(q).toContain("(tup.feed_kinds ->> $");
    expect(q).toContain("(tup.push_kinds ->> $");
    expect(q).toContain(`exists (select 1 from "push_subscriptions" wnt where wnt.user_id = twi.user_id)`);
    expect(q).toContain(`join "user_prefs" tup on tup.user_id = twi.user_id`);
    expect(params).toContain("viewer_1");
    expect(params.filter((p) => p === "trade-match")).toHaveLength(2); // the two wanted tests
  });

  it("answers the earlier of the two stamps as the kind's enabledAt", () => {
    expect(q).toContain("coalesce(tup.feed_kinds ->> 'trade-match', tup.push_kinds ->> 'trade-match') as enabled_at");
  });

  it("leaves out a line the collection already reaches, qualified on both sides", () => {
    expect(q).toContain(`coalesce((select sum(tci.quantity) from "collection_items" tci where tci.user_id = twi.user_id and tci.oracle_id = twi.oracle_id), 0) < twi.quantity`);
  });
});

describe("tradeMatchFingerprint", () => {
  it("ignores the order of the wished cards and moves with each input", () => {
    const base = tradeMatchFingerprint(["a", "b"], "2026-10-01", "g1");
    expect(tradeMatchFingerprint(["b", "a"], "2026-10-01", "g1")).toBe(base);
    expect(tradeMatchFingerprint(["a", "b", "c"], "2026-10-01", "g1")).not.toBe(base);
    expect(tradeMatchFingerprint(["a", "b"], "2026-10-02", "g1")).not.toBe(base);
    expect(tradeMatchFingerprint(["a", "b"], "2026-10-01", "g2")).not.toBe(base);
  });

  it("cannot be forged across fields", () => {
    expect(tradeMatchFingerprint(["a"], "b", "c")).not.toBe(tradeMatchFingerprint(["a", "b"], "", "c"));
  });
});

describe("tradeMatchKey", () => {
  it("is one item per card per friend", () => {
    expect(tradeMatchKey("card", "friend")).toBe("card:friend");
  });
});
