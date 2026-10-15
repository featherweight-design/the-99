import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { handEntriesSince, listColumns, netHandChanges, revertDiffers, standingBuiltEntries, syncSummaryColumn } from "./history";
import type { HistoryRow, HistoryRowState } from "../../db/schema";
import { cartDecksOf } from "./deck-line";

const id = { oracleId: "a", setCode: "lea", collectorNumber: "1", finish: "nonfoil" };
const row = (before: number | null, after: number | null) => ({
  ...id,
  before: before === null ? null : { quantity: before, scryfallId: null, condition: null },
  after: after === null ? null : { quantity: after, scryfallId: null, condition: null },
});

// S14: a precon add reverted and then restored stands again, so a first Replace names its box, not "by hand".
describe("standingBuiltEntries", () => {
  const add = (id: string, revertedBy: string | null) => ({ id, revertedBy, source: `precon:${id}`, rows: [] });
  it("keeps an add nothing reverted, drops one a revert took back, and keeps one whose revert was itself reverted", () => {
    const entries = [add("a", null), add("b", "r1"), add("c", "r2")];
    const out = standingBuiltEntries(entries, [{ id: "r2", revertedBy: "r3" }]);
    expect(out.map((e) => e.source)).toEqual(["precon:a", "precon:c"]);
  });

  it("drops an add whose chain ends reverted again", () => {
    const out = standingBuiltEntries([add("c", "r2")], [{ id: "r2", revertedBy: "r3" }, { id: "r3", revertedBy: "r4" }]);
    expect(out).toEqual([]);
  });
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

describe("the overwrite anchor (collection sync, G7)", () => {
  const text = new PgDialect().sqlToQuery(handEntriesSince("user_1")).sql.replace(/\s+/g, " ");

  it("anchors on the newest confirmed upload whatever its kind, so a Sync moves it", () => {
    expect(text).toContain("select u.id, u.confirmed_at from csv_uploads u where u.user_id = $1 and u.confirmed_at is not null order by u.confirmed_at desc limit 1");
    expect(text).not.toMatch(/upload_(replace|add|sync)/);
  });

  it("counts hand entries only: no upload of any kind is an edit", () => {
    expect(text).toContain("e.kind in ('add', 'edit', 'revert')");
  });
});

describe("an opened Sync's summary (G9)", () => {
  const text = new PgDialect().sqlToQuery(syncSummaryColumn).sql.replace(/\s+/g, " ");

  it("reads its own upload's syncSummary, for a Sync alone, scoped to the entry's user", () => {
    expect(text).toContain("case when h.kind = 'upload_sync' then ( select u.preview_payload -> 'syncSummary' from csv_uploads u");
    expect(text).toContain("where u.user_id = h.user_id");
    expect(text).toContain("then substr(h.source, 13)::uuid end ) end as sync_summary");
  });
});

// The Replace warning counts holdings the hand changes left different from the upload, not entries.
describe("netHandChanges", () => {
  const st = (quantity: number, scryfallId: string | null = "s1", condition: string | null = null): HistoryRowState => ({ quantity, scryfallId, condition });
  const row = (card: string, before: HistoryRowState | null, after: HistoryRowState | null, finish = "nonfoil"): HistoryRow =>
    ({ oracleId: card, setCode: "set", collectorNumber: "1", finish, name: card, before, after });
  const entry = (seq: number, ...rows: HistoryRow[]) => ({ seq, rows });

  it("counts an add and its revert as nothing (two precon adds and their two reverts)", () => {
    const net = netHandChanges([
      entry(1, row("a", null, st(70))), entry(2, row("a", st(70), null)),
      entry(3, row("b", null, st(70))), entry(4, row("b", st(70), null)),
    ]);
    expect(net.count).toBe(0);
    expect(net.keys.size).toBe(0);
  });

  // A production ledger, 2026-10-15: since the upload, an add of 1 and its revert, hand adds of 16 and 24, then a
  // 97-card precon added, reverted, added, reverted and added again. Nine entries; 137 holdings differ. A build that
  // counted entries quoted "9 changes" here.
  it("counts holdings, not entries, over an add/revert/add/revert/add precon chain", () => {
    const cards = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);
    const adds = (seq: number, ids: string[]) => entry(seq, ...ids.map((c) => row(c, null, st(1))));
    const reverts = (seq: number, ids: string[]) => entry(seq, ...ids.map((c) => row(c, st(1), null)));
    const precon = cards("p", 97);
    const ledger = [
      adds(1, ["x"]), reverts(3, ["x"]),
      adds(11, cards("h", 16)), adds(13, cards("k", 24)),
      adds(14, precon), reverts(18, precon), adds(19, precon), reverts(21, precon), adds(24, precon),
    ];
    expect(ledger).toHaveLength(9);
    const net = netHandChanges(ledger);
    expect(net.count).toBe(137);
    expect(net.keys.has("x|set|1|nonfoil")).toBe(false);
    expect(net.keys.has("p0|set|1|nonfoil")).toBe(true);
  });

  it("counts a holding once, however many entries touched it", () => {
    expect(netHandChanges([entry(1, row("a", st(1), st(2))), entry(2, row("a", st(2), st(3)))]).count).toBe(1);
    // Added, reverted, added again: it differs from the upload.
    expect(netHandChanges([entry(1, row("a", null, st(1))), entry(2, row("a", st(1), null)), entry(3, row("a", null, st(1)))]).count).toBe(1);
  });

  it("counts an edit undone by a later edit as nothing, and one that only moves partway as a change", () => {
    expect(netHandChanges([entry(1, row("a", st(2), st(5))), entry(2, row("a", st(5), st(2)))]).count).toBe(0);
    expect(netHandChanges([entry(1, row("a", st(2), st(5))), entry(2, row("a", st(5), st(3)))]).count).toBe(1);
  });

  it("counts each differing holding, and reads a printing, a finish or a condition as a difference", () => {
    const net = netHandChanges([
      entry(1, row("a", null, st(1)), row("b", st(1), st(1, "s2")), row("c", st(1), st(1, "s1", "LP"))),
      entry(2, row("d", null, st(1), "foil")),
    ]);
    expect(net.count).toBe(4);
    // A finish is part of the key, so the foil and the nonfoil of one card are two holdings.
    expect(netHandChanges([entry(1, row("a", null, st(1), "foil"), row("a", null, st(1), "nonfoil"))]).count).toBe(2);
  });

  it("nets by the ledger's order, whatever order the rows arrive in", () => {
    expect(netHandChanges([entry(2, row("a", st(70), null)), entry(1, row("a", null, st(70)))]).count).toBe(0);
    // An add then an edit that raises it is one change; read in the wrong order it would net to nothing.
    expect(netHandChanges([entry(2, row("a", st(1), st(3))), entry(1, row("a", null, st(1)))]).count).toBe(1);
  });

  it("counts an entry whose rows were pruned as one change, as it always did, and keys nothing for it", () => {
    const net = netHandChanges([{ seq: 1, rows: null }, entry(2, row("a", null, st(1)))]);
    expect(net.count).toBe(2);
    expect(net.keys.size).toBe(1);
  });

  it("is nothing when there are no hand changes", () => {
    expect(netHandChanges([])).toEqual({ count: 0, keys: new Set() });
  });
});
