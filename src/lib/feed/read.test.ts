import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { named } from "../person-name/mint";
import { FEED_KINDS } from "./kinds";
import { catalogBranch, feedQuery, feedUnion, loadFeed, markSeenQuery, toFeedItem, toPost, unseenCount, unseenCountQuery, unseenFriendsCount } from "./read";

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
    // Every catalog branch through `kindEnabledAt` too: the stamp, else always for a default-on kind (none of these two).
    const flatQ = q.replace(/\s+/g, " ");
    const gate = (moment: string, alias: string) =>
      `and ${moment} > coalesce((${alias}.feed_kinds ->> $`;
    const tail = (alias: string) => `::text = any(coalesce(${alias}.feed_kinds_declined, '{}'::text[]))) then '-infinity'::timestamptz end)`;
    expect(flatQ).toContain(gate("greatest(sf.first_seen_at at time zone 'UTC', s.released_at::timestamp at time zone 'UTC')", "sup"));
    expect(flatQ).toContain(gate("greatest(pf.first_seen_at at time zone 'UTC', p.release_date::timestamp at time zone 'UTC')", "pup"));
    expect(flatQ).toContain(gate("wa.first_seen_at", "aup"));
    for (const a of ["sup", "pup", "aup"]) expect(flatQ).toContain(tail(a));
    // The stamp-only gate is gone: a reader with no row would read nothing.
    expect(flatQ).not.toMatch(/> \(\w+\.feed_kinds ->> '[a-z-]+'\)::timestamptz/);
    expect(params).toContain("new-set");
    expect(params).toContain("new-precon");
    // Stored kinds go through `kindEnabledAt`: the stamp, else always for a default-on kind not declined (G4).
    expect(flatQ).toMatch(/fi\.created_at > coalesce\(\(fup\.feed_kinds ->> fi\.kind\)::timestamptz, case when fi\.kind = any\(\$\d+::text\[\]\) and not \(fi\.kind = any\(coalesce\(fup\.feed_kinds_declined, '\{\}'::text\[\]\)\)\) then '-infinity'::timestamptz end\)/);
    expect(params).toContainEqual(["spare-request", "secret-lair", "commander-decklists", "wizards-news"]);
  });

  it("left joins the reader's prefs in the stored branch, so a reader with no row still reads a default-on kind", () => {
    expect(q.replace(/\s+/g, " ")).toContain(`from "feed_items" fi left join "user_prefs" fup on fup.user_id = fi.user_id`);
  });

  it("joins only the READER's prefs row in every branch", () => {
    // LEFT joined (a reader with no row reads nulls, and the gate then reads only the default-on kinds).
    expect(q).toMatch(/left join "user_prefs" sup on sup\.user_id = \$\d+/);
    expect(q).toMatch(/left join "user_prefs" pup on pup\.user_id = \$\d+/);
    expect(q).toMatch(/left join "user_prefs" aup on aup\.user_id = \$\d+/);
    expect(q).toMatch(/where fi\.user_id = \$\d+ and fi\.kind = any\(\$\d+::text\[\]\)/);
    // Five catalog branches' prefs joins and dismissals (✕), and the stored branch's reader: all the same reader.
    expect(params.filter((p) => p === "user_1")).toHaveLength(11);
    expect(q).toMatch(/not exists \(select 1 from "feed_dismissals" sfd where sfd\.user_id = \$\d+ and sfd\.key = 'set:' \|\| s\.code\)/);
    expect(q).toMatch(/not exists \(select 1 from "feed_dismissals" pfd where pfd\.user_id = \$\d+ and pfd\.key = 'precon:' \|\| p\.file_name\)/);
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

describe("the Announcements branch", () => {
  const { sql, params } = render(feedUnion("user_1", ["commander-decklists"], NOW));
  const q = flat(sql);

  it("reads one kind's posts, never the baseline, at first_seen_at, keyed post:<contentful id>", () => {
    expect(q).toMatch(/^select wa\.kind as kind, 'post:' \|\| wa\.contentful_id as key, wa\.first_seen_at as created_at,/);
    expect(q).toMatch(/from "wizards_announcements" wa left join "user_prefs" aup on aup\.user_id = \$\d+ where wa\.kind = \$\d+::text and wa\.baseline = false/);
    expect(params).toContain("commander-decklists");
    // The one branch asked for, and no other.
    expect(q).not.toContain(`"sets"`);
    expect(q).not.toContain(`"feed_items"`);
    expect(q.match(/from "wizards_announcements"/g)).toHaveLength(1);
  });

  it("honors the reader's ✕ by the same key", () => {
    expect(q).toMatch(/not exists \(select 1 from "feed_dismissals" afd where afd\.user_id = \$\d+ and afd\.key = 'post:' \|\| wa\.contentful_id\)/);
  });

  it("gates on kindEnabledAt with the kind default on, so a reader who never chose (or has no prefs row) reads a post", () => {
    expect(q).toMatch(/and wa\.first_seen_at > coalesce\(\(aup\.feed_kinds ->> \$\d+::text\)::timestamptz, case when \$\d+::text = any\(\$\d+::text\[\]\)/);
    expect(params).toContainEqual(["spare-request", "secret-lair", "commander-decklists", "wizards-news"]);
  });

  it("carries the row's words in data, the lists' count an aliased, qualified correlated subquery", () => {
    expect(q).toContain(`jsonb_build_object('title', wa.title, 'excerpt', wa.excerpt, 'hero', wa.hero_image_url, 'url', wa.url, 'promised', wa.promised_decks, 'lists', (select count(*) from "wizards_announcement_decklists" wad where wad.announcement_id = wa.id)::int) as data`);
  });

  it("is the branch push reads too, with its own gate", () => {
    const pushed = flat(new PgDialect().sqlToQuery(catalogBranch("secret-lair", "u", NOW, ({ id }) => id)).sql);
    expect(pushed).toMatch(/and wa\.contentful_id$/);
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
    expect(q).toContain("(f.created_at > coalesce(up.feed_seen_at, '-infinity'::timestamptz) and not exists (select 1 from \"feed_items\" ofi");
    expect(q).not.toContain("friends_seen_at");
  });

  it("marks unseen against friends_seen_at for /friends, never Home's cursor", () => {
    const friends = flat(render(feedQuery("user_1", ["trade-match"], NOW, "friends_seen_at")).sql);
    expect(friends).toContain("(f.created_at > coalesce(up.friends_seen_at, '-infinity'::timestamptz) and not exists (select 1 from \"feed_items\" ofi");
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
    expect(q).toMatch(/^insert into "user_prefs" as up \(user_id, feed_seen_at\) select \$1, \$2::timestamptz where exists \( select 1 from \(/);
    expect(q).toMatch(/\) f where f\.created_at > \$\d+::timestamptz and f\.created_at <= \$\d+::timestamptz and f\.created_at > coalesce\(\(select cup\.feed_seen_at from "user_prefs" cup where cup\.user_id = \$\d+\), '-infinity'::timestamptz\)\) on conflict/);
  });

  it("an upsert, so a reader with no prefs row (a default-on kind) is marked too, and never moves the cursor backwards", () => {
    expect(q).toMatch(/on conflict \(user_id\) do update set feed_seen_at = excluded\.feed_seen_at where up\.feed_seen_at is null or up\.feed_seen_at < excluded\.feed_seen_at$/);
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

  it("reads a Wizards post from its data, defensively", () => {
    const item = toFeedItem({
      ...row, kind: "secret-lair", key: "post:abc", created_at: NOW, name: "JAWS",
      data: { title: "JAWS is live", excerpt: "Five cards.", hero: "https://images.ctfassets.net/x.jpg", url: "https://magic.wizards.com/en/news/x", promised: null, lists: 0 },
    });
    expect(item).toMatchObject({ kind: "secret-lair", key: "post:abc", post: { title: "JAWS is live", excerpt: "Five cards.", hero: "https://images.ctfassets.net/x.jpg", url: "https://magic.wizards.com/en/news/x", promised: null, lists: 0 } });
    expect(toPost({}, "Named")).toEqual({ title: "Named", excerpt: null, hero: null, url: "", promised: null, lists: 0 });
    expect(toPost({ title: "", excerpt: "", hero: 3, lists: "5", promised: 5 }, "N")).toEqual({ title: "N", excerpt: null, hero: null, url: "", promised: 5, lists: 0 });
  });

  it("names a friend by public id and display name, never more", () => {
    const item = toFeedItem({ ...row, kind: "trade-match", key: "item:1", created_at: NOW, oracle_id: "o", friend_public_id: "p_1", friend_name: "Colin" });
    expect(item).toMatchObject({ kind: "trade-match", friend: { publicId: "p_1", displayName: named("Colin") }, data: {} });
    expect(JSON.stringify(item)).not.toContain("user_");
  });

  it("reads a spare request's answer marker, and nothing on an incoming ask or another kind", () => {
    const base = { ...row, key: "item:1", created_at: NOW, oracle_id: "o", friend_public_id: "p_1", friend_name: "Colin" };
    expect(toFeedItem({ ...base, kind: "spare-request", data: { answer: "yes" } })).toMatchObject({ answer: "yes" });
    expect(toFeedItem({ ...base, kind: "spare-request", data: { answer: "no" } })).toMatchObject({ answer: "no" });
    expect(toFeedItem({ ...base, kind: "spare-request", data: null })).toMatchObject({ answer: null });
    expect(toFeedItem({ ...base, kind: "spare-request", data: { answer: "maybe" } })).toMatchObject({ answer: null });
    expect(toFeedItem({ ...base, kind: "trade-match", data: { answer: "yes" } })).toMatchObject({ answer: null });
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

describe("the reads", () => {
  const never = { execute: async () => { throw new Error("no statement should run"); } } as never;

  it("runs no statement for the friends count with Friends off, and answers 0", async () => {
    expect(await unseenFriendsCount("u", env(), NOW, never)).toBe(0);
  });

  it("reads New precon (feed and badge), and never writes its stored choice", async () => {
    const ran: SQL[] = [];
    const q = { execute: async (s: SQL) => { ran.push(s); return { rows: [{ n: 0 }] }; } } as never;
    const e = env();
    await loadFeed("u", e, NOW, q);
    await unseenCount("u", e, NOW, q);
    expect(ran).toHaveLength(2);
    for (const s of ran) {
      const text = render(s).sql;
      expect(text.includes(`from "precons" p`)).toBe(true);
      expect(text).not.toMatch(/^\s*(update|insert|delete)/i);
    }
  });

  it("sorts what it reads waiting-on-you first, then newest", async () => {
    const rows = [
      { kind: "new-set", key: "set:a", created_at: "2026-10-21 00:00:00+00", code: "a", name: "A", file_name: null, oracle_id: null, variant_id: null, friend_public_id: null, friend_name: null, data: {}, unseen: false },
      { kind: "combo", key: "item:2", created_at: "2026-10-22 00:00:00+00", code: null, name: null, file_name: null, oracle_id: null, variant_id: "1-2", friend_public_id: null, friend_name: null, data: {}, unseen: true },
    ];
    const q = { execute: async () => ({ rows }) } as never;
    expect((await loadFeed("u", env(), NOW, q)).map((i) => i.key)).toEqual(["item:2", "set:a"]);
  });
});

describe("an answer opened one by one reads seen (small items item 3)", () => {
  it("the row's unseen and the badge's count both leave out an answer whose request was opened since it landed", () => {
    const row = flat(render(feedQuery("user_1", FEED_KINDS, NOW)).sql);
    const count = flat(render(unseenCountQuery("user_1", FEED_KINDS, NOW, "feed_seen_at")).sql);
    for (const q of [row, count]) {
      expect(q).toContain("join \"spare_requests\" osr on osr.id::text = ofi.dedupe_key and osr.asker_user_id = ofi.user_id");
      expect(q).toContain("where 'item:' || ofi.id::text = f.key and ofi.user_id = $");
      expect(q).toContain("ofi.data ->> 'answer' is not null and osr.asker_seen_at is not null and osr.asker_seen_at >= osr.answered_at)");
    }
  });
});
