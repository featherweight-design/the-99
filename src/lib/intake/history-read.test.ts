import { describe, expect, it } from "vitest";

import { afterKey, runsPageQuery } from "./history-read";

const key = { at: "2026-10-13T21:40:00.123Z", id: "0000aaaa-0000-4000-8000-000000000001" };

describe("History's page query", () => {
  it("reads only the reader's own rows that carry an ask, qualified by table", () => {
    const q = runsPageQuery("u", null, 20).toSQL();
    expect(q.sql).toContain('"intake_reads"."user_id" = $');
    expect(q.sql).toContain('"intake_reads"."ask" is not null');
    expect(q.params).toContain("u");
  });

  it("lists answered, nothing-found and in-flight runs, and no other outcome", () => {
    const q = runsPageQuery("u", null, 20).toSQL();
    expect(q.sql).toMatch(/"intake_reads"\."status" = \$\d+ or "intake_reads"\."status" = \$\d+ or \("intake_reads"\."status" = \$\d+ and "intake_reads"\."error_class" = \$\d+\)/);
    expect(q.params).toEqual(expect.arrayContaining(["ok", "pending", "failed", "nothing_valid"]));
    expect(q.params).not.toContain("cancelled");
  });

  it("pages newest first on the millisecond and the uuid, one row past the page", () => {
    const q = runsPageQuery("u", key, 20).toSQL();
    expect(q.sql).toMatch(/\(date_trunc\('milliseconds', "intake_reads"\."created_at"\), "intake_reads"\."id"\) < \(\$\d+::timestamp, \$\d+::uuid\)/);
    expect(q.sql).toMatch(/order by date_trunc\('milliseconds', "intake_reads"\."created_at"\) desc, "intake_reads"\."id" desc limit \$\d+/);
    expect(q.params).toContain(key.at);
    expect(q.params).toContain(key.id);
    expect(q.params).toContain(21);
  });

  it("reads the first page with no key at all", () => {
    expect(afterKey(null)).toBeUndefined();
    expect(runsPageQuery("u", null, 20).toSQL().sql).not.toContain("::uuid");
  });
});
