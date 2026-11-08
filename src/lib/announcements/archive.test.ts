import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

import { archiveCountsQuery, archivePageQuery, loadArchive, loadArchivePage, toArchivePage } from "./archive";
import { ARCHIVE_PAGE, anchorCursor } from "./archive-model";

const render = (q: SQL) => new PgDialect().sqlToQuery(q);
const flat = (s: string) => s.replace(/\s+/g, " ");
const on = { ANNOUNCEMENTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const off = {} as NodeJS.ProcessEnv;

const post = (i: number, o: Record<string, unknown> = {}) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  contentful_id: `c${i}`,
  kind: "wizards-news",
  title: `Post ${i}`,
  excerpt: null,
  hero: null,
  url: `https://magic.wizards.com/en/news/p${i}`,
  promised: null,
  lists: 0,
  published_at: new Date(Date.UTC(2026, 10, 30 - i)),
  published_text: `2026-11-${String(30 - i).padStart(2, "0")} 00:00:00+00`,
  ...o,
});

describe("archivePageQuery", () => {
  const q = flat(render(archivePageQuery("all", null)).sql);

  it("is a library: baseline posts, dismissed posts and switched-off kinds are all in, and no per-reader table is read", () => {
    expect(q).not.toContain("baseline");
    expect(q).not.toContain("feed_dismissals");
    expect(q).not.toContain("user_prefs");
    expect(q).not.toContain("feed_kinds");
    expect(q).toContain('from "wizards_announcements" wa');
  });

  it("is newest first on the keyset's own sort key, asking for one row past the page", () => {
    expect(q).toContain("order by wa.published_at desc, wa.id desc");
    expect(render(archivePageQuery("all", null)).sql).toMatch(new RegExp(`limit \\$\\d+`));
    expect(render(archivePageQuery("all", null)).params).toContain(ARCHIVE_PAGE + 1);
  });

  it("counts a post's lists with an aliased, qualified subquery", () => {
    expect(q).toContain('(select count(*) from "wizards_announcement_decklists" wad where wad.announcement_id = wa.id)::int as lists');
  });

  it("filters by kind and starts after a cursor, both as bound values", () => {
    const { sql, params } = render(archivePageQuery("secret-lair", anchorCursor("2025-03")));
    expect(flat(sql)).toContain("wa.kind = $1::text");
    expect(flat(sql)).toContain("(wa.published_at, wa.id) < ($2::timestamptz, $3::uuid)");
    expect(params.slice(0, 3)).toEqual(["secret-lair", "2025-04-01 00:00:00+00", "00000000-0000-0000-0000-000000000000"]);
  });

  it("keeps to the kinds the app knows under All too, so rows agree with the counts", () => {
    const { sql, params } = render(archivePageQuery("all", null));
    expect(flat(sql)).toContain("wa.kind in ($1::text, $2::text, $3::text)");
    expect(params.slice(0, 3)).toEqual(["secret-lair", "commander-decklists", "wizards-news"]);
  });

  it("drops a cursor that is not one rather than binding it", () => {
    const { sql } = render(archivePageQuery("all", "'; drop table x; --"));
    expect(flat(sql)).not.toContain("<");
  });

  it("is a read only", () => {
    expect(flat(render(archiveCountsQuery()).sql)).toMatch(/^select /);
    expect(q).toMatch(/^select /);
  });
});

describe("archiveCountsQuery", () => {
  it("groups every month by UTC and kind in one statement", () => {
    const q = flat(render(archiveCountsQuery()).sql);
    expect(q).toContain("to_char(wa.published_at at time zone 'UTC', 'YYYY-MM') as ym");
    expect(q).toContain("group by 1, 2");
  });
});

describe("toArchivePage", () => {
  it("draws the first thirty and names the next page by the thirtieth row's own key", () => {
    const rows = Array.from({ length: ARCHIVE_PAGE + 1 }, (_, i) => post(i));
    const page = toArchivePage(rows, new Map());
    expect(page.items).toHaveLength(ARCHIVE_PAGE);
    expect(page.next).toBe(`${rows[ARCHIVE_PAGE - 1].published_text}|${rows[ARCHIVE_PAGE - 1].id}`);
  });

  it("has no next page at or under thirty rows", () => {
    expect(toArchivePage(Array.from({ length: ARCHIVE_PAGE }, (_, i) => post(i)), new Map()).next).toBeNull();
    expect(toArchivePage([], new Map())).toEqual({ items: [], next: null });
  });

  it("builds the Home feed's own row: seen, dated at publication, its press through the out route", () => {
    const [v] = toArchivePage([post(3, { excerpt: "Summary", hero: "h.jpg" })], new Map()).items;
    expect(v.unseen).toBe(false);
    expect(v.at).toBe("2026-11-27T00:00:00.000Z");
    expect(v.key).toBe("post:c3");
    expect(v.outbound).toBe("/out/wizards/c3");
    expect(v.post).toMatchObject({ title: "Post 3", summary: "Summary", hero: "h.jpg" });
  });

  it("keeps a decklists post's N of M lists and its See the lists address", () => {
    const rows = [post(1, { kind: "commander-decklists", promised: 4, lists: 2 })];
    const [v] = toArchivePage(rows, new Map([["c1", "/decks/precons?set=x"]])).items;
    expect(v.post!.lists).toEqual({ n: 2, of: 4 });
    expect(v.href).toBe("/decks/precons?set=x");
    expect(v.outbound).not.toBeNull();
  });

  it("draws a post with no hero as the plate's null hero", () => {
    expect(toArchivePage([post(1)], new Map()).items[0].post!.hero).toBeNull();
  });
});

describe("the loaders", () => {
  const exec = (rows: unknown[]) => ({ execute: vi.fn(async () => ({ rows })) }) as unknown as Parameters<typeof loadArchivePage>[3] & { execute: ReturnType<typeof vi.fn> };

  it("reads nothing while ANNOUNCEMENTS_ENABLED is off for the reader", async () => {
    const q = exec([post(1)]);
    expect(await loadArchivePage(off, "all", null, q)).toBeNull();
    expect(await loadArchive(off, "all", null, q)).toBeNull();
    expect(q.execute).not.toHaveBeenCalled();
  });

  it("writes nothing: every statement it runs is a select", async () => {
    const q = exec([post(1), post(2)]);
    await loadArchivePage(on, "all", null, q);
    for (const [stmt] of q.execute.mock.calls) expect(flat(render(stmt as SQL).sql)).toMatch(/^select /);
    expect(q.execute).toHaveBeenCalledTimes(1);
  });

  it("reads a decklists post's addresses only when the page holds one", async () => {
    const plain = exec([post(1)]);
    await loadArchivePage(on, "all", null, plain);
    expect(plain.execute).toHaveBeenCalledTimes(1);
    const lists = exec([post(1, { kind: "commander-decklists" })]);
    await loadArchivePage(on, "all", null, lists);
    expect(lists.execute).toHaveBeenCalledTimes(2);
  });
});
