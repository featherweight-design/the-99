import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

vi.mock("../../db", () => ({ db: {} }));

import { anchorQuery, earlierQuery, hasFullKeys, readSyncBase } from "./sync-base";

const dialect = new PgDialect();
const render = (q: SQL) => {
  const out = dialect.sqlToQuery(q);
  return { sql: out.sql.replace(/\s+/g, " "), params: out.params };
};

describe("the anchor query", () => {
  const q = render(anchorQuery("user_1"));

  it("is owner-scoped: the upload by the reader's id, and the entry on the upload's own user", () => {
    expect(q.sql).toContain("where u.user_id = $2");
    expect(q.sql).toContain("on h.user_id = u.user_id and h.source = 'csv_uploads:' || u.id::text");
    expect(q.sql).toContain("select 1 from csv_uploads c where c.user_id = $1 and c.confirmed_at is not null");
    expect(q.params).toEqual(["user_1", "user_1"]);
  });

  it("anchors on a confirmed upload with no entry, an unreverted Replace, or an unreverted Sync under Everything", () => {
    expect(q.sql).toContain("u.confirmed_at is not null");
    expect(q.sql).toContain("h.id is null or ( h.reverted_by is null and ( h.kind = 'upload_replace' or (h.kind = 'upload_sync' and u.preview_payload -> 'syncSummary' ->> 'pick' = 'everything') ) )");
  });

  it("never anchors on an Add: no clause admits upload_add", () => {
    expect(q.sql).not.toContain("upload_add");
  });

  it("takes the newest, with a tie broken by id", () => {
    expect(q.sql).toContain("order by u.confirmed_at desc, u.id desc limit 1");
  });

  it("aliases every table, so no bare column can resolve against the wrong one (AGENTS.md)", () => {
    expect(q.sql).not.toMatch(/"csv_uploads"|"collection_history"/);
    expect(q.sql).not.toMatch(/[^.\w]confirmed_at is not null/);
  });
});

describe("the anchor query, excluding the upload being synced", () => {
  const q = render(anchorQuery("user_1", "this-upload"));

  it("leaves it out of both the uploaded check and the anchor, so a first upload reads neverUploaded", () => {
    expect(q.sql).toContain("select 1 from csv_uploads c where c.user_id = $1 and c.confirmed_at is not null and c.id <> $2::uuid");
    expect(q.sql).toContain("where u.user_id = $3 and u.confirmed_at is not null and u.id <> $4::uuid and (");
    expect(q.params).toEqual(["user_1", "this-upload", "user_1", "this-upload"]);
  });

  it("excludes nothing when no upload is named", () => {
    expect(render(anchorQuery("user_1")).sql).not.toContain("<>");
  });
});

describe("the earlier query", () => {
  const q = render(earlierQuery("user_1", "anchor-id"));

  it("is owner-scoped, its anchor read included", () => {
    expect(q.sql).toContain("where u.user_id = $1");
    expect(q.sql).toContain("select an.confirmed_at from csv_uploads an where an.id = $3 and an.user_id = $4");
    expect(q.params.slice(0, 4)).toEqual(["user_1", "anchor-id", "anchor-id", "user_1"]);
  });

  it("reads the confirmed uploads before the anchor, leaving out Adds, newest first and capped", () => {
    expect(q.sql).toContain("and u.id <> $2");
    expect(q.sql).toContain("and (h.kind is null or h.kind <> 'upload_add')");
    expect(q.sql).toContain("order by u.confirmed_at desc, u.id desc limit $5");
    expect(q.params[4]).toBe(5);
  });
});

const full = (n: number, quantity = 1) => ({
  oracleId: `o${n}`, setCode: "lea", collectorNumber: "1", finish: "nonfoil" as const, condition: null, quantity,
});

function runner(...results: unknown[][]) {
  const calls: SQL[] = [];
  return {
    calls,
    q: { execute: async (s: SQL) => { calls.push(s); return { rows: results.shift() ?? [] }; } } as never,
  };
}

describe("readSyncBase", () => {
  it("is neverUploaded with no confirmed upload", async () => {
    const { q, calls } = runner([{ uploaded: false, id: null, confirmed_at: null, items: null }]);
    expect(await readSyncBase("u", q)).toEqual({ unavailable: "neverUploaded" });
    expect(calls).toHaveLength(1);
  });

  it("passes the excluded upload to the anchor query", async () => {
    const { q, calls } = runner([{ uploaded: false, id: null, confirmed_at: null, items: null }]);
    expect(await readSyncBase("u", q, { excludeUploadId: "this-upload" })).toEqual({ unavailable: "neverUploaded" });
    expect(dialect.sqlToQuery(calls[0]).params).toContain("this-upload");
  });

  it("is noRecord when every confirmed upload is skipped (an Add, a reverted one, a partial Sync)", async () => {
    const { q } = runner([{ uploaded: true, id: null, confirmed_at: null, items: null }]);
    expect(await readSyncBase("u", q)).toEqual({ unavailable: "noRecord" });
  });

  it("is noRecord when the anchor's file was stored before 0008 (no collector number or finish)", async () => {
    const { q } = runner([{ uploaded: true, id: "a", confirmed_at: new Date(0), items: [{ oracleId: "o1", setCode: "lea", condition: null, quantity: 1 }] }]);
    expect(await readSyncBase("u", q)).toEqual({ unavailable: "noRecord" });
  });

  it("returns the anchor's quantities and the earlier files, leaving out a pre-0008 one", async () => {
    const { q } = runner(
      [{ uploaded: true, id: "a", confirmed_at: "2026-10-01T00:00:00Z", items: [full(1, 2), full(1, 1), full(2)] }],
      [
        { id: "e1", confirmed_at: "2026-09-01T00:00:00Z", items: [full(1)] },
        { id: "e0", confirmed_at: "2026-08-01T00:00:00Z", items: [{ oracleId: "o1", setCode: "lea", condition: null, quantity: 1 }] },
      ],
    );
    const base = await readSyncBase("u", q);
    if (!("anchor" in base)) throw new Error("expected an anchor");
    expect(base.anchor.uploadId).toBe("a");
    expect(base.anchor.confirmedAt.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect([...base.anchor.items]).toEqual([["o1|lea|1|nonfoil", 3], ["o2|lea|1|nonfoil", 1]]);
    expect(base.earlier.map((e) => e.uploadId)).toEqual(["e1"]);
  });

  it("hasFullKeys accepts an empty collector number (a bare Name,Qty export) and refuses a missing one", () => {
    expect(hasFullKeys([{ ...full(1), collectorNumber: "" }])).toBe(true);
    expect(hasFullKeys([{ oracleId: "o", setCode: "s", finish: "foil", condition: null, quantity: 1 }])).toBe(false);
  });
});
