// The table is read only through the viewer's grant: their own seat, the table open on the database's clock, and
// their own pod membership, in one statement. Only the emitted SQL shows that; `probe:rule-zero` proves the answers.
import { describe, expect, it } from "vitest";
import { loadTable, readOnTheSpot, tableGrantQuery } from "./rule-zero-table";

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

describe("the reads refuse a malformed ask before reading anything", () => {
  it("takes only a table id, and a whole seat number", async () => {
    expect(await loadTable(VIEWER, "x")).toBeNull();
    expect(await readOnTheSpot(VIEWER, "x", 1)).toBe("refused");
    expect(await readOnTheSpot(VIEWER, TABLE, 1.5)).toBe("refused");
    expect(await readOnTheSpot(VIEWER, TABLE, "1")).toBe("refused");
  });
});
