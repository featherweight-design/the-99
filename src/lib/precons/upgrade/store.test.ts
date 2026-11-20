import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const dialect = new PgDialect();
const render = (q: unknown) => dialect.sqlToQuery(q as SQL);

const db = vi.hoisted(() => ({
  selectRows: [] as unknown[],
  updateRows: [] as unknown[],
  selectWhere: [] as unknown[],
  updates: [] as { set: Record<string, unknown>; where: unknown }[],
}));
vi.mock("../../../db", () => ({
  db: {
    select: () => {
      const b: Record<string, unknown> = {};
      b.from = () => b;
      b.where = (w: unknown) => { db.selectWhere.push(w); return b; };
      b.then = (res: (v: unknown) => unknown) => Promise.resolve(db.selectRows).then(res);
      return b;
    },
    update: () => {
      const u = { set: {} as Record<string, unknown>, where: null as unknown };
      const b: Record<string, unknown> = {};
      b.set = (s: Record<string, unknown>) => { u.set = s; return b; };
      b.where = (w: unknown) => { u.where = w; db.updates.push(u); return b; };
      b.returning = () => Promise.resolve(db.updateRows);
      return b;
    },
  },
}));
vi.mock("../../model/allowance", () => ({ AllowanceSpentError: class extends Error {}, reserveModelCall: vi.fn(), settleModelCall: vi.fn() }));
vi.mock("../../tuning/run-store", () => ({ recordLate: vi.fn(), RunSupersededError: class extends Error {} }));

const { markSeen, setPick } = await import("./store");

const RUN = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  db.selectRows = []; db.updateRows = []; db.selectWhere.length = 0; db.updates.length = 0;
});

describe("markSeen (fresh start 1/4)", () => {
  it("writes seen_at only on the reader's own finished run while it is still null", async () => {
    db.updateRows = [{ id: RUN }];
    expect(await markSeen("u1", RUN, new Date("2026-11-20T00:00:00Z"))).toBe(true);
    const [u] = db.updates;
    expect(u.set).toEqual({ seenAt: new Date("2026-11-20T00:00:00Z") });
    const where = render(u.where);
    expect(where.sql).toContain('"precon_upgrades"."seen_at" is null');
    expect(where.sql).toContain('"precon_upgrades"."user_id" = $');
    expect(where.sql).toContain('"precon_upgrades"."status" <> $');
    expect(where.params).toEqual(expect.arrayContaining([RUN, "u1", "pending"]));
  });

  it("is false when nothing was written (already seen, pending, or another reader's run)", async () => {
    db.updateRows = [];
    expect(await markSeen("u1", RUN)).toBe(false);
  });
});

describe("setPick (fresh start 1/4)", () => {
  it("requires the run's pairs to name the line in the same UPDATE: an add by addId", async () => {
    db.updateRows = [{ unpicked: ["a-add-1"] }];
    expect(await setPick("u1", RUN, "a-add-1", false)).toEqual({ ok: true, unpicked: ["a-add-1"] });
    expect(db.selectWhere).toHaveLength(0);
    const where = render(db.updates[0].where);
    expect(where.sql).toContain('"precon_upgrades"."pairs" @> jsonb_build_array(jsonb_build_object($');
    expect(where.params).toEqual(expect.arrayContaining([RUN, "u1", "done", "addId", "add-1"]));
  });

  it("names a cut by cutId", async () => {
    db.updateRows = [{ unpicked: [] }];
    await setPick("u1", RUN, "c-cut-2", true);
    expect(render(db.updates[0].where).params).toEqual(expect.arrayContaining(["cutId", "cut-2"]));
  });

  it("is notFound when no row updated: a line the run does not name, another reader's run, or one not done", async () => {
    db.updateRows = [];
    expect(await setPick("u2", RUN, "a-elsewhere", false)).toEqual({ ok: false, reason: "notFound" });
  });

  it("refuses an id that is neither an add nor a cut without a query", async () => {
    expect(await setPick("u1", RUN, "x-add-1", false)).toEqual({ ok: false, reason: "notFound" });
    expect(db.updates).toHaveLength(0);
  });

  it("unpicks with an atomic add that never repeats the id", async () => {
    db.updateRows = [{ unpicked: ["c-cut-2"] }];
    expect(await setPick("u1", RUN, "c-cut-2", false)).toEqual({ ok: true, unpicked: ["c-cut-2"] });
    const set = render(db.updates[0].set.unpicked);
    expect(set.sql).toContain("@> jsonb_build_array(");
    expect(set.sql).toContain("|| jsonb_build_array(");
    expect(set.params).toContain("c-cut-2");
  });

  it("picks with an atomic remove", async () => {
    db.updateRows = [{ unpicked: [] }];
    expect(await setPick("u1", RUN, "a-add-1", true)).toEqual({ ok: true, unpicked: [] });
    const set = render(db.updates[0].set.unpicked);
    expect(set.sql).toMatch(/"unpicked" - \$\d+::text/);
    expect(set.params).toEqual(["a-add-1"]);
  });
});
