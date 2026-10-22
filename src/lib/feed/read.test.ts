import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { FEED_KINDS } from "./kinds";
import { feedQuery, feedUnion, loadFeed, markSeenQuery, toFeedItem, unseenCount, unseenCountQuery, unseenFriendsCount } from "./read";

/** A resolved env for a test. */
const env = (e: Record<string, string> = {}): NodeJS.ProcessEnv => e as unknown as NodeJS.ProcessEnv;

const NOW = new Date("2026-10-22T12:00:00Z");
const render = (q: SQL | null) => new PgDialect().sqlToQuery(q!);
const flat = (s: string) => s.replace(/\s+/g, " ");

describe("feedUnion", () => {
  const { sql, params } = render(feedUnion("user_1", FEED_KINDS, NOW));
  const q = flat(sql);

  it("reads new sets from their first-seen stamp, never a baseline row, of a release type, out by today", () => {
    expect(q).toContain(`from "sets" s join "catalog_first_seen" sf on sf.kind = 'set' and sf.key = s.code`);
    expect(q).toContain("where sf.baseline = false and s.digital = false and s.set_type = any(");
    expect(params).toContainEqual(["expansion", "commander"]);
    expect(q).toMatch(/s\.released_at <= \$\d+::date/);
    expect(params).toContain("2026-10-22");
  });

  it("dates a set at the later of its stamp and its release day, both read as UTC", () => {
    expect(q).toContain("greatest(sf.first_seen_at at time zone 'UTC', s.released_at::timestamp at time zone 'UTC') as created_at");
  });

  it("reads released precons by file name, never a baseline row or a twin", () => {
    expect(q).toContain(`from "precons" p join "catalog_first_seen" pf on pf.kind = 'precon' and pf.key = p.file_name`);
    expect(q).toMatch(/where pf\.baseline = false and p\.twin_of is null and p\.release_date <= \$\d+::date/);
  });

  it("shows each kind only what arrived after ITS OWN enabledAt (absent when off, so nothing)", () => {
    // Against the item's own moment (the later of the stamp and the release), so a set first seen before the
    // reader opted in but released after still arrives, and one released before still does not.
    const flatQ = q.replace(/\s+/g, " ");
    expect(flatQ).toContain(`and greatest(sf.first_seen_at at time zone 'UTC', s.released_at::timestamp at time zone 'UTC') > (sup.feed_kinds ->> 'new-set')::timestamptz`);
    expect(flatQ).toContain(`and greatest(pf.first_seen_at at time zone 'UTC', p.release_date::timestamp at time zone 'UTC') > (pup.feed_kinds ->> 'new-precon')::timestamptz`);
    expect(q).toContain("fi.created_at > (fup.feed_kinds ->> fi.kind)::timestamptz");
  });

  it("joins only the READER's prefs row in every branch", () => {
    expect(q).toMatch(/join "user_prefs" sup on sup\.user_id = \$\d+/);
    expect(q).toMatch(/join "user_prefs" pup on pup\.user_id = \$\d+/);
    expect(q).toMatch(/where fi\.user_id = \$\d+ and fi\.kind = any\(\$\d+::text\[\]\)/);
    expect(params.filter((p) => p === "user_1")).toHaveLength(3);
  });

  it("reads only the stored kinds asked for, and only the branches asked for", () => {
    expect(params).toContainEqual(["price-drop", "trade-match", "spare-request", "combo"]);
    const sets = flat(render(feedUnion("u", ["new-set"], NOW)).sql);
    expect(sets).not.toContain("precons");
    expect(sets).not.toContain("feed_items");
    expect(feedUnion("u", [], NOW)).toBeNull();
  });

  it("writes every column out by its alias: no bare column name follows a select or a where", () => {
    // AGENTS.md, a correlated subquery must alias and qualify: every column reference in the union is `alias.column`.
    const bare = q.match(/(?:select|where|and|on|by|,)\s+(?!null|'|count|exists|lower|greatest|coalesce|1\b|\()("?[a-z_]+"?)(?=\s*(?:=|>|<|,|as\b))/g) ?? [];
    expect(bare).toEqual([]);
  });
});

describe("feedQuery", () => {
  const { sql, params } = render(feedQuery("user_1", FEED_KINDS, NOW));
  const q = flat(sql);

  it("keeps fourteen days, never after now, newest first", () => {
    expect(q).toMatch(/where f\.created_at > \$\d+::timestamptz and f\.created_at <= \$\d+::timestamptz order by f\.created_at desc, f\.key$/);
    expect(params).toContain("2026-10-08T12:00:00.000Z");
    expect(params).toContain(NOW.toISOString());
  });

  it("marks unseen against feed_seen_at, null being never seen", () => {
    expect(q).toContain("f.created_at > coalesce(up.feed_seen_at, '-infinity'::timestamptz) as unseen");
    expect(q).not.toContain("friends_seen_at");
  });

  it("marks unseen against friends_seen_at for /friends, never Home's cursor", () => {
    const friends = flat(render(feedQuery("user_1", ["trade-match"], NOW, "friends_seen_at")).sql);
    expect(friends).toContain("f.created_at > coalesce(up.friends_seen_at, '-infinity'::timestamptz) as unseen");
    expect(friends).not.toContain("feed_seen_at");
  });
});

describe("the two badges' counts", () => {
  it("Home counts every kind against feed_seen_at, so a /friends visit never clears it", () => {
    const q = flat(render(unseenCountQuery("u", FEED_KINDS, NOW, "feed_seen_at")).sql);
    expect(q).toMatch(/^select count\(\*\)::int as n from \(/);
    expect(q).toContain("f.created_at > coalesce(up.feed_seen_at, '-infinity'::timestamptz)");
    expect(q).not.toContain("friends_seen_at");
  });

  it("Friends counts against friends_seen_at, so a Home visit never clears it", () => {
    const q = flat(render(unseenCountQuery("u", ["trade-match"], NOW, "friends_seen_at")).sql);
    expect(q).toContain("f.created_at > coalesce(up.friends_seen_at, '-infinity'::timestamptz)");
    expect(q).not.toContain("feed_seen_at");
  });
});

describe("markSeenQuery", () => {
  const { sql } = render(markSeenQuery("u", FEED_KINDS, NOW, "feed_seen_at"));
  const q = flat(sql);

  it("writes ONLY while an unseen item exists in the window (the stamp trigger moves on any UPDATE)", () => {
    expect(q).toMatch(/and exists \( select 1 from \(.*\) f where f\.created_at > \$\d+::timestamptz and f\.created_at <= \$\d+::timestamptz and f\.created_at > coalesce\(up\.feed_seen_at, '-infinity'::timestamptz\)\)$/);
  });

  it("never moves the cursor backwards", () => {
    expect(q).toMatch(/where up\.user_id = \$\d+ and \(up\.feed_seen_at is null or up\.feed_seen_at < \$\d+::timestamptz\)/);
  });

  it("writes nothing at all with no kind to read", () => {
    expect(markSeenQuery("u", [], NOW, "feed_seen_at")).toBeNull();
  });
});

describe("toFeedItem", () => {
  const row = { code: null, name: null, file_name: null, oracle_id: null, variant_id: null, friend_public_id: null, friend_name: null, data: null, unseen: true };

  it("links a set to its page and a precon to its own", () => {
    expect(toFeedItem({ ...row, kind: "new-set", key: "set:soc", created_at: "2026-10-20 00:00:00+00", code: "soc", name: "Secrets" })).toMatchObject({
      kind: "new-set", href: "/collection/sets/soc", createdAt: new Date("2026-10-20T00:00:00Z"),
    });
    expect(toFeedItem({ ...row, kind: "new-precon", key: "precon:A B", created_at: NOW, code: "soc", name: "Ashling", file_name: "A B" })).toMatchObject({
      href: "/decks/precons/A%20B", setCode: "soc",
    });
  });

  it("names a friend by public id and display name, never more", () => {
    const item = toFeedItem({ ...row, kind: "trade-match", key: "item:1", created_at: NOW, oracle_id: "o", friend_public_id: "p_1", friend_name: "Colin" });
    expect(item).toMatchObject({ kind: "trade-match", friend: { publicId: "p_1", displayName: "Colin" }, data: {} });
    expect(JSON.stringify(item)).not.toContain("user_");
  });
});

describe("a trade match a friend kept back", () => {
  const KEPT = `and not exists ( select 1 from "spare_keep" sk where sk.user_id = fi.friend_user_id and sk.oracle_id = fi.oracle_id)`;

  it("is left out of the feed, both badge counts and both mark-seen checks alike", () => {
    const statements = [
      feedQuery("u", FEED_KINDS, NOW),
      unseenCountQuery("u", FEED_KINDS, NOW, "feed_seen_at"),
      unseenCountQuery("u", ["trade-match"], NOW, "friends_seen_at"),
      markSeenQuery("u", FEED_KINDS, NOW, "feed_seen_at"),
      markSeenQuery("u", ["trade-match"], NOW, "friends_seen_at"),
    ];
    for (const s of statements) expect(flat(render(s).sql)).toContain(KEPT);
  });
});

describe("the reads with the feed off", () => {
  const never = { execute: async () => { throw new Error("no statement should run"); } } as never;

  it("runs no statement and answers empty", async () => {
    expect(await loadFeed("u", env(), NOW, never)).toEqual([]);
    expect(await unseenCount("u", env(), NOW, never)).toBe(0);
    expect(await unseenFriendsCount("u", env({ HOME_FEED_ENABLED: "true" }), NOW, never)).toBe(0);
  });

  it("reads New precon (feed and badge) only with Precons on; its stored choice is not touched either way", async () => {
    for (const [precons, expected] of [[false, false], [true, true]] as const) {
      const ran: SQL[] = [];
      const q = { execute: async (s: SQL) => { ran.push(s); return { rows: [{ n: 0 }] }; } } as never;
      const e = env(precons ? { HOME_FEED_ENABLED: "true", PRECONS_ENABLED: "true" } : { HOME_FEED_ENABLED: "true" });
      await loadFeed("u", e, NOW, q);
      await unseenCount("u", e, NOW, q);
      expect(ran).toHaveLength(2);
      for (const s of ran) {
        const text = render(s).sql;
        expect(text.includes(`from "precons" p`)).toBe(expected);
        expect(text).not.toMatch(/^\s*(update|insert|delete)/i);
      }
    }
  });

  it("sorts what it reads waiting-on-you first, then newest", async () => {
    const rows = [
      { kind: "new-set", key: "set:a", created_at: "2026-10-21 00:00:00+00", code: "a", name: "A", file_name: null, oracle_id: null, variant_id: null, friend_public_id: null, friend_name: null, data: {}, unseen: false },
      { kind: "combo", key: "item:2", created_at: "2026-10-22 00:00:00+00", code: null, name: null, file_name: null, oracle_id: null, variant_id: "1-2", friend_public_id: null, friend_name: null, data: {}, unseen: true },
    ];
    const q = { execute: async () => ({ rows }) } as never;
    expect((await loadFeed("u", env({ HOME_FEED_ENABLED: "true" }), NOW, q)).map((i) => i.key)).toEqual(["item:2", "set:a"]);
  });
});
