import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "../../db";
import {
  closeFeedOffer, closeFeedOfferQuery, effectiveKinds, feedKindsUpdate, kindsOn, loadNewsSettings, markFeedSeen, markFriendsSeen,
  neverChose, nextFeedPrefs, parseChosenKinds, parseDeclined, parseFeedKinds, readFeedPrefs, setFeedKinds, type FeedKindsMap,
} from "./prefs";
import { DEFAULT_ON_KINDS, FEED_KINDS, isAnnouncementKind, type FeedKind } from "./kinds";

/** The scope of a form drawn with ANNOUNCEMENTS_ENABLED off: every kind but Wizards' three, so they are never touched. */
const noPosts = FEED_KINDS.filter((k) => !isAnnouncementKind(k));
const POSTS = ["secret-lair", "commander-decklists", "wizards-news"] as const;

/** A resolved env for a test. */
const env = (e: Record<string, string> = {}): NodeJS.ProcessEnv => e as unknown as NodeJS.ProcessEnv;

const NOW = new Date("2026-10-22T12:00:00Z");
const EARLIER = "2026-10-01T09:00:00.000Z";
const render = (q: SQL) => new PgDialect().sqlToQuery(q);

describe("parseFeedKinds", () => {
  it("keeps known kinds with a readable instant and reads anything else as off", () => {
    expect(parseFeedKinds({ combo: EARLIER, news: EARLIER, "new-set": "soon", "price-drop": 3 })).toEqual({ combo: EARLIER });
    expect(parseFeedKinds(null)).toEqual({});
    expect(parseFeedKinds(["combo"])).toEqual({});
  });
});

/** The map after a save, for kinds that start off (no default-on kind is touched by these cases). */
const nextFeedKinds = (map: FeedKindsMap, on: readonly FeedKind[], now: Date, scope?: readonly FeedKind[]) =>
  nextFeedPrefs({ map, declined: [...DEFAULT_ON_KINDS] }, on, now, scope)?.map ?? null;

describe("nextFeedPrefs (the map after a save)", () => {
  it("stamps a kind turned on with now", () => {
    expect(nextFeedKinds({}, ["combo"], NOW)).toEqual({ combo: NOW.toISOString() });
  });

  it("keeps the OLD stamp of a kind that stays on, so a re-save never re-opens its window", () => {
    expect(nextFeedKinds({ combo: EARLIER }, ["combo", "new-set"], NOW)).toEqual({ "new-set": NOW.toISOString(), combo: EARLIER });
  });

  it("removes a kind turned off", () => {
    expect(nextFeedKinds({ combo: EARLIER, "new-set": EARLIER }, ["new-set"], NOW)).toEqual({ "new-set": EARLIER });
  });

  it("is null when nothing changes, so the save writes nothing", () => {
    expect(nextFeedKinds({ combo: EARLIER }, ["combo"], NOW)).toBeNull();
    expect(nextFeedKinds({}, [], NOW)).toBeNull();
  });

  it("leaves a kind outside the form's scope as it was, on or off", () => {
    const scope = ["new-set", "new-precon", "combo"] as const;
    expect(nextFeedKinds({ "trade-match": EARLIER }, ["combo"], NOW, scope)).toEqual({ "trade-match": EARLIER, combo: NOW.toISOString() });
    // Out of scope and asked for: not turned on.
    expect(nextFeedKinds({}, ["trade-match"], NOW, scope)).toBeNull();
  });

  it("turned off then on again stamps anew, so the old window does not come back", () => {
    const off = nextFeedKinds({ combo: EARLIER }, [], NOW)!;
    expect(off).toEqual({});
    const later = new Date("2026-10-23T00:00:00Z");
    expect(nextFeedKinds(off, ["combo"], later)).toEqual({ combo: later.toISOString() });
  });

  it("lists what is on in the closed set's order", () => {
    expect(kindsOn({ combo: EARLIER, "new-set": EARLIER })).toEqual(["new-set", "combo"]);
  });
});

