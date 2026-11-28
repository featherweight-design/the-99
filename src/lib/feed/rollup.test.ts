import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { named } from "../person-name/mint";
import type { FeedCard, FeedView } from "./home";
import { FEED_KINDS } from "./kinds";
import { unseenCountQuery } from "./read";
import { rollCountKey, rollTradeMatches, rollZone } from "./rollup";

const NOW = new Date("2026-10-22T12:00:00Z");
const flat = (s: string) => s.replace(/\s+/g, " ");
const render = (q: SQL | null) => new PgDialect().sqlToQuery(q!);

const card = (oracleId: string, name: string): FeedCard => ({ oracleId, name, image: `${oracleId}.jpg`, art: null, colorIdentity: null });
const view = (o: Partial<FeedView>): FeedView => ({
  key: "k", kind: "trade-match", at: "2026-10-22T10:00:00Z", unseen: true, card: null, friend: null, href: null, opens: null, outbound: null,
  name: null, setSize: null, owned: null, drop: null, combo: null, answer: null, askable: false, ...o,
});
const colin = { publicId: "p1", displayName: named("Colin") };
const max = { publicId: "p2", displayName: named("Max") };
const match = (key: string, at: string, friend: typeof colin, c: FeedCard | null, o: Partial<FeedView> = {}) =>
  view({ key, at, friend, card: c, href: `/friends/${friend.publicId}/spares?spare=${c?.oracleId}`, askable: true, ...o });

describe("rollTradeMatches", () => {
  it("folds a friend's matches on one reader-day into the newest, in its place, the rest of the list untouched", () => {
    const set = view({ key: "set:a", kind: "new-set", at: "2026-10-22T10:30:00Z" });
    const views = [
      match("m3", "2026-10-22T11:00:00Z", colin, card("c3", "Miku"), { unseen: false }),
      set,
      match("m2", "2026-10-22T10:00:00Z", colin, card("c2", "Ghalta"), { unseen: true }),
      match("m1", "2026-10-22T09:00:00Z", colin, card("c1", "Sai"), { unseen: false }),
    ];
    const out = rollTradeMatches(views, "UTC");
    expect(out.map((v) => v.key)).toEqual(["m3", "set:a"]);
    expect(out[1]).toBe(set);
    expect(out[0]).toMatchObject({
      key: "m3",
      at: "2026-10-22T11:00:00Z",
      unseen: true,
      askable: false,
      href: "/friends/p1/spares",
      card: { oracleId: "c3" },
      rollup: { keys: ["m3", "m2", "m1"] },
    });
    expect(out[0].rollup?.cards.map((c) => c.name)).toEqual(["Miku", "Ghalta", "Sai"]);
  });

  it("leaves a single match exactly as it was (the shipped row)", () => {
    const one = match("m1", "2026-10-22T09:00:00Z", colin, card("c1", "Sai"));
    const out = rollTradeMatches([one], "UTC");
    expect(out).toEqual([one]);
    expect(out[0]).toBe(one);
  });

  it("keeps two friends apart, and one friend's two reader-days apart", () => {
    const out = rollTradeMatches(
      [
        match("a", "2026-10-22T11:00:00Z", colin, card("c1", "Sai")),
        match("b", "2026-10-22T10:00:00Z", max, card("c2", "Ghalta")),
        match("c", "2026-10-21T23:00:00Z", colin, card("c3", "Miku")),
      ],
      "UTC",
    );
    expect(out.map((v) => [v.key, v.rollup?.keys ?? null])).toEqual([["a", null], ["b", null], ["c", null]]);
  });

  it("judges the day in the reader's zone: 23:00 and 01:00 UTC are one evening in New York", () => {
    const views = [
      match("late", "2026-10-23T01:00:00Z", colin, card("c1", "Sai")),
      match("early", "2026-10-22T23:00:00Z", colin, card("c2", "Ghalta")),
    ];
    expect(rollTradeMatches(views, "UTC").map((v) => v.key)).toEqual(["late", "early"]);
    expect(rollTradeMatches(views, "America/New_York").map((v) => [v.key, v.rollup?.keys])).toEqual([["late", ["late", "early"]]]);
  });

  it("counts a member the catalog lost but draws only the cards it still holds", () => {
    const out = rollTradeMatches(
      [match("a", "2026-10-22T11:00:00Z", colin, null), match("b", "2026-10-22T10:00:00Z", colin, card("c2", "Ghalta"))],
      "UTC",
    );
    expect(out[0].rollup).toEqual({ keys: ["a", "b"], cards: [card("c2", "Ghalta")] });
    expect(out[0].card).toEqual(card("c2", "Ghalta"));
  });

  it("never folds a match with no friend, or another kind", () => {
    const views = [
      view({ key: "x", at: "2026-10-22T11:00:00Z" }),
      view({ key: "y", at: "2026-10-22T10:00:00Z" }),
      view({ key: "s1", kind: "spare-request", friend: colin }),
      view({ key: "s2", kind: "spare-request", friend: colin }),
    ];
    expect(rollTradeMatches(views, "UTC")).toEqual(views);
  });
});

