import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  clearQuietQuery,
  pushCapWhen,
  readerDayStart,
  readerZoneQuery,
  tradeMatchFingerprint,
  tradeMatchKey,
  tradeMatchPushLock,
  wishedForMatchQuery,
} from "./trade-match";

describe("wishedForMatchQuery", () => {
  const { sql, params } = new PgDialect().sqlToQuery(wishedForMatchQuery("viewer_1"));
  const q = sql.replace(/\s+/g, " ");

  it("reads only the viewer's own lines, and only while they want trade-match news: the feed kind on, or a device with its push on", () => {
    expect(q).toContain(`select tup.user_id from "user_prefs" tup where tup.user_id = $`);
    expect(q).toContain("(tup.feed_kinds ->> $");
    expect(q).toContain("(tup.push_kinds ->> $");
    expect(q).toContain(`exists (select 1 from "push_subscriptions" wnt where wnt.user_id = tup.user_id)`);
    expect(params).toContain("viewer_1");
    expect(params.filter((p) => p === "trade-match")).toHaveLength(4); // the two wanted tests, in each union side's owner gate
  });

  it("reads the whole wishlist, the hand lines and the lines the decks put there, still-wanted only", () => {
    expect(q).toContain(`from "wishlist_items" hw where hw.user_id in (select tup.user_id`);
    expect(q).toContain(`from "wishlist_synced" sw where sw.user_id in (select tup.user_id`);
    expect(q).toContain("where uh.wanted or us.wanted");
  });

  it("leaves out a line the collection already reaches, as each side counts it (a hand line's named printing only by its own copies)", () => {
    expect(q).toContain("hs.owned < hs.quantity as wanted");
    expect(q).toContain("ss.owned < ss.quantity as wanted");
    expect(q).toMatch(/ci\.user_id = hw\.user_id and ci\.oracle_id = hw\.oracle_id and \(hw\.scryfall_id::uuid is null/);
  });

  it("marks a card quiet only when a quiet synced line alone wants it (a hand line makes it loud)", () => {
    expect(q).toContain("(ul.source = 'deck' and tq.quiet_since is not null) as quiet");
    expect(q).toContain(`left join lateral (select tqs.created_at::text as quiet_since from "wishlist_synced" tqs where tqs.user_id = ul.user_id and tqs.oracle_id = ul.oracle_id and tqs.quiet) tq on true`);
  });

  it("answers the earlier of the two stamps as the kind's enabledAt", () => {
    expect(q).toContain("coalesce(tep.feed_kinds ->> 'trade-match', tep.push_kinds ->> 'trade-match') as enabled_at");
  });
});

describe("readerDayStart", () => {
  it("is midnight in the reader's zone", () => {
    // 2026-11-27 03:00 UTC is still 11-26 in New York (UTC-5): that day began at 05:00 UTC on 11-26.
    expect(readerDayStart(new Date("2026-11-27T03:00:00Z"), "America/New_York").toISOString()).toBe("2026-11-26T05:00:00.000Z");
    expect(readerDayStart(new Date("2026-11-27T03:00:00Z"), "Asia/Tokyo").toISOString()).toBe("2026-11-26T15:00:00.000Z");
  });

  it("falls back to UTC with no device or a zone the runtime does not know", () => {
    expect(readerDayStart(new Date("2026-11-27T03:00:00Z"), null).toISOString()).toBe("2026-11-27T00:00:00.000Z");
    expect(readerDayStart(new Date("2026-11-27T03:00:00Z"), "Not/AZone").toISOString()).toBe("2026-11-27T00:00:00.000Z");
  });
});

describe("the one-push-a-day cap", () => {
  it("allows the push only while no trade-match push of another batch was queued since the day began", () => {
    const r = new PgDialect().sqlToQuery(pushCapWhen("viewer_1", "trade-match:run-1", new Date("2026-11-27T05:00:00Z")));
    const q = r.sql.replace(/\s+/g, " ");
    expect(q).toMatch(/^not exists \(select 1 from "push_outbox" tpo where tpo\.user_id = \$1 and tpo\.kind = 'trade-match' and tpo\.batch_key <> \$2 and tpo\.created_at >= \$3::timestamptz\)$/);
    expect(r.params).toEqual(["viewer_1", "trade-match:run-1", "2026-11-27T05:00:00.000Z"]);
  });

  it("is judged under a per-reader lock", () => {
    const r = new PgDialect().sqlToQuery(tradeMatchPushLock("viewer_1"));
    expect(r.sql).toBe("select pg_advisory_xact_lock(hashtext('trade-match-push'), hashtext($1))");
    expect(r.params).toEqual(["viewer_1"]);
  });

  it("clears quiet on the rows it read alone, each by its card and arrival stamp", () => {
    const r = new PgDialect().sqlToQuery(
      clearQuietQuery("viewer_1", [{ oracleId: "a", since: "2026-11-27 10:00:00.123456+00" }, { oracleId: "b", since: "2026-11-27 10:00:01+00" }]),
    );
    expect(r.sql.replace(/\s+/g, " ")).toBe(
      `update "wishlist_synced" set quiet = false where user_id = $1 and quiet and (oracle_id, created_at) in (select * from unnest($2::uuid[], $3::timestamptz[]))`,
    );
    expect(r.params).toEqual(["viewer_1", "{a,b}", `{"2026-11-27 10:00:00.123456+00","2026-11-27 10:00:01+00"}`]);
  });

  it("reads the zone of the device that refreshed last", () => {
    const q = new PgDialect().sqlToQuery(readerZoneQuery("viewer_1")).sql.replace(/\s+/g, " ");
    expect(q).toContain(`from "push_subscriptions" tps where tps.user_id = $1 order by tps.refreshed_at desc, tps.id limit 1`);
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