describe("a default-on kind (spare-request, G4; Wizards' three)", () => {
  const none = { map: {}, declined: [] as FeedKind[] };
  it("is on for a reader who never chose, and only those", () => {
    expect(effectiveKinds(none)).toEqual([...POSTS, "spare-request"]);
    expect(effectiveKinds({ map: { combo: EARLIER }, declined: [] })).toEqual([...POSTS, "spare-request", "combo"]);
    expect(effectiveKinds({ map: {}, declined: ["spare-request"] })).toEqual([...POSTS]);
    expect(effectiveKinds({ map: {}, declined: [...DEFAULT_ON_KINDS] })).toEqual([]);
  });

  it("left alone by a save, writes nothing for it", () => {
    expect(nextFeedPrefs(none, ["spare-request"], NOW, noPosts)).toBeNull();
    expect(nextFeedPrefs(none, ["spare-request", "combo"], NOW, noPosts)).toEqual({ map: { combo: NOW.toISOString() }, declined: [] });
    expect(nextFeedPrefs(none, [...POSTS, "spare-request"], NOW)).toBeNull();
  });

  it("turned off: off the map and onto the declined list", () => {
    expect(nextFeedPrefs(none, [], NOW, noPosts)).toEqual({ map: {}, declined: ["spare-request"] });
    expect(nextFeedPrefs({ map: { "spare-request": EARLIER }, declined: [] }, [], NOW, noPosts)).toEqual({ map: {}, declined: ["spare-request"] });
    // A form that offers them (the switch on) and leaves them unticked declines Wizards' three too, in FEED_KINDS order.
    expect(nextFeedPrefs(none, ["spare-request"], NOW)).toEqual({ map: {}, declined: [...POSTS] });
  });

  it("turned on again: off the declined list and stamped NOW, so what arrived while off never comes back", () => {
    expect(nextFeedPrefs({ map: {}, declined: ["spare-request"] }, ["spare-request"], NOW, noPosts)).toEqual({
      map: { "spare-request": NOW.toISOString() }, declined: [],
    });
    expect(nextFeedPrefs({ map: {}, declined: ["secret-lair"] }, ["secret-lair"], NOW, ["secret-lair"])).toEqual({
      map: { "secret-lair": NOW.toISOString() }, declined: [],
    });
  });

  it("outside the form's scope, stays declined or on as it was", () => {
    expect(nextFeedPrefs({ map: {}, declined: ["spare-request"] }, ["combo"], NOW, ["combo"])).toEqual({
      map: { combo: NOW.toISOString() }, declined: ["spare-request"],
    });
    expect(nextFeedPrefs(none, [], NOW, ["combo"])).toBeNull();
  });

  it("parses the stored list to known kinds, once each, in order", () => {
    expect(parseDeclined(["spare-request", "nope", "spare-request"])).toEqual(["spare-request"]);
    expect(parseDeclined(null)).toEqual([]);
  });
});

describe("parseChosenKinds (the action's input)", () => {
  const available = ["new-set", "new-precon", "combo"] as const;
  it("takes known, available kinds once each, in order", () => {
    expect(parseChosenKinds(["combo", "new-set", "combo"], available)).toEqual(["new-set", "combo"]);
    expect(parseChosenKinds([], available)).toEqual([]);
  });

  it("refuses the whole save on an unknown or unavailable kind, or a value that is not a list", () => {
    expect(parseChosenKinds(["combo", "news"], available)).toBeNull();
    expect(parseChosenKinds(["trade-match"], available)).toBeNull();
    expect(parseChosenKinds("combo", available)).toBeNull();
    expect(parseChosenKinds(Array(20).fill("combo"), available)).toBeNull();
  });
});

describe("feedKindsUpdate", () => {
  it("writes only while the row still holds BOTH columns it read (jsonb and array equality, qualified)", () => {
    const { sql, params } = feedKindsUpdate(
      "user_1", { feedKinds: { combo: EARLIER }, declined: ["spare-request"] },
      { map: { combo: EARLIER, "new-set": NOW.toISOString() }, declined: [] }, db,
    ).toSQL();
    expect(sql).toMatch(/^update "user_prefs" set "feed_kinds" = \$1, "feed_kinds_declined" = \$2 where \("user_prefs"\."user_id" = \$3 and "user_prefs"\."feed_kinds" = \$4::jsonb and "user_prefs"\."feed_kinds_declined" = \$5::text\[\]\)$/);
    expect(params[3]).toBe(JSON.stringify({ combo: EARLIER }));
    expect(params[4]).toEqual(["spare-request"]);
  });
});