describe("rollZone", () => {
  it("falls back to UTC with no device or a zone the runtime does not know", () => {
    expect(rollZone(null)).toBe("UTC");
    expect(rollZone("Not/AZone")).toBe("UTC");
    expect(rollZone("Europe/Dublin")).toBe("Europe/Dublin");
  });
});

describe("the badges (orchestrator ruling: fold What's new and Home's badge, never the Friends list or its badge)", () => {
  it("Home's badge counts a friend's day of matches once, bucketed on the bound zone; every other row by its key", () => {
    const { sql, params } = render(unseenCountQuery("u", FEED_KINDS, NOW, "feed_seen_at", false, "America/New_York"));
    const q = flat(sql);
    expect(q).toMatch(/select count\(distinct case when f\.kind = 'trade-match' and f\.friend_public_id is not null then 'roll:' \|\| f\.friend_public_id \|\| ':' \|\| \(\(f\.created_at at time zone \$\d+\)::date\)::text else f\.key end\)::int as n/);
    expect(params).toContain("America/New_York");
  });

  it("without a zone, a count is per item: the Friends badge stays one per card, as its Waiting on you list draws", () => {
    const friends = flat(render(unseenCountQuery("u", ["trade-match"], NOW, "friends_seen_at")).sql);
    expect(friends).toMatch(/select count\(\*\)::int as n/);
    expect(friends).not.toContain("'roll:'");
  });

  it("the key the badge counts and the row the list folds agree, a day of four matches and one set", () => {
    // The list: four matches from Colin on one day fold to one row, beside a set; the badge's SQL key, evaluated the
    // same way in JS here, gives the same number of distinct keys as the list has unseen rows.
    const zone = "UTC";
    const views = [
      match("a", "2026-10-22T11:00:00Z", colin, card("c1", "Sai")),
      match("b", "2026-10-22T10:00:00Z", colin, card("c2", "Ghalta")),
      match("c", "2026-10-22T09:00:00Z", colin, card("c3", "Miku")),
      match("d", "2026-10-22T08:00:00Z", colin, card("c4", "Zada")),
      view({ key: "set:a", kind: "new-set", at: "2026-10-22T07:00:00Z" }),
    ];
    const rows = rollTradeMatches(views, zone);
    const keyOf = (v: FeedView) => (v.kind === "trade-match" && v.friend ? `roll:${v.friend.publicId}:${v.at.slice(0, 10)}` : v.key);
    expect(new Set(views.filter((v) => v.unseen).map(keyOf)).size).toBe(rows.filter((v) => v.unseen).length);
    expect(rows).toHaveLength(2);
    // The Friends badge counts each of the four, the list Waiting on you draws.
    expect(views.filter((v) => v.kind === "trade-match" && v.unseen)).toHaveLength(4);
    expect(flat(render(rollCountKey(zone)).sql)).toContain("'roll:' || f.friend_public_id");
  });
});
