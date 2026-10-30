import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { catalogItemsByKeyQuery, catalogReadersQuery, enqueueCatalogArrivals, enqueueCatalogQuery } from "./catalog";

const dialect = new PgDialect();
const render = (q: Parameters<PgDialect["sqlToQuery"]>[0]) => dialect.sqlToQuery(q);
const flat = (s: string) => s.replace(/\s+/g, " ").trim();
const NOW = new Date("2026-10-22T16:00:00.000Z");
const DAY_MS = 24 * 60 * 60_000;

describe("queueing one reader's catalog arrivals", () => {
  const set = render(enqueueCatalogQuery("u1", "new-set", NOW, DAY_MS));
  const precon = render(enqueueCatalogQuery("u1", "new-precon", NOW, DAY_MS));

  it("inserts the feed's own key and moment, with the day's batch, and nothing on a repeat", () => {
    const q = flat(set.sql);
    expect(q).toMatch(/^insert into "push_outbox" \(user_id, kind, item_key, batch_key, payload, created_at\) select \$1, f\.kind, f\.key, \$2, '\{\}'::jsonb, f\.created_at from \(/);
    expect(set.params.slice(0, 2)).toEqual(["u1", "new-set:2026-10-22"]);
    expect(q).toMatch(/on conflict \(user_id, kind, item_key\) do nothing returning id$/);
  });

  it("reads the feed's arrival rules: never a baseline stamp, released, a release type", () => {
    const q = flat(set.sql);
    expect(q).toContain(`from "sets" s join "catalog_first_seen" sf on sf.kind = 'set' and sf.key = s.code left join "user_prefs" sup on sup.user_id = $`);
    expect(q).toContain("where sf.baseline = false and s.digital = false");
    expect(flat(precon.sql)).toContain(`from "precons" p join "catalog_first_seen" pf on pf.kind = 'precon' and pf.key = p.file_name left join "user_prefs" pup on pup.user_id = $`);
    expect(flat(precon.sql)).toContain("where pf.baseline = false and p.twin_of is null");
  });

  it("judges the item's moment against the PUSH stamp, never the feed's, inside the stale window and not after now", () => {
    const q = flat(set.sql);
    const moment = "greatest(sf.first_seen_at at time zone 'UTC', s.released_at::timestamp at time zone 'UTC')";
    expect(q).toContain(`${moment} > coalesce((sup.push_kinds ->> $`);
    expect(q).not.toContain("feed_kinds");
    expect(q).toMatch(new RegExp(`${moment.replace(/[().:']/g, "\\$&")} > \\$\\d+::timestamptz and ${moment.replace(/[().:']/g, "\\$&")} <= \\$\\d+::timestamptz`));
    expect(set.params).toContain("2026-10-21T16:00:00.000Z");
    expect(set.params).toContain(NOW.toISOString());
    expect(flat(precon.sql)).toContain("greatest(pf.first_seen_at at time zone 'UTC', p.release_date::timestamp at time zone 'UTC') > coalesce((pup.push_kinds ->> $");
  });

  it("only while the reader still has a device, by an aliased subquery", () => {
    expect(flat(set.sql)).toMatch(/where exists \(select 1 from "push_subscriptions" qps where qps\.user_id = \$\d+\)/);
  });
});

describe("the readers the cron looks at", () => {
  const gate = (n: number) =>
    `coalesce((cup.push_kinds ->> $${n}::text)::timestamptz, case when $${n + 1}::text = any($${n + 2}::text[]) ` +
    `and not ($${n + 3}::text = any(coalesce(cup.push_kinds_declined, '{}'::text[]))) then '-infinity'::timestamptz end) is not null`;

  it("have a device and a catalog kind's push on, the prefs row LEFT joined", () => {
    const r = render(catalogReadersQuery());
    expect(flat(r.sql)).toBe(
      `select distinct cps.user_id as user_id from "push_subscriptions" cps left join "user_prefs" cup on cup.user_id = cps.user_id where ${gate(1)} or ${gate(5)}`,
    );
    expect(r.params).toEqual(["new-set", "new-set", ["spare-request", "secret-lair", "commander-decklists", "wizards-news"], "new-set", "new-precon", "new-precon", ["spare-request", "secret-lair", "commander-decklists", "wizards-news"], "new-precon"]);
  });

  it("for a default-on kind, passes the kind as default on to the gate", () => {
    const r = render(catalogReadersQuery(["new-set"], ["new-set"]));
    expect(flat(r.sql)).toContain(`left join "user_prefs" cup on cup.user_id = cps.user_id where ${gate(1)}`);
    expect(r.params).toEqual(["new-set", "new-set", ["new-set"], "new-set"]);
  });
});

describe("resolving catalog keys", () => {
  it("reads each kind's branch by the ids its keys name, with no stamp", () => {
    const r = render(catalogItemsByKeyQuery("u1", [
      { kind: "new-set", key: "set:dsk" }, { kind: "new-precon", key: "precon:A B" }, { kind: "new-precon", key: "precon:C" },
    ], NOW)!);
    const q = flat(r.sql);
    expect(q).toContain("and s.code = any($");
    expect(q).toContain("and p.file_name = any($");
    expect(r.params).toContainEqual(["dsk"]);
    expect(r.params).toContainEqual(["A B", "C"]);
    expect(q).not.toContain("feed_kinds");
    expect(q).not.toContain("push_kinds");
    expect(q).toContain("false as unseen");
  });

  it("is null with nothing to read, a key that names nothing included", () => {
    expect(catalogItemsByKeyQuery("u1", [], NOW)).toBeNull();
    expect(catalogItemsByKeyQuery("u1", [{ kind: "new-set", key: "precon:x" }, { kind: "new-precon", key: "item:1" }], NOW)).toBeNull();
  });

  it("reads only the kinds asked for", () => {
    const q = flat(render(catalogItemsByKeyQuery("u1", [{ kind: "new-set", key: "set:dsk" }], NOW)!).sql);
    expect(q).not.toContain(`"precons"`);
  });
});

describe("the cron's catalog pass", () => {
  const fakeQ = (readers: string[], failFor: string | null = null) => {
    const statements: string[] = [];
    return {
      statements,
      q: {
        execute: async (s: Parameters<PgDialect["sqlToQuery"]>[0]) => {
          const r = render(s);
          statements.push(r.sql);
          if (r.sql.includes("select distinct cps.user_id")) return { rows: readers.map((user_id) => ({ user_id })) };
          if (failFor && r.params[0] === failFor) throw new Error("boom");
          return { rows: [{ id: "row" }] };
        },
      } as never,
    };
  };
  const on = { PUSH_ENABLED: "true", HOME_FEED_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;

  it("queues each reader's kinds their switches allow, and none for a reader with push off", async () => {
    const { q, statements } = fakeQ(["a", "b"]);
    const out = await enqueueCatalogArrivals({ now: NOW, staleMs: DAY_MS, q, resolveEnv: async (u) => (u === "b" ? { ...on, PUSH_ENABLED: "false" } : on) });
    expect(out).toEqual({ queued: 2, failed: 0 });
    expect(statements.filter((s) => s.startsWith("insert"))).toHaveLength(2);
  });

  it("one reader failing never stops the others", async () => {
    const { q } = fakeQ(["a", "b"], "a");
    const out = await enqueueCatalogArrivals({ now: NOW, staleMs: DAY_MS, q, resolveEnv: async () => on });
    expect(out).toEqual({ queued: 2, failed: 1 });
  });
});