describe("setFeedKinds", () => {
  /** A stand-in for the three statements it makes, over one prefs row. */
  function fake(row: { feedKinds: unknown; declined?: string[] } | undefined, raced = 0) {
    const writes: unknown[] = [];
    let races = raced;
    const chain = (rows: unknown[]) => ({ returning: async () => rows });
    const q = {
      select: () => ({ from: () => ({ where: async () => (row ? [row] : []) }) }),
      insert: () => ({ values: (v: unknown) => ({ onConflictDoNothing: () => { writes.push(v); return chain([{ userId: "u" }]); } }) }),
      update: () => ({ set: (v: unknown) => ({ where: () => { writes.push(v); return chain(races-- > 0 ? [] : [{ userId: "u" }]); } }) }),
    };
    return { q: q as never, writes };
  }

  it("writes nothing when the choice is what the row holds", async () => {
    const { q, writes } = fake({ feedKinds: { combo: EARLIER }, declined: [...DEFAULT_ON_KINDS] });
    expect(await setFeedKinds("u", ["combo"], NOW, undefined, q)).toBe(false);
    expect(writes).toEqual([]);
  });

  it("inserts the reader's row when there is none", async () => {
    const { q, writes } = fake(undefined);
    expect(await setFeedKinds("u", ["new-set", "spare-request"], NOW, undefined, q)).toBe(true);
    // The whole set offered, Wizards' three unticked: declined.
    expect(writes).toEqual([{ userId: "u", feedKinds: { "new-set": NOW.toISOString() }, feedKindsDeclined: [...POSTS] }]);
  });

  it("re-reads and decides again when another save landed first", async () => {
    const { q, writes } = fake({ feedKinds: { combo: EARLIER }, declined: [] }, 1);
    expect(await setFeedKinds("u", ["combo", "new-set"], NOW, undefined, q)).toBe(true);
    expect(writes).toHaveLength(2);
  });
});

describe("the two seen cursors", () => {
  function recorder(rowCount: number) {
    const ran: SQL[] = [];
    return { q: { execute: async (s: SQL) => { ran.push(s); return { rows: [], rowCount }; } } as never, ran };
  }
  const all = env({ SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_WISHLIST_ENABLED: "true" });

  it("a Home visit moves feed_seen_at and never friends_seen_at", async () => {
    const { q, ran } = recorder(1);
    expect(await markFeedSeen("u", all, NOW, q)).toBe(true);
    const { sql } = render(ran[0]);
    expect(sql.replace(/\s+/g, " ")).toMatch(/^insert into "user_prefs" as up \(user_id, feed_seen_at\) select /);
    expect(sql).not.toContain("friends_seen_at");
  });

  it("a /friends visit moves friends_seen_at and never feed_seen_at, over trade matches alone", async () => {
    const { q, ran } = recorder(1);
    expect(await markFriendsSeen("u", all, NOW, q)).toBe(true);
    const { sql, params } = render(ran[0]);
    expect(sql.replace(/\s+/g, " ")).toMatch(/^insert into "user_prefs" as up \(user_id, friends_seen_at\) select /);
    expect(sql).not.toContain("feed_seen_at");
    expect(sql).not.toContain(`"catalog_first_seen"`);
    expect(params).toContainEqual(["trade-match"]);
  });

  it("reports no write when nothing was unseen (the statement matched no row)", async () => {
    const { q } = recorder(0);
    expect(await markFeedSeen("u", all, NOW, q)).toBe(false);
  });

  it("runs nothing while the Friends badge's kind is unavailable", async () => {
    const { q, ran } = recorder(1);
    expect(await markFriendsSeen("u", env({ SOCIAL_FRIENDS_ENABLED: "true" }), NOW, q)).toBe(false);
    expect(ran).toEqual([]);
  });
});

