// The table is read only through the viewer's grant: their own seat, the table open on the database's clock, and
// their own pod membership, in one statement. Only the emitted SQL shows that; `probe:rule-zero` proves the answers.
import { describe, expect, it, vi } from "vitest";
import { db } from "../../db";
import { ON_THE_SPOT_MAX, loadTable, readOnTheSpot, seatTargetQuery, tableGrantQuery } from "./rule-zero-table";

const VIEWER = "user_viewer";
const TABLE = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

describe("tableGrantQuery", () => {
  const q = tableGrantQuery(VIEWER, TABLE).toSQL();

  it("joins the viewer's own seat and the viewer's own membership of the table's pod", () => {
    expect(q.sql).toContain(`inner join "rule_zero_seats" "viewer_seat" on ("viewer_seat"."table_id" = "rule_zero_tables"."id" and "viewer_seat"."user_id" = $1)`);
    expect(q.sql).toContain(`inner join "pod_members" "viewer_in" on ("viewer_in"."pod_id" = "rule_zero_tables"."pod_id" and "viewer_in"."user_id" = $2)`);
  });

  it("decides open by the database's clock, qualified to the table", () => {
    expect(q.sql).toMatch(/where \("rule_zero_tables"\."id" = \$3 and "rule_zero_tables"\."expires_at" > now\(\)\)$/);
    expect(q.params).toEqual([VIEWER, VIEWER, TABLE]);
  });

  it("returns the table's name and times, never a seat's account or deck", () => {
    const projection = q.sql.slice(0, q.sql.indexOf(" from "));
    // The pod's owner and the setter are compared on the server and never sent: `TableView` carries booleans and a name.
    expect(projection).not.toMatch(/deck_id|"user_id"/);
  });
});

describe("seatTargetQuery", () => {
  const q = seatTargetQuery(VIEWER, TABLE, 2).toSQL();

  it("selects the seat's deck in the same statement as the viewer's grant, so a reseat cannot fall between them", () => {
    expect(q.sql).toContain(`inner join "rule_zero_seats" "viewer_seat" on ("viewer_seat"."table_id" = "rule_zero_tables"."id" and "viewer_seat"."user_id" = $1)`);
    expect(q.sql).toContain(`inner join "pod_members" "viewer_in" on ("viewer_in"."pod_id" = "rule_zero_tables"."pod_id" and "viewer_in"."user_id" = $2)`);
    expect(q.sql).toContain(`inner join "pod_members" on ("pod_members"."pod_id" = "rule_zero_tables"."pod_id" and "pod_members"."user_id" = "rule_zero_seats"."user_id")`);
    expect(q.sql).toMatch(/where \("rule_zero_seats"\."table_id" = \$3 and "rule_zero_seats"\."seat" = \$4 and "rule_zero_tables"\."expires_at" > now\(\)\)$/);
    expect(q.params).toEqual([VIEWER, VIEWER, TABLE, 2]);
  });
});

describe("the reads refuse a malformed ask before reading anything", () => {
  it("takes only a table id, and a whole seat number", async () => {
    expect(await loadTable(VIEWER, "x")).toBeNull();
    expect(await readOnTheSpot(VIEWER, "x", 1)).toBe("refused");
    expect(await readOnTheSpot(VIEWER, TABLE, 1.5)).toBe("refused");
    expect(await readOnTheSpot(VIEWER, TABLE, "1")).toBe("refused");
  });

  it("takes only a seat the table can have, so nothing out of the column's range reaches the database", async () => {
    for (const seat of [0, 9, 32768, -1]) expect(await readOnTheSpot(VIEWER, TABLE, seat)).toBe("refused");
  });
});

describe("readOnTheSpot holds at most ON_THE_SPOT_MAX of the pool's connections", () => {
  it("answers busy past the bound without opening a transaction, and frees its place when one finishes", async () => {
    const release: (() => void)[] = [];
    const spy = vi.spyOn(db, "transaction").mockImplementation(
      () => new Promise((resolve) => release.push(() => resolve("skipped" as never))) as never,
    );
    try {
      const held = Array.from({ length: ON_THE_SPOT_MAX }, () => readOnTheSpot(VIEWER, TABLE, 1));
      expect(await readOnTheSpot(VIEWER, TABLE, 2)).toBe("busy");
      expect(spy).toHaveBeenCalledTimes(ON_THE_SPOT_MAX);
      release.shift()!();
      expect(await held[0]).toBe("skipped");
      const next = readOnTheSpot(VIEWER, TABLE, 2);
      expect(spy).toHaveBeenCalledTimes(ON_THE_SPOT_MAX + 1);
      release.forEach((r) => r());
      await Promise.all([...held, next]);
    } finally {
      spy.mockRestore();
    }
  });
});
