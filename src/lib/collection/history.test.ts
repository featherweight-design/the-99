import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { cartDecksOf, listColumns, revertDiffers } from "./history";

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
    expect(text).toContain("select u.filename from csv_uploads u where u.user_id = h.user_id");
    // The id is compared bare, so the primary key can serve it; a concatenation on u.id could not.
    expect(text).toContain("and u.id = case when h.source ~ '^csv_uploads:");
    expect(text).toContain("then substr(h.source, 13)::uuid end ) as upload_filename");
    expect(text).not.toContain("'csv_uploads:' || u.id");
    expect(text).toContain("h.rows -> 0 ->> 'name' as first_name");
  });

  it("resolves a Shopping source to the deck's name now, qualified and scoped to the entry's own user", () => {
    expect(text).toContain("select d.name from decks d where d.user_id = h.user_id");
    expect(text).toContain("and d.id = case when h.source ~ '^shopping:[0-9a-f]{8}-");
    expect(text).toContain("then substr(h.source, 10)::uuid end ) as shopping_deck_name");
    // The id is read off the source alone, so a deleted deck still yields its id with a null name.
    expect(text).toContain("then substr(h.source, 10) end as shopping_deck_id");
  });
});

describe("cartDecksOf", () => {
  const living = new Map([["a", "Gishath"], ["b", "Omnath"], ["c", "Atraxa"], ["d", "Kinnan"], ["e", "Zur"]]);
  it("names the first three living decks in the source's order, counts the rest, and counts the deleted apart", () => {
    expect(cartDecksOf(["a", "x", "b", "c", "d", "e", "y"], living)).toEqual({
      named: [{ id: "a", name: "Gishath" }, { id: "b", name: "Omnath" }, { id: "c", name: "Atraxa" }],
      more: 2,
      gone: 2,
    });
  });
  it("is empty of names when every deck is gone", () => {
    expect(cartDecksOf(["x", "y"], living)).toEqual({ named: [], more: 0, gone: 2 });
  });
});
