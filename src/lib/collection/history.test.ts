import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { listColumns, revertDiffers } from "./history";

const id = { oracleId: "a", setCode: "lea", collectorNumber: "1", finish: "nonfoil" };
const row = (before: number | null, after: number | null) => ({
  ...id,
  before: before === null ? null : { quantity: before, scryfallId: null, condition: null },
  after: after === null ? null : { quantity: after, scryfallId: null, condition: null },
});

describe("revertDiffers", () => {
  it("is false when today's revert is the exact inverse of the entry", () => {
    // The entry added 3; nothing moved since, so the revert takes 3 away.
    expect(revertDiffers([row(1, 4)], [row(4, 1)])).toBe(false);
    expect(revertDiffers([row(2, null)], [row(null, 2)])).toBe(false);
  });

  it("is true when the collection moved and the revert can do less (brief §F)", () => {
    // The entry added 3 copies, 2 were removed since: the revert can take away only 1.
    expect(revertDiffers([row(null, 3)], [row(1, null)])).toBe(true);
  });

  it("is true when the revert has nothing left to do on a row the entry changed", () => {
    expect(revertDiffers([row(null, 3)], [])).toBe(true);
  });
});

describe("the list's copies figure", () => {
  // Rendered, because the figure is SQL over the stored rows. `probe:collection-write` checks
  // every entry's figure against its own rows on a real database; this pins which side is which.
  const text = new PgDialect().sqlToQuery(listColumns).sql.replace(/\s+/g, " ");

  it("counts copies up as after minus before, and down as before minus after, never netted", () => {
    expect(text).toContain(
      "greatest( coalesce((e -> 'after' ->> 'quantity')::int, 0) - coalesce((e -> 'before' ->> 'quantity')::int, 0), 0 )",
    );
    expect(text).toContain(
      "greatest( coalesce((e -> 'before' ->> 'quantity')::int, 0) - coalesce((e -> 'after' ->> 'quantity')::int, 0), 0 )",
    );
  });

  it("sums wide, since a sum of integer moves need not fit an integer", () => {
    expect(text.match(/\)\), 0\)::bigint from jsonb_array_elements\(h\.rows\) e \) as copies_(up|down)/g)).toHaveLength(2);
  });

  it("names an upload entry by its filename, qualified on both sides and scoped to the entry's own user", () => {
    // Both columns of the correlated subquery name their table: bare `id` would resolve against
    // csv_uploads and compare the upload with itself (AGENTS.md).
    expect(text).toContain("select u.filename from csv_uploads u where 'csv_uploads:' || u.id = h.source and u.user_id = h.user_id ) as upload_filename");
    expect(text).toContain("h.rows -> 0 ->> 'name' as first_name");
  });
});