describe("loadNewsSettings (Settings' news section)", () => {
  function reader(feedKinds: unknown) {
    let reads = 0;
    const q = { select: () => ({ from: () => ({ where: async () => { reads++; return [{ feedKinds }]; } }) }) } as never;
    return { q, reads: () => reads };
  }

  it("gives the available kinds in FEED_KINDS order, each with whether it is on; an unavailable kind is absent", async () => {
    const { q } = reader({ combo: EARLIER, "price-drop": EARLIER, "trade-match": EARLIER });
    const rows = await loadNewsSettings("u", env({ SOCIAL_WISHLIST_ENABLED: "true" }), q);
    expect(rows).toEqual([
      { kind: "new-set", on: false },
      { kind: "new-precon", on: false },
      { kind: "price-drop", on: true },
      { kind: "combo", on: true },
    ]);
  });

  it("offers trade matches only with friends and the wishlist both on, and a spare request only with its switch", async () => {
    const { q } = reader({});
    const rows = await loadNewsSettings("u", env({ SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_WISHLIST_ENABLED: "true" }), q);
    expect(rows.map((r) => r.kind)).toEqual(["new-set", "new-precon", "price-drop", "trade-match", "combo"]);
  });

  it("lists New precon with its stored choice", async () => {
    const { q } = reader({ "new-precon": EARLIER, combo: EARLIER });
    expect(await loadNewsSettings("u", env(), q)).toEqual([
      { kind: "new-set", on: false },
      { kind: "new-precon", on: true },
      { kind: "combo", on: true },
    ]);
  });

  it("reads a spare request ON for a reader who never chose, and off once declined (G4)", async () => {
    const on = env({ SOCIAL_FRIENDS_ENABLED: "true", SPARE_REQUESTS_ENABLED: "true" });
    const fresh = { select: () => ({ from: () => ({ where: async () => [] }) }) } as never;
    expect(await loadNewsSettings("u", on, fresh)).toContainEqual({ kind: "spare-request", on: true });
    const declined = { select: () => ({ from: () => ({ where: async () => [{ feedKinds: {}, declined: ["spare-request"] }] }) }) } as never;
    expect(await loadNewsSettings("u", on, declined)).toContainEqual({ kind: "spare-request", on: false });
  });
});

describe("neverChose (the offer line's rule, announcements call 3)", () => {
  it("holds with nothing stamped, nothing declined and the offer never closed", () => {
    expect(neverChose({ map: {}, declined: [] })).toBe(true);
    expect(neverChose({ map: {}, declined: [], offerClosed: false })).toBe(true);
  });

  it("ends with a kind stamped, a default-on kind declined, or the offer's ✕", () => {
    expect(neverChose({ map: { combo: EARLIER }, declined: [] })).toBe(false);
    expect(neverChose({ map: {}, declined: ["secret-lair"] })).toBe(false);
    expect(neverChose({ map: {}, declined: [], offerClosed: true })).toBe(false);
  });

  it("leaves the default-on kinds on after the ✕, exactly as for a reader who never chose", () => {
    expect(effectiveKinds({ map: {}, declined: [], offerClosed: true })).toEqual(effectiveKinds({ map: {}, declined: [] }));
  });
});

describe("readFeedPrefs: the offer's ✕", () => {
  const reading = (rows: unknown[]) => ({ select: () => ({ from: () => ({ where: async () => rows }) }) }) as never;

  it("reads closed when the row holds a stamp, and open when it holds none or there is no row", async () => {
    expect((await readFeedPrefs("u", reading([{ feedKinds: {}, declined: [], offerClosedAt: NOW }]))).offerClosed).toBe(true);
    expect((await readFeedPrefs("u", reading([{ feedKinds: {}, declined: [], offerClosedAt: null }]))).offerClosed).toBe(false);
    expect((await readFeedPrefs("u", reading([]))).offerClosed).toBe(false);
  });
});

describe("closeFeedOffer (the offer's ✕)", () => {
  it("upserts the caller's own row, stamping only the column, guarded on the stored row's column (qualified)", () => {
    const { sql, params } = closeFeedOfferQuery("user_1", NOW, db).toSQL();
    expect(sql).toMatch(/^insert into "user_prefs" /);
    expect(sql).toMatch(/ on conflict \("user_id"\) do update set "feed_offer_closed_at" = \$\d+ where "user_prefs"\.feed_offer_closed_at is null$/);
    expect(sql).not.toMatch(/do update set .*"feed_kinds/);
    expect(params).toContain("user_1");
  });

  it("writes for the caller alone, and reports a repeat (the guard matched nothing) as no write", async () => {
    const values: unknown[] = [];
    const q = (rows: unknown[]) => ({
      insert: () => ({ values: (v: unknown) => { values.push(v); return { onConflictDoUpdate: () => ({ returning: async () => rows }) }; } }),
    }) as never;
    expect(await closeFeedOffer("user_1", NOW, q([{ userId: "user_1" }]))).toBe(true);
    expect(await closeFeedOffer("user_1", NOW, q([]))).toBe(false);
    expect(values).toEqual([{ userId: "user_1", feedOfferClosedAt: NOW }, { userId: "user_1", feedOfferClosedAt: NOW }]);
  });
});
